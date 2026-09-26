import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { ThemeSwitcher } from './ThemeSwitcher';

/**
 * Slim top bar — just user avatar + theme switcher.
 * Navigation is now in AppSidebar.
 */
export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
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

  const getAvatarInitials = () => {
    if (!user?.email) return 'U';
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between w-full h-full">
      {/* Left: empty placeholder for breadcrumb */}
      <div />

      {/* Right: theme + user */}
      <div className="flex items-center gap-2.5">
        <ThemeSwitcher />

        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-accent transition-all"
              title="Account Settings"
            >
              <div className="w-7 h-7 rounded-full bg-accent-muted border border-accent/30 text-accent font-mono text-[11px] font-bold flex items-center justify-center">
                {getAvatarInitials()}
              </div>
              <ChevronDown className="w-3 h-3 text-text-muted" />
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
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-success font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Supabase RLS Protected</span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-danger hover:bg-danger-muted transition-colors"
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
  );
};
