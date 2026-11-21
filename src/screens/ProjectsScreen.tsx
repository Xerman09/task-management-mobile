import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { Folder, Project, Task } from '../types';

interface ProjectsScreenProps {
  folders: Folder[];
  projects: Project[];
  tasks: Task[];
  onSelectProject: (projectId: number) => void;
}

export default function ProjectsScreen({
  folders,
  projects,
  tasks,
  onSelectProject,
}: ProjectsScreenProps) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Folders &amp; Projects</Text>
      <Text style={styles.subtitle}>Tap any project to view and manage its tasks</Text>

      {/* Folders */}
      <Text style={styles.sectionLabel}>FOLDERS ({folders.length})</Text>
      <View style={styles.folderRow}>
        {folders.map((folder) => {
          const projCount = projects.filter((p) => p.folder_id === folder.id).length;
          return (
            <View key={folder.id} style={styles.folderCard}>
              <View style={[styles.folderIcon, { backgroundColor: `${folder.color}25` }]}>
                <Ionicons name="folder" size={18} color={folder.color} />
              </View>
              <Text style={styles.folderName} numberOfLines={1}>
                {folder.name}
              </Text>
              <Text style={styles.folderSub}>
                {projCount} {projCount === 1 ? 'project' : 'projects'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Projects */}
      <Text style={styles.sectionLabel}>PROJECTS ({projects.length})</Text>
      <View style={styles.list}>
        {projects.map((proj) => {
          const pTasks = tasks.filter((t) => t.project_id === proj.id);
          const done = pTasks.filter((t) => t.status === 'completed').length;
          const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;

          return (
            <TouchableOpacity
              key={proj.id}
              style={styles.projectCard}
              activeOpacity={0.85}
              onPress={() => onSelectProject(proj.id)}
            >
              <View style={styles.projectHeader}>
                <View style={[styles.projectColorBox, { backgroundColor: proj.color }]}>
                  <Ionicons name="layers" size={16} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectName}>{proj.name}</Text>
                  {proj.folder_name && (
                    <Text style={styles.projectFolder}>{proj.folder_name}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </View>

              {proj.description && (
                <Text style={styles.projectDesc} numberOfLines={2}>
                  {proj.description}
                </Text>
              )}

              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${pct}%`, backgroundColor: proj.color }]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {done}/{pTasks.length} ({pct}%)
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 100, gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: -6, marginBottom: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  folderRow: { flexDirection: 'row', gap: 10 },
  folderCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 6,
  },
  folderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  folderSub: { fontSize: 11, color: COLORS.textMuted },
  list: { gap: 10 },
  projectCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  projectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  projectColorBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  projectFolder: { fontSize: 11, color: COLORS.cyan, fontWeight: '600', marginTop: 2 },
  projectDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
});
