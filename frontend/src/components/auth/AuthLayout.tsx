import React from 'react';
import { UploadCloud, MessageSquare, BookOpen } from 'lucide-react';
import { ThemeSwitcher } from '../ThemeSwitcher';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-base text-text-main flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent text-text-on-accent font-heading font-bold text-xs flex items-center justify-center shadow-sm">
            R
          </div>
          <span className="font-heading font-bold text-sm tracking-tight text-text-main">
            DocuRAG
          </span>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-xl border border-border bg-surface shadow-overlay overflow-hidden min-h-[520px]">
          {/* Left Column: Form Area (55%) */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="w-full max-w-[400px] mx-auto">
              {children}
            </div>
          </div>

          {/* Right Column: Brand Panel (45%) — hidden on mobile */}
          <div className="hidden lg:flex lg:col-span-5 bg-surface-2/60 border-l border-border p-8 flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent bg-accent-muted px-2.5 py-1 rounded">
                  DocuRAG Platform
                </span>
                <h2 className="font-heading text-xl font-bold text-text-main mt-3 leading-snug">
                  Grounded Document Intelligence for Fast Answers
                </h2>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  Turn your private documents into verifiable knowledge without hallucinations.
                </p>
              </div>

              {/* 3 Feature Bullets */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-accent-muted text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-main">Upload your documents</h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      PDFs, Word docs, Markdown, and text files indexed with high-dimensional embeddings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-accent-muted text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-main">Ask in plain language</h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Semantic vector retrieval searches context and answers complex queries instantly.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-accent-muted text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-main">Every answer cites its source</h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Inspect the exact document name, page number, and similarity score for each citation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/80 flex items-center justify-between text-[11px] text-text-secondary">
              <span>Isolated Workspace Security</span>
              <span className="font-mono text-accent">PostgreSQL + pgvector</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-[11px] text-text-secondary">
        DocuRAG · Private Document Workspace
      </footer>
    </div>
  );
};
