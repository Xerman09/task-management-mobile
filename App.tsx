import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  batchCreateTasks,
  checkSyncState,
  clearSession,
  createSubtask,
  createTag,
  createTask,
  deleteSubtask,
  deleteTask,
  getDashboardBootstrap,
  getTags,
  loadPersistedConfig,
  updateSubtask,
  updateTask,
} from './src/api';
import { DEFAULT_STATUS_COLUMNS, ThemePalette } from './src/theme';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { Folder, Project, Subtask, Tag, Task, TaskPriority, TaskRecurrence, TaskStatus, User } from './src/types';
import { ParsedPlanTask } from './src/utils/aiPlanParser';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TasksScreen, { QueueFilter } from './src/screens/TasksScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import MatrixScreen from './src/screens/MatrixScreen';
import FocusScreen from './src/screens/FocusScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateTaskModal from './src/components/CreateTaskModal';
import TaskDetailModal from './src/components/TaskDetailModal';
import ConfirmModal from './src/components/ConfirmModal';
import SidebarDrawer from './src/components/SidebarDrawer';
import PomodoroBar from './src/components/PomodoroBar';
import CommandPaletteModal from './src/components/CommandPaletteModal';
import WorkspaceToolsModal, { WorkspaceToolTab } from './src/components/WorkspaceToolsModal';
import NotificationsModal from './src/components/NotificationsModal';
import UpdateModal from './src/components/UpdateModal';
import { TaskFlowIcon } from './src/components/TaskFlowLogo';
import { BUILD_INFO } from './src/buildInfo';
import { triggerHaptic } from './src/utils/feedback';
import { getTodayYMD } from './src/utils/date';

const WORKSPACE_CACHE_KEY = '@taskflow_workspace_cache';

type TabKey = 'home' | 'tasks' | 'calendar' | 'matrix' | 'focus' | 'projects' | 'profile';

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [booting, setBooting] = useState(true);
  const [initialServerUrl, setInitialServerUrl] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  const [activeQueue, setActiveQueue] = useState<QueueFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');

  const [createVisible, setCreateVisible] = useState(false);
  const [createInitialMode, setCreateInitialMode] = useState<'single' | 'ai_plan'>('single');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pomodoroVisible, setPomodoroVisible] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toolsTab, setToolsTab] = useState<WorkspaceToolTab | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{
    visible: boolean;
    latestVersion: string;
    apkUrl: string;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

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

  const checkForAppUpdate = useCallback(
    async (manual = false) => {
      if (!manual && (Platform.OS !== 'android' || BUILD_INFO.runNumber === 0)) {
        return;
      }
      try {
        const res = await fetch(
          `https://github.com/Xerman09/task-management-mobile/releases/download/latest-apk/version.json?t=${Date.now()}`
        );
        if (!res.ok) {
          if (manual) showToast('No newer update found');
          return;
        }
        const data = (await res.json()) as {
          version?: string;
          run_number?: number;
          commit?: string;
          apk_url?: string;
        };
        const isNewer =
          (typeof data.run_number === 'number' && data.run_number > BUILD_INFO.runNumber) ||
          (Boolean(data.commit) && BUILD_INFO.commit !== 'local' && data.commit !== BUILD_INFO.commit);
        if (isNewer && data.apk_url) {
          setUpdateInfo({
            visible: true,
            latestVersion: `v${data.version || 'latest'}`,
            apkUrl: data.apk_url,
          });
        } else if (manual) {
          showToast(`You are on the latest version (v${BUILD_INFO.version})`);
        }
      } catch {
        if (manual) showToast('Could not check for updates right now');
      }
    },
    [showToast]
  );

  useEffect(() => {
    void checkForAppUpdate(false);
  }, [checkForAppUpdate]);

  const loadWorkspaceData = useCallback(async (silent = false) => {
    if (silent) setSyncStatus('syncing');
    try {
      const boot = await getDashboardBootstrap();
      if (boot.success) {
        if (boot.user) setUser(boot.user);
        setTasks(boot.tasks || []);
        setProjects(boot.projects || []);
        setFolders(boot.folders || []);
        AsyncStorage.setItem(
          WORKSPACE_CACHE_KEY,
          JSON.stringify({
            tasks: boot.tasks || [],
            projects: boot.projects || [],
            folders: boot.folders || [],
          })
        ).catch(() => {});
        getTags()
          .then((tRes) => {
            if (tRes.success && tRes.tags) setAvailableTags(tRes.tags);
          })
          .catch(() => {});
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
          try {
            const cached = await AsyncStorage.getItem(WORKSPACE_CACHE_KEY);
            if (cached && mounted) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
              if (Array.isArray(parsed.projects)) setProjects(parsed.projects);
              if (Array.isArray(parsed.folders)) setFolders(parsed.folders);
            }
          } catch {}
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
        if (!res.success && res.message?.toLowerCase().includes('unauthorized')) {
          await clearSession();
          syncFingerprintRef.current = '';
          setUser(null);
          showToast('Session expired. Please sign in again.');
        } else if (res.success && res.fingerprint) {
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
    const proj = projects.find((p) => p.id === latest.project_id);
    const cols =
      proj?.statuses && proj.statuses.length > 0
        ? proj.statuses.map((s) => ({ id: s.slug as TaskStatus, label: s.label }))
        : DEFAULT_STATUS_COLUMNS.map((c) => ({ id: c.id as TaskStatus, label: c.label }));
    const seq = cols.map((c) => c.id);
    const idx = seq.indexOf(latest.status);
    const nextStatus = seq[(idx + 1) % seq.length];
    const prevStatus = latest.status;

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    void triggerHaptic(nextStatus === 'completed' ? 'success' : 'light');
    const label = cols.find((c) => c.id === nextStatus)?.label || nextStatus;
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

  const handleToggleComplete = async (task: Task) => {
    const latest = tasksRef.current.find((t) => t.id === task.id) || task;
    const prevStatus = latest.status;
    const nextStatus: TaskStatus = prevStatus === 'completed' ? 'todo' : 'completed';

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    void triggerHaptic(nextStatus === 'completed' ? 'success' : 'light');
    showToast(nextStatus === 'completed' ? 'Task completed' : 'Task reopened');

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

  const handleUpdateTaskFields = async (
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
  ) => {
    try {
      const res = await updateTask({ id: taskId, ...patch });
      if (res.success && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task! : t)));
        if (res.sync_fingerprint) syncFingerprintRef.current = res.sync_fingerprint;
        showToast('Task updated');
      } else {
        showToast(res.message || 'Failed to update task');
      }
    } catch {
      showToast('Network error updating task');
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag | null> => {
    try {
      const res = await createTag(name);
      if (res.success && res.tag) {
        setAvailableTags((prev) =>
          prev.some((t) => t.id === res.tag!.id) ? prev : [...prev, res.tag!]
        );
        return res.tag;
      }
      showToast(res.message || 'Failed to create tag');
    } catch {
      showToast('Network error creating tag');
    }
    return null;
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const nextCompleted = !subtask.is_completed;
    const setLocalCompleted = (completed: boolean) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === subtask.task_id
            ? {
                ...t,
                subtasks: t.subtasks.map((s) =>
                  s.id === subtask.id ? { ...s, is_completed: completed } : s
                ),
              }
            : t
        )
      );
    };
    setLocalCompleted(nextCompleted);

    try {
      const res = await updateSubtask(subtask.id, { is_completed: nextCompleted });
      if (!res.success) {
        setLocalCompleted(!nextCompleted);
        showToast(res.message || 'Failed to update step');
      } else {
        if (res.sync_fingerprint) syncFingerprintRef.current = res.sync_fingerprint;
        if (res.task_status || res.task_priority) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === subtask.task_id
                ? {
                    ...t,
                    ...(res.task_status ? { status: res.task_status } : {}),
                    ...(res.task_priority ? { priority: res.task_priority } : {}),
                  }
                : t
            )
          );
        }
      }
    } catch {
      setLocalCompleted(!nextCompleted);
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
  }): Promise<boolean> => {
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
        return true;
      } else {
        showToast(res.message || 'Failed to create task');
        return false;
      }
    } catch {
      showToast('Network error creating task');
      return false;
    }
  };

  const handleImportAiPlan = async (
    items: ParsedPlanTask[],
    projectId: number | null
  ): Promise<boolean> => {
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
        return true;
      } else {
        showToast(res.message || 'Failed to import AI plan');
        return false;
      }
    } catch {
      showToast('Network error importing AI plan');
      return false;
    }
  };

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null;

  if (booting) {
    return (
      <SafeAreaProvider>
        <StatusBar style={colors.isLight ? 'dark' : 'light'} />
        <View style={styles.bootScreen}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.bootText}>Loading TaskFlow...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar style={colors.isLight ? 'dark' : 'light'} />
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

  const syncColor =
    syncStatus === 'synced'
      ? colors.emerald
      : syncStatus === 'syncing'
        ? colors.cyan
        : colors.rose;
  const syncLabel =
    syncStatus === 'synced' ? 'Live' : syncStatus === 'syncing' ? 'Syncing' : 'Retry';

  const todayYmd = getTodayYMD();
  const reminderCount = tasks.filter(
    (t) => t.status !== 'completed' && t.due_date && t.due_date <= todayYmd
  ).length;

  const sidebarProps = {
    user,
    activeTab,
    activeQueue,
    selectedProjectId,
    tasks,
    projects,
    folders,
    syncStatus,
    onClose: () => setSidebarOpen(false),
    onSelectTab: (tab: TabKey) => setActiveTab(tab),
    onSelectQueue: (queue: QueueFilter) => {
      setActiveQueue(queue);
      setActiveTab('tasks');
    },
    onSelectProject: (pid: number | 'all') => {
      setSelectedProjectId(pid);
      setActiveQueue('all');
      setActiveTab('tasks');
    },
    onOpenCreate: (mode: 'single' | 'ai_plan') => {
      setCreateInitialMode(mode);
      setCreateVisible(true);
    },
    onOpenTools: (tab: WorkspaceToolTab) => setToolsTab(tab),
    onRefreshSync: () => {
      void loadWorkspaceData(true);
      showToast('Workspace synced');
    },
    onRequestLogout: () => {
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
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar style={colors.isLight ? 'dark' : 'light'} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.shell}>
          {isWide && <SidebarDrawer visible docked {...sidebarProps} />}

          <View style={styles.mainCol}>
            {/* Top App Bar */}
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                {!isWide && (
                  <TouchableOpacity
                    style={styles.menuBtn}
                    onPress={() => setSidebarOpen(true)}
                    accessibilityLabel="Open sidebar menu"
                  >
                    <Ionicons name="menu-outline" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
                {!isWide && <TaskFlowIcon size={28} />}
                <Text style={styles.brandTitle}>
                  {isWide
                    ? activeTab === 'home'
                      ? 'Today Overview'
                      : activeTab === 'tasks'
                        ? 'Tasks & Board'
                        : activeTab === 'calendar'
                          ? 'Calendar'
                          : activeTab === 'matrix'
                            ? 'Eisenhower Matrix'
                            : activeTab === 'focus'
                              ? 'Pomodoro Focus'
                              : activeTab === 'projects'
                                ? 'Folders & Projects'
                                : 'Profile & Sync'
                    : 'TaskFlow'}
                </Text>
              </View>

              <View style={styles.topRightRow}>
                <TouchableOpacity
                  style={styles.topIconBtn}
                  onPress={() => setCommandOpen(true)}
                  accessibilityLabel="Quick search and command palette"
                >
                  <Ionicons name="search" size={17} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.topIconBtn}
                  onPress={() => setNotificationsOpen(true)}
                  accessibilityLabel="Open reminders and alerts"
                >
                  <Ionicons name="notifications-outline" size={17} color={colors.textSecondary} />
                  {reminderCount > 0 && (
                    <View style={styles.topBadge}>
                      <Text style={styles.topBadgeText}>{reminderCount > 9 ? '9+' : reminderCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {isWide && (
                  <TouchableOpacity
                    style={styles.topIconBtn}
                    onPress={() => setPomodoroVisible((v) => !v)}
                    accessibilityLabel="Toggle Pomodoro Focus Timer"
                  >
                    <Ionicons
                      name="timer-outline"
                      size={17}
                      color={pomodoroVisible ? colors.cyan : colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                {isWide && (
                  <TouchableOpacity
                    style={styles.liveSyncPill}
                    onPress={() => {
                      void loadWorkspaceData(true);
                      showToast('Workspace synced');
                    }}
                  >
                    <View style={[styles.liveSyncDot, { backgroundColor: syncColor }]} />
                    <Text style={[styles.liveSyncText, { color: syncColor }]}>{syncLabel}</Text>
                  </TouchableOpacity>
                )}
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
            </View>

            {/* Collapsible Pomodoro Focus Timer */}
            <PomodoroBar
              visible={pomodoroVisible}
              onClose={() => setPomodoroVisible(false)}
              onNotify={showToast}
            />

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
              onAdvanceStatus={handleToggleComplete}
              onToggleSubtask={handleToggleSubtask}
              onGoToTasks={(filter) => {
                setActiveQueue(filter);
                setActiveTab('tasks');
              }}
              onTogglePomodoro={() => setActiveTab('focus')}
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
              onToggleComplete={handleToggleComplete}
              onQuickCreate={(title, projectId, dueDate) =>
                handleCreateSingle({
                  title,
                  priority: 'medium',
                  projectId,
                  dueDate,
                  steps: [],
                })
              }
              onToggleSubtask={handleToggleSubtask}
              onAddSubtask={handleAddSubtask}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarScreen
              tasks={tasks}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
              onAdvanceStatus={handleToggleComplete}
            />
          )}

          {activeTab === 'matrix' && (
            <MatrixScreen
              tasks={tasks}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
              onAdvanceStatus={handleAdvanceStatus}
            />
          )}

          {activeTab === 'focus' && (
            <FocusScreen
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
              onNotify={showToast}
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
              onWorkspaceChanged={async () => {
                await loadWorkspaceData(true);
              }}
              onShowToast={showToast}
              onRequestConfirm={({ title, message, confirmLabel, onConfirm }) => {
                setConfirmState({
                  visible: true,
                  title,
                  message,
                  confirmLabel,
                  onConfirm: () => {
                    setConfirmState((s) => ({ ...s, visible: false }));
                    onConfirm();
                  },
                });
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
                showToast('Workspace synced');
              }}
              onOpenAiImport={() => {
                setCreateInitialMode('ai_plan');
                setCreateVisible(true);
              }}
              onOpenTools={(tab) => setToolsTab(tab)}
              onCheckUpdates={() => void checkForAppUpdate(true)}
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

        {/* Floating Quick Create Button (hidden on Today & Profile where New Task is already prominent) */}
        {activeTab !== 'home' && activeTab !== 'profile' && (
          <TouchableOpacity
            style={[styles.fab, isWide && styles.fabWide]}
            activeOpacity={0.85}
            onPress={() => {
              setCreateInitialMode('single');
              setCreateVisible(true);
            }}
          >
            <Ionicons name="add" size={26} color="#09090b" />
          </TouchableOpacity>
        )}

        {/* Toast Banner */}
        {toastMsg && (
          <View style={[styles.toast, isWide && styles.toastWide]}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        )}

        {/* Bottom Tab Bar (mobile only; wide screens use docked sidebar) */}
        {!isWide && (
          <SafeAreaView edges={['bottom']} style={styles.tabBarSafe}>
            <View style={styles.tabBar}>
              {(
                [
                  { key: 'home', label: 'Today', icon: 'sunny-outline', activeIcon: 'sunny' },
                  { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline', activeIcon: 'checkbox' },
                  { key: 'calendar', label: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar' },
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
                    {active && <View style={styles.tabActiveBar} />}
                    <Ionicons
                      name={active ? tab.activeIcon : tab.icon}
                      size={22}
                      color={active ? colors.cyan : colors.textMuted}
                    />
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SafeAreaView>
        )}
          </View>
        </View>

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
          projects={projects}
          availableTags={availableTags}
          currentUserId={user.id}
          onClose={() => setSelectedTaskId(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePriority={handleUpdatePriority}
          onUpdateTaskFields={handleUpdateTaskFields}
          onCreateTag={handleCreateTag}
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

        {!isWide && <SidebarDrawer visible={sidebarOpen} {...sidebarProps} />}

        <CommandPaletteModal
          visible={commandOpen}
          tasks={tasks}
          projects={projects}
          onClose={() => setCommandOpen(false)}
          onSelectTask={(t) => setSelectedTaskId(t.id)}
          onSelectProject={(pid) => {
            setSelectedProjectId(pid);
            setActiveQueue('all');
            setActiveTab('tasks');
          }}
          onRunAction={(action) => {
            if (action === 'new_task') {
              setCreateInitialMode('single');
              setCreateVisible(true);
            } else if (action === 'ai_plan') {
              setCreateInitialMode('ai_plan');
              setCreateVisible(true);
            } else if (action === 'calendar') {
              setActiveTab('calendar');
            } else if (action === 'matrix') {
              setActiveTab('matrix');
            } else if (action === 'tools') {
              setToolsTab('automations');
            }
          }}
        />

        <WorkspaceToolsModal
          visible={toolsTab !== null}
          initialTab={toolsTab || 'automations'}
          tasks={tasks}
          onClose={() => setToolsTab(null)}
          onWorkspaceChanged={async () => {
            await loadWorkspaceData(true);
          }}
          onShowToast={showToast}
          onRequestConfirm={({ title, message, confirmLabel, onConfirm }) => {
            setConfirmState({
              visible: true,
              title,
              message,
              confirmLabel,
              onConfirm: () => {
                setConfirmState((s) => ({ ...s, visible: false }));
                onConfirm();
              },
            });
          }}
        />
        <NotificationsModal
          visible={notificationsOpen}
          tasks={tasks}
          onClose={() => setNotificationsOpen(false)}
          onSelectTask={(t) => setSelectedTaskId(t.id)}
        />

        <UpdateModal
          visible={Boolean(updateInfo?.visible)}
          currentVersion={`v${BUILD_INFO.version}`}
          latestVersion={updateInfo?.latestVersion || 'latest'}
          apkUrl={
            updateInfo?.apkUrl ||
            'https://github.com/Xerman09/task-management-mobile/releases/download/latest-apk/TaskFlow.apk'
          }
          onDismiss={() => setUpdateInfo((u) => (u ? { ...u, visible: false } : null))}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const createStyles = (COLORS: ThemePalette) => StyleSheet.create({
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
  shell: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.bg },
  mainCol: { flex: 1, backgroundColor: COLORS.bg },
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
  topRightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.amber,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  topBadgeText: { fontSize: 9, fontWeight: '800', color: '#09090b' },
  liveSyncPill: {
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
  liveSyncDot: { width: 6, height: 6, borderRadius: 3 },
  liveSyncText: { fontSize: 11, fontWeight: '700' },
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
  fabWide: { bottom: 24, right: 24 },
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
  toastWide: { bottom: 24, left: 24, right: 96, maxWidth: 360 },
  toastText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  tabBarSafe: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
    paddingTop: 4,
  },
  tabActiveBar: {
    position: 'absolute',
    top: -6,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.cyan,
  },
  tabLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.cyan },
});
