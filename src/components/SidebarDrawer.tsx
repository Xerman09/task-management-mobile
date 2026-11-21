import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { Folder, Project, Task, User } from '../types';
import { QueueFilter } from '../screens/TasksScreen';
import { getTodayYMD } from '../utils/date';

type TabKey = 'home' | 'tasks' | 'projects' | 'profile';

interface SidebarDrawerProps {
  visible: boolean;
  user: User;
  activeTab: TabKey;
  activeQueue: QueueFilter;
  selectedProjectId: number | 'all';
  tasks: Task[];
  projects: Project[];
  folders: Folder[];
  syncStatus: 'synced' | 'syncing' | 'error';
  onClose: () => void;
  onSelectTab: (tab: TabKey) => void;
  onSelectQueue: (queue: QueueFilter) => void;
  onSelectProject: (projectId: number | 'all') => void;
  onOpenCreate: (mode: 'single' | 'ai_plan') => void;
  onRefreshSync: () => void;
  onRequestLogout: () => void;
}

const DRAWER_WIDTH = Math.min(310, Math.round(Dimensions.get('window').width * 0.82));

export default function SidebarDrawer({
  visible,
  user,
  activeTab,
  activeQueue,
  selectedProjectId,
  tasks,
  projects,
  folders,
  syncStatus,
  onClose,
  onSelectTab,
  onSelectQueue,
  onSelectProject,
  onOpenCreate,
  onRefreshSync,
  onRequestLogout,
}: SidebarDrawerProps) {
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, modalVisible, slideAnim, backdropAnim]);

  const counts = useMemo(() => {
    const today = getTodayYMD();
    let todayCount = 0;
    let missedCount = 0;
    let recurringCount = 0;
    let completedCount = 0;

    for (const t of tasks) {
      const done = t.status === 'completed';
      if (done) completedCount += 1;
      if (!done && t.due_date === today) todayCount += 1;
      if (!done && t.due_date && t.due_date < today) missedCount += 1;
      if (!done && t.recurrence && t.recurrence !== 'none') recurringCount += 1;
    }

    return {
      all: tasks.length,
      today: todayCount,
      missed: missedCount,
      recurring: recurringCount,
      completed: completedCount,
    };
  }, [tasks]);

  const projectTaskCounts = useMemo(() => {
    const map: Record<number, number> = {};
    for (const t of tasks) {
      if (t.project_id && t.status !== 'completed') {
        map[t.project_id] = (map[t.project_id] || 0) + 1;
      }
    }
    return map;
  }, [tasks]);

  const groupedFolders = useMemo(() => {
    const folderIds = new Set(folders.map((f) => f.id));
    const sections = folders.map((folder) => ({
      folder,
      items: projects.filter((p) => p.folder_id === folder.id),
    }));
    const unfiled = projects.filter((p) => !p.folder_id || !folderIds.has(p.folder_id));
    return { sections, unfiled };
  }, [folders, projects]);

  const initials = (user.name || user.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const syncColor =
    syncStatus === 'synced'
      ? COLORS.emerald
      : syncStatus === 'syncing'
        ? COLORS.cyan
        : COLORS.rose;

  const syncLabel =
    syncStatus === 'synced' ? 'Live' : syncStatus === 'syncing' ? 'Syncing' : 'Retry';

  const navigateTab = (tab: TabKey) => {
    onSelectTab(tab);
    onClose();
  };

  const navigateQueue = (queue: QueueFilter) => {
    onSelectQueue(queue);
    onClose();
  };

  const navigateProject = (projectId: number | 'all') => {
    onSelectProject(projectId);
    onClose();
  };

  if (!modalVisible) return null;

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left']}>
            {/* Brand + Close Header */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View style={styles.brandIcon}>
                  <Ionicons name="checkmark-done" size={17} color={COLORS.cyan} />
                </View>
                <View>
                  <Text style={styles.brandTitle}>TaskFlow</Text>
                  <Text style={styles.brandSub}>Workspace</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="Close sidebar"
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* User Card */}
            <TouchableOpacity
              style={styles.userCard}
              activeOpacity={0.8}
              onPress={() => navigateTab('profile')}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials || 'U'}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
              <View style={[styles.syncPill, { borderColor: syncColor }]}>
                <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
                <Text style={[styles.syncText, { color: syncColor }]}>{syncLabel}</Text>
              </View>
            </TouchableOpacity>

            {/* Quick Action Buttons */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.newTaskBtn}
                onPress={() => {
                  onClose();
                  onOpenCreate('single');
                }}
              >
                <Ionicons name="add" size={16} color="#09090b" />
                <Text style={styles.newTaskText}>New Task</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiPlanBtn}
                onPress={() => {
                  onClose();
                  onOpenCreate('ai_plan');
                }}
              >
                <Ionicons name="sparkles" size={14} color="#ddd6fe" />
                <Text style={styles.aiPlanText}>AI Plan</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Primary Views */}
              <Text style={styles.sectionLabel}>NAVIGATION</Text>
              <NavItem
                icon="sunny-outline"
                label="Today Overview"
                active={activeTab === 'home'}
                onPress={() => navigateTab('home')}
              />
              <NavItem
                icon="checkbox-outline"
                label="All Tasks"
                badge={counts.all}
                active={
                  activeTab === 'tasks' && activeQueue === 'all' && selectedProjectId === 'all'
                }
                onPress={() => {
                  onSelectProject('all');
                  navigateQueue('all');
                }}
              />
              <NavItem
                icon="folder-outline"
                label="Projects & Folders"
                badge={projects.length}
                active={activeTab === 'projects'}
                onPress={() => navigateTab('projects')}
              />
              <NavItem
                icon="person-outline"
                label="Profile & Sync"
                active={activeTab === 'profile'}
                onPress={() => navigateTab('profile')}
              />

              {/* Smart Queues */}
              <Text style={[styles.sectionLabel, { marginTop: 18 }]}>SMART QUEUES</Text>
              <NavItem
                icon="today-outline"
                label="Today's Focus"
                badge={counts.today}
                active={activeTab === 'tasks' && activeQueue === 'today'}
                onPress={() => navigateQueue('today')}
              />
              <NavItem
                icon="alert-circle-outline"
                label="Missed / Overdue"
                badge={counts.missed}
                badgeTone={counts.missed > 0 ? 'danger' : 'default'}
                active={activeTab === 'tasks' && activeQueue === 'missed'}
                onPress={() => navigateQueue('missed')}
              />
              <NavItem
                icon="repeat-outline"
                label="Recurring"
                badge={counts.recurring}
                active={activeTab === 'tasks' && activeQueue === 'recurring'}
                onPress={() => navigateQueue('recurring')}
              />
              <NavItem
                icon="checkmark-done-circle-outline"
                label="Completed"
                badge={counts.completed}
                active={activeTab === 'tasks' && activeQueue === 'completed'}
                onPress={() => navigateQueue('completed')}
              />

              {/* Folders & Projects */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { marginTop: 18, marginBottom: 0 }]}>
                  PROJECTS
                </Text>
                {selectedProjectId !== 'all' && (
                  <TouchableOpacity onPress={() => navigateProject('all')}>
                    <Text style={styles.clearFilterText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {groupedFolders.sections.map(({ folder, items }) => (
                <View key={folder.id} style={styles.folderGroup}>
                  <View style={styles.folderRow}>
                    <Ionicons
                      name="folder"
                      size={13}
                      color={folder.color || COLORS.textMuted}
                    />
                    <Text style={styles.folderName} numberOfLines={1}>
                      {folder.name}
                    </Text>
                  </View>
                  {items.length === 0 ? (
                    <Text style={styles.emptyFolderText}>No projects</Text>
                  ) : (
                    items.map((project) => (
                      <ProjectNavItem
                        key={project.id}
                        project={project}
                        count={projectTaskCounts[project.id] || 0}
                        active={activeTab === 'tasks' && selectedProjectId === project.id}
                        onPress={() => navigateProject(project.id)}
                      />
                    ))
                  )}
                </View>
              ))}

              {groupedFolders.unfiled.length > 0 && (
                <View style={styles.folderGroup}>
                  {groupedFolders.sections.length > 0 && (
                    <View style={styles.folderRow}>
                      <Ionicons name="albums-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.folderName}>Unfiled</Text>
                    </View>
                  )}
                  {groupedFolders.unfiled.map((project) => (
                    <ProjectNavItem
                      key={project.id}
                      project={project}
                      count={projectTaskCounts[project.id] || 0}
                      active={activeTab === 'tasks' && selectedProjectId === project.id}
                      onPress={() => navigateProject(project.id)}
                    />
                  ))}
                </View>
              )}

              {projects.length === 0 && (
                <Text style={styles.emptyFolderText}>No projects created yet.</Text>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={() => {
                  onRefreshSync();
                  onClose();
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.footerBtnText}>Sync Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerBtn, styles.logoutBtn]}
                onPress={() => {
                  onClose();
                  onRequestLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={16} color="#fca5a5" />
                <Text style={[styles.footerBtnText, { color: '#fca5a5' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function NavItem({
  icon,
  label,
  badge,
  badgeTone = 'default',
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
  badgeTone?: 'default' | 'danger';
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? COLORS.cyan : COLORS.textSecondary}
      />
      <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
        {label}
      </Text>
      {typeof badge === 'number' && (
        <View
          style={[
            styles.badge,
            badgeTone === 'danger' && styles.badgeDanger,
            active && styles.badgeActive,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              badgeTone === 'danger' && styles.badgeTextDanger,
              active && styles.badgeTextActive,
            ]}
          >
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ProjectNavItem({
  project,
  count,
  active,
  onPress,
}: {
  project: Project;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.navItem, styles.projectItem, active && styles.navItemActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.projectDot,
          { backgroundColor: project.color || COLORS.cyan },
        ]}
      />
      <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
        {project.name}
      </Text>
      <View style={[styles.badge, active && styles.badgeActive]}>
        <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  drawer: {
    height: '100%',
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  brandSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: COLORS.bg,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  newTaskBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.cyan,
  },
  newTaskText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#09090b',
  },
  aiPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.violetSoft,
    borderWidth: 1,
    borderColor: COLORS.violetBorder,
  },
  aiPlanText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ddd6fe',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.textMuted,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cyan,
    marginTop: 18,
    paddingHorizontal: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  navLabelActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
  },
  badgeDanger: {
    backgroundColor: COLORS.roseSoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  badgeTextActive: {
    color: COLORS.cyan,
  },
  badgeTextDanger: {
    color: '#fca5a5',
  },
  folderGroup: {
    marginTop: 6,
    marginBottom: 6,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  folderName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  projectItem: {
    paddingLeft: 18,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyFolderText: {
    fontSize: 11,
    color: COLORS.textMuted,
    paddingHorizontal: 18,
    paddingVertical: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  logoutBtn: {
    backgroundColor: COLORS.roseSoft,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
