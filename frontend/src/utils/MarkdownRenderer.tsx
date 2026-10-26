import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownProps {
  content: string;
  className?: string;
}

const CodeBlock: React.FC<{ language?: string; value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-border bg-surface-2 font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-surface/50 text-[11px] text-text-muted">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-text-main transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-text-main leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content text-sm leading-relaxed text-text-main space-y-2 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold font-heading text-text-main mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold font-heading text-text-main mt-3 mb-1.5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold font-heading text-text-main mt-2 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-text-main">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-5 space-y-1 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-5 space-y-1 mb-2">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent pl-3 italic text-text-secondary my-2">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-border rounded-lg">
              <table className="w-full text-xs text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2 border-b border-border text-text-main">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-surface-2/40 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="p-2.5 font-semibold text-text-main">{children}</th>,
          td: ({ children }) => <td className="p-2.5 text-text-secondary">{children}</td>,
          code: ({ inline, className: codeClass, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(codeClass || '');
            const value = String(children).replace(/\n$/, '');
            if (!inline && match) {
              return <CodeBlock language={match[1]} value={value} />;
            }
            if (!inline && value.includes('\n')) {
              return <CodeBlock value={value} />;
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono text-[12px] text-accent font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
