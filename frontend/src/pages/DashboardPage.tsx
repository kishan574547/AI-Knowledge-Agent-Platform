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
  useSpring,
  useMotionValue,
  useTransform,
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

// ─── Radial Progress Ring with Neon Glow Trail ──────────────────────────────
function RadialProgress({
  value,
  max,
  color,
  size = 48,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max === 0 ? 0 : Math.min(value / max, 1);
  const strokeDash = useSpring(0, { stiffness: 80, damping: 20 });

  useEffect(() => {
    strokeDash.set(pct * circumference);
  }, [pct, circumference, strokeDash]);

  const dashOffset = useTransform(strokeDash, (v) => circumference - v);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        className="text-border/40"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset: dashOffset, filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

// ─── Bento Stat Card ─────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  animated?: boolean;
  icon: React.ReactNode;
  accent: string;
  accentMuted: string;
  progress?: { value: number; max: number; color: string };
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  animated = false,
  icon,
  accent,
  accentMuted,
  progress,
  delay = 0,
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const spotlightX = useTransform(mouseX, (v) => `${v}px`);
  const spotlightY = useTransform(mouseY, (v) => `${v}px`);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as any }}
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
      onMouseMove={handleMouseMove}
      className="relative rounded-2xl border border-border bg-surface p-5 shadow-level1 flex items-center justify-between overflow-hidden group cursor-default"
      style={{
        borderTopWidth: 2,
        borderTopColor: accent,
      }}
    >
      {/* Radial cursor spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(140px circle at ${spotlightX} ${spotlightY}, ${accentMuted}, transparent 80%)`,
        }}
      />

      <div className="relative z-10">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          {label}
        </span>
        <div className="text-2xl font-extrabold font-mono text-text-main mt-1 tabular-nums">
          {animated && typeof value === 'number' ? (
            <AnimatedCounter value={value} />
          ) : (
            value
          )}
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-2">
        {progress && (
          <RadialProgress
            value={progress.value}
            max={progress.max}
            color={progress.color}
          />
        )}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
          style={{ backgroundColor: accentMuted, color: accent }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Pulse Beacon (Processing indicator) ────────────────────────────────────
const PulseBeacon: React.FC<{ color: string }> = ({ color }) => (
  <span className="relative inline-flex h-2 w-2 mr-2">
    <span
      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
      style={{ backgroundColor: color }}
    />
    <span
      className="relative inline-flex rounded-full h-2 w-2"
      style={{ backgroundColor: color }}
    />
  </span>
);

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
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
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
        setRefreshRotation((r) => r + 360);
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

  // Derived values
  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);
  const readyCount = documents.filter((d) => d.status === 'ready').length;
  const processingCount = documents.filter(
    (d) => d.status === 'processing' || d.status === 'uploaded'
  ).length;

  // Container stagger variants
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex items-center justify-between p-3 px-4 rounded-xl border text-xs font-semibold shadow-level2 ${
              notification.type === 'success'
                ? 'border-success/30 bg-success-muted text-success'
                : 'border-danger/30 bg-danger-muted text-danger'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </motion.div>
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 p-0.5 rounded hover:opacity-70 transition-opacity"
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
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="flex flex-1 gap-4 min-h-0"
        >
          {/* Collapsible Sidebar */}
          <motion.div
            initial={false}
            animate={{ width: sidebarCollapsed ? 52 : 272 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="rounded-2xl border border-border bg-surface shadow-level1 p-3 flex flex-col shrink-0 overflow-hidden"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-3 pt-1">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-main transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleNewConversation}
                  className="p-2 rounded-lg bg-accent-muted text-accent hover:bg-accent/20 transition-colors"
                  title="New conversation"
                >
                  <MessageSquare className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                  <span className="font-heading text-xs font-bold text-text-main uppercase tracking-wider">
                    Threads
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-1 rounded-md text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </motion.button>
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
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="flex flex-col flex-1 gap-4 overflow-y-auto pr-1"
        >
          {/* Bento Stat Cards — staggered */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <motion.div variants={itemVariants}>
              <StatCard
                label="Total Documents"
                value={documents.length}
                animated
                accent="var(--accent)"
                accentMuted="var(--accent-muted)"
                icon={<Files className="w-4 h-4" />}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                label="Indexed & Ready"
                value={readyCount}
                animated
                accent="var(--success)"
                accentMuted="var(--success-muted)"
                icon={<Layers className="w-4 h-4" />}
                progress={{
                  value: readyCount,
                  max: Math.max(documents.length, 1),
                  color: 'var(--success)',
                }}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <StatCard
                label="Storage Used"
                value={formatFileSize(totalBytes)}
                accent="var(--warning)"
                accentMuted="var(--warning-muted)"
                icon={<HardDrive className="w-4 h-4" />}
              />
            </motion.div>
          </motion.div>

          {/* Processing banner */}
          <AnimatePresence>
            {processingCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-warning/30 bg-warning-muted text-warning text-xs font-semibold">
                  <PulseBeacon color="var(--warning)" />
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    {processingCount} document{processingCount > 1 ? 's' : ''} being chunked &
                    vectorized…
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search + Controls */}
          <div className="flex items-center gap-3">
            <motion.div
              className="relative flex-1"
              animate={{ scale: searchFocused ? 1.008 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search documents by name…"
                className="w-full h-10 pl-10 pr-20 bg-surface border border-border rounded-xl text-xs text-text-main placeholder-text-muted/70 focus:border-accent transition-all shadow-level1 font-sans"
              />
              <AnimatePresence>
                {searchFocused && (
                  <motion.span
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-text-muted px-1.5 py-0.5 rounded border border-border bg-surface-2"
                  >
                    ⌘K
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-primary !h-10 !px-4 !rounded-xl shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload</span>
            </motion.button>

            {/* Spring-animated rotate refresh button */}
            <motion.button
              onClick={() => fetchDocuments(true)}
              disabled={isRefreshing}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              animate={{ rotate: refreshRotation }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="h-10 w-10 rounded-xl border border-border bg-surface hover:bg-surface-2 text-text-muted hover:text-accent flex items-center justify-center transition-colors shadow-level1 shrink-0"
              title="Refresh list"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'text-accent' : ''}`} />
            </motion.button>
          </div>

          {/* Document Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <Spinner size="lg" />
                <p className="text-xs text-text-muted mt-3 animate-pulse">
                  Loading workspace documents…
                </p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="py-16 text-center rounded-2xl border border-dashed border-border bg-surface/50 p-8"
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-12 h-12 rounded-2xl bg-accent-muted border border-accent/20 flex items-center justify-center text-accent mx-auto mb-3"
                >
                  <Files className="w-6 h-6" />
                </motion.div>
                <h3 className="font-heading text-sm font-bold text-text-main">
                  {searchQuery ? 'No matching documents' : 'No documents uploaded yet'}
                </h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try a different search term.'
                    : 'Upload PDF, DOCX, TXT, or Markdown files to start asking questions.'}
                </p>
                {!searchQuery && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setIsUploadModalOpen(true)}
                    className="btn-primary mt-5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload your first document</span>
                  </motion.button>
                )}
              </motion.div>
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
                      exit={{ opacity: 0, scale: 0.94, y: 6 }}
                      transition={{
                        layout: { type: 'spring', stiffness: 300, damping: 28 },
                      }}
                    >
                      <DocumentCard
                        document={doc}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
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
