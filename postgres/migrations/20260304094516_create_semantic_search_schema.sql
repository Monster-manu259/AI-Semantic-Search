

/*
AI Semantic Search Engine Schema
PostgreSQL + Pinecone Version
Vectors stored in Pinecone
Compatible with current API code
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;


--------------------------------------------------
-- USERS TABLE (Admin & User Only)
--------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL, 
    full_name text,
    
    -- Strict Role Check
    role text NOT NULL DEFAULT 'user' 
        CHECK (role IN ('admin', 'user')),

    is_active boolean DEFAULT true,
    last_login timestamptz,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

--------------------------------------------------
-- DOCUMENTS
--------------------------------------------------

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title text NOT NULL,
  content text NOT NULL,
  source_url text,

  metadata jsonb DEFAULT '{}'::jsonb,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','indexed','failed')),

  user_id uuid NOT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

--------------------------------------------------
-- DOCUMENT CHUNKS
--------------------------------------------------

CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  document_id uuid NOT NULL
    REFERENCES documents(id) ON DELETE CASCADE,

  chunk_index int NOT NULL,

  content text NOT NULL,

  -- Pinecone vector reference
  pinecone_id text NOT NULL,

  metadata jsonb DEFAULT '{}'::jsonb,

  token_count int DEFAULT 0,

  created_at timestamptz DEFAULT now(),

  UNIQUE(document_id, chunk_index)
);

--------------------------------------------------
-- SEARCH QUERIES
--------------------------------------------------

CREATE TABLE IF NOT EXISTS search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  query_text text NOT NULL,

  search_type text DEFAULT 'vector'
    CHECK (search_type IN ('vector','keyword','hybrid')),

  results_count int DEFAULT 0,

  user_id uuid,

  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

--------------------------------------------------
-- SEARCH ANALYTICS
--------------------------------------------------

CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  query_id uuid NOT NULL
    REFERENCES search_queries(id) ON DELETE CASCADE,

  chunk_id uuid NOT NULL
    REFERENCES document_chunks(id) ON DELETE CASCADE,

  rank_position int NOT NULL,

  clicked boolean DEFAULT false,

  relevance_score float,

  created_at timestamptz DEFAULT now()
);

--------------------------------------------------
-- SEARCH RESULTS
--------------------------------------------------

CREATE TABLE IF NOT EXISTS search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  query_id uuid REFERENCES search_queries(id) ON DELETE CASCADE,

  chunk_id uuid REFERENCES document_chunks(id),

  document_id uuid,

  score float,

  rank_position int,

  created_at timestamptz DEFAULT now()
);

--------------------------------------------------
-- CHAT SESSIONS
--------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL,

  -- first query becomes title
  title text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

--------------------------------------------------
-- CHAT MESSAGES
--------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id uuid NOT NULL
    REFERENCES chat_sessions(id) ON DELETE CASCADE,

  role text NOT NULL
    CHECK (role IN ('user','assistant')),

  content text NOT NULL,

  query_id uuid
    REFERENCES search_queries(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now()
);

--------------------------------------------------
--inserting the data before the alter table for users
--------------------------------------------------

INSERT INTO users (id, email, password_hash, full_name, role)
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'admin@example.com', 
  'placeholder_hash', 
  'System Admin', 
  'admin'
)
ON CONFLICT (id) DO NOTHING;

--------------------------------------------------
--QUERY_EMBEDDINGS
--------------------------------------------------

--------------------------------------------------
-- ALTER
--------------------------------------------------

ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS content_tsv tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', content)
) STORED;


-- Ensure existing tables point to this new users table
ALTER TABLE documents 
ADD CONSTRAINT fk_documents_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE search_queries 
ADD CONSTRAINT fk_queries_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE chat_sessions 
ADD CONSTRAINT fk_chat_sessions_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

--------------------------------------------------
-- INDEXES (PERFORMANCE)
--------------------------------------------------

-- Indexing for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id
ON documents(user_id);

CREATE INDEX IF NOT EXISTS idx_documents_status
ON documents(status);

CREATE INDEX IF NOT EXISTS idx_documents_created_at
ON documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_metadata
ON documents USING gin(metadata);

-- Document Chunks
CREATE INDEX IF NOT EXISTS idx_chunks_document_id
ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_chunks_created_at
ON document_chunks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chunks_pinecone_id
ON document_chunks(pinecone_id);

CREATE INDEX IF NOT EXISTS idx_chunks_content_tsv
ON document_chunks
USING gin(content_tsv);

CREATE INDEX IF NOT EXISTS idx_chunks_metadata
ON document_chunks
USING gin(metadata);

-- Full text trigram search
CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm
ON document_chunks
USING gin (content gin_trgm_ops);

-- Search queries
CREATE INDEX IF NOT EXISTS idx_queries_user_id
ON search_queries(user_id);

CREATE INDEX IF NOT EXISTS idx_queries_created_at
ON search_queries(created_at DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_query_id
ON search_analytics(query_id);

CREATE INDEX IF NOT EXISTS idx_analytics_chunk_id
ON search_analytics(chunk_id);


-- Search results indexes
CREATE INDEX IF NOT EXISTS idx_search_results_query_id
ON search_results(query_id);

CREATE INDEX IF NOT EXISTS idx_search_results_document_id
ON search_results(document_id);

CREATE INDEX IF NOT EXISTS idx_search_results_created_at
ON search_results(created_at DESC);

--------------------------------------------------
-- CHAT INDEXES
--------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
ON chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_created
ON chat_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session
ON chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created
ON chat_messages(created_at);

--------------------------------------------------
-- AUTO UPDATE updated_at
--------------------------------------------------

CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_updated_at();


CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE chat_sessions
  SET updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chat_session_on_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_session_timestamp();