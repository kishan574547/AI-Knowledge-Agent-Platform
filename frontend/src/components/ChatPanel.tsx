import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  User,
  ChevronDown,
  Filter,
  FileText,
  AlertCircle,
  BookOpen,
  Brain,
  History,
  Plus,
  Copy,
  Check,
  RotateCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, Conversation, SourceRef } from '../types/conversation';
import { DocumentItem } from '../types/document';
import { Spinner } from './Spinner';
import { MarkdownRenderer } from '../utils/MarkdownRenderer';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

interface ChatPanelProps {
  conversation: Conversation | null;
  documents: DocumentItem[];
  isQuerying: boolean;
  onSendMessage: (
    text: string,
    scope: 'all' | 'selected',
    selectedDocumentIds: string[]
  ) => void;
  onUpdateScope: (scope: 'all' | 'selected', documentIds: string[]) => void;
  onOpenHistory?: () => void;
  onNewChat?: () => void;
}

function formatTime(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── User Bubble ─────────────────────────────────────────────────────────────
const UserBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="flex items-start gap-2.5 justify-end group"
  >
    <div className="max-w-[75%] flex flex-col items-end">
      {/* Accent-tinted background with strong readable text in every theme */}
      <div className="bg-accent-muted border border-accent/25 text-text-main text-xs sm:text-sm px-4 py-2.5 rounded-lg rounded-tr-none shadow-sm font-sans">
        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      </div>
      <span className="text-[11px] font-sans text-text-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {formatTime(msg.timestamp)}
      </span>
    </div>
    <div className="w-7 h-7 rounded-full bg-accent-muted border border-accent/30 text-accent flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold">
      <User className="w-3.5 h-3.5" />
    </div>
  </motion.div>
);

// ─── Assistant Bubble with Markdown, Distinct Error Card, and Sources ─────────
const AssistantBubble: React.FC<{
  msg: ChatMessage;
  onRetry?: (text: string) => void;
  lastUserQuery?: string;
}> = ({ msg, onRetry, lastUserQuery }) => {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasSources = msg.sources && msg.sources.length > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Error Card (Defect #6: Render errors as distinct inline card with Retry)
  if (msg.isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-start gap-2.5"
      >
        <div className="w-7 h-7 rounded-md bg-danger-muted border border-danger/30 text-danger flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="max-w-[85%] w-full">
          <div className="p-4 rounded-lg bg-danger-muted border border-danger/30 text-xs sm:text-sm text-text-main flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-semibold text-danger">Response Generation Error</p>
              <p className="text-text-secondary leading-relaxed">{msg.content}</p>
            </div>
            {onRetry && lastUserQuery && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<RotateCw className="w-3 h-3" />}
                onClick={() => onRetry(lastUserQuery)}
              >
                Retry
              </Button>
            )}
          </div>
          <span className="text-[11px] font-sans text-text-secondary mt-1 block">
            {formatTime(msg.timestamp)}
          </span>
        </div>
      </motion.div>
    );
  }

  // Normal Assistant Message
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-2.5 group"
    >
      {/* Brand mark avatar (Defect #4) */}
      <Avatar isBrand size="sm" className="mt-0.5" />

      <div className="max-w-[85%] space-y-2">
        {/* Clean surface with thin border */}
        <div className="p-4 rounded-lg rounded-tl-none bg-surface border border-border text-xs sm:text-sm text-text-main shadow-card">
          <MarkdownRenderer content={msg.content} />
        </div>

        {/* Sources Row and Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-0.5 flex-wrap">
          {hasSources ? (
            <div>
              <button
                onClick={() => setShowSources(!showSources)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-muted text-[11px] font-medium text-accent hover:opacity-90 transition-opacity"
              >
                <BookOpen className="w-3 h-3" />
                <span>
                  {msg.sources!.length} verified source{msg.sources!.length !== 1 ? 's' : ''}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showSources ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {showSources && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-2 space-y-1.5"
                  >
                    {msg.sources!.map((s: SourceRef, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-surface-2 border border-border flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="font-medium text-text-main truncate max-w-[220px]">
                            {s.filename}
                          </span>
                          {s.page !== undefined && s.page !== null && (
                            <span className="text-[11px] font-mono text-text-secondary">
                              p.{s.page}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-text-secondary">
                            chunk #{s.chunk_index}
                          </span>
                        </div>

                        {s.similarity !== undefined && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-muted text-accent shrink-0">
                            {Math.round(s.similarity * 100)}% match
                          </span>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : <div />}

          {/* Action buttons: Copy & Timestamp */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-[11px] text-text-secondary hover:text-text-main flex items-center gap-1 transition-colors px-1 py-0.5 rounded"
              title="Copy message"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {onRetry && lastUserQuery && (
              <button
                onClick={() => onRetry(lastUserQuery)}
                className="text-[11px] text-text-secondary hover:text-text-main flex items-center gap-1 transition-colors px-1 py-0.5 rounded"
                title="Regenerate answer"
              >
                <RotateCw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
            )}

            <span className="text-[11px] font-sans text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(msg.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Animated Thinking Shimmer ────────────────────────────────────────────────
const ThinkingSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="flex items-start gap-2.5"
  >
    <Avatar isBrand size="sm" className="mt-0.5" />
    <div className="max-w-[70%] space-y-2.5 p-4 rounded-lg rounded-tl-none bg-surface border border-border shadow-card">
      <div className="skeleton-line w-48" />
      <div className="skeleton-line w-64" />
      <div className="skeleton-line w-36" />
      <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/50 text-[11px] text-text-secondary">
        <Brain className="w-3.5 h-3.5 text-accent animate-pulse" />
        <span>Searching your documents and generating grounded answer…</span>
      </div>
    </div>
  </motion.div>
);

// ─── Main Chat Panel Component ────────────────────────────────────────────────
export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  documents,
  isQuerying,
  onSendMessage,
  onUpdateScope,
  onOpenHistory,
  onNewChat,
}) => {
  const [input, setInput] = useState('');
  const [scope, setScope] = useState<'all' | 'selected'>(conversation?.documentScope || 'all');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    conversation?.selectedDocumentIds || []
  );
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const scopeMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, isQuerying]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scopeMenuRef.current && !scopeMenuRef.current.contains(e.target as Node)) {
        setIsScopeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isQuerying) return;
    onSendMessage(input.trim(), scope, selectedIds);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleDocument = (id: string) => {
    const updated = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    setSelectedIds(updated);
    onUpdateScope('selected', updated);
  };

  const selectAll = () => {
    setScope('all');
    setSelectedIds([]);
    onUpdateScope('all', []);
    setIsScopeMenuOpen(false);
  };

  const suggestionChips = [
    'Summarize my documents',
    'List the key points and architecture',
    'What are the main requirements and deadlines?',
    'Compare key tradeoffs mentioned',
  ];

  const hasMessages = conversation && conversation.messages.length > 0;

  // Retrieve last user query for retry/regenerate
  const lastUserMsg = conversation?.messages
    ?.filter((m) => m.role === 'user')
    ?.slice(-1)[0];

  return (
    <div className="flex flex-col h-full rounded-lg border border-border bg-surface shadow-card overflow-hidden">
      {/* Workspace Header */}
      <div className="px-5 py-3 border-b border-border bg-surface flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold text-text-main truncate">
            {conversation?.title || 'New Conversation'}
          </h2>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Answers grounded strictly in your indexed document chunks
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenHistory && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenHistory}
              leftIcon={<History className="w-3.5 h-3.5 text-accent" />}
            >
              <span>History</span>
            </Button>
          )}

          {onNewChat && (
            <Button
              variant="primary"
              size="sm"
              onClick={onNewChat}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              <span>New Chat</span>
            </Button>
          )}

          {/* Document scope selector */}
          <div className="relative" ref={scopeMenuRef}>
            <button
              onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-2 text-xs font-medium text-text-main transition-colors shadow-sm"
            >
              <Filter className="w-3.5 h-3.5 text-accent" />
              <span>
                {scope === 'all' ? 'All documents' : `${selectedIds.length} selected`}
              </span>
              <ChevronDown className="w-3 h-3 text-text-muted" />
            </button>

            <AnimatePresence>
              {isScopeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-surface shadow-overlay p-2 z-50 text-left"
                >
                  <div className="p-2 border-b border-border mb-1">
                    <span className="text-xs font-semibold text-text-main">
                      Filter Retrieval Scope
                    </span>
                  </div>

                  <button
                    onClick={selectAll}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-surface-2 text-xs font-medium text-text-main transition-colors"
                  >
                    <span>All indexed documents</span>
                    {scope === 'all' && (
                      <span className="text-[10px] font-bold text-accent">Active</span>
                    )}
                  </button>

                  <div className="my-1 border-t border-border" />
                  <div className="px-2 py-1 text-[11px] font-semibold text-text-secondary">
                    Individual Documents
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {documents.length === 0 ? (
                      <div className="p-2 text-xs text-text-secondary italic">
                        No ready documents found
                      </div>
                    ) : (
                      documents.map((d) => {
                        const isSelected = selectedIds.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            onClick={() => toggleDocument(d.id)}
                            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-surface-2 text-xs text-left transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5"
                            />
                            <span className="truncate flex-1 text-text-main">{d.filename}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {!hasMessages && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
            <div className="w-12 h-12 rounded-lg bg-accent-muted text-accent flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-text-main">
              Ask about your documents
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
              Every answer is grounded in your verified vector chunks and cites its source.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-lg">
              {suggestionChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(chip);
                    textareaRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-2 text-xs font-medium text-text-main transition-colors shadow-sm"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {conversation?.messages.map((msg) =>
          msg.role === 'user' ? (
            <UserBubble key={msg.id} msg={msg} />
          ) : (
            <AssistantBubble
              key={msg.id}
              msg={msg}
              onRetry={(text) => onSendMessage(text, scope, selectedIds)}
              lastUserQuery={lastUserMsg?.content}
            />
          )
        )}

        {isQuerying && <ThinkingSkeleton />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section (Defect #10: Clear Send button + helper line) */}
      <div className="p-4 border-t border-border bg-surface shrink-0">
        <form
          onSubmit={handleSend}
          className="relative rounded-lg border border-border focus-within:border-accent bg-surface-2/60 transition-colors"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents..."
            className="w-full resize-none pl-4 pr-12 py-3 bg-transparent text-xs sm:text-sm text-text-main placeholder-text-secondary/70 leading-relaxed font-sans focus:outline-none"
          />

          {/* Primary Round Send Button (Rule 5.5 & Defect #10) */}
          <button
            type="submit"
            disabled={!input.trim() || isQuerying}
            className="absolute right-2.5 top-2.5 w-8 h-8 rounded-full bg-accent text-text-on-accent flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm"
            aria-label="Send question"
            title="Send question"
          >
            {isQuerying ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>

        <div className="mt-2 text-center text-[11px] text-text-secondary">
          Enter to send, Shift+Enter for a new line
        </div>
      </div>
    </div>
  );
};
