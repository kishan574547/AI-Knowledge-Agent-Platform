import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { ThemeId } from '../types/theme';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, allThemes, currentPreset } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch visual theme"
        title={`Current theme: ${currentPreset.name}`}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-text-main text-xs font-medium transition-all"
      >
        <div
          className="w-3.5 h-3.5 rounded-full border border-border/80 flex items-center justify-center"
          style={{ backgroundColor: currentPreset.swatch.accent }}
        />
        <span className="hidden sm:inline">{currentPreset.name}</span>
        <Palette className="w-3.5 h-3.5 text-text-muted" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-surface shadow-level2 p-3.5 z-50"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
              <span className="text-xs font-semibold text-text-main">Workspace Theme</span>
              <span className="text-[11px] text-text-muted">6 styles</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {allThemes.map((preset) => {
                const isSelected = theme === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setTheme(preset.id as ThemeId);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-all border ${
                      isSelected
                        ? 'border-accent bg-accent-tint text-text-main ring-1 ring-accent'
                        : 'border-border/60 hover:border-border hover:bg-surface-2 text-text-muted hover:text-text-main'
                    }`}
                  >
                    {/* Color swatch trio preview */}
                    <div
                      className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden"
                      style={{ backgroundColor: preset.swatch.bg }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: preset.swatch.accent }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium leading-tight truncate">{preset.name}</div>
                      <div className="text-[10px] text-text-muted capitalize leading-none mt-0.5">{preset.type}</div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
