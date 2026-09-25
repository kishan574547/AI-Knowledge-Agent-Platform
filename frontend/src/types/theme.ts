export type ThemeId = 'daylight' | 'midnight' | 'studio' | 'harbor' | 'forest' | 'contrast';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  type: 'light' | 'dark';
  description: string;
  swatch: {
    bg: string;
    surface: string;
    accent: string;
  };
}

export const THEMES: ThemePreset[] = [
  {
    id: 'daylight',
    name: 'Daylight',
    type: 'light',
    description: 'Warm, professional, easy on the eyes',
    swatch: {
      bg: '#FAFAF9',
      surface: '#FFFFFF',
      accent: '#3B5BDB',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    type: 'dark',
    description: 'Refined dark with warm undertones',
    swatch: {
      bg: '#14141A',
      surface: '#1B1C22',
      accent: '#6C8EF5',
    },
  },
  {
    id: 'studio',
    name: 'Studio',
    type: 'light',
    description: 'Soft neutral, paper-inspired workspace',
    swatch: {
      bg: '#F6F4EF',
      surface: '#FFFDF9',
      accent: '#A15C38',
    },
  },
  {
    id: 'harbor',
    name: 'Harbor',
    type: 'light',
    description: 'Corporate-friendly crisp blue',
    swatch: {
      bg: '#F5F7FA',
      surface: '#FFFFFF',
      accent: '#2563EB',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    type: 'light',
    description: 'Calm earthy green & warm neutrals',
    swatch: {
      bg: '#F7F6F1',
      surface: '#FFFFFF',
      accent: '#3F7A5A',
    },
  },
  {
    id: 'contrast',
    name: 'Contrast',
    type: 'light',
    description: 'High-contrast WCAG AAA accessibility',
    swatch: {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      accent: '#0047AB',
    },
  },
];
