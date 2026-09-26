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
  Brain,
  History,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, Conversation } from '../types/conversation';
import { DocumentItem } from '../types/document';
import { Spinner } from './Spinner';

interface ChatPanelProps {
  conversation: Conversation | null;
  documents: DocumentItem[];
  isQuerying: boolean;
  onSendMessage: (text: string, scope: 'all' | 'selected', selectedIds: string[]) => void;
  onUpdateScope: (scope: 'all' | 'selected', selectedIds: string[]) => void;
  onRenameTitle?: (title: string) => void;
  onOpenHistory?: () => void;
  onNewChat?: () => void;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── User Bubble ─────────────────────────────────────────────────────────────
const UserBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
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

// ─── Assistant Bubble ─────────────────────────────────────────────────────────
const AssistantBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const [showSources, setShowSources] = useState(false);
  const hasSources = msg.sources && msg.sources.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.04 }}
      className="flex items-start gap-2.5"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
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
      </motion.div>

      <div className="max-w-[85%] space-y-2">
        <div
          className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm border ${
            msg.isError
              ? 'bg-danger-muted border-danger/30 text-danger'
              : 'bg-surface border-border text-text-main shadow-level1'
          }`}
        >
          <div className="leading-relaxed whitespace-pre-wrap break-words font-sans">
            {msg.content}
          </div>
        </div>

        {/* Sources accordion */}
        {hasSources && (
          <div className="pt-0.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSources(!showSources)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-muted text-[11px] font-mono font-semibold text-accent hover:bg-accent/20 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              <span>
                {msg.sources!.length} verified source{msg.sources!.length !== 1 ? 's' : ''}
              </span>
              <motion.div
                animate={{ rotate: showSources ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              >
                <ChevronDown className="w-3 h-3" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden mt-2 space-y-1.5"
                >
                  {msg.sources!.map((s, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.2 }}
                      className="p-2 rounded-lg bg-surface border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="font-medium text-text-main truncate max-w-[240px]">
                          {s.filename}
                        </span>
                        {s.page !== undefined && s.page !== null && (
                          <span className="text-[10px] font-mono text-text-muted">p.{s.page}</span>
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
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="text-[10px] font-mono text-text-muted">{formatTime(msg.timestamp)}</div>
      </div>
    </motion.div>
  );
};

// ─── Animated Thinking Skeleton ───────────────────────────────────────────────
const ThinkingSkeleton: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    className="flex items-start gap-2.5"
  >
    <motion.div
      animate={{
        boxShadow: [
          '0 0 0 0 var(--accent-muted)',
          '0 0 0 6px transparent',
          '0 0 0 0 var(--accent-muted)',
        ],
      }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      className="w-7 h-7 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center shrink-0 mt-0.5 text-accent"
    >
      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
    </motion.div>

    <div className="max-w-[70%] space-y-2.5 p-4 rounded-2xl rounded-tl-sm bg-surface border border-border shadow-level1">
      {[48, 64, 36].map((w, i) => (
        <motion.div
          key={i}
          className="skeleton-line"
          style={{ width: `${w * 4}px` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      <div className="flex items-center gap-2 mt-1">
        <Brain className="w-3 h-3 text-accent animate-pulse" />
        <p className="text-[11px] text-text-muted font-medium">
          Retrieving chunks & generating grounded answer…
        </p>
      </div>
    </div>
  </motion.div>
);

// ─── Suggestion Chip ──────────────────────────────────────────────────────────
const SuggestionChip: React.FC<{ label: string; onClick: () => void; delay: number }> = ({
  label,
  onClick,
  delay,
}) => (
  <motion.button
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{
      scale: 1.04,
      borderColor: 'var(--accent)',
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    }}
    whileTap={{ scale: 0.96 }}
    transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    onClick={onClick}
    className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-2 text-xs font-medium text-text-main transition-colors"
  >
    {label}
  </motion.button>
);

// ─── Main Chat Panel ──────────────────────────────────────────────────────────
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
  const [isFocused, setIsFocused] = useState(false);
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
    'Summarize this document',
    'What are the key takeaways?',
    'List any risks or requirements',
    'Explain the main architecture',
  ];

  const hasMessages = conversation && conversation.messages.length > 0;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-surface shadow-level1 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-surface flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold text-text-main truncate">
            {conversation?.title || 'New Exploration'}
          </h2>
          <p className="text-[11px] text-text-muted">
            Answers grounded in your indexed document chunks
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenHistory && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-border/60 text-xs font-semibold text-text-main transition-all"
              title="View past conversations"
            >
              <History className="w-3.5 h-3.5 text-accent" />
              <span>Chat History</span>
            </motion.button>
          )}

          {onNewChat && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-border/60 text-xs font-semibold text-text-main transition-all"
              title="Start a new chat thread"
            >
              <Plus className="w-3.5 h-3.5 text-accent" />
              <span>New Chat</span>
            </motion.button>
          )}

          {/* Document scope selector */}
          <div className="relative" ref={scopeMenuRef}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-border/60 text-xs font-semibold text-text-main transition-all"
            >
              <Filter className="w-3.5 h-3.5 text-accent" />
              <span>
                {scope === 'all' ? 'All documents' : `${selectedIds.length} selected`}
              </span>
              <motion.div
                animate={{ rotate: isScopeMenuOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              >
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {isScopeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 6 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                  className="absolute right-0 mt-1.5 w-64 rounded-xl border border-border bg-surface shadow-level2 p-2 z-30"
                >
                <div className="p-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Context Scope
                </div>

                <motion.button
                  whileHover={{ backgroundColor: 'var(--accent-muted)' }}
                  onClick={selectAll}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                    scope === 'all'
                      ? 'bg-accent-muted text-accent font-semibold'
                      : 'hover:bg-surface-2 text-text-main'
                  }`}
                >
                  <span>Search all workspace files</span>
                  {scope === 'all' && <Check className="w-3.5 h-3.5" />}
                </motion.button>

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
                        <motion.button
                          key={d.id}
                          whileHover={{ x: 2 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          onClick={() => {
                            setScope('selected');
                            toggleDocument(d.id);
                          }}
                          className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-2 text-left text-xs text-text-main"
                        >
                          <motion.div
                            animate={{ scale: isChecked ? 1 : 0.9 }}
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-accent border-accent text-white'
                                : 'border-border bg-surface'
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </motion.div>
                          <span className="truncate flex-1">{d.filename}</span>
                        </motion.button>
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
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-2xl bg-accent-muted border border-accent/20 flex items-center justify-center text-accent mb-4"
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
            <h3 className="font-heading text-sm font-bold text-text-main">
              Ask anything about your documents
            </h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              Questions are matched against vector embeddings and answered from your verified source
              files.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-lg">
              {suggestionChips.map((chip, i) => (
                <SuggestionChip
                  key={i}
                  label={chip}
                  delay={i * 0.06 + 0.1}
                  onClick={() => {
                    setInput(chip);
                    textareaRef.current?.focus();
                  }}
                />
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

      {/* Input Section */}
      <div className="p-4 border-t border-border bg-surface shrink-0">
        <motion.form
          onSubmit={handleSend}
          animate={{
            boxShadow: isFocused
              ? '0 0 0 2px var(--accent)'
              : '0 0 0 1px var(--border)',
          }}
          transition={{ duration: 0.15 }}
          className="relative rounded-xl overflow-hidden bg-surface-2"
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            className="w-full resize-none pl-4 pr-12 py-3 bg-transparent text-sm text-text-main placeholder-text-muted/70 transition-all leading-relaxed font-sans focus:outline-none"
          />

          <motion.button
            type="submit"
            disabled={!input.trim() || isQuerying}
            whileHover={{ scale: input.trim() && !isQuerying ? 1.08 : 1 }}
            whileTap={{ scale: input.trim() && !isQuerying ? 0.92 : 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="btn-primary absolute right-2.5 top-2.5 !p-2 !rounded-lg"
            title="Send question"
          >
            {isQuerying ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
          </motion.button>
        </motion.form>

        <div className="mt-2 text-center text-[11px] font-medium text-text-muted">
          Every answer links back to the exact document and passage it came from.
        </div>
      </div>
    </div>
  );
};
