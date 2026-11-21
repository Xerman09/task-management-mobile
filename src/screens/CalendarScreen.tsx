import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIORITY_COLORS, ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Task } from '../types';
import { formatDisplayDate, getTodayYMD } from '../utils/date';

interface CalendarScreenProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onAdvanceStatus: (task: Task) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function CalendarScreen({
  tasks,
  onSelectTask,
  onAdvanceStatus,
}: CalendarScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const todayYmd = getTodayYMD();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYmd, setSelectedYmd] = useState(todayYmd);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (t.due_date) {
        if (!map[t.due_date]) map[t.due_date] = [];
        map[t.due_date].push(t);
      }
    }
    return map;
  }, [tasks]);

  const gamification = useMemo(() => {
    const monthPrefix = `${year}-${pad2(month + 1)}-`;
    let perfectDays = 0;
    let totalDoneAll = 0;
    let monthDone = 0;
    let monthTotal = 0;

    for (const t of tasks) {
      if (t.status === 'completed') totalDoneAll += 1;
    }

    for (const [ymd, list] of Object.entries(tasksByDate)) {
      if (list.length === 0) continue;
      const done = list.filter((t) => t.status === 'completed').length;
      if (done === list.length) perfectDays += 1;
      if (ymd.startsWith(monthPrefix)) {
        monthDone += done;
        monthTotal += list.length;
      }
    }

    const xp = totalDoneAll * 25 + perfectDays * 50;
    const level = Math.floor(xp / 250) + 1;
    const levelPct = Math.round(((xp % 250) / 250) * 100);
    const monthPct = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;

    return { perfectDays, xp, level, levelPct, monthPct, monthDone, monthTotal };
  }, [tasks, tasksByDate, year, month]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; ymd: string | null }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, ymd: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, ymd: `${year}-${pad2(month + 1)}-${pad2(d)}` });
    }
    return cells;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const dayTasks = tasksByDate[selectedYmd] || [];
  const dayDone = dayTasks.filter((t) => t.status === 'completed').length;
  const dayPct = dayTasks.length > 0 ? Math.round((dayDone / dayTasks.length) * 100) : 0;

  const questBadge =
    dayTasks.length === 0
      ? { label: 'Free Day', color: colors.textMuted, icon: 'sparkles-outline' as const }
      : dayPct === 100
        ? { label: 'Perfect Day!', color: colors.emerald, icon: 'trophy' as const }
        : dayPct >= 75
          ? { label: 'Almost There!', color: colors.cyan, icon: 'flash' as const }
          : dayPct > 0
            ? { label: 'In Progress', color: colors.amber, icon: 'rocket-outline' as const }
            : { label: 'Quest Ready', color: colors.violet, icon: 'flag-outline' as const };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Gamified Stats Banner */}
      <View style={styles.gameBanner}>
        <View style={styles.gameStat}>
          <View style={[styles.gameIcon, { backgroundColor: colors.amberSoft }]}>
            <Ionicons name="trophy" size={16} color={colors.amber} />
          </View>
          <View>
            <Text style={styles.gameVal}>Lv.{gamification.level}</Text>
            <Text style={styles.gameLbl}>{gamification.xp} XP</Text>
          </View>
        </View>

        <View style={styles.gameStat}>
          <View style={[styles.gameIcon, { backgroundColor: colors.emeraldSoft }]}>
            <Ionicons name="flame" size={16} color={colors.emerald} />
          </View>
          <View>
            <Text style={styles.gameVal}>{gamification.perfectDays}</Text>
            <Text style={styles.gameLbl}>Perfect Days</Text>
          </View>
        </View>

        <View style={styles.gameStat}>
          <View style={[styles.gameIcon, { backgroundColor: colors.cyanSoft }]}>
            <Ionicons name="pie-chart" size={16} color={colors.cyan} />
          </View>
          <View>
            <Text style={styles.gameVal}>{gamification.monthPct}%</Text>
            <Text style={styles.gameLbl}>Month Goal</Text>
          </View>
        </View>
      </View>

      {/* Month Calendar Card */}
      <View style={styles.monthCard}>
        <View style={styles.monthHeader}>
          <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const d = new Date();
                setYear(d.getFullYear());
                setMonth(d.getMonth());
                setSelectedYmd(todayYmd);
              }}
            >
              <Text style={styles.todayJump}>Jump to Today</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Weekday Labels */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={styles.weekLabel}>
              {w}
            </Text>
          ))}
        </View>

        {/* Days Grid with Per-Day Progress Fill */}
        <View style={styles.daysGrid}>
          {calendarCells.map((cell, idx) => {
            if (!cell.day || !cell.ymd) {
              return <View key={`empty-${idx}`} style={styles.dayCellWrap} />;
            }
            const list = tasksByDate[cell.ymd] || [];
            const total = list.length;
            const done = list.filter((t) => t.status === 'completed').length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            const isSelected = cell.ymd === selectedYmd;
            const isToday = cell.ymd === todayYmd;
            const isPerfect = total > 0 && done === total;
            const isOverdueZero = total > 0 && done === 0 && cell.ymd < todayYmd;

            const fillColor = isPerfect
              ? 'rgba(16, 185, 129, 0.28)'
              : pct > 0
                ? 'rgba(6, 182, 212, 0.24)'
                : isOverdueZero
                  ? 'rgba(239, 68, 68, 0.14)'
                  : 'transparent';

            const barColor = isPerfect
              ? colors.emerald
              : pct > 0
                ? colors.cyan
                : isOverdueZero
                  ? colors.rose
                  : colors.textMuted;

            return (
              <View key={cell.ymd} style={styles.dayCellWrap}>
                <TouchableOpacity
                  style={[
                    styles.dayCell,
                    isToday && styles.dayToday,
                    isPerfect && !isSelected && styles.dayPerfect,
                    isSelected && styles.daySelected,
                  ]}
                  onPress={() => setSelectedYmd(cell.ymd!)}
                  activeOpacity={0.8}
                >
                  {/* Vertical bottom-up fill representing % completed for that day */}
                  {total > 0 && !isSelected && (
                    <View
                      style={[
                        styles.dayFillOverlay,
                        {
                          height: `${pct > 0 ? Math.max(18, pct) : 100}%`,
                          backgroundColor: fillColor,
                        },
                      ]}
                    />
                  )}

                  <View style={styles.dayTopRow}>
                    <Text
                      style={[
                        styles.dayNum,
                        isToday && !isSelected && { color: colors.cyan },
                        isSelected && { color: '#09090b', fontWeight: '800' },
                      ]}
                    >
                      {cell.day}
                    </Text>
                    {isPerfect && (
                      <Ionicons
                        name="star"
                        size={9}
                        color={isSelected ? '#09090b' : colors.emerald}
                      />
                    )}
                  </View>

                  {total > 0 && (
                    <View style={styles.cellBarTrack}>
                      <View
                        style={[
                          styles.cellBarFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: isSelected ? '#09090b' : barColor,
                          },
                        ]}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* Selected Day Quest Progress Card */}
      <View style={styles.questCard}>
        <View style={styles.questHeader}>
          <View>
            <Text style={styles.agendaTitle}>
              {selectedYmd === todayYmd ? 'Today' : formatDisplayDate(selectedYmd)}
            </Text>
            <Text style={styles.questSub}>
              {dayTasks.length === 0
                ? 'No quests scheduled'
                : `${dayDone} of ${dayTasks.length} completed (${dayPct}%)`}
            </Text>
          </View>
          <View style={[styles.questBadge, { borderColor: questBadge.color }]}>
            <Ionicons name={questBadge.icon} size={13} color={questBadge.color} />
            <Text style={[styles.questBadgeText, { color: questBadge.color }]}>
              {questBadge.label}
            </Text>
          </View>
        </View>

        {dayTasks.length > 0 && (
          <View style={styles.questTrack}>
            <View
              style={[
                styles.questFill,
                {
                  width: `${dayPct}%`,
                  backgroundColor: dayPct === 100 ? colors.emerald : colors.cyan,
                },
              ]}
            />
          </View>
        )}
      </View>

      {dayTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-clear-outline" size={26} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No tasks scheduled for this date</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {dayTasks.map((task) => {
            const prio = PRIORITY_COLORS[task.priority];
            const done = task.status === 'completed';
            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskCard, { borderLeftWidth: 3, borderLeftColor: prio.text }]}
                onPress={() => onSelectTask(task)}
                activeOpacity={0.85}
              >
                <TouchableOpacity
                  onPress={() => onAdvanceStatus(task)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={21}
                    color={done ? colors.emerald : colors.textMuted}
                  />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>{task.title}</Text>
                  <View style={styles.metaRow}>
                    {task.project_name && (
                      <Text style={styles.metaText}>{task.project_name}</Text>
                    )}
                    <View style={[styles.prioBadge, { backgroundColor: prio.bg, borderColor: prio.border }]}>
                      <Text style={[styles.prioText, { color: prio.text }]}>{task.priority}</Text>
                    </View>
                    {done && <Text style={styles.xpTag}>+25 XP</Text>}
                  </View>
                </View>
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
      gap: 12,
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center',
    },
    gameBanner: {
      flexDirection: 'row',
      gap: 8,
    },
    gameStat: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 10,
    },
    gameIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameVal: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
    gameLbl: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
    monthCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 14,
      gap: 10,
    },
    monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    todayJump: { fontSize: 11, fontWeight: '700', color: COLORS.cyan, marginTop: 2 },
    weekRow: { flexDirection: 'row' },
    weekLabel: {
      width: '14.28%',
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.textMuted,
    },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCellWrap: {
      width: '14.28%',
      padding: 2,
    },
    dayCell: {
      height: 46,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
    },
    dayFillOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    dayToday: { borderColor: COLORS.cyan, borderWidth: 1.5 },
    dayPerfect: { borderColor: 'rgba(16, 185, 129, 0.55)' },
    daySelected: { backgroundColor: COLORS.cyan, borderColor: COLORS.cyan },
    dayTopRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    dayNum: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
    cellBarTrack: {
      width: '82%',
      height: 3,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.12)',
      overflow: 'hidden',
    },
    cellBarFill: { height: '100%', borderRadius: 2 },
    questCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 14,
      gap: 10,
    },
    questHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    agendaTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    questSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    questBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: COLORS.card,
    },
    questBadgeText: { fontSize: 11, fontWeight: '800' },
    questTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.borderSubtle,
      overflow: 'hidden',
    },
    questFill: { height: '100%', borderRadius: 4 },
    emptyCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 24,
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
    list: { gap: 8 },
    taskCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 12,
    },
    taskTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
    taskTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    metaText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
    prioBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
    prioText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    xpTag: { fontSize: 10, fontWeight: '800', color: COLORS.emerald },
  });
