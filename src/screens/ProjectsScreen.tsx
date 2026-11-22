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
import {
  createFolder,
  createProject,
  deleteFolder,
  deleteProject,
  updateFolder,
  updateProject,
} from '../api';
import { ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Folder, Project, Task } from '../types';

interface ProjectsScreenProps {
  folders: Folder[];
  projects: Project[];
  tasks: Task[];
  onSelectProject: (projectId: number) => void;
  onWorkspaceChanged: () => Promise<void>;
  onShowToast: (msg: string) => void;
  onRequestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }) => void;
}

const PALETTE_COLORS = [
  '#06b6d4',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
];

export default function ProjectsScreen({
  folders,
  projects,
  tasks,
  onSelectProject,
  onWorkspaceChanged,
  onShowToast,
  onRequestConfirm,
}: ProjectsScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [modalMode, setModalMode] = useState<'folder' | 'project' | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [colorInput, setColorInput] = useState(PALETTE_COLORS[0]);
  const [folderIdInput, setFolderIdInput] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreateFolder = () => {
    setEditingFolder(null);
    setEditingProject(null);
    setNameInput('');
    setColorInput(PALETTE_COLORS[0]);
    setModalMode('folder');
  };

  const openEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setEditingProject(null);
    setNameInput(folder.name);
    setColorInput(folder.color || PALETTE_COLORS[0]);
    setModalMode('folder');
  };

  const openCreateProject = () => {
    setEditingFolder(null);
    setEditingProject(null);
    setNameInput('');
    setDescInput('');
    setColorInput(PALETTE_COLORS[1]);
    setFolderIdInput(folders[0]?.id ?? null);
    setModalMode('project');
  };

  const openEditProject = (proj: Project) => {
    setEditingFolder(null);
    setEditingProject(proj);
    setNameInput(proj.name);
    setDescInput(proj.description || '');
    setColorInput(proj.color || PALETTE_COLORS[0]);
    setFolderIdInput(proj.folder_id ?? null);
    setModalMode('project');
  };

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (modalMode === 'folder') {
        const res = editingFolder
          ? await updateFolder({ id: editingFolder.id, name: trimmed, color: colorInput })
          : await createFolder({ name: trimmed, color: colorInput });
        if (res.success) {
          setModalMode(null);
          await onWorkspaceChanged();
          onShowToast(editingFolder ? 'Folder updated' : 'Folder created');
        } else {
          onShowToast(res.message || 'Failed to save folder');
        }
      } else if (modalMode === 'project') {
        const res = editingProject
          ? await updateProject({
              id: editingProject.id,
              name: trimmed,
              description: descInput.trim(),
              color: colorInput,
              folder_id: folderIdInput,
            })
          : await createProject({
              name: trimmed,
              description: descInput.trim(),
              color: colorInput,
              folder_id: folderIdInput,
            });
        if (res.success) {
          setModalMode(null);
          await onWorkspaceChanged();
          onShowToast(editingProject ? 'Project updated' : 'Project created');
        } else {
          onShowToast(res.message || 'Failed to save project');
        }
      }
    } catch {
      onShowToast('Network error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFolder = (folder: Folder) => {
    onRequestConfirm({
      title: 'Delete Folder',
      message: `Delete folder "${folder.name}"? Projects inside will become unfiled.`,
      confirmLabel: 'Delete Folder',
      onConfirm: async () => {
        try {
          const res = await deleteFolder(folder.id);
          if (res.success) {
            await onWorkspaceChanged();
            onShowToast('Folder deleted');
          } else {
            onShowToast(res.message || 'Failed to delete folder');
          }
        } catch {
          onShowToast('Network error deleting folder');
        }
      },
    });
  };

  const confirmDeleteProject = (proj: Project) => {
    onRequestConfirm({
      title: 'Delete Project',
      message: `Delete project "${proj.name}"?`,
      confirmLabel: 'Delete Project',
      onConfirm: async () => {
        try {
          const res = await deleteProject(proj.id);
          if (res.success) {
            await onWorkspaceChanged();
            onShowToast('Project deleted');
          } else {
            onShowToast(res.message || 'Failed to delete project');
          }
        } catch {
          onShowToast('Network error deleting project');
        }
      },
    });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Projects</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={openCreateFolder}>
              <Ionicons name="folder-open-outline" size={14} color={colors.textPrimary} />
              <Text style={styles.secondaryBtnText}>Folder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={openCreateProject}>
              <Ionicons name="add" size={15} color={colors.bg} />
              <Text style={styles.primaryBtnText}>Project</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>Tap a project to filter and manage its tasks</Text>
      </View>

      {/* Folders */}
      <Text style={styles.sectionLabel}>FOLDERS ({folders.length})</Text>
      {folders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="folder-open-outline" size={22} color={colors.textMuted} />
          <Text style={styles.emptyText}>No folders yet</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.folderRow}
        >
          {folders.map((folder) => {
            const projCount = projects.filter((p) => p.folder_id === folder.id).length;
            return (
              <View key={folder.id} style={styles.folderCard}>
                <View style={styles.folderTop}>
                  <View style={[styles.folderIcon, { backgroundColor: `${folder.color}25` }]}>
                    <Ionicons name="folder" size={18} color={folder.color} />
                  </View>
                  <View style={styles.miniActions}>
                    <TouchableOpacity onPress={() => openEditFolder(folder)}>
                      <Ionicons name="create-outline" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeleteFolder(folder)}>
                      <Ionicons name="trash-outline" size={15} color={colors.rose} />
                    </TouchableOpacity>
                  </View>
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
        </ScrollView>
      )}

      {/* Projects */}
      <Text style={styles.sectionLabel}>PROJECTS ({projects.length})</Text>
      {projects.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="layers-outline" size={24} color={colors.textMuted} />
          <Text style={styles.emptyText}>No projects created yet</Text>
        </View>
      ) : (
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
                  <View style={styles.miniActions}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        openEditProject(proj);
                      }}
                      style={styles.iconPill}
                    >
                      <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        confirmDeleteProject(proj);
                      }}
                      style={styles.iconPill}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.rose} />
                    </TouchableOpacity>
                  </View>
                </View>

                {proj.description ? (
                  <Text style={styles.projectDesc} numberOfLines={2}>
                    {proj.description}
                  </Text>
                ) : null}

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
      )}

      {/* Create / Edit Modal */}
      <Modal
        visible={modalMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMode(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'folder'
                  ? editingFolder
                    ? 'Edit Folder'
                    : 'New Folder'
                  : editingProject
                    ? 'Edit Project'
                    : 'New Project'}
              </Text>
              <TouchableOpacity onPress={() => setModalMode(null)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={modalMode === 'folder' ? 'e.g. Work, Personal' : 'e.g. Mobile App'}
              placeholderTextColor={colors.textMuted}
            />

            {modalMode === 'project' && (
              <>
                <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={descInput}
                  onChangeText={setDescInput}
                  placeholder="Optional project notes..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />

                <Text style={styles.fieldLabel}>FOLDER</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.pill, folderIdInput === null && styles.pillActive]}
                    onPress={() => setFolderIdInput(null)}
                  >
                    <Text style={[styles.pillText, folderIdInput === null && styles.pillTextActive]}>
                      Unfiled
                    </Text>
                  </TouchableOpacity>
                  {folders.map((f) => {
                    const active = folderIdInput === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => setFolderIdInput(f.id)}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {f.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.fieldLabel}>COLOR</Text>
            <View style={styles.colorRow}>
              {PALETTE_COLORS.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  onPress={() => setColorInput(hex)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: hex },
                    colorInput === hex && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (COLORS: ThemePalette) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: COLORS.bg },
    content: {
      padding: 16,
      paddingBottom: 100,
      gap: 12,
      maxWidth: 960,
      width: '100%',
      alignSelf: 'center',
    },
    headerBlock: { gap: 4 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    headerActions: { flexDirection: 'row', gap: 8 },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: COLORS.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    primaryBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.bg },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 10,
    },
    secondaryBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
    subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.textMuted,
      letterSpacing: 0.8,
      marginTop: 6,
    },
    folderRow: { flexDirection: 'row', gap: 10, paddingRight: 4 },
    folderCard: {
      width: 164,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 12,
      gap: 6,
    },
    folderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    miniActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconPill: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 18,
    },
    emptyText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
    folderIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    folderName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
    folderSub: { fontSize: 11, color: COLORS.textMuted },
    list: { gap: 10 },
    projectCard: {
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 14,
      gap: 10,
    },
    projectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    projectColorBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    projectName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
    projectFolder: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
    projectDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.68)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 18,
      gap: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    fieldLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8 },
    input: {
      backgroundColor: COLORS.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: COLORS.textPrimary,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    pillActive: { backgroundColor: COLORS.cyanSoft, borderColor: COLORS.cyanBorder },
    pillText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
    pillTextActive: { color: COLORS.cyan },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 4 },
    colorSwatch: { width: 26, height: 26, borderRadius: 13 },
    colorSwatchActive: { borderWidth: 3, borderColor: COLORS.textPrimary },
    saveBtn: {
      marginTop: 6,
      height: 42,
      borderRadius: 10,
      backgroundColor: COLORS.cyan,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: { fontSize: 13, fontWeight: '800', color: '#09090b' },
  });
