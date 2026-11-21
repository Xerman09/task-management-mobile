import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_STATUS_COLUMNS, PRIORITY_COLORS, ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Subtask, Task, TaskPriority, TaskStatus } from '../types';
import { formatDisplayDate, formatEstimatedMinutes } from '../utils/date';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdateStatus: (taskId: number, status: TaskStatus) => void;
  onUpdatePriority: (taskId: number, priority: TaskPriority) => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onAddSubtask: (taskId: number, title: string) => void;
  onDeleteSubtask: (taskId: number, subtaskId: number) => void;
  onRequestDeleteTask: (task: Task) => void;
}

export default function TaskDetailModal({
  task,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onRequestDeleteTask,
}: TaskDetailModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [newStep, setNewStep] = useState('');

  if (!task) return null;

  const doneCount = task.subtasks.filter((s) => s.is_completed).length;
  const pct = task.subtasks.length > 0 ? Math.round((doneCount / task.subtasks.length) * 100) : 0;
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

  return (
    <Modal visible={Boolean(task)} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>TSK-{task.id}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => onRequestDeleteTask(task)}>
                <Ionicons name="trash-outline" size={20} color={colors.rose} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
            <Text style={styles.title}>{task.title}</Text>

            <View style={styles.metaRow}>
              {task.project_name && (
                <View style={styles.metaChip}>
                  <View style={[styles.dot, { backgroundColor: task.project_color || colors.cyan }]} />
                  <Text style={styles.metaText}>{task.project_name}</Text>
                </View>
              )}
              {task.due_date && (
                <View style={styles.metaChip}>
                  <Ionicons name="calendar-outline" size={12} color={colors.cyan} />
                  <Text style={styles.metaText}>{formatDisplayDate(task.due_date)}</Text>
                </View>
              )}
              {task.estimated_minutes && (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={12} color={colors.amber} />
                  <Text style={styles.metaText}>
                    Est. {formatEstimatedMinutes(task.estimated_minutes)}
                  </Text>
                </View>
              )}
            </View>

            {/* Status Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Status</Text>
              <View style={styles.pillRow}>
                {DEFAULT_STATUS_COLUMNS.map((col) => {
                  const active = task.status === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[
                        styles.pill,
                        active && { borderColor: col.color, backgroundColor: `${col.color}22` },
                      ]}
                      onPress={() => onUpdateStatus(task.id, col.id)}
                    >
                      <View style={[styles.dot, { backgroundColor: col.color }]} />
                      <Text style={[styles.pillText, active && { color: colors.textPrimary }]}>
                        {col.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Priority Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Priority</Text>
              <View style={styles.pillRow}>
                {priorities.map((p) => {
                  const active = task.priority === p;
                  const c = PRIORITY_COLORS[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.pill,
                        active && { backgroundColor: c.bg, borderColor: c.border },
                      ]}
                      onPress={() => onUpdatePriority(task.id, p)}
                    >
                      <Text style={[styles.pillText, active && { color: c.text }]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            {task.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <View style={styles.descBox}>
                  <Text style={styles.descText}>{task.description}</Text>
                </View>
              </View>
            ) : null}

            {/* Steps on how to finish */}
            <View style={styles.section}>
              <View style={styles.stepsHeader}>
                <Text style={styles.sectionLabel}>
                  Steps on how to finish ({doneCount}/{task.subtasks.length})
                </Text>
                {task.subtasks.length > 0 && <Text style={styles.pctText}>{pct}%</Text>}
              </View>

              {task.subtasks.length > 0 && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
              )}

              <View style={{ gap: 8 }}>
                {task.subtasks.map((sub) => (
                  <View key={sub.id} style={styles.subRow}>
                    <TouchableOpacity
                      style={styles.subMain}
                      onPress={() => onToggleSubtask(sub)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={sub.is_completed ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={sub.is_completed ? colors.emerald : colors.textMuted}
                      />
                      <Text style={[styles.subTitle, sub.is_completed && styles.subTitleDone]}>
                        {sub.title}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDeleteSubtask(task.id, sub.id)}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newStep}
                  onChangeText={setNewStep}
                  placeholder="Add a step to finish this task..."
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={() => {
                    if (newStep.trim()) {
                      onAddSubtask(task.id, newStep.trim());
                      setNewStep('');
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => {
                    if (newStep.trim()) {
                      onAddSubtask(task.id, newStep.trim());
                      setNewStep('');
                    }
                  }}
                >
                  <Ionicons name="add" size={18} color="#09090b" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (COLORS: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.74)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  idBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  idText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  body: { padding: 18 },
  title: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 25 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  descBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  descText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  stepsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctText: { fontSize: 12, fontWeight: '700', color: COLORS.emerald },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.emerald, borderRadius: 3 },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  subTitle: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  subTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

