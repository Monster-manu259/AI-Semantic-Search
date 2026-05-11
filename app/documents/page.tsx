'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Loader as Loader2, Trash2, RefreshCw, CircleCheck as CheckCircle2, Circle as XCircle, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  content: string;
  source_url: string | null;
  metadata: Record<string, any>;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  created_at: string;
  updated_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    sourceUrl: '',
  });

  // const USER_ID = "11111111-1111-1111-1111-111111111111";

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/documents", {
  credentials: "include"
});
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          sourceUrl: formData.sourceUrl || null,
          // userId: USER_ID,
          metadata: {},
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Document uploaded and processing started');
        setFormData({ title: '', content: '', sourceUrl: '' });
        setDialogOpen(false);
        fetchDocuments();
        setTimeout(() => {
          fetchDocuments();
        }, 5000);
      } else {
        toast.error('Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Document deleted successfully');
        fetchDocuments();
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleReprocess = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reprocess' }),
      });

      if (response.ok) {
        toast.success('Document reprocessing started');
        fetchDocuments();
        setTimeout(() => {
          fetchDocuments();
        }, 5000);
      } else {
        toast.error('Failed to reprocess document');
      }
    } catch (error) {
      console.error('Reprocess error:', error);
      toast.error('Failed to reprocess document');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'indexed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'indexed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-orange-50 text-orange-700 border-orange-200';
    }
  };

  return (
<div className="min-h-screen bg-[#0d0d0f] text-white">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between pt-8">
          <div>
            <Link href="/search">
<Button variant="ghost" className="mb-4 gap-2 text-gray-300 hover:bg-[#1a1a1d] hover:text-white">
                  <ArrowLeft className="w-4 h-4" />
                Back to Search
              </Button>
            </Link>
<h1 className="text-4xl font-bold text-gray-200 flex items-center gap-3">
                <FileText className="w-10 h-10 text-blue-600" />
              Document Management
            </h1>
<p className="text-lg text-gray-400 mt-2">
                Upload and manage your document knowledge base
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Upload className="w-5 h-5" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
                <DialogDescription>
                  Add a new document to your knowledge base. It will be automatically processed and indexed.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Machine Learning Best Practices"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className='text-black'
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your document content here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                    className="font-mono text-sm text-black"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL (Optional)</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    placeholder="https://example.com/article"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                    className='text-black'
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 text-black">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-white border-gray-700">
          <CardHeader>
            <CardTitle>Your Documents</CardTitle>
            <CardDescription>
              {documents.length} document{documents.length !== 1 ? 's' : ''} in your knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg mb-2">No documents yet</p>
                <p className="text-slate-400 mb-6">Upload your first document to get started</p>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Document
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <h3 className="text-lg font-semibold text-slate-800">{doc.title}</h3>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge className={getStatusColor(doc.status)} variant="outline">
                              <span className="flex items-center gap-1">
                                {getStatusIcon(doc.status)}
                                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                              </span>
                            </Badge>
                            <Badge variant="secondary">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </Badge>
                            {doc.source_url && (
                              <Badge variant="outline">
                                <a
                                  href={doc.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  Source
                                </a>
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-slate-600 line-clamp-2">
                            {doc.content.substring(0, 200)}...
                          </p>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {(doc.status === 'failed' || doc.status === 'indexed') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReprocess(doc.id)}
                              className="gap-1"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Reprocess
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
