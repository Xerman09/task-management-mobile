export const COLORS = {
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

export const PRIORITY_COLORS: Record<'urgent' | 'high' | 'medium' | 'low', { text: string; bg: string; border: string }> = {
  urgent: { text: '#fca5a5', bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.35)' },
  high: { text: '#fcd34d', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.35)' },
  medium: { text: '#67e8f9', bg: 'rgba(6, 182, 212, 0.14)', border: 'rgba(6, 182, 212, 0.32)' },
  low: { text: '#a1a1aa', bg: 'rgba(113, 113, 122, 0.16)', border: 'rgba(113, 113, 122, 0.32)' },
};

export const DEFAULT_STATUS_COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#71717a', isCompleted: false },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b', isCompleted: false },
  { id: 'review', label: 'In Review', color: '#6366f1', isCompleted: false },
  { id: 'completed', label: 'Completed', color: '#10b981', isCompleted: true },
] as const;
