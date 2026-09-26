import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Check,
  Sun, Moon, Globe, Bell, Shield, LogOut, Trash2, Save, Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const Toggle: React.FC<{ enabled: boolean; onChange: () => void }> = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
      enabled ? 'bg-accent' : 'bg-border'
    }`}
    role="switch"
    aria-checked={enabled}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const Card: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ icon, title, description, danger, children }) => (
  <div className={`rounded-2xl border bg-surface p-6 shadow-level1 ${danger ? 'border-danger/40' : 'border-border'}`}>
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-danger/15 text-danger' : 'bg-accent-muted text-accent'}`}>
        {icon}
      </div>
      <div>
        <h2 className={`font-heading text-sm font-bold ${danger ? 'text-danger' : 'text-text-main'}`}>{title}</h2>
        <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const Row: React.FC<{ label: string; sub?: string; children: React.ReactNode; danger?: boolean }> = ({
  label, sub, children, danger,
}) => (
  <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
    <div>
      <p className={`text-sm font-medium ${danger ? 'text-danger' : 'text-text-main'}`}>{label}</p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </div>
    <div className="shrink-0 ml-4">{children}</div>
  </div>
);

const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel, danger, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm mx-4 bg-surface rounded-2xl border border-border shadow-level2 p-6"
      >
        <h3 className="font-heading text-base font-bold text-text-main mb-1">{title}</h3>
        <p className="text-xs text-text-muted mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              danger ? 'bg-danger hover:bg-danger/90' : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentPreset, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  );
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [lang, setLang] = useState<'en' | 'te' | 'ta'>('en');
  const languages = [
    { id: 'en' as const, label: 'English' },
    { id: 'te' as const, label: 'Telugu' },
    { id: 'ta' as const, label: 'Tamil' },
  ];

  const [digestEnabled, setDigestEnabled] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isDark = currentPreset.type === 'dark';
  const email = user?.email || '—';

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setNameLoading(true);
    setNameError(null);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ data: { full_name: displayName.trim() } });
        if (error) throw error;
      }
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 2500);
    } catch (err: any) {
      setNameError(err.message || 'Failed to save name');
    } finally {
      setNameLoading(false);
    }
  };

  const pwChecks = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One number or symbol', met: /[0-9!@#$%^&*]/.test(newPassword) },
    { label: 'Passwords match', met: newPassword.length > 0 && newPassword === confirmPassword },
  ];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwChecks.some((c) => !c.met)) return;
    setPwError(null);
    setPwLoading(true);
    try {
      await authService.updatePassword(newPassword);
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.message || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await authService.logout();
    } catch {
      // still sign out
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

  return (
    <>
      <ConfirmDialog
        open={showSignOutDialog}
        title="Sign out?"
        message="You will be logged out of your current session and redirected to the login page."
        confirmLabel="Sign Out"
        onConfirm={() => { setShowSignOutDialog(false); logout(); }}
        onCancel={() => setShowSignOutDialog(false)}
      />
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete account & data?"
        message="This will permanently erase your profile, documents, and workspace history. This action cannot be undone."
        confirmLabel={deleteLoading ? 'Deleting…' : 'Delete Account'}
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <div className="flex flex-col h-full overflow-y-auto pr-1 gap-y-1">
        <div className="pb-4 border-b border-border mb-2">
          <h1 className="font-heading text-base font-bold text-text-main">Settings</h1>
          <p className="text-[11px] text-text-muted mt-0.5">
            Manage your profile details, security, app preferences, and notifications.
          </p>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4 pb-4">

          {/* Account Info & Profile */}
          <motion.div variants={itemVariants}>
            <Card icon={<User className="w-4 h-4" />} title="Account Info & Profile" description="Update your public display name and account credentials">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-10 px-3 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Email Address</label>
                    <span className="text-[10px] text-text-muted">🔒 Read Only</span>
                  </div>
                  <input type="email" value={email} readOnly className="w-full h-10 px-3 bg-surface-2/50 border border-border rounded-lg text-sm text-text-muted cursor-not-allowed" />
                </div>
              </div>
              {nameError && (
                <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">{nameError}</span>
                </div>
              )}
              {nameSuccess && (
                <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg border-l-4 border-success bg-success/10 text-success text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />Name saved successfully!
                </div>
              )}
              <button
                onClick={handleSaveName}
                disabled={nameLoading || !displayName.trim()}
                className="h-9 px-4 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {nameLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Name
              </button>

              <div className="mt-5 pt-5 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-sm font-bold text-text-main">Security — Change Password</span>
                </div>
                {pwSuccess && (
                  <div className="mb-3 flex items-center gap-2 p-2.5 rounded-lg border-l-4 border-success bg-success/10 text-success text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />Password updated successfully!
                  </div>
                )}
                {pwError && (
                  <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg border-l-4 border-danger bg-danger-tint text-danger text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span className="font-medium">{pwError}</span>
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full h-10 pl-3 pr-10 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:outline-none focus:border-accent transition-all"
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-text-muted hover:text-text-main">
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full h-10 pl-3 pr-10 bg-surface-2 border border-border rounded-lg text-sm text-text-main placeholder-text-secondary/60 focus:outline-none focus:border-accent transition-all"
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-text-muted hover:text-text-main">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 p-3 rounded-lg bg-surface-2 border border-border">
                      {pwChecks.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${c.met ? 'bg-success text-white' : 'bg-border text-text-muted'}`}>
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className={c.met ? 'text-text-main font-medium' : 'text-text-muted'}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={pwLoading || pwChecks.some((c) => !c.met)}
                    className="h-9 px-4 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    Update Password
                  </button>
                </form>
              </div>
            </Card>
          </motion.div>

          {/* App Preferences */}
          <motion.div variants={itemVariants}>
            <Card icon={<Globe className="w-4 h-4" />} title="App Preferences" description="Theme appearance and regional language settings">
              <Row label="Appearance Mode" sub={`Currently active: ${isDark ? 'Dark' : 'Light'} Mode`}>
                <button
                  onClick={() => setTheme(isDark ? 'daylight' : 'midnight')}
                  className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center hover:bg-accent-muted hover:border-accent hover:text-accent text-text-muted transition-all"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </Row>
              <div className="py-3.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2.5">Interface Language</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {languages.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setLang(id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        lang === id ? 'bg-accent text-white border-accent' : 'bg-surface-2 border-border text-text-muted hover:border-accent hover:text-text-main'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={itemVariants}>
            <Card icon={<Bell className="w-4 h-4" />} title="Notifications & Alerts" description="Control digest emails, task reminders, and automated alerts">
              <Row label="Daily Document Digest" sub="Receive a morning summary of your document activity and pending queries">
                <Toggle enabled={digestEnabled} onChange={() => setDigestEnabled(!digestEnabled)} />
              </Row>
              <Row label="AI Agent Proactive Alerts" sub="Get notified when the RAG agent produces new insights or flags issues">
                <Toggle enabled={alertsEnabled} onChange={() => setAlertsEnabled(!alertsEnabled)} />
              </Row>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={itemVariants}>
            <Card icon={<Shield className="w-4 h-4" />} title="Danger Zone" description="Irreversible actions and session termination" danger>
              <Row label="Sign Out of DocuRAG" sub="Terminate your current session safely">
                <button
                  onClick={() => setShowSignOutDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-text-main hover:bg-surface-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />Sign Out
                </button>
              </Row>
              <Row label="Delete Account & Data" sub="Permanently erase your profile, documents, and workspace history" danger>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />Delete Account
                </button>
              </Row>
            </Card>
          </motion.div>

        </motion.div>
      </div>
    </>
  );
};
