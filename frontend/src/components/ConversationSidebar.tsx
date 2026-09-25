import React, { useState } from 'react';
import { MessageSquarePlus, Trash2, MessageSquare, ChevronRight, Clock, Eraser } from 'lucide-react';
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

  return (
    <aside className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Conversations
        </h2>
        {conversations.length > 0 && (
          <button
            onClick={onClearAll}
            title="Clear all conversations"
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* New Conversation Button */}
      <button
        onClick={onCreate}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 mb-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold transition-all hover:scale-[1.01] group"
      >
        <MessageSquarePlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
        New Conversation
      </button>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
        {conversations.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No conversations yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">Start one to ask questions.</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                    : 'hover:bg-slate-800/60 border border-transparent text-slate-300 hover:text-white'
                }`}
                onClick={() => onSelect(conv.id)}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <MessageSquare
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug truncate">{conv.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{timeAgo(conv.updatedAt)}</span>
                    {conv.messages.length > 0 && (
                      <span className="text-[10px] text-slate-600">
                        · {conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                {!isActive && hoveredId === conv.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
