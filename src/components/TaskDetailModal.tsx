import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTaskComment, deleteTaskComment, getTaskComments } from '../api';
import { DEFAULT_STATUS_COLUMNS, PRIORITY_COLORS, ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Project, Subtask, Tag, Task, TaskComment, TaskPriority, TaskRecurrence, TaskStatus } from '../types';
import { formatDisplayDate, formatEstimatedMinutes, getTodayYMD } from '../utils/date';

interface TaskDetailModalProps {
  task: Task | null;
  projects: Project[];
  availableTags: Tag[];
  currentUserId?: number;
  onClose: () => void;
  onUpdateStatus: (taskId: number, status: TaskStatus) => void;
  onUpdatePriority: (taskId: number, priority: TaskPriority) => void;
  onUpdateTaskFields: (
    taskId: number,
    patch: {
      title?: string;
      description?: string | null;
      due_date?: string | null;
      recurrence?: TaskRecurrence;
      project_id?: number | null;
      estimated_minutes?: number | null;
      tags?: (number | string | { id?: number; name: string; color?: string })[];
    }
  ) => Promise<void>;
  onCreateTag: (name: string) => Promise<Tag | null>;
  onToggleSubtask: (subtask: Subtask) => void;
  onAddSubtask: (taskId: number, title: string) => void;
  onDeleteSubtask: (taskId: number, subtaskId: number) => void;
  onRequestDeleteTask: (task: Task) => void;
}

const RECURRENCES: { value: TaskRecurrence; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function TaskDetailModal({
  task,
  projects,
  availableTags,
  currentUserId,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateTaskFields,
  onCreateTag,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onRequestDeleteTask,
}: TaskDetailModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [newStep, setNewStep] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>('none');
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [editEstMinutes, setEditEstMinutes] = useState('');

  const [newTagInput, setNewTagInput] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [task?.id]);

  useEffect(() => {
    if (!task || editing) return;
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditDueDate(task.due_date || '');
    setEditRecurrence(task.recurrence || 'none');
    setEditProjectId(task.project_id ?? null);
    setEditEstMinutes(task.estimated_minutes ? String(task.estimated_minutes) : '');
  }, [task, editing]);

  useEffect(() => {
    if (!task) {
      setComments([]);
      return;
    }
    let mounted = true;
    setCommentsLoading(true);
    getTaskComments(task.id)
      .then((res) => {
        if (mounted && res.success) {
          setComments(res.comments || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setCommentsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [task?.id]);

  if (!task) return null;

  const taskProject = projects.find((p) => p.id === task.project_id);
  const statusColumns =
    taskProject?.statuses && taskProject.statuses.length > 0
      ? taskProject.statuses.map((s) => ({ id: s.slug, label: s.label, color: s.color }))
      : DEFAULT_STATUS_COLUMNS.map((c) => ({ id: c.id, label: c.label, color: c.color }));

  const doneCount = task.subtasks.filter((s) => s.is_completed).length;
  const pct = task.subtasks.length > 0 ? Math.round((doneCount / task.subtasks.length) * 100) : 0;
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

  const handleSaveEdits = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const parsedMins = editEstMinutes.trim() ? parseInt(editEstMinutes.trim(), 10) : null;
      await onUpdateTaskFields(task.id, {
        title: trimmed,
        description: editDescription.trim() || null,
        due_date: editDueDate.trim() || null,
        recurrence: editRecurrence,
        project_id: editProjectId,
        estimated_minutes: parsedMins && !Number.isNaN(parsedMins) ? parsedMins : null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTag = async (tag: Tag) => {
    const currentTags = task.tags || [];
    const exists = currentTags.some((t) => t.id === tag.id || t.name.toLowerCase() === tag.name.toLowerCase());
    const nextNames = exists
      ? currentTags.filter((t) => t.id !== tag.id && t.name.toLowerCase() !== tag.name.toLowerCase()).map((t) => t.name)
      : [...currentTags.map((t) => t.name), tag.name];
    await onUpdateTaskFields(task.id, { tags: nextNames });
  };

  const handleAddTag = async () => {
    const name = newTagInput.trim();
    if (!name) return;
    setNewTagInput('');
    const created = await onCreateTag(name);
    const currentNames = (task.tags || []).map((t) => t.name);
    const tagName = created?.name || name;
    if (!currentNames.some((n) => n.toLowerCase() === tagName.toLowerCase())) {
      await onUpdateTaskFields(task.id, { tags: [...currentNames, tagName] });
    }
  };

  const handlePostComment = async () => {
    const body = commentInput.trim();
    if (!body || postingComment) return;
    setPostingComment(true);
    try {
      const res = await createTaskComment(task.id, body);
      if (res.success && res.comment) {
        setComments((prev) => [...prev, res.comment!]);
        setCommentInput('');
      }
    } finally {
      setPostingComment(false);
    }
  };

  const handleRemoveComment = async (commentId: number) => {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    try {
      const res = await deleteTaskComment(commentId);
      if (!res.success) setComments(prev);
    } catch {
      setComments(prev);
    }
  };

  return (
    <Modal visible={Boolean(task)} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: task.project_color || colors.cyan }]} />
              <Text style={styles.projectLabel}>{task.project_name || 'Personal Task'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setEditing((v) => !v)}
                style={[styles.iconBtn, editing && styles.iconBtnActive]}
              >
                <Ionicons
                  name={editing ? 'close-outline' : 'create-outline'}
                  size={17}
                  color={editing ? colors.cyan : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onRequestDeleteTask(task)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={17} color={colors.rose} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 16, paddingBottom: 28 }}>
            {editing ? (
              <View style={styles.editCard}>
                <Text style={styles.sectionLabel}>TITLE</Text>
                <TextInput
                  style={styles.input}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Task title"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Add notes or details..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />

                <View style={styles.rowBetween}>
                  <Text style={styles.sectionLabel}>DUE DATE</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => setEditDueDate(getTodayYMD())}>
                      <Text style={styles.quickLink}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditDueDate('')}>
                      <Text style={[styles.quickLink, { color: colors.textMuted }]}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={styles.input}
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                  placeholder="e.g. 2026-11-21"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.sectionLabel}>ESTIMATED MINUTES</Text>
                <TextInput
                  style={styles.input}
                  value={editEstMinutes}
                  onChangeText={setEditEstMinutes}
                  placeholder="e.g. 45"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />

                <Text style={styles.sectionLabel}>RECURRENCE</Text>
                <View style={styles.pillRow}>
                  {RECURRENCES.map((r) => {
                    const active = editRecurrence === r.value;
                    return (
                      <TouchableOpacity
                        key={r.value}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => setEditRecurrence(r.value)}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.sectionLabel}>PROJECT</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, editProjectId === null && styles.pillActive]}
                    onPress={() => setEditProjectId(null)}
                  >
                    <Text style={[styles.pillText, editProjectId === null && styles.pillTextActive]}>
                      Personal
                    </Text>
                  </TouchableOpacity>
                  {projects.map((p) => {
                    const active = editProjectId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => setEditProjectId(p.id)}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveEdits}
                  disabled={saving}
                >
                  <Ionicons name="checkmark" size={16} color="#09090b" />
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.title}>{task.title}</Text>
                {task.description ? <Text style={styles.desc}>{task.description}</Text> : null}

                {/* Meta Row */}
                <View style={styles.metaRow}>
                  {task.due_date && (
                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={13} color={colors.cyan} />
                      <Text style={styles.metaText}>{formatDisplayDate(task.due_date)}</Text>
                    </View>
                  )}
                  {task.estimated_minutes ? (
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={13} color={colors.amber} />
                      <Text style={styles.metaText}>{formatEstimatedMinutes(task.estimated_minutes)}</Text>
                    </View>
                  ) : null}
                  {task.recurrence && task.recurrence !== 'none' && (
                    <View style={styles.metaChip}>
                      <Ionicons name="repeat" size={13} color={colors.emerald} />
                      <Text style={styles.metaText}>{task.recurrence}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Status Selector */}
            <View>
              <Text style={styles.sectionLabel}>STATUS</Text>
              <View style={styles.pillRow}>
                {statusColumns.map((col) => {
                  const active = task.status === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[
                        styles.pill,
                        active && { backgroundColor: `${col.color}25`, borderColor: col.color },
                      ]}
                      onPress={() => onUpdateStatus(task.id, col.id as TaskStatus)}
                    >
                      <Text style={[styles.pillText, active && { color: colors.textPrimary }]}>
                        {col.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Priority Selector */}
            <View>
              <Text style={styles.sectionLabel}>PRIORITY</Text>
              <View style={styles.pillRow}>
                {priorities.map((p) => {
                  const active = task.priority === p;
                  const tone = PRIORITY_COLORS[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.pill,
                        active && { backgroundColor: tone.bg, borderColor: tone.border },
                      ]}
                      onPress={() => onUpdatePriority(task.id, p)}
                    >
                      <Text style={[styles.pillText, active && { color: tone.text }]}>
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tags */}
            <View>
              <Text style={styles.sectionLabel}>TAGS</Text>
              <View style={styles.pillRow}>
                {availableTags.map((tag) => {
                  const active = (task.tags || []).some(
                    (t) => t.id === tag.id || t.name.toLowerCase() === tag.name.toLowerCase()
                  );
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.pill,
                        active && {
                          backgroundColor: `${tag.color || colors.cyan}25`,
                          borderColor: tag.color || colors.cyan,
                        },
                      ]}
                      onPress={() => handleToggleTag(tag)}
                    >
                      <View
                        style={[
                          styles.tagDot,
                          { backgroundColor: tag.color || colors.cyan },
                        ]}
                      />
                      <Text style={[styles.pillText, active && { color: colors.textPrimary }]}>
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newTagInput}
                  onChangeText={setNewTagInput}
                  placeholder="Create or attach tag..."
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddTag}>
                  <Ionicons name="pricetag-outline" size={16} color="#09090b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Subtasks / Steps */}
            <View>
              <View style={styles.stepsHeader}>
                <Text style={styles.sectionLabel}>
                  STEPS TO FINISH ({doneCount}/{task.subtasks.length})
                </Text>
                {task.subtasks.length > 0 && <Text style={styles.pctText}>{pct}%</Text>}
              </View>

              {task.subtasks.length > 0 && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
              )}

              <View style={styles.stepsList}>
                {task.subtasks.map((sub) => (
                  <View key={sub.id} style={styles.stepRow}>
                    <TouchableOpacity
                      style={styles.stepToggle}
                      onPress={() => onToggleSubtask(sub)}
                    >
                      <Ionicons
                        name={sub.is_completed ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={sub.is_completed ? colors.emerald : colors.textMuted}
                      />
                      <Text style={[styles.stepText, sub.is_completed && styles.stepTextDone]}>
                        {sub.title}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDeleteSubtask(task.id, sub.id)}>
                      <Ionicons name="close-circle-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newStep}
                  onChangeText={setNewStep}
                  placeholder="Add a step..."
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

            {/* Comments */}
            <View>
              <Text style={styles.sectionLabel}>COMMENTS ({comments.length})</Text>
              {commentsLoading ? (
                <ActivityIndicator size="small" color={colors.cyan} style={{ marginVertical: 8 }} />
              ) : comments.length === 0 ? (
                <Text style={styles.emptyCommentText}>No comments yet. Start the discussion below.</Text>
              ) : (
                <View style={styles.commentsList}>
                  {comments.map((c) => (
                    <View key={c.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{c.author_name || c.user_name || 'Member'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.commentDate}>{formatDisplayDate(c.created_at)}</Text>
                          {(!currentUserId || c.user_id === currentUserId) && (
                            <TouchableOpacity onPress={() => handleRemoveComment(c.id)}>
                              <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text style={styles.commentBody}>{c.body}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={commentInput}
                  onChangeText={setCommentInput}
                  placeholder="Write a comment..."
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handlePostComment}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handlePostComment}
                  disabled={postingComment}
                >
                  <Ionicons name="send" size={15} color="#09090b" />
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '92%',
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  projectLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: COLORS.cyanSoft,
    borderColor: COLORS.cyanBorder,
  },
  body: { paddingTop: 14 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  desc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  editCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 10,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickLink: { fontSize: 11, fontWeight: '700', color: COLORS.cyan },
  saveBtn: {
    marginTop: 4,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.cyan,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: '#09090b' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.cyanSoft,
    borderColor: COLORS.cyanBorder,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.cyan },
  tagDot: { width: 7, height: 7, borderRadius: 4 },
  stepsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pctText: { fontSize: 11, fontWeight: '700', color: COLORS.cyan },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.borderSubtle,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.cyan },
  stepsList: { gap: 8, marginBottom: 10 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  stepToggle: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  stepText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  stepTextDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  addInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCommentText: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  commentsList: { gap: 8 },
  commentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 10,
    gap: 4,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  commentDate: { fontSize: 10, color: COLORS.textMuted },
  commentBody: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
});
