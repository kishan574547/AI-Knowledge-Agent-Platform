import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeId, ThemePreset, THEMES } from '../types/theme';

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  currentPreset: ThemePreset;
  allThemes: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'rag_theme_preference';

function getInitialTheme(): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
  if (saved && THEMES.some((t) => t.id === saved)) {
    return saved;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'midnight';
  }
  return 'daylight';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => getInitialTheme());

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Also set dark/light class for Tailwind if needed
    const current = THEMES.find((t) => t.id === theme);
    if (current?.type === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const currentPreset = useMemo(() => {
    return THEMES.find((t) => t.id === theme) || THEMES[0];
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        currentPreset,
        allThemes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
