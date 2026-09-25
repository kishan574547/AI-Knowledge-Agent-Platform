import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Brain,
  Wrench,
  GitMerge,
  Settings,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Clock,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../context/DashboardContext';

type ActiveTab = 'chat' | 'documents';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: 'route' | 'tab';
  route?: string;
  tab?: ActiveTab;
  badge?: string;
  badgeType?: 'count' | 'soon';
  bottomSection?: boolean;
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggle }) => {
  const { activeTab, setActiveTab, setIsUploadModalOpen, totalDocCount } = useDashboard();
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabNav = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (location.pathname !== '/') navigate('/');
  };

  const isTabActive = (tab: ActiveTab) =>
    location.pathname === '/' && activeTab === tab;

  const navItems: NavItem[] = [
    {
      id: 'rag-qa',
      label: 'RAG Q&A',
      icon: <MessageSquare className="w-4 h-4" />,
      type: 'tab',
      tab: 'chat',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="w-4 h-4" />,
      type: 'tab',
      tab: 'documents',
      badge: totalDocCount > 0 ? String(totalDocCount) : undefined,
      badgeType: 'count',
    },
    {
      id: 'memory',
      label: 'Long-Term Memory',
      icon: <Brain className="w-4 h-4" />,
      type: 'route',
      route: '/memory',
    },
    {
      id: 'mcp-tools',
      label: 'MCP Tools',
      icon: <Wrench className="w-4 h-4" />,
      type: 'route',
      route: '/mcp-tools',
      badge: 'Soon',
      badgeType: 'soon',
    },
    {
      id: 'multi-agent',
      label: 'Multi-Agent Research',
      icon: <GitMerge className="w-4 h-4" />,
      type: 'route',
      route: '/multi-agent',
      badge: 'Soon',
      badgeType: 'soon',
    },
  ];

  const bottomItems: NavItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      type: 'route',
      route: '/settings',
      bottomSection: true,
    },
  ];

  const renderItem = (item: NavItem) => {
    const isComing = item.badgeType === 'soon';

    const isActive =
      item.type === 'tab'
        ? isTabActive(item.tab!)
        : location.pathname === item.route;

    const content = (
      <>
        {/* Icon */}
        <span
          className={`shrink-0 transition-colors duration-200 ${
            isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-main'
          }`}
        >
          {item.icon}
        </span>

        {/* Label + badge */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-center gap-2 overflow-hidden whitespace-nowrap flex-1 min-w-0"
            >
              <span
                className={`text-xs font-semibold truncate transition-colors ${
                  isActive ? 'text-text-main' : 'text-text-muted group-hover:text-text-main'
                }`}
              >
                {item.label}
              </span>

              {item.badge && item.badgeType === 'count' && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-accent-muted text-accent shrink-0">
                  {item.badge}
                </span>
              )}

              {item.badge && item.badgeType === 'soon' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-border text-text-muted bg-surface-2 flex items-center gap-0.5 shrink-0">
                  <Clock className="w-2.5 h-2.5" />
                  Soon
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active pill */}
        {isActive && (
          <motion.span
            layoutId="sidebarActivePill"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-accent"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
      </>
    );

    const baseClass = `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer select-none ${
      isActive
        ? 'bg-accent-muted'
        : isComing
        ? 'opacity-60 cursor-not-allowed'
        : 'hover:bg-surface-2'
    }`;

    if (isComing) {
      return (
        <div key={item.id} className={baseClass} title={collapsed ? item.label : undefined}>
          {content}
        </div>
      );
    }

    if (item.type === 'tab') {
      return (
        <button
          key={item.id}
          onClick={() => handleTabNav(item.tab!)}
          className={`${baseClass} w-full text-left`}
          title={collapsed ? item.label : undefined}
        >
          {content}
        </button>
      );
    }

    return (
      <NavLink
        key={item.id}
        to={item.route!}
        className={baseClass}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </NavLink>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col shrink-0 h-full bg-surface border-r border-border overflow-hidden"
    >
      {/* Brand + collapse toggle */}
      <div className="flex items-center h-14 border-b border-border px-3 shrink-0">
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <div className="w-7 h-7 rounded-lg bg-accent text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-xs font-bold text-text-main truncate leading-tight">
                  AI Knowledge
                </p>
                <p className="text-[10px] text-text-muted truncate leading-tight">
                  Agent Platform
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-accent text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm mx-auto">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Collapse toggle — only visible when expanded */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="ml-auto p-1 rounded-md text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* If collapsed, show toggle at bottom of brand row */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center py-2 text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors border-b border-border"
          title="Expand sidebar"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Upload shortcut */}
      <div className="px-3 py-3 border-b border-border">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsUploadModalOpen(true)}
          className={`btn-primary w-full !rounded-xl transition-all ${
            collapsed ? '!px-0 !py-2 !gap-0 justify-center' : ''
          }`}
          title={collapsed ? 'Upload Document' : undefined}
        >
          <UploadCloud className="w-3.5 h-3.5 shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden whitespace-nowrap text-xs font-semibold"
              >
                Upload Document
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {/* Section label */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-3 mb-2"
            >
              Workspace
            </motion.p>
          )}
        </AnimatePresence>

        {navItems.map(renderItem)}
      </nav>

      {/* Bottom: Settings */}
      <div className="px-2 py-3 border-t border-border space-y-0.5">
        {bottomItems.map(renderItem)}
      </div>
    </motion.aside>
  );
};
