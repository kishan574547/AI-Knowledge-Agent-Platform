import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Files,
  HardDrive,
  Search,
  RefreshCw,
  Layers,
  MessageSquare,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { documentService } from '../services/documentService';
import { ragService } from '../services/ragService';
import { DocumentItem } from '../types/document';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ConversationSidebar } from '../components/ConversationSidebar';
import { ChatPanel } from '../components/ChatPanel';
import { Spinner } from '../components/Spinner';
import { Alert } from '../components/Alert';
import { useConversations } from '../hooks/useConversations';
import { formatFileSize } from '../utils/formatters';

type ActiveTab = 'chat' | 'documents';

export const DashboardPage: React.FC = () => {
  // ─── Document State ───────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // ─── RAG / Chat State ─────────────────────────────────────────────────────────
  const [isQuerying, setIsQuerying] = useState(false);
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

  // ─── Layout State ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ─── Document Fetching ────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentService.listDocuments();
      setDocuments(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load documents' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setTotalCount((prev) => prev + 1);
    setAlert({
      type: 'success',
      message: `"${newDoc.filename}" uploaded and queued for processing.`,
    });
    setActiveTab('documents');
  };

  const handleDelete = async (docId: string) => {
    await documentService.deleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setTotalCount((prev) => Math.max(0, prev - 1));
    setAlert({ type: 'success', message: 'Document deleted.' });
  };

  const handleStatusChange = useCallback((id: string, updated: DocumentItem) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }, []);

  // ─── Chat Handler ─────────────────────────────────────────────────────────────
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

  // ─── Derived Values ────────────────────────────────────────────────────────────
  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);
  const readyCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <div className="flex flex-col h-full gap-0 animate-fadeIn">
      {/* Alert Banner */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Files className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-white leading-none">{totalCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Documents</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-white leading-none">{formatFileSize(totalBytes)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Storage</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-white leading-none">{readyCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">RAG Ready</div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-white leading-none">{conversations.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Conversations</div>
          </div>
        </div>
      </div>

      {/* Main Panel: Sidebar + Content */}
      <div className="flex flex-1 gap-4 min-h-0" style={{ height: 'calc(100vh - 260px)' }}>
        {/* Conversation Sidebar */}
        <div
          className={`glass-panel border border-slate-800 rounded-2xl transition-all duration-300 overflow-hidden flex flex-col ${
            sidebarCollapsed ? 'w-12' : 'w-64'
          } shrink-0`}
        >
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center pt-4 gap-3">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleNewConversation}
                className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="New conversation"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full p-3">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  History
                </span>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1 text-slate-500 hover:text-white rounded-lg transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ConversationSidebar
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onSelect={(id) => {
                    selectConversation(id);
                    setActiveTab('chat');
                  }}
                  onCreate={handleNewConversation}
                  onDelete={deleteConversation}
                  onClearAll={clearConversations}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0 flex flex-col glass-panel border border-slate-800 rounded-2xl overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-800/80 shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'chat'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'documents'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Documents
              {totalCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                  {totalCount}
                </span>
              )}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {activeTab === 'documents' && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5" />
                Upload
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'chat' ? (
              <ChatPanel
                conversation={activeConversation}
                documents={documents}
                isQuerying={isQuerying}
                onSendMessage={handleSendMessage}
                onUpdateScope={(scope, selectedIds) => {
                  if (activeConversationId) {
                    updateDocumentScope(activeConversationId, scope, selectedIds);
                  }
                }}
              />
            ) : (
              /* Documents Tab */
              <div className="h-full overflow-y-auto p-4">
                {/* Search + refresh bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search documents…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={fetchDocuments}
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Document Grid */}
                {loading ? (
                  <div className="py-16 flex flex-col items-center gap-3">
                    <Spinner size="lg" />
                    <p className="text-xs text-slate-500">Loading documents…</p>
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto mb-3">
                      <Files className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      {searchQuery ? 'No results found' : 'No documents yet'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      {searchQuery
                        ? `No document matches "${searchQuery}".`
                        : 'Upload PDF, TXT, DOCX, or Markdown files to start building your knowledge base.'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Upload Document
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredDocs.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};
