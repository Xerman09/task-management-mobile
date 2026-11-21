import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PRIORITY_COLORS } from '../theme';
import { Subtask, Task, User } from '../types';
import { formatDisplayDate, getTodayYMD } from '../utils/date';

interface HomeScreenProps {
  user: User;
  tasks: Task[];
  onOpenCreate: (mode: 'single' | 'ai_plan') => void;
  onSelectTask: (task: Task) => void;
  onAdvanceStatus: (task: Task) => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onGoToTasks: (filter: 'all' | 'today' | 'missed') => void;
}

export default function HomeScreen({
  user,
  tasks,
  onOpenCreate,
  onSelectTask,
  onAdvanceStatus,
  onToggleSubtask,
  onGoToTasks,
}: HomeScreenProps) {
  const todayStr = getTodayYMD();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const dueTodayTasks = tasks.filter((t) => t.due_date === todayStr && t.status !== 'completed');
  const overdueTasks = tasks.filter(
    (t) => Boolean(t.due_date) && (t.due_date as string) < todayStr && t.status !== 'completed'
  );
  const focusTasks = [...overdueTasks, ...dueTodayTasks].slice(0, 6);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Greeting Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>TODAY • {formatDisplayDate(todayStr).toUpperCase()}</Text>
          <Text style={styles.greeting}>Welcome back, {user.name.split(' ')[0]}</Text>
        </View>
        <View style={styles.syncPill}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>Live UI</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionPrimary]}
          activeOpacity={0.85}
          onPress={() => onOpenCreate('single')}
        >
          <Ionicons name="add-circle" size={18} color="#09090b" />
          <Text style={styles.actionPrimaryText}>New Task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionAi]}
          activeOpacity={0.85}
          onPress={() => onOpenCreate('ai_plan')}
        >
          <Ionicons name="sparkles" size={16} color="#ddd6fe" />
          <Text style={styles.actionAiText}>AI Plan Import</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <TouchableOpacity style={styles.kpiCard} onPress={() => onGoToTasks('all')} activeOpacity={0.8}>
          <Text style={styles.kpiLabel}>Completion</Text>
          <Text style={styles.kpiValue}>{completionPct}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completionPct}%`, backgroundColor: COLORS.cyan }]} />
          </View>
          <Text style={styles.kpiSub}>
            {completed} of {total} done
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={() => onGoToTasks('today')} activeOpacity={0.8}>
          <Text style={styles.kpiLabel}>Due Today</Text>
          <Text style={[styles.kpiValue, { color: COLORS.amber }]}>{dueTodayTasks.length}</Text>
          <Text style={styles.kpiSub}>Scheduled for today</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={() => onGoToTasks('missed')} activeOpacity={0.8}>
          <Text style={styles.kpiLabel}>Missed</Text>
          <Text style={[styles.kpiValue, { color: overdueTasks.length > 0 ? COLORS.rose : COLORS.textPrimary }]}>
            {overdueTasks.length}
          </Text>
          <Text style={styles.kpiSub}>{overdueTasks.length > 0 ? 'Needs attention' : 'On track'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={() => onGoToTasks('all')} activeOpacity={0.8}>
          <Text style={styles.kpiLabel}>Open Tasks</Text>
          <Text style={styles.kpiValue}>{total - completed}</Text>
          <Text style={styles.kpiSub}>Active workspace items</Text>
        </TouchableOpacity>
      </View>

      {/* Today's & Overdue Focus */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s Focus &amp; Urgent</Text>
        <TouchableOpacity onPress={() => onGoToTasks('all')}>
          <Text style={styles.sectionLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {focusTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={28} color={COLORS.emerald} />
          <Text style={styles.emptyTitle}>All caught up for today!</Text>
          <Text style={styles.emptySub}>Tap New Task or AI Plan Import above to add work.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {focusTasks.map((task) => {
            const isOverdue = Boolean(task.due_date) && (task.due_date as string) < todayStr;
            const prio = PRIORITY_COLORS[task.priority];
            const doneSteps = task.subtasks.filter((s) => s.is_completed).length;

            return (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                activeOpacity={0.85}
                onPress={() => onSelectTask(task)}
              >
                <View style={styles.taskTopRow}>
                  <TouchableOpacity
                    onPress={() => onAdvanceStatus(task)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={task.status === 'in_progress' ? 'ellipse-outline' : 'radio-button-off'}
                      size={20}
                      color={task.status === 'in_progress' ? COLORS.amber : COLORS.textMuted}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {task.title}
                    </Text>
                    <View style={styles.metaRow}>
                      {task.project_name && (
                        <View style={styles.projectPill}>
                          <View
                            style={[styles.projectDot, { backgroundColor: task.project_color || COLORS.cyan }]}
                          />
                          <Text style={styles.projectText}>{task.project_name}</Text>
                        </View>
                      )}
                      <View style={[styles.prioPill, { backgroundColor: prio.bg, borderColor: prio.border }]}>
                        <Text style={[styles.prioText, { color: prio.text }]}>{task.priority}</Text>
                      </View>
                      {task.due_date && (
                        <Text style={[styles.dueText, isOverdue && { color: COLORS.rose }]}>
                          {task.due_date === todayStr ? 'Today' : formatDisplayDate(task.due_date)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {task.subtasks.length > 0 && (
                  <View style={styles.stepsBox}>
                    <View style={styles.stepsHeader}>
                      <Ionicons name="list-outline" size={13} color={COLORS.cyan} />
                      <Text style={styles.stepsLabel}>
                        Steps ({doneSteps}/{task.subtasks.length})
                      </Text>
                    </View>
                    {task.subtasks.slice(0, 3).map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={styles.stepRow}
                        onPress={() => onToggleSubtask(sub)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={sub.is_completed ? 'checkbox' : 'square-outline'}
                          size={16}
                          color={sub.is_completed ? COLORS.emerald : COLORS.textMuted}
                        />
                        <Text
                          style={[styles.stepText, sub.is_completed && styles.stepTextDone]}
                          numberOfLines={1}
                        >
                          {sub.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kicker: { fontSize: 11, fontWeight: '700', color: COLORS.cyan, letterSpacing: 0.8 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.emeraldSoft,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  syncDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.emerald },
  syncText: { fontSize: 11, fontWeight: '700', color: COLORS.emerald },
  quickActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionPrimary: { backgroundColor: COLORS.textPrimary },
  actionPrimaryText: { fontSize: 13, fontWeight: '700', color: '#09090b' },
  actionAi: { backgroundColor: COLORS.violetSoft, borderWidth: 1, borderColor: COLORS.violetBorder },
  actionAiText: { fontSize: 13, fontWeight: '700', color: '#ddd6fe' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '48.4%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  kpiValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  kpiSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.borderSubtle,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sectionLink: { fontSize: 12, fontWeight: '600', color: COLORS.cyan },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  list: { gap: 10 },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  taskTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 19 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 },
  projectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  projectDot: { width: 6, height: 6, borderRadius: 3 },
  projectText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  prioPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  prioText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dueText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  stepsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 10,
    gap: 6,
  },
  stepsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepsLabel: { fontSize: 11, fontWeight: '700', color: COLORS.cyan },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  stepText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  stepTextDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
});

