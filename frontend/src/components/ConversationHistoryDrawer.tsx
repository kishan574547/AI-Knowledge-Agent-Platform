import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  Search,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  conversationService,
  ConversationItem,
} from '../services/conversationService';

interface ConversationHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationType: 'rag' | 'mcp' | 'multi_agent';
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
}

export const ConversationHistoryDrawer: React.FC<ConversationHistoryDrawerProps> = ({
  isOpen,
  onClose,
  conversationType,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, conversationType]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await conversationService.listConversations(conversationType, 0, 50);
      setConversations(res.items || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRename = (e: React.MouseEvent, conv: ConversationItem) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await conversationService.renameConversation(id, editTitle.trim());
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c))
      );
      setEditingId(null);
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setDeletingId(id);
      await conversationService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        onNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const lastWeek = today - 7 * 86400000;

    const groups: { [key: string]: ConversationItem[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filtered.forEach((conv) => {
      const convDate = new Date(conv.updated_at || conv.created_at).getTime();
      if (convDate >= today) {
        groups['Today'].push(conv);
      } else if (convDate >= yesterday) {
        groups['Yesterday'].push(conv);
      } else if (convDate >= lastWeek) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });

    return groups;
  }, [conversations, searchQuery]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Drawer / Panel */}
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            className="fixed top-0 right-0 h-full w-80 md:w-96 bg-surface border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <History className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                    {conversationType === 'mcp' ? 'MCP Chat History' : 'RAG Q&A History'}
                  </h3>
                  <p className="text-[10px] text-text-muted">
                    {conversations.length} persistent {conversations.length === 1 ? 'chat' : 'chats'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    onNewChat();
                    onClose();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-accent hover:opacity-90 transition-all shadow-sm"
                  title="Start New Chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Chat</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
                  title="Close History"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-border bg-surface-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-main placeholder:text-text-muted transition-all"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {loading && conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  <span className="text-xs">Loading conversations...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-text-muted gap-2">
                  <MessageSquare className="w-8 h-8 opacity-40 text-accent" />
                  <p className="text-xs font-semibold text-text-main">No conversation history yet</p>
                  <p className="text-[11px] max-w-[200px]">
                    Your chats and tool executions will be saved here automatically.
                  </p>
                </div>
              ) : (
                Object.entries(groupedConversations).map(([groupTitle, items]) => {
                  if (items.length === 0) return null;

                  return (
                    <div key={groupTitle} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        <Clock className="w-3 h-3 text-accent" />
                        <span>{groupTitle}</span>
                      </div>

                      <div className="space-y-1">
                        {items.map((conv) => {
                          const isActive = activeConversationId === conv.id;
                          const isEditing = editingId === conv.id;
                          const isDeleting = deletingId === conv.id;

                          return (
                            <div
                              key={conv.id}
                              onClick={() => {
                                if (!isEditing) {
                                  onSelectConversation(conv.id);
                                  onClose();
                                }
                              }}
                              className={`group relative flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                isActive
                                  ? 'bg-accent-muted border-accent text-text-main shadow-sm'
                                  : 'bg-surface hover:bg-surface-2 border-border text-text-muted hover:text-text-main'
                              } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <MessageSquare
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isActive ? 'text-accent' : 'text-text-muted'
                                  }`}
                                />

                                {isEditing ? (
                                  <div
                                    className="flex items-center gap-1 flex-1 min-w-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveRename(e as any, conv.id);
                                        if (e.key === 'Escape') handleCancelRename(e as any);
                                      }}
                                      autoFocus
                                      className="w-full text-xs px-2 py-0.5 rounded bg-surface border border-accent text-text-main outline-none"
                                    />
                                    <button
                                      onClick={(e) => handleSaveRename(e, conv.id)}
                                      className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                                      title="Save"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={handleCancelRename}
                                      className="p-1 text-text-muted hover:bg-surface-2 rounded"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold truncate leading-tight">
                                      {conv.title}
                                    </p>
                                    <p className="text-[10px] text-text-muted mt-0.5">
                                      {new Date(conv.updated_at || conv.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {!isEditing && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => handleStartRename(e, conv)}
                                    className="p-1 rounded text-text-muted hover:text-text-main hover:bg-surface-2"
                                    title="Rename"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(e, conv.id)}
                                    className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
