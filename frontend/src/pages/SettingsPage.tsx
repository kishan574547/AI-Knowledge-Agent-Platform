import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { Settings, Palette, Shield, Bell, Database, Cpu } from 'lucide-react';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

const Section: React.FC<{ icon: React.ReactNode; title: string; description: string; children?: React.ReactNode }> = ({
  icon, title, description, children,
}) => (
  <div className="rounded-2xl border border-border bg-surface p-5 shadow-level1">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-heading text-sm font-bold text-text-main">{title}</h3>
        <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export const SettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-accent-muted text-accent flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-heading text-base font-bold text-text-main">Settings</h1>
          <p className="text-[11px] text-text-muted">Workspace preferences and configuration</p>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Appearance */}
        <motion.div variants={itemVariants}>
          <Section
            icon={<Palette className="w-4 h-4" />}
            title="Appearance"
            description="Choose your workspace theme"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted font-semibold">Active theme:</span>
              <ThemeSwitcher />
            </div>
            <p className="text-[11px] text-text-muted mt-3">
              7 themes available — Daylight, Midnight, Studio, Harbor, Forest, and High-Contrast.
            </p>
          </Section>
        </motion.div>

        {/* Privacy & Security */}
        <motion.div variants={itemVariants}>
          <Section
            icon={<Shield className="w-4 h-4" />}
            title="Privacy & Security"
            description="Row-level security and data isolation"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Supabase RLS</span>
                <span className="font-semibold text-success">Active</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Document isolation</span>
                <span className="font-semibold text-success">Per-user</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Memory encryption</span>
                <span className="font-semibold text-success">Enabled</span>
              </div>
            </div>
          </Section>
        </motion.div>

        {/* RAG Configuration */}
        <motion.div variants={itemVariants}>
          <Section
            icon={<Cpu className="w-4 h-4" />}
            title="RAG Configuration"
            description="Retrieval and embedding settings"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Embedding model</span>
                <span className="font-mono font-semibold text-text-main">all-MiniLM-L6-v2</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Vector store</span>
                <span className="font-mono font-semibold text-text-main">pgvector</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">LLM</span>
                <span className="font-mono font-semibold text-text-main">Gemini 1.5 Flash</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Chunk size</span>
                <span className="font-mono font-semibold text-text-main">512 tokens</span>
              </div>
            </div>
          </Section>
        </motion.div>

        {/* Storage */}
        <motion.div variants={itemVariants}>
          <Section
            icon={<Database className="w-4 h-4" />}
            title="Storage"
            description="Document and memory storage"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Document storage</span>
                <span className="font-mono font-semibold text-text-main">Supabase Storage</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Vector index</span>
                <span className="font-mono font-semibold text-text-main">Supabase pgvector</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Long-term memory</span>
                <span className="font-mono font-semibold text-text-main">PostgreSQL + embeddings</span>
              </div>
            </div>
          </Section>
        </motion.div>

        {/* Coming Soon — Notifications */}
        <motion.div variants={itemVariants}>
          <Section
            icon={<Bell className="w-4 h-4" />}
            title="Notifications"
            description="Alerts and processing notifications"
          >
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                <div className="text-[11px] font-semibold text-text-muted px-3 py-1.5 rounded-lg border border-dashed border-border bg-surface-2 inline-block">
                  Coming in a future release
                </div>
              </div>
            </div>
          </Section>
        </motion.div>
      </motion.div>
    </div>
  );
};
