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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Month Header */}
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

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {calendarCells.map((cell, idx) => {
            if (!cell.day || !cell.ymd) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }
            const isSelected = cell.ymd === selectedYmd;
            const isToday = cell.ymd === todayYmd;
            const count = tasksByDate[cell.ymd]?.length || 0;
            const hasOverdue =
              cell.ymd < todayYmd &&
              (tasksByDate[cell.ymd] || []).some((t) => t.status !== 'completed');

            return (
              <TouchableOpacity
                key={cell.ymd}
                style={[
                  styles.dayCell,
                  isToday && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
                onPress={() => setSelectedYmd(cell.ymd!)}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isToday && { color: colors.cyan },
                    isSelected && { color: '#09090b', fontWeight: '800' },
                  ]}
                >
                  {cell.day}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: isSelected
                          ? '#09090b'
                          : hasOverdue
                            ? colors.rose
                            : colors.cyan,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Day Agenda */}
      <View style={styles.agendaHeader}>
        <Text style={styles.agendaTitle}>
          {selectedYmd === todayYmd ? 'Today' : formatDisplayDate(selectedYmd)}
        </Text>
        <Text style={styles.agendaCount}>
          {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
        </Text>
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
                <TouchableOpacity onPress={() => onAdvanceStatus(task)}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'radio-button-off'}
                    size={20}
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
      gap: 14,
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center',
    },
    monthCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 14,
      gap: 12,
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
    dayCell: {
      width: '14.28%',
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      gap: 3,
    },
    dayToday: { borderWidth: 1, borderColor: COLORS.cyanBorder },
    daySelected: { backgroundColor: COLORS.cyan },
    dayNum: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
    dot: { width: 5, height: 5, borderRadius: 3 },
    agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    agendaTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    agendaCount: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
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
  });
