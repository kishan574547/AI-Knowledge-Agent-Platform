import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Files,
  HardDrive,
  Search,
  RotateCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';
import {
  motion,
  AnimatePresence,
  animate,
  type Variants,
} from 'framer-motion';
import { documentService } from '../services/documentService';
import { ragService } from '../services/ragService';
import { DocumentItem } from '../types/document';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ConversationSidebar } from '../components/ConversationSidebar';
import { ConversationHistoryDrawer } from '../components/ConversationHistoryDrawer';
import { ChatPanel } from '../components/ChatPanel';
import { Spinner } from '../components/Spinner';
import { useConversations } from '../hooks/useConversations';
import { useDashboard } from '../context/DashboardContext';
import { formatFileSize } from '../utils/formatters';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

// ─── Animated Rolling Number Counter ────────────────────────────────────────
function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [displayVal, setDisplayVal] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayVal(Math.round(v)),
    });
    prevValue.current = value;
    return controls.stop;
  }, [value]);

  return <span className={className}>{displayVal}</span>;
}

// ─── Left-Aligned Stat Card (Section 5.3 spec) ──────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  animated?: boolean;
  icon: React.ReactNode;
  accent: string;
  accentMuted: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  animated = false,
  icon,
  accent,
  accentMuted,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-border bg-surface p-4 shadow-card flex items-center gap-4 cursor-default transition-all hover:border-border/80"
    >
      {/* 40px rounded chip with accent-muted background */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: accentMuted, color: accent }}
      >
        {icon}
      </div>

      {/* Label above, value beneath, left-aligned together */}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-text-secondary">
          {label}
        </span>
        <div className="text-2xl font-bold font-heading text-text-main mt-0.5 tabular-nums">
          {animated && typeof value === 'number' ? (
            <AnimatedCounter value={value} />
          ) : (
            value
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Dashboard Page ─────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isUploadModalOpen,
    setIsUploadModalOpen,
    setTotalDocCount,
  } = useDashboard();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isQuerying, setIsQuerying] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const {
    conversations,
    activeConversationId,
    activeConversation,
    createConversation,
    deleteConversation,
    selectConversation,
    addUserMessage,
    addAssistantMessage,
    updateDocumentScope,
    clearConversations,
  } = useConversations();

  // Auto-dismiss notifications
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const fetchDocuments = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await documentService.listDocuments();
        const items = res.items || [];
        setDocuments(items);
        setTotalDocCount(res.total || items.length);
      } catch (err: any) {
        setNotification({
          type: 'error',
          message: err.message || 'Failed to fetch documents',
        });
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [setTotalDocCount]
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => {
      const next = [newDoc, ...prev];
      setTotalDocCount(next.length);
      return next;
    });
    setNotification({
      type: 'success',
      message: `"${newDoc.filename}" uploaded and queued for indexing.`,
    });
    setActiveTab('documents');
  };

  const handleDelete = async (docId: string) => {
    await documentService.deleteDocument(docId);
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== docId);
      setTotalDocCount(next.length);
      return next;
    });
    setNotification({ type: 'success', message: 'Document removed from workspace.' });
  };

  const handleStatusChange = useCallback((id: string, updated: DocumentItem) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }, []);

  const handleSendMessage = async (
    text: string,
    scope: 'all' | 'selected',
    selectedIds: string[]
  ) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
    }

    addUserMessage(convId, text);
    setIsQuerying(true);

    try {
      const res = await ragService.query({
        question: text,
        document_ids: scope === 'selected' && selectedIds.length > 0 ? selectedIds : undefined,
        conversation_id: convId,
      });

      addAssistantMessage(
        convId,
        res.answer,
        res.sources?.map((s) => ({
          document_id: s.document_id,
          filename: s.filename,
          chunk_index: s.chunk_index,
          page: s.page,
          similarity: s.similarity,
        }))
      );
    } catch (err: any) {
      addAssistantMessage(convId, err.message || 'Failed to generate an answer.', undefined, true);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleNewConversation = async () => {
    await createConversation();
    setActiveTab('chat');
  };

  const handleAskAbout = async (doc: DocumentItem) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
    }
    updateDocumentScope(convId, 'selected', [doc.id]);
    setActiveTab('chat');
  };

  // Filter and sort documents
  const filteredDocs = documents
    .filter((doc) => {
      const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'all') return true;
      const ext = doc.filename.split('.').pop()?.toLowerCase();
      return ext === filterType;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      }
      if (sortBy === 'name') {
        return a.filename.localeCompare(b.filename);
      }
      if (sortBy === 'size') {
        return (b.file_size || 0) - (a.file_size || 0);
      }
      return 0;
    });

  const totalBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);
  const readyCount = documents.filter((d) => d.status === 'ready').length;
  const processingCount = documents.filter(
    (d) => d.status === 'processing' || d.status === 'uploaded'
  ).length;

  // Container stagger variants
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`flex items-center justify-between p-3 px-4 rounded-lg border text-xs font-medium shadow-card ${
              notification.type === 'success'
                ? 'border-success/30 bg-success-muted text-success'
                : 'border-danger/30 bg-danger-muted text-danger'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 p-0.5 rounded hover:opacity-70 transition-opacity text-current"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Layout */}
      {activeTab === 'chat' ? (
        /* ── Chat View ─────────────────────────────────────────────────── */
        <motion.div
          key="chat-view"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-1 gap-4 min-h-0"
        >
          {/* Collapsible Sidebar */}
          <motion.div
            initial={false}
            animate={{ width: sidebarCollapsed ? 56 : 280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="rounded-xl border border-border bg-surface shadow-card p-3 flex flex-col shrink-0 overflow-hidden"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-3 pt-1">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 rounded-lg hover:bg-surface-2 text-text-secondary hover:text-text-main transition-colors"
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNewConversation}
                  className="p-2 rounded-lg bg-accent-muted text-accent hover:bg-accent/20 transition-colors"
                  aria-label="New conversation"
                  title="New conversation"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                  <span className="font-heading text-xs font-bold text-text-main uppercase tracking-wider">
                    Conversations
                  </span>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-1 rounded-md text-text-secondary hover:text-text-main hover:bg-surface-2 transition-colors"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ConversationSidebar
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelect={(id) => selectConversation(id)}
                    onCreate={handleNewConversation}
                    onDelete={deleteConversation}
                    onClearAll={clearConversations}
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* Chat Workspace */}
          <div className="flex-1 min-w-0 h-full">
            <ChatPanel
              conversation={activeConversation}
              documents={documents.filter((d) => d.status === 'ready')}
              isQuerying={isQuerying}
              onSendMessage={handleSendMessage}
              onOpenHistory={() => setIsHistoryDrawerOpen(true)}
              onNewChat={handleNewConversation}
              onUpdateScope={(s, ids) => {
                if (activeConversationId) updateDocumentScope(activeConversationId, s, ids);
              }}
            />
          </div>
        </motion.div>
      ) : (
        /* ── Documents View ─────────────────────────────────────────────── */
        <motion.div
          key="documents-view"
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col flex-1 gap-5 overflow-y-auto pr-1"
        >
          {/* Section 5.3 Page Header Row */}
          <div className="flex items-center justify-between gap-4 pb-1">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-text-main">Documents</h1>
              <Badge variant="neutral">{documents.length}</Badge>
            </div>
            <div className="flex items-center gap-2.5">
              <IconButton
                icon={<RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />}
                label="Refresh documents"
                variant="ghost"
                onClick={() => fetchDocuments(true)}
                disabled={isRefreshing}
              />
              <Button
                variant="primary"
                size="md"
                leftIcon={<UploadCloud className="w-4 h-4" />}
                onClick={() => setIsUploadModalOpen(true)}
              >
                Upload document
              </Button>
            </div>
          </div>

          {/* Section 5.3 Stat Strip (3 cards in a row, stack on mobile) */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3.5"
          >
            <motion.div variants={itemVariants}>
              <StatCard
                label="Total Documents"
                value={documents.length}
                animated
                accent="var(--accent)"
                accentMuted="var(--accent-muted)"
                icon={<Files className="w-5 h-5" />}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                label="Indexed & Ready"
                value={readyCount}
                animated
                accent="var(--success)"
                accentMuted="var(--success-muted)"
                icon={<Layers className="w-5 h-5" />}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                label="Storage Used"
                value={formatFileSize(totalBytes)}
                accent="var(--warning)"
                accentMuted="var(--warning-muted)"
                icon={<HardDrive className="w-5 h-5" />}
              />
            </motion.div>
          </motion.div>

          {/* Processing Banner */}
          <AnimatePresence>
            {processingCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-warning/30 bg-warning-muted text-warning text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
                  </span>
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {processingCount} document{processingCount > 1 ? 's' : ''} currently indexing for retrieval…
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 5.3 Toolbar: search input (grows), file-type filter dropdown, sort dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by name…"
                aria-label="Search documents by name"
                className="w-full h-9 pl-9 pr-3 bg-surface border border-border rounded-lg text-xs text-text-main placeholder-text-secondary/70 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filter by file type"
                className="h-9 px-3 bg-surface border border-border rounded-lg text-xs font-medium text-text-main focus:outline-none focus:border-accent transition-colors cursor-pointer"
              >
                <option value="all">All types</option>
                <option value="pdf">PDF (.pdf)</option>
                <option value="docx">Word (.docx)</option>
                <option value="txt">Text (.txt)</option>
                <option value="md">Markdown (.md)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort documents"
                className="h-9 px-3 bg-surface border border-border rounded-lg text-xs font-medium text-text-main focus:outline-none focus:border-accent transition-colors cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A–Z)</option>
                <option value="size">Size (Largest)</option>
              </select>
            </div>
          </div>

          {/* Document Grid & States */}
          <div className="flex-1 pb-6">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <Spinner size="lg" />
                <p className="text-xs text-text-secondary mt-3">
                  Loading documents…
                </p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <EmptyState
                icon={<Files className="w-6 h-6" />}
                title={searchQuery || filterType !== 'all' ? 'No matching documents' : 'No documents yet'}
                description={
                  searchQuery || filterType !== 'all'
                    ? 'Try adjusting your search query or file type filter.'
                    : 'Upload PDF, Word, text, or Markdown files to start asking questions.'
                }
                action={
                  !searchQuery && filterType === 'all'
                    ? {
                        label: 'Upload your first document',
                        onClick: () => setIsUploadModalOpen(true),
                        icon: <UploadCloud className="w-4 h-4" />,
                      }
                    : undefined
                }
              />
            ) : (
              <motion.div
                layout
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
              >
                <AnimatePresence>
                  {filteredDocs.map((doc) => (
                    <motion.div
                      key={doc.id}
                      layout
                      variants={itemVariants}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ layout: { duration: 0.2 } }}
                    >
                      <DocumentCard
                        document={doc}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onAskAbout={handleAskAbout}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Global Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* RAG Chat History Drawer */}
      <ConversationHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        conversationType="rag"
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => selectConversation(id)}
        onNewChat={handleNewConversation}
      />
    </div>
  );
};
