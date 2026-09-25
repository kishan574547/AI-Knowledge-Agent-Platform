import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Files,
  UploadCloud,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../context/DashboardContext';
import { ThemeSwitcher } from './ThemeSwitcher';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeTab, setActiveTab, setIsUploadModalOpen, totalDocCount } = useDashboard();
  const navigate = useNavigate();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Generate deterministic muted avatar background from user email
  const getAvatarInitials = () => {
    if (!user?.email) return 'U';
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-surface border-b border-border shrink-0 select-none">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Left Section: Brand Wordmark + Workspace Selector */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            {/* Geometric calm brand mark */}
            <div className="w-7 h-7 rounded-lg bg-text-main flex items-center justify-center text-surface font-mono font-bold text-xs shadow-sm">
              R
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-main tracking-tight text-sm">
                DocuRAG
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-text-muted px-2 py-0.5 rounded-md bg-surface-2 border border-border">
                <span>Personal</span>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </span>
            </div>
          </Link>

          {/* Navigation Underline Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`relative px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'chat' ? 'text-text-main' : 'text-text-muted hover:text-text-main'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
              {activeTab === 'chat' && (
                <motion.div
                  layoutId="navbarTabUnderline"
                  className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-accent"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`relative px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'documents' ? 'text-text-main' : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Files className="w-3.5 h-3.5" />
              <span>Documents</span>
              {totalDocCount > 0 && (
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-surface-2 border border-border text-text-muted">
                  {totalDocCount}
                </span>
              )}
              {activeTab === 'documents' && (
                <motion.div
                  layoutId="navbarTabUnderline"
                  className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-accent"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          </nav>
        </div>

        {/* Right Section: Upload CTA -> Theme Switcher -> User Profile Dropdown */}
        <div className="flex items-center gap-2.5">
          {/* Upload Button (Outlined Secondary) */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text-main text-xs font-medium transition-all"
            title="Upload Document"
          >
            <UploadCloud className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Theme Switcher Popover */}
          <ThemeSwitcher />

          {/* User Profile Avatar Dropdown */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-border transition-all"
                title="Account Settings"
              >
                <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/30 text-accent font-mono text-[11px] font-semibold flex items-center justify-center">
                  {getAvatarInitials()}
                </div>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface shadow-level2 p-2 z-50"
                  >
                    <div className="p-2 border-b border-border mb-1">
                      <div className="text-xs font-semibold text-text-main truncate">
                        {user.user_metadata?.full_name || 'Workspace User'}
                      </div>
                      <div className="text-[11px] font-mono text-text-muted truncate mt-0.5">
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-success">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Supabase RLS Protected</span>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-danger hover:bg-danger-tint transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
