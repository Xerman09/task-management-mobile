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
import { ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Project, Task } from '../types';

interface CommandPaletteModalProps {
  visible: boolean;
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
  onSelectTask: (task: Task) => void;
  onSelectProject: (projectId: number) => void;
  onRunAction: (action: 'new_task' | 'ai_plan' | 'calendar' | 'matrix' | 'tools') => void;
}

export default function CommandPaletteModal({
  visible,
  tasks,
  projects,
  onClose,
  onSelectTask,
  onSelectProject,
  onRunAction,
}: CommandPaletteModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const matchingTasks = useMemo(() => {
    if (!q) return tasks.slice(0, 5);
    return tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.project_name || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [tasks, q]);

  const matchingProjects = useMemo(() => {
    if (!q) return projects.slice(0, 4);
    return projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [projects, q]);

  const quickActions: {
    id: 'new_task' | 'ai_plan' | 'calendar' | 'matrix' | 'tools';
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { id: 'new_task', label: 'Create New Task', icon: 'add-circle-outline' },
    { id: 'ai_plan', label: 'AI Plan / Text Translator', icon: 'sparkles-outline' },
    { id: 'calendar', label: 'Open Calendar View', icon: 'calendar-outline' },
    { id: 'matrix', label: 'Open Eisenhower Matrix', icon: 'grid-outline' },
    { id: 'tools', label: 'Automations, Integrations & Data Center', icon: 'construct-outline' },
  ];

  const filteredActions = q
    ? quickActions.filter((a) => a.label.toLowerCase().includes(q))
    : quickActions;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.cyan} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Search tasks, projects, or commands..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
            {filteredActions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
                {filteredActions.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    style={styles.row}
                    onPress={() => {
                      onClose();
                      onRunAction(act.id);
                    }}
                  >
                    <Ionicons name={act.icon} size={17} color={colors.cyan} />
                    <Text style={styles.rowTitle}>{act.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {matchingProjects.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>PROJECTS</Text>
                {matchingProjects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.row}
                    onPress={() => {
                      onClose();
                      onSelectProject(p.id);
                    }}
                  >
                    <View style={[styles.dot, { backgroundColor: p.color || colors.cyan }]} />
                    <Text style={styles.rowTitle}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {matchingTasks.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>TASKS</Text>
                {matchingTasks.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.row}
                    onPress={() => {
                      onClose();
                      onSelectTask(t);
                    }}
                  >
                    <Ionicons
                      name={t.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={t.status === 'completed' ? colors.emerald : colors.textMuted}
                    />
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {t.title}
                    </Text>
                    {t.project_name && (
                      <Text style={styles.rowMeta}>{t.project_name}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (COLORS: ThemePalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 70,
      paddingHorizontal: 16,
    },
    card: {
      width: '100%',
      maxWidth: 540,
      maxHeight: '78%',
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderSubtle,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: COLORS.textPrimary,
    },
    list: { padding: 12 },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: COLORS.textMuted,
      letterSpacing: 0.8,
      marginBottom: 4,
      paddingHorizontal: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
    },
    rowTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
    rowMeta: { fontSize: 11, color: COLORS.textMuted },
    dot: { width: 9, height: 9, borderRadius: 5 },
  });
