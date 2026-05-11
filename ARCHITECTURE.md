# AI Semantic Search Engine - System Architecture

## Overview

A full-stack semantic search engine that enables users to search through documents using natural language queries powered by AI embeddings and vector similarity. The system supports hybrid search (combining vector and keyword search), RAG (Retrieval Augmented Generation), and advanced ranking algorithms.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐      │
│  │  Search  │  │Documents │  │ Analytics │  │   RAG    │      │
│  │   UI     │  │ Manager  │  │Dashboard  │  │ Chat UI  │      │
│  └──────────┘  └──────────┘  └───────────┘  └──────────┘      │
│       Next.js 13 + React + Tailwind CSS + ShadCN UI            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ /search  │  │/documents│  │/analytics│  │  /rag    │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Search    │  │  Document   │  │     RAG     │            │
│  │  Service    │  │  Processor  │  │   Service   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Embedding  │  │  Chunking   │  │   Ranking   │            │
│  │  Generator  │  │   Service   │  │  Algorithm  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌─────────────────────────────┐  ┌──────────────────────┐
│      Supabase PostgreSQL     │  │   OpenAI API         │
│     + pgvector Extension     │  │  Embeddings API      │
│                              │  │  GPT-4 API           │
│  ┌────────────────────────┐ │  └──────────────────────┘
│  │  Vector Similarity     │ │
│  │  Search (HNSW Index)   │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 13 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Component Library**: ShadCN UI
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Database Client**: Supabase JS Client

### Database
- **Primary Database**: PostgreSQL (via Supabase)
- **Vector Extension**: pgvector
- **Vector Index**: HNSW (Hierarchical Navigable Small World)
- **Text Search**: pg_trgm (trigram similarity)

### AI/ML
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **LLM**: OpenAI GPT-4-turbo-preview
- **Vector Similarity**: Cosine similarity

## Core Components

### 1. Document Ingestion Pipeline

```typescript
Document Upload → Text Chunking → Embedding Generation → Vector Storage
```

**Features:**
- Automatic document processing
- Smart text chunking with overlap
- Batch embedding generation
- Metadata preservation
- Status tracking (pending, processing, indexed, failed)

**Implementation:**
- `lib/document-processor.ts`: Orchestrates the pipeline
- `lib/chunking.ts`: Splits text into semantic chunks
- `lib/openai.ts`: Generates embeddings

### 2. Vector Search System

**Search Types:**

1. **Vector Search**: Pure semantic similarity
   - Uses cosine distance on embeddings
   - HNSW index for fast ANN search
   - Returns top-K most similar chunks

2. **Keyword Search**: Traditional text matching
   - Uses PostgreSQL trigram similarity
   - ILIKE pattern matching
   - GIN indexes for performance

3. **Hybrid Search**: Combines both approaches
   - Weighted combination: 70% vector + 30% keyword (configurable)
   - Best of both worlds
   - Handles both semantic and exact matches

**Implementation:**
- `lib/search.ts`: Search service with all search types
- Database functions: `match_documents()`, `hybrid_search()`

### 3. RAG (Retrieval Augmented Generation)

**Pipeline:**
```
User Query → Vector Search → Context Assembly → LLM Generation → Response
```

**Features:**
- Context-aware responses
- Source citation
- Confidence scoring
- Follow-up question support
- Multi-document synthesis

**Implementation:**
- `lib/rag.ts`: RAG service
- Context assembly with deduplication
- GPT-4 for answer generation

### 4. Semantic Ranking

**Ranking Algorithm:**
```
Combined Score = (Vector Similarity × 0.7) + (Keyword Match × 0.3) + Bonus
```

**Bonus Factors:**
- Exact query match: +0.1
- Word overlap ratio: +0.05
- Document freshness: configurable

**Implementation:**
- `lib/search.ts`: `rerankResults()` function
- Multi-factor scoring

## Database Schema

### Tables

1. **documents**
   - Stores document metadata
   - Tracks processing status
   - User ownership (RLS enabled)

2. **document_chunks**
   - Chunked text content
   - 1536-dimensional embeddings
   - Chunk metadata and position
   - HNSW vector index

3. **search_queries**
   - Query history
   - Query embeddings
   - Search parameters
   - Analytics data

4. **search_analytics**
   - Click tracking
   - Relevance feedback
   - Performance metrics

### Indexes

- **HNSW Vector Index**: `idx_chunks_embedding` (m=16, ef_construction=64)
- **GIN Trigram Index**: `idx_chunks_content_trgm`
- **B-tree Indexes**: Foreign keys, user_id, status, timestamps

### RLS Policies

All tables have Row Level Security enabled:
- Users can only access their own documents
- Search queries are user-scoped
- Analytics are user-specific

## API Endpoints

### Document Management

```
POST   /api/documents          - Upload new document
GET    /api/documents          - List user documents
GET    /api/documents/:id      - Get document details
DELETE /api/documents/:id      - Delete document
PATCH  /api/documents/:id      - Update/reprocess document
```

### Search

```
POST   /api/search             - Perform search
PATCH  /api/search             - Track result click
```

**Request Body:**
```json
{
  "query": "string",
  "searchType": "vector|keyword|hybrid",
  "matchThreshold": 0.7,
  "matchCount": 10,
  "userId": "uuid",
  "vectorWeight": 0.7,
  "keywordWeight": 0.3
}
```

### RAG

```
POST   /api/rag                - Generate AI answer
GET    /api/rag?documentId=x   - Generate document summary
```

**Request Body:**
```json
{
  "query": "string",
  "userId": "uuid",
  "maxContextLength": 3000,
  "temperature": 0.7,
  "includeSourceReferences": true
}
```

### Analytics

```
GET    /api/analytics?type=queries    - Search analytics
GET    /api/analytics?type=documents  - Document statistics
GET    /api/analytics?type=clicks     - Click tracking data
```

## Text Processing

### Chunking Strategy

**Default Configuration:**
- Chunk Size: 500 tokens
- Overlap: 50 tokens
- Max Chunks: 100 per document

**Algorithms:**
1. **Sentence-based Chunking**: Splits on sentence boundaries
2. **Paragraph-based Chunking**: Splits on paragraph breaks
3. **Token-based Chunking**: Fixed token windows with overlap

**Implementation:**
- Preserves semantic meaning
- Maintains context at boundaries
- Token estimation: ~4 characters per token

### Embedding Generation

**Model**: text-embedding-ada-002
- Dimensions: 1536
- Max Tokens: 8191
- Batch Size: 10 chunks per API call

**Optimization:**
- Batch processing for efficiency
- Retry logic for failures
- Token counting for cost tracking

## Performance Considerations

### Database Performance

1. **Vector Search Optimization**
   - HNSW index for O(log n) search
   - Index parameters tuned for accuracy/speed
   - Cosine distance operator (<=>)

2. **Query Optimization**
   - Prepared statements via RPC functions
   - Combined queries to reduce roundtrips
   - Appropriate indexes on filter columns

3. **Connection Pooling**
   - Supabase handles connection pooling
   - Service role key for admin operations

### Scalability

**Current Limits:**
- Documents: Unlimited (limited by storage)
- Chunks: ~1M efficiently searchable
- Concurrent Searches: 100+ (Supabase tier dependent)

**Scaling Strategies:**
1. Horizontal: Add read replicas
2. Vertical: Upgrade database instance
3. Caching: Redis for frequent queries
4. CDN: Static assets and UI

### Cost Optimization

**OpenAI API Costs:**
- Embeddings: $0.0001 per 1K tokens
- GPT-4: $0.03 per 1K input tokens, $0.06 per 1K output
- Batch processing reduces API calls

**Database Costs:**
- Storage: ~1KB per chunk (text + vector)
- Index: ~2x storage overhead
- Queries: Minimal compute cost

## Security

### Authentication & Authorization

- Row Level Security (RLS) on all tables
- User-scoped data access
- Service role key for admin operations

### Data Protection

- Environment variables for secrets
- No sensitive data in logs
- Secure API key storage

### Input Validation

- Query length limits
- Content sanitization
- Rate limiting (via Supabase)

## Deployment

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

### Build Process

```bash
npm install
npm run build
```

### Hosting Options

1. **Vercel** (Recommended)
   - Automatic deployments
   - Edge functions support
   - Built-in CDN

2. **Netlify**
   - Plugin for Next.js
   - Continuous deployment

3. **Docker**
   - Containerized deployment
   - Self-hosted option

## Monitoring & Analytics

### Application Metrics

- Search query volume
- Search type distribution
- Average result relevance
- API response times

### Database Metrics

- Query performance
- Index usage
- Storage growth
- Connection pool utilization

### AI Metrics

- Embedding generation time
- LLM response quality
- Token usage
- API error rates

## Future Enhancements

### Planned Features

1. **Multi-modal Search**
   - Image embeddings
   - PDF parsing
   - Document OCR

2. **Advanced RAG**
   - Multi-hop reasoning
   - Chain-of-thought prompting
   - Source verification

3. **Collaborative Features**
   - Shared document libraries
   - Team workspaces
   - Permission management

4. **Performance**
   - Query result caching
   - Incremental indexing
   - Real-time updates

### Potential Improvements

- Custom embedding models
- Fine-tuned ranking models
- A/B testing framework
- User feedback loop
- Auto-categorization

## Troubleshooting

### Common Issues

1. **Slow Search Performance**
   - Check HNSW index settings
   - Verify query complexity
   - Monitor database load

2. **Low Relevance Scores**
   - Adjust chunk size
   - Tune hybrid search weights
   - Improve document quality

3. **API Rate Limits**
   - Implement request queuing
   - Batch operations
   - Add caching layer

### Debug Tools

- Database query logs
- API request logs
- Embedding visualization
- Relevance score analysis

## References

### Documentation

- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Next.js App Router](https://nextjs.org/docs/app)

### Research Papers

- HNSW Algorithm: "Efficient and robust approximate nearest neighbor search"
- Vector Embeddings: "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks"
- RAG: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
