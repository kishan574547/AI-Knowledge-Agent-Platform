import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  BookOpen,
  AlertCircle,
  Sparkles,
  MessageSquare,
  ChevronDown,
  Files,
  CheckSquare,
  Square,
} from 'lucide-react';
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
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const UserBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => (
  <div className="flex items-start gap-3 justify-end group animate-fadeIn">
    <div className="max-w-[75%]">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-sm px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg">
        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      </div>
      <div className="text-right mt-1">
        <span className="text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>
      </div>
    </div>
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
      <User className="w-4 h-4" />
    </div>
  </div>
);

const AssistantBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const [showSources, setShowSources] = useState(false);
  const hasSources = msg.sources && msg.sources.length > 0;

  return (
    <div className="flex items-start gap-3 animate-fadeIn">
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-md ${
          msg.isError
            ? 'bg-red-500/20 border border-red-500/30'
            : 'bg-slate-800 border border-slate-700'
        }`}
      >
        {msg.isError ? (
          <AlertCircle className="w-4 h-4 text-red-400" />
        ) : (
          <Bot className="w-4 h-4 text-emerald-400" />
        )}
      </div>
      <div className="max-w-[80%]">
        <div
          className={`px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border ${
            msg.isError
              ? 'bg-red-500/5 border-red-500/20 text-red-300'
              : 'bg-slate-800/80 border-slate-700/60 text-slate-100'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
        </div>

        {/* Sources */}
        {hasSources && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources((s) => !s)}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              <span>
                {msg.sources!.length} source{msg.sources!.length !== 1 ? 's' : ''}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showSources ? 'rotate-180' : ''}`}
              />
            </button>
            {showSources && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {msg.sources!.map((src, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-200 truncate" title={src.filename}>
                        {src.filename}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {src.page ? `Page ${src.page}` : `Chunk ${src.chunk_index}`}
                      </p>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
                      {Math.round(src.similarity * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-1">
          <span className="text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-3 animate-fadeIn">
    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
      <Bot className="w-4 h-4 text-emerald-400" />
    </div>
    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800/80 border border-slate-700/60">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  </div>
);

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  documents,
  isQuerying,
  onSendMessage,
  onUpdateScope,
}) => {
  const [inputText, setInputText] = useState('');
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [localScope, setLocalScope] = useState<'all' | 'selected'>('all');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync scope from active conversation
  useEffect(() => {
    if (conversation) {
      setLocalScope(conversation.documentScope);
      setLocalSelectedIds(conversation.selectedDocumentIds);
    }
  }, [conversation?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length, isQuerying]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isQuerying) return;
    setInputText('');
    onSendMessage(text, localScope, localSelectedIds);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleDocSelection = (id: string) => {
    setLocalSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id];
      return next;
    });
  };

  const applyDocScope = () => {
    if (conversation) {
      onUpdateScope(localScope, localSelectedIds);
    }
    setShowDocPicker(false);
  };

  const readyDocs = documents.filter((d) => d.status === 'ready');

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-300">No Conversation Selected</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
          Create a new conversation or select an existing one from the sidebar to start asking
          questions about your documents.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white truncate max-w-[200px]" title={conversation.title}>
              {conversation.title}
            </p>
            <p className="text-[10px] text-slate-500">Powered by Gemini + pgvector</p>
          </div>
        </div>

        {/* Scope Button */}
        <div className="relative">
          <button
            onClick={() => setShowDocPicker((s) => !s)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
              localScope === 'selected' && localSelectedIds.length > 0
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Files className="w-3.5 h-3.5" />
            <span>
              {localScope === 'all'
                ? 'All Documents'
                : localSelectedIds.length === 0
                ? 'Select Docs'
                : `${localSelectedIds.length} selected`}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showDocPicker ? 'rotate-180' : ''}`} />
          </button>

          {showDocPicker && (
            <div className="absolute right-0 top-9 z-30 w-72 glass-panel border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-3 border-b border-slate-800">
                <p className="text-xs font-semibold text-slate-300">Document Scope</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose which documents to search for answers.
                </p>
              </div>
              <div className="p-3 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="scope"
                    checked={localScope === 'all'}
                    onChange={() => setLocalScope('all')}
                    className="accent-emerald-500"
                  />
                  <div>
                    <p className="text-xs font-medium text-slate-200">All Documents</p>
                    <p className="text-[11px] text-slate-500">Search across your entire knowledge base</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={localScope === 'selected'}
                    onChange={() => setLocalScope('selected')}
                    className="accent-emerald-500"
                  />
                  <div>
                    <p className="text-xs font-medium text-slate-200">Selected Documents</p>
                    <p className="text-[11px] text-slate-500">Narrow to specific documents only</p>
                  </div>
                </label>
              </div>

              {localScope === 'selected' && (
                <div className="px-3 pb-3 space-y-1 max-h-40 overflow-y-auto">
                  {readyDocs.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">
                      No ready documents available.
                    </p>
                  ) : (
                    readyDocs.map((doc) => {
                      const checked = localSelectedIds.includes(doc.id);
                      return (
                        <button
                          key={doc.id}
                          onClick={() => toggleDocSelection(doc.id)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-800 text-left transition-colors"
                        >
                          {checked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="text-xs text-slate-300 truncate" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              <div className="px-3 py-2.5 border-t border-slate-800 flex justify-end">
                <button
                  onClick={applyDocScope}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {conversation.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">Ask your first question</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              Questions are answered using verified content from your documents — no hallucination.
            </p>
          </div>
        ) : (
          conversation.messages.map((msg) =>
            msg.role === 'user' ? (
              <UserBubble key={msg.id} msg={msg} />
            ) : (
              <AssistantBubble key={msg.id} msg={msg} />
            )
          )
        )}

        {isQuerying && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-800/80">
        <div className="flex items-end gap-2.5">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // auto-grow
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents… (Enter to send, Shift+Enter for newline)"
              disabled={isQuerying}
              className="w-full pl-4 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none disabled:opacity-60 leading-snug max-h-[120px]"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isQuerying || !inputText.trim()}
            className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 shrink-0"
            title="Send message"
          >
            {isQuerying ? (
              <Spinner size="sm" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">
          Answers are grounded in your documents only — never hallucinated.
        </p>
      </div>
    </div>
  );
};
