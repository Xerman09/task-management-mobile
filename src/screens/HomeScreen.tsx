import React, { useEffect, useMemo, useState } from 'react';
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

  const [pomoMode, setPomoMode] = useState<'focus' | 'break'>('focus');
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);

  useEffect(() => {
    if (!pomoRunning) return;
    const t = setInterval(() => {
      setPomoSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [pomoRunning]);

  useEffect(() => {
    if (!pomoRunning || pomoSeconds > 0) return;
    setPomoRunning(false);
    const next = pomoMode === 'focus' ? 'break' : 'focus';
    setPomoMode(next);
    setPomoSeconds(next === 'break' ? 5 * 60 : 25 * 60);
  }, [pomoRunning, pomoSeconds, pomoMode]);

  const pomoMins = Math.floor(pomoSeconds / 60);
  const pomoSecs = pomoSeconds % 60;
  const pomoFormatted = `${pomoMins < 10 ? '0' : ''}${pomoMins}:${pomoSecs < 10 ? '0' : ''}${pomoSecs}`;

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

  const { xp, level, levelPct, xpInLevel } = useMemo(() => {
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
    return {
      xp: totalXp,
      level: lvl,
      levelPct: Math.round((inLvl / 250) * 100),
      xpInLevel: inLvl,
    };
  }, [tasks, completed]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Editorial Greeting & Quiet Level Progress */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateText}>{formatDisplayDate(todayStr)}</Text>
            <Text style={styles.greeting}>Good day, {user.name.split(' ')[0]}</Text>
          </View>
          <View style={styles.levelTag}>
            <Text style={styles.levelTagText}>Lv. {level}</Text>
            <Text style={styles.levelXpText}>{xp} XP</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(3, todayAllTasks.length > 0 ? todayPct : levelPct)}%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressMetaRow}>
            <Text style={styles.progressMeta}>
              {todayAllTasks.length > 0
                ? `${todayDone} of ${todayAllTasks.length} today`
                : `${xpInLevel}/250 XP to Lv. ${level + 1}`}
            </Text>
            <Text style={styles.progressMeta}>{completionPct}% overall</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={() => onOpenCreate('single')}
          >
            <Ionicons name="add" size={17} color={colors.bg} />
            <Text style={styles.btnPrimaryText}>New Task</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.85}
            onPress={() => onOpenCreate('ai_plan')}
          >
            <Ionicons name="sparkles-outline" size={15} color={colors.textPrimary} />
            <Text style={styles.btnSecondaryText}>AI Plan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clean 4-Column Stat Strip */}
      <View style={styles.statStrip}>
        <TouchableOpacity style={styles.statItem} onPress={() => onGoToTasks('today')}>
          <Text style={styles.statVal}>{dueTodayTasks.length}</Text>
          <Text style={styles.statLbl}>Today</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => onGoToTasks('missed')}>
          <Text style={[styles.statVal, overdueTasks.length > 0 && { color: colors.rose }]}>
            {overdueTasks.length}
          </Text>
          <Text style={styles.statLbl}>Overdue</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => onGoToTasks('all')}>
          <Text style={styles.statVal}>{total - completed}</Text>
          <Text style={styles.statLbl}>Open</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => onGoToTasks('all')}>
          <Text style={styles.statVal}>{completed}</Text>
          <Text style={styles.statLbl}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Quiet Inline Focus Timer */}
      <View style={styles.pomoRow}>
        <TouchableOpacity
          style={styles.pomoLeft}
          activeOpacity={0.75}
          onPress={onTogglePomodoro}
        >
          <Ionicons name="timer-outline" size={17} color={colors.textSecondary} />
          <Text style={styles.pomoClock}>{pomoFormatted}</Text>
          <Text style={styles.pomoModeLbl}>
            {pomoMode === 'focus' ? 'Focus' : 'Break'}
          </Text>
        </TouchableOpacity>

        <View style={styles.pomoControls}>
          <TouchableOpacity
            style={styles.pomoSwitch}
            onPress={() => {
              const next = pomoMode === 'focus' ? 'break' : 'focus';
              setPomoRunning(false);
              setPomoMode(next);
              setPomoSeconds(next === 'break' ? 5 * 60 : 25 * 60);
            }}
          >
            <Text style={styles.pomoSwitchText}>
              {pomoMode === 'focus' ? '5m Break' : '25m Focus'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pomoPlay}
            onPress={() => setPomoRunning((r) => !r)}
          >
            <Ionicons
              name={pomoRunning ? 'pause' : 'play'}
              size={14}
              color={colors.bg}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pomoReset}
            onPress={() => {
              setPomoRunning(false);
              setPomoSeconds(pomoMode === 'focus' ? 25 * 60 : 5 * 60);
            }}
          >
            <Ionicons name="refresh" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Focus Queue */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Up Next</Text>
        <TouchableOpacity onPress={() => onGoToTasks('all')}>
          <Text style={styles.sectionLink}>See all</Text>
        </TouchableOpacity>
      </View>

      {focusTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color={colors.emerald} />
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptySub}>Nothing overdue or scheduled for today.</Text>
        </View>
      ) : (
        <View style={styles.listGroup}>
          {focusTasks.map((task, idx) => {
            const isOverdue = Boolean(task.due_date) && (task.due_date as string) < todayStr;
            const prio = PRIORITY_COLORS[task.priority];
            const doneSteps = task.subtasks.filter((s) => s.is_completed).length;

            return (
              <View
                key={task.id}
                style={[styles.taskRowWrap, idx > 0 && styles.taskRowBorder]}
              >
                <TouchableOpacity
                  style={styles.taskRow}
                  activeOpacity={0.75}
                  onPress={() => onSelectTask(task)}
                >
                  <TouchableOpacity
                    onPress={() => onAdvanceStatus(task)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={task.status === 'in_progress' ? 'disc-outline' : 'ellipse-outline'}
                      size={20}
                      color={task.status === 'in_progress' ? colors.amber : colors.textMuted}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {task.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.prioDot, { backgroundColor: prio.text }]} />
                      {task.project_name && (
                        <Text style={styles.metaText}>{task.project_name}</Text>
                      )}
                      {task.due_date && (
                        <Text style={[styles.metaText, isOverdue && { color: colors.rose }]}>
                          {task.project_name ? '· ' : ''}
                          {task.due_date === todayStr ? 'Today' : formatDisplayDate(task.due_date)}
                        </Text>
                      )}
                      {task.subtasks.length > 0 && (
                        <Text style={styles.metaText}>
                          · {doneSteps}/{task.subtasks.length} steps
                        </Text>
                      )}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </TouchableOpacity>

                {task.subtasks.length > 0 && (
                  <View style={styles.stepsInline}>
                    {task.subtasks.slice(0, 2).map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={styles.stepRow}
                        onPress={() => onToggleSubtask(sub)}
                      >
                        <Ionicons
                          name={sub.is_completed ? 'checkbox' : 'square-outline'}
                          size={15}
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
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (COLORS: ThemePalette) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: COLORS.bg },
    content: {
      padding: 18,
      paddingBottom: 100,
      gap: 16,
      maxWidth: 820,
      width: '100%',
      alignSelf: 'center',
    },
    headerBlock: { gap: 14 },
    headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    dateText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    greeting: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2, letterSpacing: -0.4 },
    levelTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
    },
    levelTagText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
    levelXpText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
    progressWrap: { gap: 6 },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.borderSubtle,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.emerald },
    progressMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressMeta: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
    actionsRow: { flexDirection: 'row', gap: 10 },
    btnPrimary: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      backgroundColor: COLORS.textPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    btnPrimaryText: { fontSize: 13, fontWeight: '700', color: COLORS.bg },
    btnSecondary: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    btnSecondaryText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
    statStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      paddingVertical: 12,
    },
    statItem: { flex: 1, alignItems: 'center', gap: 2 },
    statVal: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
    statLbl: { fontSize: 11, fontWeight: '500', color: COLORS.textMuted },
    statDivider: { width: 1, height: 22, backgroundColor: COLORS.borderSubtle },
    pomoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    pomoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pomoClock: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    pomoModeLbl: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
    pomoControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pomoSwitch: { paddingHorizontal: 8, paddingVertical: 4 },
    pomoSwitchText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
    pomoPlay: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: COLORS.textPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pomoReset: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
    sectionLink: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
    emptyCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      padding: 24,
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
    emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
    listGroup: {
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      overflow: 'hidden',
    },
    taskRowWrap: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
    taskRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.borderSubtle },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    taskTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 19 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
    prioDot: { width: 6, height: 6, borderRadius: 3 },
    metaText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
    stepsInline: { paddingLeft: 32, gap: 6 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
    stepTextDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  });
