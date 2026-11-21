import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIORITY_COLORS, ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
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
  onTogglePomodoro?: () => void;
}

export default function HomeScreen({
  user,
  tasks,
  onOpenCreate,
  onSelectTask,
  onAdvanceStatus,
  onToggleSubtask,
  onGoToTasks,
  onTogglePomodoro,
}: HomeScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const todayStr = getTodayYMD();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const todayAllTasks = tasks.filter((t) => t.due_date === todayStr);
  const todayDone = todayAllTasks.filter((t) => t.status === 'completed').length;
  const todayPct = todayAllTasks.length > 0 ? Math.round((todayDone / todayAllTasks.length) * 100) : 0;
  const dueTodayTasks = todayAllTasks.filter((t) => t.status !== 'completed');
  const overdueTasks = tasks.filter(
    (t) => Boolean(t.due_date) && (t.due_date as string) < todayStr && t.status !== 'completed'
  );
  const focusTasks = [...overdueTasks, ...dueTodayTasks].slice(0, 6);

  const { xp, level, levelPct, xpInLevel, rankTitle, perfectDays } = useMemo(() => {
    const byDay: Record<string, { total: number; done: number }> = {};
    let doneStepsCount = 0;
    for (const t of tasks) {
      doneStepsCount += t.subtasks.filter((s) => s.is_completed).length;
      if (!t.due_date) continue;
      if (!byDay[t.due_date]) byDay[t.due_date] = { total: 0, done: 0 };
      byDay[t.due_date].total += 1;
      if (t.status === 'completed') byDay[t.due_date].done += 1;
    }
    let perf = 0;
    for (const d of Object.values(byDay)) {
      if (d.total > 0 && d.done === d.total) perf += 1;
    }
    const totalXp = completed * 25 + doneStepsCount * 5 + perf * 50;
    const lvl = Math.floor(totalXp / 250) + 1;
    const inLvl = totalXp % 250;
    const pct = Math.round((inLvl / 250) * 100);
    const rank =
      lvl >= 10
        ? 'Flow Legend'
        : lvl >= 6
          ? 'Task Master'
          : lvl >= 3
            ? 'Focus Knight'
            : 'Task Apprentice';
    return {
      xp: totalXp,
      level: lvl,
      levelPct: pct,
      xpInLevel: inLvl,
      rankTitle: rank,
      perfectDays: perf,
    };
  }, [tasks, completed]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Gamified Hero Focus Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.levelBadgeRow}>
              <View style={styles.levelPill}>
                <Ionicons name="trophy" size={11} color={colors.amber} />
                <Text style={styles.levelPillText}>{rankTitle.toUpperCase()}</Text>
              </View>
              <Text style={styles.xpText}>{xp} XP</Text>
            </View>
            <Text style={styles.greeting}>Welcome back, {user.name.split(' ')[0]}</Text>
          </View>

          <View style={styles.levelCrest}>
            <Text style={styles.levelCrestLabel}>LEVEL</Text>
            <Text style={styles.levelCrestNum}>{level}</Text>
          </View>
        </View>

        {/* Scannable Status Pills */}
        <View style={styles.heroChipsRow}>
          <View style={styles.heroChip}>
            <Ionicons name="sunny" size={12} color={colors.amber} />
            <Text style={styles.heroChipText}>{dueTodayTasks.length} Due Today</Text>
          </View>
          <View
            style={[
              styles.heroChip,
              overdueTasks.length > 0 && {
                backgroundColor: colors.roseSoft,
                borderColor: 'rgba(239, 68, 68, 0.35)',
              },
            ]}
          >
            <Ionicons
              name="flame"
              size={12}
              color={overdueTasks.length > 0 ? colors.rose : colors.textMuted}
            />
            <Text
              style={[
                styles.heroChipText,
                overdueTasks.length > 0 && { color: '#fca5a5' },
              ]}
            >
              {overdueTasks.length} Overdue
            </Text>
          </View>
          <View style={styles.heroChip}>
            <Ionicons name="star" size={12} color={colors.emerald} />
            <Text style={styles.heroChipText}>{perfectDays} Perfect</Text>
          </View>
        </View>

        {/* Dual Gamified Progress Bars: Today's Quest + Level XP */}
        <View style={styles.barsWrap}>
          <View style={styles.barHeaderRow}>
            <Text style={styles.barLabel}>
              {todayAllTasks.length > 0
                ? `Today's Quest (${todayDone}/${todayAllTasks.length})`
                : `Workspace Quest (${completed}/${total})`}
            </Text>
            <Text
              style={[
                styles.barVal,
                todayPct === 100 && todayAllTasks.length > 0 && { color: colors.emerald },
              ]}
            >
              {todayAllTasks.length > 0
                ? todayPct === 100
                  ? 'Perfect Day! +50 XP'
                  : `${todayPct}%`
                : `${completionPct}%`}
            </Text>
          </View>
          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${todayAllTasks.length > 0 ? todayPct : completionPct}%`,
                  backgroundColor:
                    todayAllTasks.length > 0 && todayPct === 100 ? colors.emerald : colors.cyan,
                },
              ]}
            />
          </View>

          <View style={[styles.barHeaderRow, { marginTop: 4 }]}>
            <Text style={styles.barLabel}>Level {level + 1} Progress</Text>
            <Text style={styles.barVal}>{xpInLevel}/250 XP</Text>
          </View>
          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                { width: `${Math.max(4, levelPct)}%`, backgroundColor: colors.amber },
              ]}
            />
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
      </View>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <TouchableOpacity style={styles.kpiCard} onPress={() => onGoToTasks('all')} activeOpacity={0.8}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>Completion</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: colors.cyanSoft }]}>
              <Ionicons name="checkmark-done" size={14} color={colors.cyan} />
            </View>
          </View>
          <Text style={styles.kpiValue}>{completionPct}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completionPct}%`, backgroundColor: colors.cyan }]} />
          </View>
          <Text style={styles.kpiSub}>
            {completed} of {total} done
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={() => onGoToTasks('today')} activeOpacity={0.8}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>Due Today</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: colors.amberSoft }]}>
              <Ionicons name="sunny" size={14} color={colors.amber} />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: colors.amber }]}>{dueTodayTasks.length}</Text>
          <Text style={styles.kpiSub}>Scheduled for today</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={() => onGoToTasks('missed')} activeOpacity={0.8}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>Missed</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: overdueTasks.length > 0 ? colors.roseSoft : colors.emeraldSoft }]}>
              <Ionicons
                name={overdueTasks.length > 0 ? 'alert-circle' : 'shield-checkmark'}
                size={14}
                color={overdueTasks.length > 0 ? colors.rose : colors.emerald}
              />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: overdueTasks.length > 0 ? colors.rose : colors.textPrimary }]}>
            {overdueTasks.length}
          </Text>
          <Text style={styles.kpiSub}>{overdueTasks.length > 0 ? 'Needs attention' : 'On track'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={() => onGoToTasks('all')} activeOpacity={0.8}>
          <View style={styles.kpiTop}>
            <Text style={styles.kpiLabel}>Open Tasks</Text>
            <View style={[styles.kpiIconBox, { backgroundColor: colors.violetSoft }]}>
              <Ionicons name="layers" size={14} color="#c4b5fd" />
            </View>
          </View>
          <Text style={styles.kpiValue}>{total - completed}</Text>
          <Text style={styles.kpiSub}>Active workspace items</Text>
        </TouchableOpacity>
      </View>

      {/* Today's & Overdue Focus */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s Focus &amp; Urgent</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onTogglePomodoro && (
            <TouchableOpacity style={styles.sectionPillBtn} onPress={onTogglePomodoro}>
              <Ionicons name="timer-outline" size={13} color={colors.cyan} />
              <Text style={styles.sectionPillText}>Focus</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.sectionPillBtn} onPress={() => onGoToTasks('all')}>
            <Text style={styles.sectionPillText}>View All</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.cyan} />
          </TouchableOpacity>
        </View>
      </View>

      {focusTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={28} color={colors.emerald} />
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
                style={[styles.taskCard, { borderLeftWidth: 3, borderLeftColor: prio.text }]}
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
                      color={task.status === 'in_progress' ? colors.amber : colors.textMuted}
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
                            style={[styles.projectDot, { backgroundColor: task.project_color || colors.cyan }]}
                          />
                          <Text style={styles.projectText}>{task.project_name}</Text>
                        </View>
                      )}
                      <View style={[styles.prioPill, { backgroundColor: prio.bg, borderColor: prio.border }]}>
                        <Text style={[styles.prioText, { color: prio.text }]}>{task.priority}</Text>
                      </View>
                      {task.due_date && (
                        <Text style={[styles.dueText, isOverdue && { color: colors.rose }]}>
                          {task.due_date === todayStr ? 'Today' : formatDisplayDate(task.due_date)}
                        </Text>
                      )}
                      <View style={styles.xpRewardPill}>
                        <Text style={styles.xpRewardText}>+25 XP</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {task.subtasks.length > 0 && (
                  <View style={styles.stepsBox}>
                    <View style={styles.stepsHeader}>
                      <Ionicons name="list-outline" size={13} color={colors.cyan} />
                      <Text style={styles.stepsLabel}>
                        Steps ({doneSteps}/{task.subtasks.length})
                      </Text>
                    </View>
                    <View style={styles.miniProgressTrack}>
                      <View
                        style={[
                          styles.miniProgressFill,
                          {
                            width: `${Math.round((doneSteps / task.subtasks.length) * 100)}%`,
                            backgroundColor: doneSteps === task.subtasks.length ? colors.emerald : colors.cyan,
                          },
                        ]}
                      />
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
                          color={sub.is_completed ? colors.emerald : colors.textMuted}
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

const createStyles = (COLORS: ThemePalette) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 100, gap: 16, maxWidth: 960, width: '100%', alignSelf: 'center' },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    padding: 16,
    gap: 12,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  levelBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  levelPillText: { fontSize: 10, fontWeight: '800', color: COLORS.amber, letterSpacing: 0.5 },
  xpText: { fontSize: 11, fontWeight: '800', color: COLORS.cyan },
  levelCrest: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCrestLabel: { fontSize: 9, fontWeight: '800', color: COLORS.amber, letterSpacing: 0.6 },
  levelCrestNum: { fontSize: 21, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 23 },
  heroChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  heroChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  barsWrap: { gap: 5 },
  barHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  barVal: { fontSize: 11, fontWeight: '800', color: COLORS.textPrimary },
  kicker: { fontSize: 11, fontWeight: '700', color: COLORS.cyan, letterSpacing: 0.8 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  heroSummary: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  heroPctBadge: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPctValue: { fontSize: 17, fontWeight: '800', color: COLORS.cyan },
  heroPctLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6 },
  heroProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.cyan,
  },
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
  actionPrimary: { backgroundColor: COLORS.cyan },
  actionPrimaryText: { fontSize: 13, fontWeight: '800', color: '#09090b' },
  actionAi: { backgroundColor: COLORS.violetSoft, borderWidth: 1, borderColor: COLORS.violetBorder },
  actionAiText: { fontSize: 13, fontWeight: '700', color: '#ddd6fe' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionPillText: { fontSize: 11, fontWeight: '700', color: COLORS.cyan },
  miniProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderSubtle,
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  xpRewardPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.emeraldSoft,
  },
  xpRewardText: { fontSize: 9, fontWeight: '800', color: COLORS.emerald },
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

