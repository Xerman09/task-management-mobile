export type ThemeId = 'dark' | 'light' | 'midnight' | 'emerald';

export interface ThemePalette {
  isLight: boolean;
  bg: string;
  surface: string;
  card: string;
  cardElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cyan: string;
  cyanSoft: string;
  cyanBorder: string;
  violet: string;
  violetSoft: string;
  violetBorder: string;
  emerald: string;
  emeraldSoft: string;
  amber: string;
  amberSoft: string;
  rose: string;
  roseSoft: string;
  indigo: string;
}

export const COLORS: ThemePalette = {
  isLight: false,
  bg: '#09090b',
  surface: '#0c0d0e',
  card: '#101114',
  cardElevated: '#14161a',
  border: '#27272a',
  borderSubtle: '#1f2024',
  textPrimary: '#f4f4f5',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  cyan: '#06b6d4',
  cyanSoft: 'rgba(6, 182, 212, 0.14)',
  cyanBorder: 'rgba(6, 182, 212, 0.35)',
  violet: '#8b5cf6',
  violetSoft: 'rgba(139, 92, 246, 0.16)',
  violetBorder: 'rgba(139, 92, 246, 0.38)',
  emerald: '#10b981',
  emeraldSoft: 'rgba(16, 185, 129, 0.14)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245, 158, 11, 0.14)',
  rose: '#ef4444',
  roseSoft: 'rgba(239, 68, 68, 0.14)',
  indigo: '#6366f1',
};

export const THEMES: Record<
  ThemeId,
  { id: ThemeId; name: string; swatch: string; colors: ThemePalette }
> = {
  dark: {
    id: 'dark',
    name: 'Obsidian Dark',
    swatch: '#06b6d4',
    colors: COLORS,
  },
  light: {
    id: 'light',
    name: 'Daylight',
    swatch: '#0284c7',
    colors: {
      isLight: true,
      bg: '#f4f4f5',
      surface: '#ffffff',
      card: '#ffffff',
      cardElevated: '#e4e4e7',
      border: '#d4d4d8',
      borderSubtle: '#e4e4e7',
      textPrimary: '#18181b',
      textSecondary: '#52525b',
      textMuted: '#71717a',
      cyan: '#0284c7',
      cyanSoft: 'rgba(2, 132, 199, 0.12)',
      cyanBorder: 'rgba(2, 132, 199, 0.35)',
      violet: '#7c3aed',
      violetSoft: 'rgba(124, 58, 237, 0.12)',
      violetBorder: 'rgba(124, 58, 237, 0.35)',
      emerald: '#059669',
      emeraldSoft: 'rgba(5, 150, 105, 0.12)',
      amber: '#d97706',
      amberSoft: 'rgba(217, 119, 6, 0.12)',
      rose: '#dc2626',
      roseSoft: 'rgba(220, 38, 38, 0.12)',
      indigo: '#4f46e5',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    swatch: '#818cf8',
    colors: {
      ...COLORS,
      bg: '#060814',
      surface: '#0b1021',
      card: '#111831',
      cardElevated: '#172042',
      border: '#253057',
      borderSubtle: '#1c2547',
      cyan: '#818cf8',
      cyanSoft: 'rgba(129, 140, 248, 0.16)',
      cyanBorder: 'rgba(129, 140, 248, 0.38)',
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    swatch: '#10b981',
    colors: {
      ...COLORS,
      bg: '#050c0a',
      surface: '#0a1411',
      card: '#0f1d19',
      cardElevated: '#152722',
      border: '#1f3a32',
      borderSubtle: '#172d26',
      cyan: '#10b981',
      cyanSoft: 'rgba(16, 185, 129, 0.16)',
      cyanBorder: 'rgba(16, 185, 129, 0.38)',
    },
  },
};

export const PRIORITY_COLORS: Record<
  'urgent' | 'high' | 'medium' | 'low',
  { text: string; bg: string; border: string }
> = {
  urgent: { text: '#fca5a5', bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.35)' },
  high: { text: '#fcd34d', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.35)' },
  medium: { text: '#67e8f9', bg: 'rgba(6, 182, 212, 0.14)', border: 'rgba(6, 182, 212, 0.32)' },
  low: { text: '#a1a1aa', bg: 'rgba(113, 113, 122, 0.16)', border: 'rgba(113, 113, 122, 0.32)' },
};

export const DEFAULT_STATUS_COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#71717a', isCompleted: false },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b', isCompleted: false },
  { id: 'review', label: 'In Review', color: '#8b5cf6', isCompleted: false },
  { id: 'completed', label: 'Completed', color: '#10b981', isCompleted: true },
] as const;

export function getStatusVisual(
  status: string,
  colors: ThemePalette,
  customColor?: string
): { label: string; color: string; icon: 'ellipse-outline' | 'play-circle-outline' | 'eye-outline' | 'checkmark-circle' | 'layers-outline' } {
  if (status === 'completed') {
    return { label: 'Completed', color: customColor || colors.emerald, icon: 'checkmark-circle' };
  }
  if (status === 'in_progress') {
    return { label: 'In Progress', color: customColor || colors.amber, icon: 'play-circle-outline' };
  }
  if (status === 'review') {
    return { label: 'In Review', color: customColor || colors.violet, icon: 'eye-outline' };
  }
  if (status === 'todo') {
    return { label: 'To Do', color: customColor || colors.textMuted, icon: 'ellipse-outline' };
  }
  return {
    label: status.replace(/_/g, ' '),
    color: customColor || colors.cyan,
    icon: 'layers-outline',
  };
}
