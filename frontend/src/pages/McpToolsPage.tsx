import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Send, Loader2, CheckCircle2, AlertCircle,
  Brain, FileText, ListTodo, Trash2,
  Check, X, Zap, Shield, Eye, Lock,
  History, Plus,
} from 'lucide-react';
import { agentService, AgentEvent, ToolInfo } from '../services/agentService';
import { ConversationHistoryDrawer } from '../components/ConversationHistoryDrawer';
import { useAgent, McpMessage as Message } from '../context/AgentContext';

/* ─── Helpers ────────────────────────────────────────────── */
const TOOL_ICONS: Record<string, React.ReactNode> = {
  document_search: <FileText className="w-3.5 h-3.5" />,
  memory_search: <Brain className="w-3.5 h-3.5" />,
  memory_create: <Brain className="w-3.5 h-3.5" />,
  memory_delete: <Trash2 className="w-3.5 h-3.5" />,
  task_create: <ListTodo className="w-3.5 h-3.5" />,
  task_list: <ListTodo className="w-3.5 h-3.5" />,
  task_complete: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const PERM_COLORS: Record<string, string> = {
  read: 'text-success bg-success/10 border-success/20',
  write: 'text-warning bg-warning/10 border-warning/20',
};

/* ─── Sub-components ─────────────────────────────────────── */
const EventBadge: React.FC<{ event: AgentEvent }> = ({ event }) => {
  const icon = TOOL_ICONS[event.tool_name || ''] ?? <Wrench className="w-3 h-3" />;
  const isResult = event.type === 'tool_result';
  const isCall = event.type === 'tool_call';

  if (!isCall && !isResult) return null;

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium ${
      isResult
        ? event.success
          ? 'bg-success/10 border-success/20 text-success'
          : 'bg-danger/10 border-danger/20 text-danger'
        : 'bg-accent-muted border-accent/20 text-accent'
    }`}>
      {isResult ? (event.success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />) : icon}
      <span>{isCall ? `Calling ${event.tool_name}` : event.summary || (event.success ? 'Done' : 'Failed')}</span>
    </div>
  );
};

const ConfirmBar: React.FC<{
  pendingAction: string;
  sessionId: string;
  onConfirm: (sessionId: string, confirmed: boolean) => void;
  disabled?: boolean;
}> = ({ pendingAction, sessionId, onConfirm, disabled }) => (
  <div className="mt-3 p-3 rounded-xl border border-warning/30 bg-warning/5">
    <div className="flex items-start gap-2 mb-3">
      <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-text-main">Confirmation Required</p>
        <p className="text-[11px] text-text-muted mt-0.5">{pendingAction}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onConfirm(sessionId, true)}
        disabled={disabled}
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        <Check className="w-3 h-3" /> Confirm
      </button>
      <button
        onClick={() => onConfirm(sessionId, false)}
        disabled={disabled}
        className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-border text-xs font-medium text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors disabled:opacity-50"
      >
        <X className="w-3 h-3" /> Cancel
      </button>
    </div>
  </div>
);

const ChatMessage: React.FC<{
  msg: Message;
  onConfirm: (sessionId: string, confirmed: boolean) => void;
  confirming: boolean;
}> = ({ msg, onConfirm, confirming }) => {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-[10px] text-text-muted px-3 py-1 bg-surface-2 rounded-full border border-border">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
        isUser
          ? 'bg-accent text-white'
          : 'bg-surface-2 border border-border text-text-muted'
      }`}>
        {isUser ? 'U' : '🤖'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Tool events */}
        {!isUser && msg.events && msg.events.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {msg.events.map((ev, i) => <EventBadge key={i} event={ev} />)}
          </div>
        )}

        {/* Message bubble */}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-accent text-white rounded-tr-sm'
            : 'bg-surface-2 border border-border text-text-main rounded-tl-sm'
        } ${msg.isLoading ? 'animate-pulse' : ''}`}>
          {msg.isLoading ? (
            <div className="flex items-center gap-2 text-text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          ) : (
            msg.content
          )}
        </div>

        {/* Confirmation prompt */}
        {!isUser && msg.requiresConfirmation && msg.sessionId && msg.pendingAction && (
          <ConfirmBar
            pendingAction={msg.pendingAction}
            sessionId={msg.sessionId}
            onConfirm={onConfirm}
            disabled={confirming}
          />
        )}

        {/* Tool call count badge */}
        {!isUser && msg.toolCallsMade != null && msg.toolCallsMade > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <Zap className="w-2.5 h-2.5" />
            {msg.toolCallsMade} tool call{msg.toolCallsMade !== 1 ? 's' : ''}
          </div>
        )}

        <span className="text-[10px] text-text-muted">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};

const ToolCard: React.FC<{ tool: ToolInfo }> = ({ tool }) => (
  <div className="p-3.5 rounded-xl bg-surface-2 border border-border hover:border-accent/40 transition-all">
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <div className="flex items-center gap-2">
        <span className="text-base">{tool.emoji}</span>
        <span className="text-xs font-bold text-text-main font-mono">{tool.name}</span>
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${PERM_COLORS[tool.permission_level]}`}>
        {tool.permission_level === 'read' ? (
          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5 inline" /> READ</span>
        ) : (
          <span className="flex items-center gap-0.5"><Lock className="w-2.5 h-2.5 inline" /> WRITE</span>
        )}
      </span>
    </div>
    <p className="text-[11px] text-text-muted leading-relaxed">{tool.description}</p>
  </div>
);

const EXAMPLE_PROMPTS = [
  'Search my documents for project deadlines',
  'What do you remember about my goals?',
  'List my pending tasks',
  'Create a task to review the RAG pipeline tomorrow',
  'Remember that I am preparing for AI Engineer roles',
];

/* ─── Main Page ──────────────────────────────────────────── */
export const McpToolsPage: React.FC = () => {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [input, setInput] = useState('');
  const [showTools, setShowTools] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    sending,
    confirming,
    activeSession,
    sendMessage,
    confirmAction,
    selectConversation,
    startNewChat,
  } = useAgent();

  useEffect(() => {
    agentService
      .listTools()
      .then(setTools)
      .catch(console.error)
      .finally(() => setToolsLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSelectConversation = (conversationId: string) => {
    selectConversation(conversationId);
  };

  const handleNewChat = () => {
    startNewChat();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || sending || confirming) return;
    setInput('');
    sendMessage(text);
  };

  const handleConfirm = (_sessionId: string, confirmed: boolean) => {
    confirmAction(confirmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full gap-0 overflow-hidden min-h-0">
      {/* ── Left: Tool Panel ── */}
      <AnimatePresence initial={false}>
        {showTools && (
          <motion.div
            key="tool-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="shrink-0 flex flex-col h-full bg-surface border-r border-border overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-bold text-text-main">Available Tools</span>
                <span className="ml-auto text-[10px] font-mono text-text-muted">{tools.length}</span>
              </div>
            </div>

            {/* Permission legend */}
            <div className="px-3 py-2 flex items-center gap-3 border-b border-border shrink-0">
              <div className="flex items-center gap-1 text-[10px] text-text-muted">
                <Eye className="w-2.5 h-2.5 text-success" />
                <span>Read — auto</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-text-muted">
                <Lock className="w-2.5 h-2.5 text-warning" />
                <span>Write — confirm</span>
              </div>
            </div>

            {/* Tool list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {toolsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                </div>
              ) : (
                tools.map(tool => <ToolCard key={tool.name} tool={tool} />)
              )}
            </div>

            {/* Security notice */}
            <div className="px-3 py-3 border-t border-border shrink-0">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent-muted/50">
                <Shield className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                <p className="text-[10px] text-text-muted leading-relaxed">
                  All tools are sandboxed. owner_id is always from your authenticated session. Write tools require explicit confirmation.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Right: Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-2 h-11 px-4 border-b border-border bg-surface shrink-0">
          <button
            onClick={() => setShowTools(v => !v)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
            title={showTools ? 'Hide tools panel' : 'Show tools panel'}
          >
            <Wrench className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-semibold text-text-main">MCP Agent</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-border/60 text-text-main border border-border transition-colors shadow-sm"
              title="View Chat History"
            >
              <History className="w-3.5 h-3.5 text-accent" />
              <span>Chat History</span>
            </button>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent text-white hover:opacity-90 transition-colors shadow-sm"
              title="Start New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              onConfirm={handleConfirm}
              confirming={confirming}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Example prompts */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {EXAMPLE_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => setInput(p)}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-text-muted hover:text-text-main hover:border-accent/40 hover:bg-accent-muted/30 transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="flex items-end gap-2 p-2 rounded-xl bg-surface-2 border border-border focus-within:border-accent transition-all">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the agent anything… (Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-text-main placeholder-text-secondary/60 resize-none focus:outline-none leading-relaxed max-h-32 py-1.5 px-1"
              style={{ minHeight: '38px' }}
              disabled={sending || confirming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || confirming}
              className="h-8 w-8 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors disabled:opacity-40 shrink-0"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-text-muted mt-1.5 text-center">
            READ tools execute immediately · WRITE tools require your confirmation
          </p>
        </div>
      </div>

      {/* History Drawer */}
      <ConversationHistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        conversationType="mcp"
        activeConversationId={activeSession || null}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />
    </div>
  );
};
