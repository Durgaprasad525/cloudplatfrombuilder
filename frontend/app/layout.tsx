import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GPU Cloud Platform',
  description: 'AI PaaS dashboard – API keys, inference, usage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight text-sky-400">
              GPU Cloud Platform
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              API keys, inference, and usage metrics
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
