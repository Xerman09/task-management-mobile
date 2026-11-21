import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  batchCreateTasks,
  checkSyncState,
  clearSession,
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getDashboardBootstrap,
  loadPersistedConfig,
  updateSubtask,
  updateTask,
} from './src/api';
import { COLORS, DEFAULT_STATUS_COLUMNS } from './src/theme';
import { Folder, Project, Subtask, Task, TaskPriority, TaskStatus, User } from './src/types';
import { ParsedPlanTask } from './src/utils/aiPlanParser';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TasksScreen, { QueueFilter } from './src/screens/TasksScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateTaskModal from './src/components/CreateTaskModal';
import TaskDetailModal from './src/components/TaskDetailModal';
import ConfirmModal from './src/components/ConfirmModal';
import SidebarDrawer from './src/components/SidebarDrawer';

type TabKey = 'home' | 'tasks' | 'projects' | 'profile';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [initialServerUrl, setInitialServerUrl] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  const [activeQueue, setActiveQueue] = useState<QueueFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');

  const [createVisible, setCreateVisible] = useState(false);
  const [createInitialMode, setCreateInitialMode] = useState<'single' | 'ai_plan'>('single');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncFingerprintRef = useRef<string>('');
  const isSyncingRef = useRef<boolean>(false);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

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

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const loadWorkspaceData = useCallback(async (silent = false) => {
    if (silent) setSyncStatus('syncing');
    try {
      const boot = await getDashboardBootstrap();
      if (boot.success) {
        if (boot.user) setUser(boot.user);
        setTasks(boot.tasks || []);
        setProjects(boot.projects || []);
        setFolders(boot.folders || []);
        if (boot.sync_fingerprint) {
          syncFingerprintRef.current = boot.sync_fingerprint;
        }
        setSyncStatus('synced');
        return true;
      }
      if (boot.message?.toLowerCase().includes('unauthorized')) {
        await clearSession();
        setUser(null);
      } else {
        setSyncStatus('error');
      }
      return false;
    } catch {
      setSyncStatus('error');
      return false;
    }
  }, []);

  // Restore saved session on app startup
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await loadPersistedConfig();
        if (!mounted) return;
        setInitialServerUrl(cfg.serverUrl);
        if (cfg.token) {
          if (cfg.user) setUser(cfg.user);
          await loadWorkspaceData(false);
        }
      } finally {
        if (mounted) setBooting(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadWorkspaceData]);

  // Real-time 3-second heartbeat sync with backend-php
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        const res = await checkSyncState(syncFingerprintRef.current);
        if (res.success && res.fingerprint) {
          if (!syncFingerprintRef.current) {
            syncFingerprintRef.current = res.fingerprint;
          } else if (res.has_changes) {
            syncFingerprintRef.current = res.fingerprint;
            await loadWorkspaceData(true);
          }
        }
      } catch {
        // silent network hiccup
      } finally {
        isSyncingRef.current = false;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, loadWorkspaceData]);

  const handleAdvanceStatus = async (task: Task) => {
    const latest = tasksRef.current.find((t) => t.id === task.id) || task;
    const seq = DEFAULT_STATUS_COLUMNS.map((c) => c.id as TaskStatus);
    const idx = seq.indexOf(latest.status);
    const nextStatus = seq[(idx + 1) % seq.length];
    const prevStatus = latest.status;

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    const label = DEFAULT_STATUS_COLUMNS.find((c) => c.id === nextStatus)?.label || nextStatus;
    showToast(`Moved to ${label}`);

    try {
      const res = await updateTask({ id: task.id, status: nextStatus });
      if (!res.success) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: prevStatus } : t)));
        showToast(res.message || 'Failed to update status');
      } else if (res.sync_fingerprint) {
        syncFingerprintRef.current = res.sync_fingerprint;
      }
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: prevStatus } : t)));
      showToast('Network error updating status');
    }
  };

  const handleUpdateStatus = async (taskId: number, status: TaskStatus) => {
    const prevStatus = tasksRef.current.find((t) => t.id === taskId)?.status;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      const res = await updateTask({ id: taskId, status });
      if (!res.success && prevStatus) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t)));
        showToast(res.message || 'Failed to update status');
      } else {
        if (res.sync_fingerprint) syncFingerprintRef.current = res.sync_fingerprint;
        showToast('Status updated');
      }
    } catch {
      if (prevStatus) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t)));
      }
      showToast('Network error updating status');
    }
  };

  const handleUpdatePriority = async (taskId: number, priority: TaskPriority) => {
    const prevPriority = tasksRef.current.find((t) => t.id === taskId)?.priority;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
    try {
      const res = await updateTask({ id: taskId, priority });
      if (!res.success && prevPriority) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority: prevPriority } : t)));
        showToast(res.message || 'Failed to update priority');
      } else {
        if (res.sync_fingerprint) syncFingerprintRef.current = res.sync_fingerprint;
        showToast('Priority updated');
      }
    } catch {
      if (prevPriority) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority: prevPriority } : t)));
      }
      showToast('Network error updating priority');
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const nextCompleted = !subtask.is_completed;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === subtask.task_id
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtask.id ? { ...s, is_completed: nextCompleted } : s
              ),
            }
          : t
      )
    );

    try {
      const res = await updateSubtask(subtask.id, { is_completed: nextCompleted });
      if (!res.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === subtask.task_id
              ? {
                  ...t,
                  subtasks: t.subtasks.map((s) =>
                    s.id === subtask.id ? { ...s, is_completed: !nextCompleted } : s
                  ),
                }
              : t
          )
        );
        showToast(res.message || 'Failed to update step');
      } else if (res.sync_fingerprint) {
        syncFingerprintRef.current = res.sync_fingerprint;
      }
    } catch {
      showToast('Network error updating step');
    }
  };

  const handleAddSubtask = async (taskId: number, title: string) => {
    try {
      const res = await createSubtask(taskId, title);
      if (res.success && res.subtask) {
        if (res.sync_fingerprint) syncFingerprintRef.current = res.sync_fingerprint;
        const created = res.subtask;
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, created] } : t))
        );
        showToast('Step added');
      } else {
        showToast(res.message || 'Failed to add step');
      }
    } catch {
      showToast('Network error adding step');
    }
  };

  const handleDeleteSubtask = async (taskId: number, subtaskId: number) => {
    const prevTasks = tasksRef.current;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t
      )
    );
    try {
      const res = await deleteSubtask(subtaskId);
      if (!res.success) {
        setTasks(prevTasks);
        showToast(res.message || 'Failed to delete step');
      } else if (res.sync_fingerprint) {
        syncFingerprintRef.current = res.sync_fingerprint;
      }
    } catch {
      setTasks(prevTasks);
      showToast('Network error deleting step');
    }
  };

  const handleCreateSingle = async (data: {
    title: string;
    description?: string;
    priority: TaskPriority;
    projectId: number | null;
    dueDate?: string;
    steps: string[];
  }) => {
    try {
      const res = await createTask({
        title: data.title,
        description: data.description,
        priority: data.priority,
        project_id: data.projectId,
        due_date: data.dueDate,
        subtasks: data.steps,
      });
      if (res.success && res.task) {
        if (res.sync_fingerprint) syncFingerprintRef.current = res.sync_fingerprint;
        setTasks((prev) => [res.task!, ...prev]);
        showToast('Task created');
      } else {
        showToast(res.message || 'Failed to create task');
      }
    } catch {
      showToast('Network error creating task');
    }
  };

  const handleImportAiPlan = async (items: ParsedPlanTask[], projectId: number | null) => {
    try {
      const res = await batchCreateTasks(
        items.map((pt) => ({
          title: pt.title,
          description: pt.description,
          priority: pt.priority,
          category: pt.category || 'Work',
          due_date: pt.due_date,
          project_id: projectId,
          subtasks: pt.steps,
          estimated_minutes: pt.estimated_minutes,
        }))
      );
      if (res.success && res.tasks) {
        if (res.sync_fingerprint) syncFingerprintRef.current = res.sync_fingerprint;
        const reversed = res.tasks.slice().reverse();
        setTasks((prev) => [...reversed, ...prev]);
        const totalSteps = items.reduce((sum, item) => sum + item.steps.length, 0);
        showToast(`Imported ${res.tasks.length} tasks with ${totalSteps} steps`);
      } else {
        showToast(res.message || 'Failed to import AI plan');
      }
    } catch {
      showToast('Network error importing AI plan');
    }
  };

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null;

  if (booting) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.bootScreen}>
          <ActivityIndicator size="large" color={COLORS.cyan} />
          <Text style={styles.bootText}>Loading TaskFlow...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoginScreen
          initialServerUrl={initialServerUrl}
          onAuthenticated={async (loggedInUser) => {
            setUser(loggedInUser);
            setActiveTab('home');
            await loadWorkspaceData(false);
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
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setSidebarOpen(true)}
              accessibilityLabel="Open sidebar menu"
            >
              <Ionicons name="menu-outline" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
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
              projects={projects}
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
              folders={folders}
              projects={projects}
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
              syncStatus={syncStatus}
              onRefreshSync={() => {
                void loadWorkspaceData(true);
                showToast('Synced with backend');
              }}
              onOpenAiImport={() => {
                setCreateInitialMode('ai_plan');
                setCreateVisible(true);
              }}
              onRequestLogout={() => {
                setConfirmState({
                  visible: true,
                  title: 'Sign Out',
                  message: 'Sign out of your TaskFlow workspace?',
                  confirmLabel: 'Sign Out',
                  onConfirm: async () => {
                    setConfirmState((s) => ({ ...s, visible: false }));
                    await clearSession();
                    syncFingerprintRef.current = '';
                    setTasks([]);
                    setProjects([]);
                    setFolders([]);
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
          projects={projects}
          onClose={() => setCreateVisible(false)}
          onCreateSingle={handleCreateSingle}
          onImportAiPlan={handleImportAiPlan}
          onShowToast={showToast}
        />

        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePriority={handleUpdatePriority}
          onToggleSubtask={handleToggleSubtask}
          onAddSubtask={handleAddSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          onRequestDeleteTask={(task) => {
            setConfirmState({
              visible: true,
              title: 'Delete Task',
              message: `Are you sure you want to delete "${task.title}"?`,
              confirmLabel: 'Delete Task',
              onConfirm: async () => {
                setConfirmState((s) => ({ ...s, visible: false }));
                setSelectedTaskId(null);
                const prev = tasksRef.current;
                setTasks((p) => p.filter((t) => t.id !== task.id));
                try {
                  const res = await deleteTask(task.id);
                  if (!res.success) {
                    setTasks(prev);
                    showToast(res.message || 'Failed to delete task');
                  } else {
                    if (res.sync_fingerprint) syncFingerprintRef.current = res.sync_fingerprint;
                    showToast('Task deleted');
                  }
                } catch {
                  setTasks(prev);
                  showToast('Network error deleting task');
                }
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

        <SidebarDrawer
          visible={sidebarOpen}
          user={user}
          activeTab={activeTab}
          activeQueue={activeQueue}
          selectedProjectId={selectedProjectId}
          tasks={tasks}
          projects={projects}
          folders={folders}
          syncStatus={syncStatus}
          onClose={() => setSidebarOpen(false)}
          onSelectTab={(tab) => setActiveTab(tab)}
          onSelectQueue={(queue) => {
            setActiveQueue(queue);
            setActiveTab('tasks');
          }}
          onSelectProject={(pid) => {
            setSelectedProjectId(pid);
            setActiveQueue('all');
            setActiveTab('tasks');
          }}
          onOpenCreate={(mode) => {
            setCreateInitialMode(mode);
            setCreateVisible(true);
          }}
          onRefreshSync={() => {
            void loadWorkspaceData(true);
            showToast('Synced with backend');
          }}
          onRequestLogout={() => {
            setConfirmState({
              visible: true,
              title: 'Sign Out',
              message: 'Sign out of your TaskFlow workspace?',
              confirmLabel: 'Sign Out',
              onConfirm: async () => {
                setConfirmState((s) => ({ ...s, visible: false }));
                await clearSession();
                syncFingerprintRef.current = '';
                setTasks([]);
                setProjects([]);
                setFolders([]);
                setUser(null);
              },
            });
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  bootText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
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
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
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
