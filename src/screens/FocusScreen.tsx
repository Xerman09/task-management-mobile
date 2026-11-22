import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIORITY_COLORS, ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Task } from '../types';
import { triggerHaptic } from '../utils/feedback';

interface FocusScreenProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onSelectTask: (task: Task) => void;
  onNotify: (msg: string) => void;
}

type FocusMode = 'focus' | 'deep' | 'short_break' | 'long_break';

const MODES: { id: FocusMode; label: string; minutes: number; isBreak: boolean }[] = [
  { id: 'focus', label: 'Focus', minutes: 25, isBreak: false },
  { id: 'deep', label: 'Deep Work', minutes: 50, isBreak: false },
  { id: 'short_break', label: 'Short Break', minutes: 5, isBreak: true },
  { id: 'long_break', label: 'Long Break', minutes: 15, isBreak: true },
];

export default function FocusScreen({
  tasks,
  onToggleComplete,
  onSelectTask,
  onNotify,
}: FocusScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<FocusMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);

  const activeModeObj = MODES.find((m) => m.id === mode) || MODES[0];
  const totalSeconds = activeModeObj.minutes * 60;
  const elapsedPct = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);
  const focusedTask = useMemo(
    () => openTasks.find((t) => t.id === focusedTaskId) || openTasks[0] || null,
    [openTasks, focusedTaskId]
  );

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || secondsLeft > 0) return;
    setRunning(false);
    void triggerHaptic('success');
    if (!activeModeObj.isBreak) {
      setSessionsCompleted((s) => s + 1);
      onNotify('Focus session complete! +25 XP');
      setMode('short_break');
      setSecondsLeft(5 * 60);
    } else {
      onNotify('Break finished! Ready for next focus block.');
      setMode('focus');
      setSecondsLeft(25 * 60);
    }
  }, [running, secondsLeft, activeModeObj.isBreak, onNotify]);

  const selectMode = (next: FocusMode) => {
    const m = MODES.find((x) => x.id === next) || MODES[0];
    setRunning(false);
    setMode(next);
    setSecondsLeft(m.minutes * 60);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const clockStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const accent = activeModeObj.isBreak ? colors.emerald : colors.cyan;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Mode Selector */}
      <View style={styles.modeGrid}>
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeChip, active && { backgroundColor: `${accent}22`, borderColor: accent }]}
              onPress={() => selectMode(m.id)}
            >
              <Text style={[styles.modeText, active && { color: accent }]}>
                {m.label} ({m.minutes}m)
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Timer Card */}
      <View style={[styles.timerCard, { borderColor: `${accent}55` }]}>
        <View style={styles.timerTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${accent}20` }]}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.statusText, { color: accent }]}>
              {activeModeObj.isBreak ? 'REST & RECHARGE' : 'DEEP FOCUS'}
            </Text>
          </View>
          <View style={styles.sessionPill}>
            <Ionicons name="flame" size={13} color={colors.amber} />
            <Text style={styles.sessionText}>{sessionsCompleted} sessions</Text>
          </View>
        </View>

        <Text style={styles.clock}>{clockStr}</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${elapsedPct}%`, backgroundColor: accent }]} />
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.ctrlSecondary}
            onPress={() => {
              setRunning(false);
              setSecondsLeft(activeModeObj.minutes * 60);
            }}
          >
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            <Text style={styles.ctrlSecondaryText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlPrimary, { backgroundColor: accent }]}
            onPress={() => {
              void triggerHaptic('light');
              setRunning((r) => !r);
            }}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={19} color="#09090b" />
            <Text style={styles.ctrlPrimaryText}>{running ? 'Pause' : 'Start'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctrlSecondary}
            onPress={() => {
              setRunning(false);
              selectMode(activeModeObj.isBreak ? 'focus' : 'short_break');
            }}
          >
            <Ionicons name="play-skip-forward" size={17} color={colors.textSecondary} />
            <Text style={styles.ctrlSecondaryText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Task Target */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Focusing On</Text>
        <Text style={styles.sectionSub}>{openTasks.length} open tasks</Text>
      </View>

      {focusedTask ? (
        <View style={styles.activeTaskCard}>
          <TouchableOpacity
            onPress={() => onToggleComplete(focusedTask)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipse-outline" size={22} color={accent} />
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onSelectTask(focusedTask)}>
            <Text style={styles.activeTaskTitle}>{focusedTask.title}</Text>
            <Text style={styles.activeTaskMeta}>
              {focusedTask.project_name || 'Personal'} • {focusedTask.priority.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Ionicons name="checkmark-circle-outline" size={24} color={colors.emerald} />
          <Text style={styles.emptyText}>All tasks completed! Enjoy your focus time.</Text>
        </View>
      )}

      {/* Switch Focused Task List */}
      {openTasks.length > 1 && (
        <View style={styles.taskPickerList}>
          <Text style={styles.pickerLabel}>SWITCH TARGET TASK</Text>
          {openTasks.slice(0, 8).map((t) => {
            const selected = focusedTask?.id === t.id;
            const prio = PRIORITY_COLORS[t.priority];
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.pickRow, selected && { borderColor: accent, backgroundColor: `${accent}14` }]}
                onPress={() => setFocusedTaskId(t.id)}
              >
                <View style={[styles.prioDot, { backgroundColor: prio.text }]} />
                <Text style={styles.pickTitle} numberOfLines={1}>
                  {t.title}
                </Text>
                {selected && <Ionicons name="checkmark" size={15} color={accent} />}
              </TouchableOpacity>
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
      padding: 16,
      paddingBottom: 100,
      gap: 14,
      maxWidth: 760,
      width: '100%',
      alignSelf: 'center',
    },
    modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    modeChip: {
      flexGrow: 1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
    },
    modeText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
    timerCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      padding: 20,
      alignItems: 'center',
      gap: 16,
    },
    timerTopRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    dot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
    sessionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
    },
    sessionText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
    clock: {
      fontSize: 60,
      fontWeight: '900',
      color: COLORS.textPrimary,
      fontVariant: ['tabular-nums'],
      letterSpacing: 2,
    },
    progressTrack: {
      width: '100%',
      height: 7,
      borderRadius: 4,
      backgroundColor: COLORS.borderSubtle,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 4 },
    controlsRow: { flexDirection: 'row', gap: 10, width: '100%' },
    ctrlPrimary: {
      flex: 1.4,
      height: 46,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    ctrlPrimaryText: { fontSize: 14, fontWeight: '800', color: '#09090b' },
    ctrlSecondary: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    ctrlSecondaryText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
    sectionSub: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
    activeTaskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 14,
    },
    activeTaskTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
    activeTaskMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    emptyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 18,
    },
    emptyText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
    taskPickerList: { gap: 6 },
    pickerLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.8 },
    pickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    prioDot: { width: 7, height: 7, borderRadius: 4 },
    pickTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  });

