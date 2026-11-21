import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Task, TaskPriority } from '../types';
import { formatDisplayDate } from '../utils/date';

interface MatrixScreenProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onAdvanceStatus: (task: Task) => void;
}

const QUADRANTS: {
  priority: TaskPriority;
  title: string;
  subtitle: string;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    priority: 'urgent',
    title: 'Do First',
    subtitle: 'Urgent & Important',
    accent: '#ef4444',
    icon: 'flame',
  },
  {
    priority: 'high',
    title: 'Schedule',
    subtitle: 'Important, Plan Time',
    accent: '#f59e0b',
    icon: 'calendar',
  },
  {
    priority: 'medium',
    title: 'Delegate / Focus',
    subtitle: 'Standard Priority',
    accent: '#06b6d4',
    icon: 'flash',
  },
  {
    priority: 'low',
    title: 'Eliminate / Backlog',
    subtitle: 'Low Priority',
    accent: '#71717a',
    icon: 'archive',
  },
];

export default function MatrixScreen({
  tasks,
  onSelectTask,
  onAdvanceStatus,
}: MatrixScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Eisenhower Matrix</Text>
      <Text style={styles.subtitle}>Prioritize open tasks by urgency and impact</Text>

      <View style={styles.grid}>
        {QUADRANTS.map((q) => {
          const items = openTasks.filter((t) => t.priority === q.priority);
          return (
            <View key={q.priority} style={[styles.quadCard, { borderTopColor: q.accent, borderTopWidth: 3 }]}>
              <View style={styles.quadHeader}>
                <View style={[styles.quadIcon, { backgroundColor: `${q.accent}22` }]}>
                  <Ionicons name={q.icon} size={15} color={q.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quadTitle}>{q.title}</Text>
                  <Text style={styles.quadSub}>{q.subtitle}</Text>
                </View>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{items.length}</Text>
                </View>
              </View>

              {items.length === 0 ? (
                <Text style={styles.emptyText}>No open tasks</Text>
              ) : (
                <View style={styles.itemsList}>
                  {items.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={styles.itemRow}
                      onPress={() => onSelectTask(task)}
                      activeOpacity={0.8}
                    >
                      <TouchableOpacity onPress={() => onAdvanceStatus(task)}>
                        <Ionicons name="radio-button-off" size={16} color={q.accent} />
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {task.title}
                        </Text>
                        {task.due_date && (
                          <Text style={styles.itemMeta}>{formatDisplayDate(task.due_date)}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const createStyles = (COLORS: ThemePalette) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: COLORS.bg },
    content: {
      padding: 16,
      paddingBottom: 100,
      gap: 12,
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center',
    },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
    subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: -6, marginBottom: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    quadCard: {
      flexGrow: 1,
      minWidth: 280,
      width: '48%',
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 14,
      gap: 10,
    },
    quadHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    quadIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quadTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
    quadSub: { fontSize: 11, color: COLORS.textMuted },
    countPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
    },
    countText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
    emptyText: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 6 },
    itemsList: { gap: 6 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    itemTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
    itemMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  });

