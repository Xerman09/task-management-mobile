import React, { useMemo, useState } from 'react';
import {
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
import { Project, Subtask, Task, TaskStatus } from '../types';
import { formatDisplayDate, getTodayYMD } from '../utils/date';

export type QueueFilter = 'all' | 'today' | 'missed' | 'recurring' | 'completed';

interface TasksScreenProps {
  tasks: Task[];
  projects: Project[];
  activeQueue: QueueFilter;
  selectedProjectId: number | 'all';
  onChangeQueue: (q: QueueFilter) => void;
  onClearProjectFilter: () => void;
  onSelectTask: (task: Task) => void;
  onAdvanceStatus: (task: Task) => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onAddSubtask: (taskId: number, title: string) => void;
}

export default function TasksScreen({
  tasks,
  projects,
  activeQueue,
  selectedProjectId,
  onChangeQueue,
  onClearProjectFilter,
  onSelectTask,
  onAdvanceStatus,
  onToggleSubtask,
  onAddSubtask,
}: TasksScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
  const [inlineSteps, setInlineSteps] = useState<Record<number, string>>({});

  const todayStr = getTodayYMD();

  const toggleExpand = (taskId: number) => {
    setExpandedIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedProjectId !== 'all' && t.project_id !== selectedProjectId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeQueue === 'today') return t.due_date === todayStr;
      if (activeQueue === 'missed') {
        return Boolean(t.due_date) && (t.due_date as string) < todayStr && t.status !== 'completed';
      }
      if (activeQueue === 'recurring') return Boolean(t.recurrence && t.recurrence !== 'none');
      if (activeQueue === 'completed') return t.status === 'completed';
      return true;
    });
  }, [tasks, selectedProjectId, searchQuery, activeQueue, todayStr]);

  const activeProject = selectedProjectId !== 'all'
    ? projects.find((p) => p.id === selectedProjectId) || null
    : null;

  const queues: { id: QueueFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'missed', label: 'Missed' },
    { id: 'recurring', label: 'Recurring' },
    { id: 'completed', label: 'Done' },
  ];

  const renderStatusIcon = (status: TaskStatus) => {
    if (status === 'completed') {
      return <Ionicons name="checkmark-circle" size={20} color={colors.emerald} />;
    }
    if (status === 'in_progress') {
      return <Ionicons name="disc-outline" size={20} color={colors.amber} />;
    }
    if (status === 'review') {
      return <Ionicons name="eye-outline" size={20} color={colors.indigo} />;
    }
    return <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />;
  };

  return (
    <View style={styles.container}>
      {/* Top Search & View Switcher */}
      <View style={styles.topControls}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks..."
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'list' ? colors.textPrimary : colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'board' && styles.viewBtnActive]}
            onPress={() => setViewMode('board')}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={viewMode === 'board' ? colors.textPrimary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Queue Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.queueBar}
        contentContainerStyle={styles.queueBarContent}
      >
        {queues.map((q) => {
          const isActive = activeQueue === q.id;
          return (
            <TouchableOpacity
              key={q.id}
              style={[styles.queueChip, isActive && styles.queueChipActive]}
              onPress={() => onChangeQueue(q.id)}
            >
              <Text style={[styles.queueChipText, isActive && styles.queueChipTextActive]}>
                {q.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeProject && (
        <View style={styles.activeProjectBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.dot, { backgroundColor: activeProject.color }]} />
            <Text style={styles.activeProjectText}>Project: {activeProject.name}</Text>
          </View>
          <TouchableOpacity onPress={onClearProjectFilter}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'list' ? (
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="folder-open-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No matching tasks</Text>
              <Text style={styles.emptySub}>Try another filter or tap + to create a task.</Text>
            </View>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const isExpanded = Boolean(expandedIds[task.id]);
              const doneSteps = task.subtasks.filter((s) => s.is_completed).length;
              const prio = PRIORITY_COLORS[task.priority];
              const isOverdue =
                !isCompleted && Boolean(task.due_date) && (task.due_date as string) < todayStr;

              return (
                <View
                  key={task.id}
                  style={[
                    styles.card,
                    { borderLeftWidth: 3, borderLeftColor: prio.text },
                    isCompleted && styles.cardDone,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cardMain}
                    activeOpacity={0.85}
                    onPress={() => onSelectTask(task)}
                  >
                    <TouchableOpacity
                      onPress={() => onAdvanceStatus(task)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {renderStatusIcon(task.status)}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, isCompleted && styles.cardTitleDone]}>
                        {task.title}
                      </Text>

                      <View style={styles.metaRow}>
                        {task.project_name && (
                          <View style={styles.metaTag}>
                            <View
                              style={[styles.dot, { backgroundColor: task.project_color || colors.cyan }]}
                            />
                            <Text style={styles.metaTagText}>{task.project_name}</Text>
                          </View>
                        )}
                        <View style={[styles.prioBadge, { backgroundColor: prio.bg, borderColor: prio.border }]}>
                          <Text style={[styles.prioText, { color: prio.text }]}>{task.priority}</Text>
                        </View>
                        {task.due_date && (
                          <Text style={[styles.dueText, isOverdue && { color: colors.rose }]}>
                            {task.due_date === todayStr ? 'Today' : formatDisplayDate(task.due_date)}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.stepsToggle,
                            isExpanded && { backgroundColor: colors.cyanSoft, borderColor: colors.cyanBorder },
                          ]}
                          onPress={() => toggleExpand(task.id)}
                        >
                          <Ionicons name="list-outline" size={12} color={colors.cyan} />
                          <Text style={styles.stepsToggleText}>
                            {task.subtasks.length > 0 ? `${doneSteps}/${task.subtasks.length} Steps` : '+ Steps'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.stepsDrawer}>
                      {task.subtasks.map((sub) => (
                        <TouchableOpacity
                          key={sub.id}
                          style={styles.stepRow}
                          onPress={() => onToggleSubtask(sub)}
                        >
                          <Ionicons
                            name={sub.is_completed ? 'checkbox' : 'square-outline'}
                            size={16}
                            color={sub.is_completed ? colors.emerald : colors.textMuted}
                          />
                          <Text style={[styles.stepText, sub.is_completed && styles.stepTextDone]}>
                            {sub.title}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      <View style={styles.addStepRow}>
                        <TextInput
                          style={styles.addStepInput}
                          value={inlineSteps[task.id] || ''}
                          onChangeText={(txt) => setInlineSteps((p) => ({ ...p, [task.id]: txt }))}
                          placeholder="Add a step to finish..."
                          placeholderTextColor={colors.textMuted}
                          onSubmitEditing={() => {
                            const val = (inlineSteps[task.id] || '').trim();
                            if (val) {
                              onAddSubtask(task.id, val);
                              setInlineSteps((p) => ({ ...p, [task.id]: '' }));
                            }
                          }}
                        />
                        <TouchableOpacity
                          style={styles.addStepBtn}
                          onPress={() => {
                            const val = (inlineSteps[task.id] || '').trim();
                            if (val) {
                              onAddSubtask(task.id, val);
                              setInlineSteps((p) => ({ ...p, [task.id]: '' }));
                            }
                          }}
                        >
                          <Ionicons name="add" size={16} color="#09090b" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* Horizontal Kanban Board View */
        <ScrollView
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.boardContent}
        >
          {((activeProject?.statuses && activeProject.statuses.length > 0)
            ? activeProject.statuses.map((s) => ({ id: s.slug, label: s.label, color: s.color }))
            : DEFAULT_STATUS_COLUMNS.map((c) => ({ id: c.id, label: c.label, color: c.color }))
          ).map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <View key={col.id} style={styles.boardColumn}>
                <View style={styles.boardColHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.dot, { backgroundColor: col.color }]} />
                    <Text style={styles.boardColTitle}>{col.label}</Text>
                  </View>
                  <View style={styles.boardCountPill}>
                    <Text style={styles.boardCountText}>{colTasks.length}</Text>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {colTasks.map((task) => {
                    const prio = PRIORITY_COLORS[task.priority];
                    const doneSteps = task.subtasks.filter((s) => s.is_completed).length;
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={styles.boardCard}
                        activeOpacity={0.85}
                        onPress={() => onSelectTask(task)}
                      >
                        <Text style={styles.boardCardTitle}>{task.title}</Text>
                        <View style={styles.boardCardFooter}>
                          <View
                            style={[styles.prioBadge, { backgroundColor: prio.bg, borderColor: prio.border }]}
                          >
                            <Text style={[styles.prioText, { color: prio.text }]}>{task.priority}</Text>
                          </View>
                          {task.subtasks.length > 0 && (
                            <Text style={styles.boardStepText}>
                              {doneSteps}/{task.subtasks.length} steps
                            </Text>
                          )}
                          <TouchableOpacity
                            style={styles.advanceBtn}
                            onPress={() => onAdvanceStatus(task)}
                          >
                            <Ionicons name="arrow-forward" size={13} color={colors.cyan} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (COLORS: ThemePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchWrap: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
  },
  viewBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7 },
  viewBtnActive: { backgroundColor: '#27272a' },
  queueBar: { maxHeight: 42 },
  queueBarContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  queueChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  queueChipActive: { backgroundColor: COLORS.cyanSoft, borderColor: COLORS.cyanBorder },
  queueChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  queueChipTextActive: { color: '#67e8f9' },
  activeProjectBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeProjectText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  clearText: { fontSize: 12, fontWeight: '700', color: COLORS.cyan },
  listScroll: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100, gap: 10 },
  emptyBox: {
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: 12, color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardDone: { opacity: 0.72 },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 19 },
  cardTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted, fontWeight: '500' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  metaTag: {
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
  dot: { width: 6, height: 6, borderRadius: 3 },
  metaTagText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  prioBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  prioText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dueText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  stepsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  stepsToggleText: { fontSize: 10, fontWeight: '700', color: COLORS.cyan },
  stepsDrawer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surface,
    padding: 12,
    gap: 8,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  stepTextDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  addStepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addStepInput: {
    flex: 1,
    height: 36,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  addStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardContent: { padding: 16, gap: 12, paddingBottom: 100 },
  boardColumn: {
    width: 270,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    maxHeight: '100%',
  },
  boardColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  boardColTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  boardCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  boardCountText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  boardCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 10,
  },
  boardCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 18 },
  boardCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardStepText: { fontSize: 11, color: COLORS.cyan, fontWeight: '600' },
  advanceBtn: {
    marginLeft: 'auto',
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
  },
});

