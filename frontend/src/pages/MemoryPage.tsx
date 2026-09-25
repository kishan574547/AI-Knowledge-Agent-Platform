import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Brain,
  Plus,
  Search,
  Trash2,
  Edit3,
  Sparkles,
  Target,
  Wrench,
  FolderGit2,
  User,
  FileCode2,
  Lightbulb,
  AlertCircle,
  RefreshCw,
  X,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { memoryService } from '../services/memoryService';
import { MemoryItem, MemoryType, MemoryStats } from '../types/memory';

// ─── Type config ──────────────────────────────────────────────────────────────
const MEMORY_TYPE_CONFIG: Record<
  MemoryType,
  { label: string; icon: React.FC<{ className?: string }>; colorClass: string; badgeBg: string }
> = {
  preference: {
    label: 'Preference',
    icon: Brain,
    colorClass: 'text-violet-500',
    badgeBg: 'bg-violet-500/10 text-violet-600 border-violet-400/30',
  },
  goal: {
    label: 'Goal',
    icon: Target,
    colorClass: 'text-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-400/30',
  },
  skill: {
    label: 'Skill',
    icon: Wrench,
    colorClass: 'text-emerald-600',
    badgeBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-400/30',
  },
  project: {
    label: 'Project',
    icon: FolderGit2,
    colorClass: 'text-blue-600',
    badgeBg: 'bg-blue-500/10 text-blue-700 border-blue-400/30',
  },
  personal_context: {
    label: 'Personal Context',
    icon: User,
    colorClass: 'text-rose-500',
    badgeBg: 'bg-rose-500/10 text-rose-600 border-rose-400/30',
  },
  instruction: {
    label: 'Instruction',
    icon: FileCode2,
    colorClass: 'text-cyan-600',
    badgeBg: 'bg-cyan-500/10 text-cyan-700 border-cyan-400/30',
  },
  fact: {
    label: 'Fact',
    icon: Lightbulb,
    colorClass: 'text-yellow-600',
    badgeBg: 'bg-yellow-400/10 text-yellow-700 border-yellow-400/30',
  },
};

// ─── Importance bar ────────────────────────────────────────────────────────────
const ImportanceBar: React.FC<{ value: number }> = ({ value }) => {
  const pct = ((value - 0.5) / (2.0 - 0.5)) * 100;
  const color =
    pct > 66 ? 'var(--success)' : pct > 33 ? 'var(--warning)' : 'var(--accent)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono font-semibold text-text-muted w-6 text-right">
        {value.toFixed(1)}
      </span>
    </div>
  );
};

// ─── Memory Card ──────────────────────────────────────────────────────────────
interface MemoryCardProps {
  mem: MemoryItem;
  onEdit: (m: MemoryItem) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  formatDate: (s: string) => string;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ mem, onEdit, onDelete, isDeleting, formatDate }) => {
  const config = MEMORY_TYPE_CONFIG[mem.memory_type] || MEMORY_TYPE_CONFIG.fact;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300, damping: 24 } }}
      className="group relative p-4 rounded-2xl bg-surface border border-border hover:border-accent/40 flex flex-col justify-between shadow-level1 hover:shadow-level2 transition-shadow"
    >
      <div>
        {/* Card Top */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${config.badgeBg}`}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </span>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(mem)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
              title="Edit Memory"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              disabled={isDeleting}
              onClick={() => onDelete(mem.id)}
              className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-muted transition-colors"
              title="Delete Memory"
            >
              {isDeleting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <p className="text-xs text-text-main leading-relaxed">{mem.content}</p>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
        <ImportanceBar value={mem.importance || 1.0} />
        <span className="text-[10px] font-mono text-text-muted">{formatDate(mem.created_at)}</span>
      </div>
    </motion.div>
  );
};

// ─── Modal (Portal) ───────────────────────────────────────────────────────────
interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  editingMemory: MemoryItem | null;
  content: string;
  setContent: (v: string) => void;
  type: MemoryType;
  setType: (v: MemoryType) => void;
  importance: number;
  setImportance: (v: number) => void;
  isSubmitting: boolean;
  formError: string | null;
}

const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMemory,
  content,
  setContent,
  type,
  setType,
  importance,
  setImportance,
  isSubmitting,
  formError,
}) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-lg rounded-2xl border border-border overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}
                >
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    className="text-sm font-heading font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {editingMemory ? 'Edit Memory' : 'Add New Memory'}
                  </h3>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    This will persist across all conversations
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={onSave} className="p-5 space-y-5">
              {/* Error banner */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="p-3 rounded-xl flex items-center gap-2 text-xs font-medium border"
                      style={{
                        backgroundColor: 'var(--danger-muted)',
                        color: 'var(--danger)',
                        borderColor: 'rgba(var(--danger), 0.3)',
                      }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {formError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Memory Content */}
              <div>
                <label
                  className="block text-xs font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Memory Content
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  autoFocus
                  placeholder="e.g., I prefer Python with PyTorch for deep learning projects."
                  className="w-full p-3 rounded-xl text-xs leading-relaxed resize-none transition-all focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--accent)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)';
                  }}
                />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Keep it concise and factual. Never include passwords or secret API keys.
                </p>
              </div>

              {/* Category + Importance */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label
                    className="block text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Category
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as MemoryType)}
                    className="w-full p-2.5 rounded-xl text-xs transition-all focus:outline-none appearance-none"
                    style={{
                      backgroundColor: 'var(--bg-surface-2)',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--accent)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border)';
                    }}
                  >
                    {(Object.keys(MEMORY_TYPE_CONFIG) as MemoryType[]).map((t) => (
                      <option key={t} value={t}>
                        {MEMORY_TYPE_CONFIG[t].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Importance */}
                <div>
                  <label
                    className="block text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Importance:{' '}
                    <span style={{ color: 'var(--accent)' }} className="font-mono">
                      {importance.toFixed(1)}
                    </span>
                  </label>
                  <div className="pt-2">
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={importance}
                      onChange={(e) => setImportance(parseFloat(e.target.value))}
                      className="w-full cursor-pointer"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <div
                      className="flex justify-between text-[9px] font-mono mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div
                className="flex items-center justify-end gap-2.5 pt-4 border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  whileHover={{ scale: isSubmitting ? 1 : 1.03 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
                  className="btn-primary flex items-center gap-2 text-xs !px-5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{editingMemory ? 'Update Memory' : 'Save Memory'}</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const MemoryPage: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats>({ total: 0, by_type: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MemoryType | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [modalContent, setModalContent] = useState('');
  const [modalType, setModalType] = useState<MemoryType>('preference');
  const [modalImportance, setModalImportance] = useState<number>(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        memoryService.listMemories({
          memory_type: selectedType === 'all' ? undefined : selectedType,
          search: searchQuery.trim() || undefined,
        }),
        memoryService.getStats(),
      ]);
      setMemories(listRes.items || []);
      setStats(statsRes || { total: 0, by_type: {} });
    } catch (err: any) {
      setError(err.message || 'Failed to load memories.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, searchQuery]);

  useEffect(() => {
    const t = setTimeout(fetchMemories, 200);
    return () => clearTimeout(t);
  }, [fetchMemories]);

  const handleOpenAddModal = () => {
    setEditingMemory(null);
    setModalContent('');
    setModalType('preference');
    setModalImportance(1.0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mem: MemoryItem) => {
    setEditingMemory(mem);
    setModalContent(mem.content);
    setModalType(mem.memory_type);
    setModalImportance(mem.importance || 1.0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalContent.trim()) {
      setFormError('Memory content cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingMemory) {
        await memoryService.updateMemory(editingMemory.id, {
          content: modalContent.trim(),
          memory_type: modalType,
          importance: modalImportance,
        });
      } else {
        await memoryService.createMemory({
          content: modalContent.trim(),
          memory_type: modalType,
          importance: modalImportance,
        });
      }
      setIsModalOpen(false);
      await fetchMemories();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save memory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!window.confirm('Permanently delete this memory?')) return;
    setDeletingId(id);
    try {
      await memoryService.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setStats((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err: any) {
      alert(err.message || 'Failed to delete memory.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto pr-1 pb-8">
      {/* Page Header */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }}
          >
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1
                className="text-base font-heading font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Long-Term Memory
              </h1>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                style={{
                  backgroundColor: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  borderColor: 'var(--accent)',
                }}
              >
                {stats.total} {stats.total === 1 ? 'memory' : 'memories'}
              </span>
            </div>
            <p
              className="text-[11px] mt-0.5 max-w-xl"
              style={{ color: 'var(--text-secondary)' }}
            >
              The AI remembers facts, goals, and preferences across all your conversations to personalize answers.
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleOpenAddModal}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Memory</span>
        </motion.button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setSelectedType('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
              selectedType === 'all'
                ? 'border-transparent text-white'
                : 'border-border text-text-muted hover:text-text-main bg-surface'
            }`}
            style={
              selectedType === 'all'
                ? { backgroundColor: 'var(--accent)' }
                : {}
            }
          >
            <Layers className="w-3.5 h-3.5" />
            All
            <span className="font-mono opacity-70">({stats.total})</span>
          </button>

          {(Object.keys(MEMORY_TYPE_CONFIG) as MemoryType[]).map((t) => {
            const c = MEMORY_TYPE_CONFIG[t];
            const Icon = c.icon;
            const count = stats.by_type[t] || 0;
            const isActive = selectedType === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'border-transparent text-white'
                    : 'border-border text-text-muted hover:text-text-main bg-surface'
                }`}
                style={isActive ? { backgroundColor: 'var(--accent)' } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {c.label}
                {count > 0 && (
                  <span className="font-mono opacity-75">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories…"
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs transition-all focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1.5px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="p-4 rounded-xl flex items-center justify-between text-xs font-medium border"
              style={{
                backgroundColor: 'var(--danger-muted)',
                color: 'var(--danger)',
                borderColor: 'var(--danger)',
              }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
              <button
                onClick={fetchMemories}
                className="flex items-center gap-1 font-bold underline hover:opacity-80"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border animate-pulse flex flex-col justify-between h-44"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="skeleton-line w-24 mb-3" />
                <div className="skeleton-line w-full mb-2" />
                <div className="skeleton-line w-3/4" />
              </div>
              <div className="skeleton-line w-1/3 mt-4" />
            </div>
          ))}
        </div>
      ) : memories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed text-center gap-4"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: 'var(--accent-muted)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
            }}
          >
            <Sparkles className="w-7 h-7" />
          </motion.div>
          <div>
            <h3
              className="text-sm font-heading font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {searchQuery || selectedType !== 'all'
                ? 'No memories match your filter'
                : 'No memories yet'}
            </h3>
            <p
              className="text-xs mt-1 max-w-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {searchQuery || selectedType !== 'all'
                ? 'Try adjusting your search or category filter.'
                : 'Add memories manually or let the AI extract them from your conversations.'}
            </p>
          </div>
          {!searchQuery && selectedType === 'all' && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenAddModal}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Memory
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {memories.map((mem) => (
              <MemoryCard
                key={mem.id}
                mem={mem}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteMemory}
                isDeleting={deletingId === mem.id}
                formatDate={formatDate}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal via Portal */}
      <MemoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMemory}
        editingMemory={editingMemory}
        content={modalContent}
        setContent={setModalContent}
        type={modalType}
        setType={setModalType}
        importance={modalImportance}
        setImportance={setModalImportance}
        isSubmitting={isSubmitting}
        formError={formError}
      />
    </div>
  );
};
