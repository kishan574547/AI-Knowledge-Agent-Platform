import React, { useState } from 'react';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conversation } from '../types/conversation';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelect,
  onCreate,
  onDelete,
  onClearAll,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleClearAll = () => {
    if (confirm('Clear all conversation history?')) {
      onClearAll();
    }
  };

  return (
    <aside className="flex flex-col h-full select-none">
      {/* Top Action */}
      <button
        onClick={onCreate}
        className="flex items-center justify-center gap-2 w-full h-9 mb-3 rounded-lg border border-border bg-surface hover:bg-surface-2 hover:border-accent/60 text-text-main text-xs font-medium transition-all"
      >
        <Plus className="w-3.5 h-3.5 text-accent" />
        <span>New thread</span>
      </button>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {conversations.length === 0 ? (
          <div className="py-10 text-center px-2">
            <MessageSquare className="w-6 h-6 text-text-secondary/40 mx-auto mb-2" />
            <p className="text-xs text-text-secondary">No conversations yet</p>
            <p className="text-[11px] text-text-secondary/70 mt-0.5">
              Ask a question to start exploring your documents.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <motion.div
                  key={conv.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.15 }}
                  className={`group relative flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'bg-surface-2 text-text-main font-medium border border-border'
                      : 'hover:bg-surface-2/60 text-text-secondary hover:text-text-main'
                  }`}
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Left Active Indicator Bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeConvLeftBar"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-accent rounded-r"
                    />
                  )}

                  <div className="min-w-0 flex-1 pl-1">
                    <p className="text-xs truncate leading-snug">{conv.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-text-secondary">
                      <span>{timeAgo(conv.updatedAt)}</span>
                      {conv.messages.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {hoveredId === conv.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="p-1 rounded text-text-secondary hover:text-danger hover:bg-danger-tint transition-colors shrink-0"
                      title="Delete thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Clear All */}
      {conversations.length > 0 && (
        <div className="pt-2 border-t border-border mt-auto">
          <button
            onClick={handleClearAll}
            className="w-full py-1.5 text-center text-[11px] text-text-secondary hover:text-danger transition-colors"
          >
            Clear history
          </button>
        </div>
      )}
    </aside>
  );
};
