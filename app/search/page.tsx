'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Loader2,
  FileText,
  Sparkles,
  ArrowUp,
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  documentTitle: string;
  combinedScore?: number;
}

interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
}

interface ChatMessage {
  query: string;
  answer?: string;
  results?: SearchResult[];
}

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const urlsession = params.get('session');
  const urlType = params.get('type') as 'vector' | 'keyword' | 'hybrid' | null;
  const [userId, setUserId] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(urlsession);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'vector' | 'keyword' | 'hybrid'>('hybrid');
  const [authLoading, setAuthLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
const bottomTextareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) { router.push('/login'); return; }
        const data = await res.json();
        setUserId(data.id);
      } catch { router.push('/login'); }
      finally { setAuthLoading(false); }
    };
    loadUser();
  }, []);

  useEffect(() => { if (messages.length > 0) scrollToBottom(); }, [messages]);
  useEffect(() => { if (urlType) setSearchType(urlType); }, [urlType]);

  useEffect(() => {
    setSessionId(urlsession);
    if (!urlsession) { setMessages([]); setQuery(''); return; }
    const loadSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${urlsession}`);
        const data = await res.json();
        const formatted: ChatMessage[] = [];
        let currentQuery: string | null = null;
        for (const m of data.messages) {
          if (m.role === 'user') currentQuery = m.content;
          if (m.role === 'assistant' && currentQuery) {
            formatted.push({ query: currentQuery, answer: m.content });
            currentQuery = null;
          }
        }
        setMessages(formatted);
      } catch (error) { console.error('Failed to load session', error); }
    };
    loadSession();
  }, [urlsession]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    const currentQuery = query;
    setQuery('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (bottomTextareaRef.current) bottomTextareaRef.current.style.height = 'auto';
    setLoading(true);

    let activeSession = sessionId;
    try {
      if (!activeSession) {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, title: currentQuery }),
        });
        const session = await res.json();
        activeSession = session.id;
        setSessionId(activeSession);
        router.replace(`/search?session=${activeSession}&type=${searchType}`);
        window.dispatchEvent(new Event('session-created'));
      }

      const [searchData, ragData] = await Promise.all([
        fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: currentQuery, userId, searchType, matchCount: 10 }),
        }).then((r) => r.json()),
        fetch('/api/rag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: currentQuery }),
        }).then((r) => r.json()),
      ]);

      await fetch('/api/sessions/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession, role: 'user', content: currentQuery }),
      });
      await fetch('/api/sessions/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession, role: 'assistant', content: ragData.answer }),
      });

      setMessages((prev) => [
        ...prev,
        { query: currentQuery, answer: ragData.answer, results: searchData.results || [] },
      ]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d0d0f] text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  /* ── Shared composer box ── */
const renderComposer = (ref: React.RefObject<HTMLTextAreaElement>) => (
  <div className="w-full max-w-3xl mx-auto">
    <div className="relative bg-[#2f2f2f] rounded-2xl shadow-lg border border-transparent focus-within:border-gray-600 transition-colors duration-200">
      <textarea
        ref={ref}
        value={query}
        rows={1}
        onChange={(e) => {
          setQuery(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); }
        }}
        placeholder="Ask anything..."
        className="w-full resize-none bg-transparent text-gray-100 placeholder-gray-500 text-[15px] leading-6 px-4 pt-4 pb-2 outline-none overflow-y-auto rounded-2xl"
        style={{ minHeight: '56px', maxHeight: '200px' }}
      />
      <div className="flex items-end justify-between px-3 pb-3 pt-1">
        <Select value={searchType} onValueChange={(v: any) => setSearchType(v)}>
          <SelectTrigger className="h-8 gap-1 rounded-full bg-[#3a3a3a] hover:bg-[#444] border-none text-gray-300 text-xs font-medium px-3 focus:ring-0 w-auto transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2f2f2f] border-gray-700 text-gray-200 text-sm">
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="vector">Vector</SelectItem>
            <SelectItem value="keyword">Keyword</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150
            disabled:bg-[#444] disabled:text-gray-600 disabled:cursor-not-allowed
            enabled:bg-white enabled:text-black enabled:hover:bg-gray-200 enabled:active:scale-95"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  </div>
);

  return (
    <div className="h-screen bg-[#0d0d0f] text-white flex flex-col overflow-hidden">

      {/* ── Empty state ── */}
      {!messages.length && !loading && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-10">
          <h1 className="text-5xl font-semibold text-gray-100 text-center tracking-tight">
            What do you want to know?
          </h1>
          {renderComposer(textareaRef)}
        </div>
      )}

      {/* ── Conversation ── */}
      {(messages.length > 0 || loading) && (
        <div className="flex-1 overflow-y-auto px-6 scroll-smooth">
          <div className="w-full max-w-3xl mx-auto py-10 space-y-10">
            {messages.map((msg, i) => (
              <div key={i} className="space-y-5">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-[#2f2f2f] text-gray-100 text-[15px] leading-relaxed px-4 py-3 rounded-2xl rounded-br-md">
                    {msg.query}
                  </div>
                </div>

                {/* AI answer */}
                {msg.answer && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                      <Sparkles className="w-4 h-4" /> AI Answer
                    </div>
                    <div className="text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {msg.answer}
                    </div>
                  </div>
                )}

                {/* Source cards */}
                {msg.results && msg.results.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {msg.results.map((r) => (
                      <Card key={r.id} className="bg-[#1e1e1e] border-gray-800 hover:border-gray-600 transition-colors">
                        <CardHeader className="p-3 pb-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="text-gray-300 text-xs font-medium truncate">{r.documentTitle}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-gray-500 text-xs line-clamp-3">{r.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <hr className="border-gray-800/40" />
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Sparkles className="w-4 h-4 animate-pulse" /> Thinking...
              </div>
            )}
            <div ref={scrollRef} className="h-1" />
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="bg-[#0d0d0f] border-t border-gray-800/50 px-6 py-6">
          {renderComposer(bottomTextareaRef)}
          <p className="text-center text-gray-600 text-xs mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      )}
    </div>
  );
}