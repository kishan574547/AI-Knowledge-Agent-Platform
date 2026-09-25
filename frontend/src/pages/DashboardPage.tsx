import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { documentService } from '../services/documentService';
import { ragService } from '../services/ragService';
import { DocumentItem } from '../types/document';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ConversationSidebar } from '../components/ConversationSidebar';
import { ChatPanel } from '../components/ChatPanel';
import { Spinner } from '../components/Spinner';
import { useConversations } from '../hooks/useConversations';
import { useDashboard } from '../context/DashboardContext';
import { formatFileSize } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isUploadModalOpen,
    setIsUploadModalOpen,
    setTotalDocCount,
  } = useDashboard();

  // Document State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // RAG / Chat State
  const [isQuerying, setIsQuerying] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Fetch Documents
  const fetchDocuments = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await documentService.listDocuments();
      const items = res.items || [];
      setDocuments(items);
      setTotalDocCount(res.total || items.length);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fetch documents' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [setTotalDocCount]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Upload handler
  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => {
      const next = [newDoc, ...prev];
      setTotalDocCount(next.length);
      return next;
    });
    setNotification({
      type: 'success',
      message: `"${newDoc.filename}" uploaded successfully.`,
    });
    setActiveTab('documents');
  };

  // Delete handler
  const handleDelete = async (docId: string) => {
    await documentService.deleteDocument(docId);
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== docId);
      setTotalDocCount(next.length);
      return next;
    });
    setNotification({ type: 'success', message: 'Document deleted from workspace.' });
  };

  const handleStatusChange = useCallback((id: string, updated: DocumentItem) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }, []);

  // Chat Query Handler
  const handleSendMessage = async (
    text: string,
    scope: 'all' | 'selected',
    selectedIds: string[]
  ) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation();
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
      addAssistantMessage(
        convId,
        err.message || 'Failed to generate an answer. Please try again.',
        undefined,
        true
      );
    } finally {
      setIsQuerying(false);
    }
  };

  const handleNewConversation = () => {
    createConversation();
    setActiveTab('chat');
  };

  // Derived Values
  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);
  const readyCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium ${
              notification.type === 'success'
                ? 'border-success/30 bg-success-tint text-success'
                : 'border-danger/30 bg-danger-tint text-danger'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-[11px] underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Layout */}
      {activeTab === 'chat' ? (
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Collapsible Left History Drawer */}
          <motion.div
            initial={false}
            animate={{ width: sidebarCollapsed ? 56 : 280 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-2xl border border-border bg-surface shadow-level1 p-3 flex flex-col shrink-0 overflow-hidden"
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-3 pt-1">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 rounded-lg hover:bg-surface-2 text-text-secondary hover:text-text-main transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNewConversation}
                  className="p-2 rounded-lg bg-accent-tint text-accent hover:bg-accent/20 transition-colors"
                  title="New conversation"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                  <span className="text-xs font-semibold text-text-main">Threads</span>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-1 rounded-md text-text-secondary hover:text-text-main hover:bg-surface-2 transition-colors"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
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
              onUpdateScope={(s, ids) => {
                if (activeConversationId) {
                  updateDocumentScope(activeConversationId, s, ids);
                }
              }}
            />
          </div>
        </div>
      ) : (
        /* Documents Management View */
        <div className="flex flex-col flex-1 gap-4 overflow-y-auto pr-1">
          {/* 3 Metric Stat Cards with Status Top Borders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Documents */}
            <div className="rounded-xl border border-border border-t-2 border-t-accent bg-surface p-4 shadow-level1 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-text-secondary">Total Documents</span>
                <div className="text-2xl font-bold font-mono text-text-main mt-0.5">
                  {documents.length}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-accent-tint text-accent flex items-center justify-center">
                <Files className="w-4 h-4" />
              </div>
            </div>

            {/* Ready for RAG */}
            <div className="rounded-xl border border-border border-t-2 border-t-success bg-surface p-4 shadow-level1 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-text-secondary">Ready for RAG</span>
                <div className="text-2xl font-bold font-mono text-success mt-0.5">
                  {readyCount}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-success-tint text-success flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            {/* Storage Used */}
            <div className="rounded-xl border border-border border-t-2 border-t-warning bg-surface p-4 shadow-level1 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-text-secondary">Storage Used</span>
                <div className="text-2xl font-bold font-mono text-text-main mt-0.5">
                  {formatFileSize(totalBytes)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-warning-tint text-warning flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Search + Action Control Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by name..."
                className="w-full h-10 pl-10 pr-4 bg-surface border border-border rounded-xl text-xs text-text-main placeholder-text-secondary/60 focus:border-accent transition-all shadow-level1"
              />
            </div>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-accent text-white text-xs font-medium flex items-center gap-2 hover:bg-accent-hover transition-colors shadow-sm shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>

            <button
              onClick={() => fetchDocuments(true)}
              disabled={isRefreshing}
              className="h-10 w-10 rounded-xl border border-border bg-surface hover:bg-surface-2 text-text-secondary hover:text-text-main flex items-center justify-center transition-colors shadow-level1 shrink-0"
              title="Refresh list"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
            </button>
          </div>

          {/* 3-Column Document Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <Spinner size="lg" />
                <p className="text-xs text-text-secondary mt-3">Loading workspace documents...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-surface/50 p-8">
                <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-secondary mx-auto mb-3">
                  <Files className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-text-main">
                  {searchQuery ? 'No matching documents found' : 'No documents uploaded yet'}
                </h3>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try searching with a different keyword.'
                    : 'Upload PDF, DOCX, TXT, or Markdown documents to start chatting.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="mt-4 px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium inline-flex items-center gap-2 hover:bg-accent-hover transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload your first document</span>
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
              >
                <AnimatePresence>
                  {filteredDocs.map((doc) => (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
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
        </div>
      )}

      {/* Global Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};
