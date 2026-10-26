import React, { useState } from 'react';
import { Plus, Trash2, MessageSquare, MoreVertical, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conversation } from '../types/conversation';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Dropdown } from './ui/Dropdown';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onRename?: (id: string, newTitle: string) => void;
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
  onRename,
}) => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);

  const confirmDeleteConv = conversations.find((c) => c.id === deleteTargetId);

  const handleConfirmClearAll = () => {
    onClearAll();
    setIsClearModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      onDelete(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleConfirmRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameTarget && onRename && renameTarget.title.trim()) {
      onRename(renameTarget.id, renameTarget.title.trim());
      setRenameTarget(null);
    }
  };

  return (
    <aside className="flex flex-col h-full select-none">
      {/* Primary New Chat Button (Rule 5.5) */}
      <Button
        variant="primary"
        size="md"
        fullWidth
        onClick={onCreate}
        leftIcon={<Plus className="w-3.5 h-3.5" />}
        className="mb-3"
      >
        New chat
      </Button>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {conversations.length === 0 ? (
          <div className="py-8 text-center px-2">
            <MessageSquare className="w-6 h-6 text-text-secondary/40 mx-auto mb-2" />
            <p className="text-xs text-text-secondary">No conversations yet</p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Ask a question to start exploring your documents.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  className={`group relative flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer transition-all ${
                    isActive
                      ? 'bg-accent-muted text-text-main font-medium border border-border'
                      : 'hover:bg-surface-2 text-text-secondary hover:text-text-main'
                  }`}
                  onClick={() => onSelect(conv.id)}
                >
                  {/* Left Active Indicator Bar (Rule 5.5) */}
                  {isActive && (
                    <motion.div
                      layoutId="activeConvLeftBar"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-accent rounded-r"
                    />
                  )}

                  <div className="min-w-0 flex-1 pl-1">
                    <p className="text-xs truncate leading-snug">{conv.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-sans text-text-secondary">
                      <span>{timeAgo(conv.updatedAt)}</span>
                      {conv.messages.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Three-dot menu on hover (Rule 5.5) */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Dropdown
                      trigger={
                        <button
                          className="p-1 rounded text-text-secondary hover:text-text-main hover:bg-surface-2"
                          title="Thread options"
                          aria-label="Thread options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      }
                      items={[
                        ...(onRename
                          ? [
                              {
                                id: 'rename',
                                label: 'Rename',
                                icon: <Edit2 className="w-3.5 h-3.5" />,
                                onClick: () => setRenameTarget({ id: conv.id, title: conv.title }),
                              },
                            ]
                          : []),
                        {
                          id: 'delete',
                          label: 'Delete',
                          icon: <Trash2 className="w-3.5 h-3.5 text-danger" />,
                          danger: true,
                          onClick: () => setDeleteTargetId(conv.id),
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer: Clear All History as Small Red Ghost Text Button (Rule 5.5) */}
      {conversations.length > 0 && (
        <div className="pt-2 border-t border-border mt-auto">
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="w-full py-1 text-center text-[11px] text-danger/80 hover:text-danger hover:bg-danger/10 rounded transition-colors"
          >
            Clear all history
          </button>
        </div>
      )}

      {/* Confirmation Modal for Clear All (Rule 4.5) */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear conversation history?"
        subtitle="This will permanently delete all chat threads and their messages."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmClearAll}>
              Clear all history
            </Button>
          </>
        }
      >
        <p className="text-xs text-text-secondary">
          Are you sure you want to remove all conversations? This action cannot be undone.
        </p>
      </Modal>

      {/* Confirmation Modal for Delete Single Thread (Rule 4.5) */}
      <Modal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        title={`Delete "${confirmDeleteConv?.title || 'conversation'}"?`}
        subtitle="This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
              Delete thread
            </Button>
          </>
        }
      >
        <p className="text-xs text-text-secondary">
          All messages and citations in this conversation will be permanently removed.
        </p>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Rename conversation"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmRename}
              disabled={!renameTarget?.title.trim()}
            >
              Save title
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmRename}>
          <input
            type="text"
            value={renameTarget?.title || ''}
            onChange={(e) =>
              setRenameTarget((prev) => (prev ? { ...prev, title: e.target.value } : null))
            }
            className="w-full h-10 px-3 bg-surface border border-border focus:border-accent rounded-md text-xs sm:text-sm text-text-main"
            autoFocus
          />
        </form>
      </Modal>
    </aside>
  );
};
