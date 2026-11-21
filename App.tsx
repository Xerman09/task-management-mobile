import React, { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DEFAULT_STATUS_COLUMNS } from './src/theme';
import { MOCK_FOLDERS, MOCK_PROJECTS, MOCK_TASKS, MOCK_USER } from './src/data/mockData';
import { Subtask, Task, TaskPriority, TaskStatus, User } from './src/types';
import { ParsedPlanTask } from './src/utils/aiPlanParser';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TasksScreen, { QueueFilter } from './src/screens/TasksScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateTaskModal from './src/components/CreateTaskModal';
import TaskDetailModal from './src/components/TaskDetailModal';
import ConfirmModal from './src/components/ConfirmModal';

type TabKey = 'home' | 'tasks' | 'projects' | 'profile';

export default function App() {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [activeQueue, setActiveQueue] = useState<QueueFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');

  const [createVisible, setCreateVisible] = useState(false);
  const [createInitialMode, setCreateInitialMode] = useState<'single' | 'ai_plan'>('single');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  };

  const handleAdvanceStatus = (task: Task) => {
    const seq = DEFAULT_STATUS_COLUMNS.map((c) => c.id as TaskStatus);
    const idx = seq.indexOf(task.status);
    const nextStatus = seq[(idx + 1) % seq.length];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    const label = DEFAULT_STATUS_COLUMNS.find((c) => c.id === nextStatus)?.label || nextStatus;
    showToast(`Moved to ${label}`);
  };

  const handleToggleSubtask = (subtask: Subtask) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === subtask.task_id
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtask.id ? { ...s, is_completed: !s.is_completed } : s
              ),
            }
          : t
      )
    );
  };

  const handleAddSubtask = (taskId: number, title: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: [
                ...t.subtasks,
                {
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  task_id: taskId,
                  title,
                  is_completed: false,
                  position: t.subtasks.length + 1,
                },
              ],
            }
          : t
      )
    );
    showToast('Step added');
  };

  const handleDeleteSubtask = (taskId: number, subtaskId: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
          : t
      )
    );
  };

  const handleCreateSingle = (data: {
    title: string;
    description?: string;
    priority: TaskPriority;
    projectId: number | null;
    dueDate?: string;
    steps: string[];
  }) => {
    const newId = Date.now();
    const proj = data.projectId ? MOCK_PROJECTS.find((p) => p.id === data.projectId) : null;
    const created: Task = {
      id: newId,
      project_id: data.projectId,
      project_name: proj?.name || null,
      project_color: proj?.color || null,
      title: data.title,
      description: data.description || null,
      status: 'todo',
      priority: data.priority,
      category: 'Work',
      due_date: data.dueDate || null,
      recurrence: 'none',
      subtasks: data.steps.map((s, i) => ({
        id: newId + i + 1,
        task_id: newId,
        title: s,
        is_completed: false,
        position: i + 1,
      })),
    };
    setTasks((prev) => [created, ...prev]);
    showToast('Task created');
  };

  const handleImportAiPlan = (items: ParsedPlanTask[], projectId: number | null) => {
    const baseId = Date.now();
    const proj = projectId ? MOCK_PROJECTS.find((p) => p.id === projectId) : null;
    const newTasks: Task[] = items.map((pt, idx) => {
      const tId = baseId + idx * 100;
      return {
        id: tId,
        project_id: projectId,
        project_name: proj?.name || null,
        project_color: proj?.color || null,
        title: pt.title,
        description: pt.description || null,
        status: 'todo',
        priority: pt.priority,
        category: pt.category || 'Work',
        due_date: pt.due_date || null,
        estimated_minutes: pt.estimated_minutes ?? null,
        recurrence: 'none',
        subtasks: pt.steps.map((s, sIdx) => ({
          id: tId + sIdx + 1,
          task_id: tId,
          title: s,
          is_completed: false,
          position: sIdx + 1,
        })),
      };
    });
    setTasks((prev) => [...newTasks, ...prev]);
    const totalSteps = items.reduce((sum, item) => sum + item.steps.length, 0);
    showToast(`Imported ${items.length} tasks with ${totalSteps} steps`);
  };

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null;

  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoginScreen
          onLogin={(email) => {
            setUser({ ...MOCK_USER, email });
            setActiveTab('home');
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="checkmark-done" size={16} color={COLORS.cyan} />
            </View>
            <Text style={styles.brandTitle}>TaskFlow</Text>
          </View>
          <TouchableOpacity
            style={styles.aiShortcutBtn}
            onPress={() => {
              setCreateInitialMode('ai_plan');
              setCreateVisible(true);
            }}
          >
            <Ionicons name="sparkles" size={13} color="#ddd6fe" />
            <Text style={styles.aiShortcutText}>AI Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Active Screen */}
        <View style={styles.screenArea}>
          {activeTab === 'home' && (
            <HomeScreen
              user={user}
              tasks={tasks}
              onOpenCreate={(mode) => {
                setCreateInitialMode(mode);
                setCreateVisible(true);
              }}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
              onAdvanceStatus={handleAdvanceStatus}
              onToggleSubtask={handleToggleSubtask}
              onGoToTasks={(filter) => {
                setActiveQueue(filter);
                setActiveTab('tasks');
              }}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksScreen
              tasks={tasks}
              projects={MOCK_PROJECTS}
              activeQueue={activeQueue}
              selectedProjectId={selectedProjectId}
              onChangeQueue={setActiveQueue}
              onClearProjectFilter={() => setSelectedProjectId('all')}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
              onAdvanceStatus={handleAdvanceStatus}
              onToggleSubtask={handleToggleSubtask}
              onAddSubtask={handleAddSubtask}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsScreen
              folders={MOCK_FOLDERS}
              projects={MOCK_PROJECTS}
              tasks={tasks}
              onSelectProject={(pid) => {
                setSelectedProjectId(pid);
                setActiveQueue('all');
                setActiveTab('tasks');
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen
              user={user}
              totalTasks={tasks.length}
              completedTasks={tasks.filter((t) => t.status === 'completed').length}
              onOpenAiImport={() => {
                setCreateInitialMode('ai_plan');
                setCreateVisible(true);
              }}
              onRequestLogout={() => {
                setConfirmState({
                  visible: true,
                  title: 'Sign Out',
                  message: 'Return to the TaskFlow Mobile sign-in screen?',
                  confirmLabel: 'Sign Out',
                  onConfirm: () => {
                    setConfirmState((s) => ({ ...s, visible: false }));
                    setUser(null);
                  },
                });
              }}
            />
          )}
        </View>

        {/* Floating Quick Create Button */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => {
            setCreateInitialMode('single');
            setCreateVisible(true);
          }}
        >
          <Ionicons name="add" size={26} color="#09090b" />
        </TouchableOpacity>

        {/* Toast Banner */}
        {toastMsg && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}

        {/* Bottom Tab Bar */}
        <SafeAreaView edges={['bottom']} style={styles.tabBarSafe}>
          <View style={styles.tabBar}>
            {(
              [
                { key: 'home', label: 'Today', icon: 'sunny-outline', activeIcon: 'sunny' },
                { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline', activeIcon: 'checkbox' },
                { key: 'projects', label: 'Projects', icon: 'folder-outline', activeIcon: 'folder' },
                { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons
                    name={active ? tab.activeIcon : tab.icon}
                    size={21}
                    color={active ? COLORS.cyan : COLORS.textMuted}
                  />
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>

        {/* Modals */}
        <CreateTaskModal
          visible={createVisible}
          initialMode={createInitialMode}
          projects={MOCK_PROJECTS}
          onClose={() => setCreateVisible(false)}
          onCreateSingle={handleCreateSingle}
          onImportAiPlan={handleImportAiPlan}
          onShowToast={showToast}
        />

        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdateStatus={(taskId, status) => {
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
            showToast('Status updated');
          }}
          onUpdatePriority={(taskId, priority) => {
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
            showToast('Priority updated');
          }}
          onToggleSubtask={handleToggleSubtask}
          onAddSubtask={handleAddSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          onRequestDeleteTask={(task) => {
            setConfirmState({
              visible: true,
              title: 'Delete Task',
              message: `Are you sure you want to delete "${task.title}"?`,
              confirmLabel: 'Delete Task',
              onConfirm: () => {
                setConfirmState((s) => ({ ...s, visible: false }));
                setSelectedTaskId(null);
                setTasks((prev) => prev.filter((t) => t.id !== task.id));
                showToast('Task deleted');
              },
            });
          }}
        />

        <ConfirmModal
          visible={confirmState.visible}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState((s) => ({ ...s, visible: false }))}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  aiShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.violetSoft,
    borderWidth: 1,
    borderColor: COLORS.violetBorder,
  },
  aiShortcutText: { fontSize: 11, fontWeight: '700', color: '#ddd6fe' },
  screenArea: { flex: 1, backgroundColor: COLORS.bg },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 84,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toast: {
    position: 'absolute',
    bottom: 84,
    left: 16,
    right: 84,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  tabBarSafe: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.cyan },
});
