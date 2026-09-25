import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  User,
  ChevronDown,
  Check,
  Filter,
  Sparkles,
  FileText,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, Conversation } from '../types/conversation';
import { DocumentItem } from '../types/document';
import { Spinner } from './Spinner';

interface ChatPanelProps {
  conversation: Conversation | null;
  documents: DocumentItem[];
  isQuerying: boolean;
  onSendMessage: (
    text: string,
    scope: 'all' | 'selected',
    selectedIds: string[]
  ) => void;
  onUpdateScope: (scope: 'all' | 'selected', selectedIds: string[]) => void;
  onRenameTitle?: (title: string) => void;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// User Bubble Component
const UserBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="flex items-start gap-2.5 justify-end"
  >
    <div className="max-w-[80%]">
      <div className="bg-accent text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm font-sans">
        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      </div>
      <div className="text-right mt-1">
        <span className="text-[10px] font-mono text-text-muted">{formatTime(msg.timestamp)}</span>
      </div>
    </div>
    <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm font-semibold text-xs">
      <User className="w-3.5 h-3.5" />
    </div>
  </motion.div>
);

// Assistant Bubble Component with Smooth Sources Accordion
const AssistantBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const [showSources, setShowSources] = useState(false);
  const hasSources = msg.sources && msg.sources.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-2.5"
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          msg.isError
            ? 'bg-danger-muted border border-danger text-danger'
            : 'bg-accent-muted border border-accent/20 text-accent'
        }`}
      >
        {msg.isError ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
      </div>

      <div className="max-w-[85%] space-y-2">
        <div
          className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm border ${
            msg.isError
              ? 'bg-danger-muted border-danger/30 text-danger'
              : 'bg-surface border-border text-text-main shadow-level1'
          }`}
        >
          <div className="leading-relaxed whitespace-pre-wrap break-words font-sans">{msg.content}</div>
        </div>

        {/* Sources Accordion */}
        {hasSources && (
          <div className="pt-0.5">
            <button
              onClick={() => setShowSources(!showSources)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-muted text-[11px] font-mono font-semibold text-accent hover:bg-accent/20 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              <span>{msg.sources!.length} verified source{msg.sources!.length !== 1 ? 's' : ''}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${showSources ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden mt-2 space-y-1.5"
                >
                  {msg.sources!.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-surface border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="font-medium text-text-main truncate max-w-[240px]">
                          {s.filename}
                        </span>
                        {s.page !== undefined && s.page !== null && (
                          <span className="text-[10px] font-mono text-text-muted">
                            p.{s.page}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-text-muted">
                          chunk #{s.chunk_index}
                        </span>
                      </div>

                      {s.similarity !== undefined && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-muted text-accent shrink-0">
                          {Math.round(s.similarity * 100)}% match
                        </span>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="text-[10px] font-mono text-text-muted">
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </motion.div>
  );
};

// Shimmer Thinking Skeleton
const ThinkingSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-2.5"
  >
    <div className="w-7 h-7 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center shrink-0 mt-0.5 text-accent">
      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
    </div>
    <div className="max-w-[70%] space-y-2 p-4 rounded-2xl rounded-tl-sm bg-surface border border-border shadow-level1">
      <div className="skeleton-line w-48" />
      <div className="skeleton-line w-64" />
      <div className="skeleton-line w-36" />
      <p className="text-[11px] text-text-muted mt-1 font-medium">Searching documents and generating grounded answer…</p>
    </div>
  </motion.div>
);

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  documents,
  isQuerying,
  onSendMessage,
  onUpdateScope,
}) => {
  const [input, setInput] = useState('');
  const [scope, setScope] = useState<'all' | 'selected'>(conversation?.documentScope || 'all');
  const [selectedIds, setSelectedIds] = useState<string[]>(conversation?.selectedDocumentIds || []);
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
    'Summarize this document',
    'What are the key takeaways?',
    'List any risks or requirements',
    'Explain the main architecture',
  ];

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-surface shadow-level1 overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-3 border-b border-border bg-surface flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold text-text-main truncate">
            {conversation?.title || 'New Exploration'}
          </h2>
          <p className="text-[11px] text-text-muted">
            Answers are grounded in your uploaded documents
          </p>
        </div>

        {/* Scope Selector Chip */}
        <div className="relative" ref={scopeMenuRef}>
          <button
            onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-border/60 text-xs font-semibold text-text-main transition-all"
          >
            <Filter className="w-3.5 h-3.5 text-accent" />
            <span>
              {scope === 'all'
                ? 'All documents'
                : `${selectedIds.length} selected`}
            </span>
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>

          <AnimatePresence>
            {isScopeMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-1.5 w-64 rounded-xl border border-border bg-surface shadow-level2 p-2 z-30"
              >
                <div className="p-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Context Scope
                </div>

                <button
                  onClick={selectAll}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                    scope === 'all'
                      ? 'bg-accent-muted text-accent font-semibold'
                      : 'hover:bg-surface-2 text-text-main'
                  }`}
                >
                  <span>Search all workspace files</span>
                  {scope === 'all' && <Check className="w-3.5 h-3.5" />}
                </button>

                <div className="my-1.5 border-t border-border" />

                <div className="p-1 text-[11px] font-semibold text-text-muted">
                  Or pick specific files:
                </div>

                <div className="max-h-44 overflow-y-auto space-y-0.5">
                  {documents.length === 0 ? (
                    <div className="p-2 text-center text-xs text-text-muted">
                      No uploaded documents
                    </div>
                  ) : (
                    documents.map((d) => {
                      const isChecked = scope === 'selected' && selectedIds.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          onClick={() => {
                            setScope('selected');
                            toggleDocument(d.id);
                          }}
                          className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-2 text-left text-xs text-text-main"
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-accent border-accent text-white'
                                : 'border-border bg-surface'
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate flex-1">{d.filename}</span>
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

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {(!conversation || conversation.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10">
            <div className="w-10 h-10 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center text-accent mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-sm font-bold text-text-main">
              Ask anything about your documents
            </h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              Questions are matched against vector embeddings and answered directly from your verified source files.
            </p>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-lg">
              {suggestionChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(chip);
                    textareaRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 hover:border-accent text-xs font-medium text-text-main transition-all"
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
            <AssistantBubble key={msg.id} msg={msg} />
          )
        )}

        {isQuerying && <ThinkingSkeleton />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section (Sticky Bottom) */}
      <div className="p-4 border-t border-border bg-surface shrink-0">
        <form onSubmit={handleSend} className="relative">
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
            placeholder="Ask a question about your documents... (Enter to send, Shift+Enter for newline)"
            className="w-full resize-none pl-4 pr-12 py-3 bg-surface-2 border border-border rounded-xl text-sm text-text-main placeholder-text-muted/70 focus:bg-surface focus:border-accent transition-all leading-relaxed font-sans"
          />

          <button
            type="submit"
            disabled={!input.trim() || isQuerying}
            className="btn-primary absolute right-2.5 top-2.5 !p-2 !rounded-lg"
            title="Send question"
          >
            {isQuerying ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>

        <div className="mt-2 text-center text-[11px] font-medium text-text-muted">
          Every answer links back to the exact document and passage it came from.
        </div>
      </div>
    </div>
  );
};
