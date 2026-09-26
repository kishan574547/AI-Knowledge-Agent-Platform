import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardProvider } from '../context/DashboardContext';
import { AppSidebar } from '../components/AppSidebar';
import { TopBar } from '../components/TopBar';

export const DashboardLayout: React.FC = () => {
  // Desktop: collapsed/expanded. Mobile: open/closed drawer.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handle = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false); // close drawer when going desktop
    };
    setIsMobile(mq.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Close drawer on route change (mobile)
  const handleMobileClose = () => setMobileOpen(false);

  return (
    <DashboardProvider>
      <div className="h-screen flex overflow-hidden bg-base text-text-main">

        {/* ── Desktop Sidebar (lg+): always rendered, fixed left ── */}
        <div className="hidden lg:flex h-full shrink-0">
          <AppSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        </div>

        {/* ── Mobile Sidebar: slide-over drawer (< lg) ── */}
        <AnimatePresence>
          {isMobile && mobileOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                onClick={handleMobileClose}
              />
              {/* Drawer */}
              <motion.div
                key="drawer"
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
              >
                <AppSidebar
                  collapsed={false}
                  onToggle={handleMobileClose}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Right column: TopBar + Page content ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* TopBar row — includes mobile hamburger */}
          <div className="flex items-center shrink-0 border-b border-border bg-surface h-14 px-3 gap-2">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* TopBar content fills the rest */}
            <div className="flex-1 min-w-0">
              <TopBar />
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-hidden flex flex-col min-h-0 px-3 sm:px-5 lg:px-6 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
};

