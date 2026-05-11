import ConditionalSidebar from '@/components/ConditionalSidebar';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Semantic Search Engine',
  description: 'Search through documents using AI-powered semantic understanding',
  openGraph: {
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
     <body className={`${inter.className} bg-[#0d0d0f] text-white`}>
  <div className="flex h-screen">

    <ConditionalSidebar />

    <main className="flex-1 overflow-y-auto">
      {children}
    </main>

  </div>

  <Toaster position="top-right" richColors />
</body>
    </html>
  );
}
