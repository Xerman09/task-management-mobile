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
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { PRIORITY_COLORS, ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Project, TaskPriority } from '../types';
import { formatDisplayDate, getTodayYMD } from '../utils/date';
import {
  ParsedPlanTask,
  parseAiPlanText,
  TASKFLOW_AI_ASSISTANT_PROMPT,
  TASKFLOW_FORMAT_TEMPLATE,
} from '../utils/aiPlanParser';

interface CreateTaskModalProps {
  visible: boolean;
  initialMode?: 'single' | 'ai_plan';
  projects: Project[];
  onClose: () => void;
  onCreateSingle: (data: {
    title: string;
    description?: string;
    priority: TaskPriority;
    projectId: number | null;
    dueDate?: string;
    steps: string[];
  }) => Promise<boolean>;
  onImportAiPlan: (items: ParsedPlanTask[], projectId: number | null) => Promise<boolean>;
  onShowToast: (msg: string) => void;
}

export default function CreateTaskModal({
  visible,
  initialMode = 'single',
  projects,
  onClose,
  onCreateSingle,
  onImportAiPlan,
  onShowToast,
}: CreateTaskModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<'single' | 'ai_plan'>(initialMode);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [stepInput, setStepInput] = useState('');
  const [steps, setSteps] = useState<string[]>([]);

  const [aiPlanText, setAiPlanText] = useState('');
  const [showFormat, setShowFormat] = useState(false);
  const [copiedType, setCopiedType] = useState<'prompt' | 'format' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setMode(initialMode);
    }
  }, [visible, initialMode]);

  const parsedTasks = useMemo(() => {
    if (mode !== 'ai_plan') return [];
    return parseAiPlanText(aiPlanText, {
      priority,
      dueDate: dueDate.trim() || undefined,
    });
  }, [mode, aiPlanText, priority, dueDate]);

  const totalParsedSteps = parsedTasks.reduce((acc, t) => acc + t.steps.length, 0);

  const handleCopy = async (kind: 'prompt' | 'format') => {
    const content = kind === 'prompt' ? TASKFLOW_AI_ASSISTANT_PROMPT : TASKFLOW_FORMAT_TEMPLATE;
    await Clipboard.setStringAsync(content);
    setCopiedType(kind);
    onShowToast(
      kind === 'prompt'
        ? 'AI Assistant Prompt copied! Paste into ChatGPT / Claude / Gemini.'
        : 'TaskFlow Format template copied!'
    );
    setTimeout(() => setCopiedType((prev) => (prev === kind ? null : prev)), 2500);
  };

  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setProjectId(null);
    setDueDate('');
    setStepInput('');
    setSteps([]);
    setAiPlanText('');
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmedDue = dueDate.trim();
    if (trimmedDue && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDue)) {
      onShowToast('Please enter a valid date (YYYY-MM-DD)');
      return;
    }

    if (mode === 'ai_plan') {
      if (parsedTasks.length === 0) return;
      setSubmitting(true);
      try {
        const ok = await onImportAiPlan(parsedTasks, projectId);
        if (ok) resetAndClose();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const ok = await onCreateSingle({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        projectId,
        dueDate: trimmedDue || undefined,
        steps,
      });
      if (ok) resetAndClose();
    } finally {
      setSubmitting(false);
    }
  };

  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === 'ai_plan' ? 'AI Plan Import' : 'Create New Task'}
            </Text>
            <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'single' && styles.modeBtnActive]}
              onPress={() => setMode('single')}
            >
              <Text style={[styles.modeText, mode === 'single' && styles.modeTextActive]}>
                Single Task
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'ai_plan' && styles.modeBtnAiActive]}
              onPress={() => setMode('ai_plan')}
            >
              <Ionicons
                name="sparkles"
                size={13}
                color={mode === 'ai_plan' ? '#ddd6fe' : colors.textMuted}
              />
              <Text style={[styles.modeText, mode === 'ai_plan' && { color: '#ddd6fe' }]}>
                AI Plan / Text
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
            {mode === 'ai_plan' ? (
              <>
                <View style={styles.aiCard}>
                  <View style={styles.aiCardTop}>
                    <Text style={styles.aiCardTitle}>AI Plan &rarr; Tasks + Steps</Text>
                    <TouchableOpacity onPress={() => setShowFormat((p) => !p)}>
                      <Text style={styles.aiLink}>{showFormat ? 'Hide format' : 'View format'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.aiDesc}>
                    Copy the AI Assistant Prompt, ask your AI to convert your project plan, and paste the output below.
                  </Text>
                  <View style={styles.aiBtnRow}>
                    <TouchableOpacity
                      style={styles.aiPromptBtn}
                      onPress={() => handleCopy('prompt')}
                    >
                      <Ionicons
                        name={copiedType === 'prompt' ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color="#ede9fe"
                      />
                      <Text style={styles.aiPromptBtnText}>
                        {copiedType === 'prompt' ? 'Prompt Copied!' : 'Copy AI Prompt'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.aiFormatBtn}
                      onPress={() => handleCopy('format')}
                    >
                      <Ionicons
                        name={copiedType === 'format' ? 'checkmark' : 'document-text-outline'}
                        size={14}
                        color={colors.textPrimary}
                      />
                      <Text style={styles.aiFormatBtnText}>
                        {copiedType === 'format' ? 'Format Copied!' : 'Copy Format'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showFormat && (
                    <View style={styles.formatBox}>
                      <Text style={styles.formatCode}>{TASKFLOW_FORMAT_TEMPLATE}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.field}>
                  <View style={styles.fieldTop}>
                    <Text style={styles.label}>Paste AI Plan Text *</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        style={styles.pastePill}
                        onPress={async () => {
                          try {
                            const clip = await Clipboard.getStringAsync();
                            if (clip && clip.trim()) {
                              setAiPlanText(clip);
                              onShowToast('Pasted from clipboard');
                            } else {
                              onShowToast('Clipboard is empty');
                            }
                          } catch {
                            onShowToast('Could not read clipboard');
                          }
                        }}
                      >
                        <Ionicons name="clipboard-outline" size={12} color={colors.cyan} />
                        <Text style={styles.aiLink}>Paste</Text>
                      </TouchableOpacity>
                      {aiPlanText.trim().length > 0 && (
                        <TouchableOpacity onPress={() => setAiPlanText('')}>
                          <Text style={styles.clearLink}>Clear</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <TextInput
                    style={[styles.input, styles.aiTextArea]}
                    multiline
                    value={aiPlanText}
                    onChangeText={setAiPlanText}
                    placeholder={'TASK: Launch Mobile App\nPriority: high\nDue: 2026-11-28\nSteps:\n- [ ] Build login screen\n- [ ] Test on iOS & Android'}
                    placeholderTextColor={colors.textMuted}
                    textAlignVertical="top"
                  />
                </View>

                {aiPlanText.trim().length > 0 && (
                  <View style={styles.previewBox}>
                    <View style={styles.previewHeader}>
                      <Text style={styles.previewTitle}>Translated Preview</Text>
                      <Text style={styles.previewCount}>
                        {parsedTasks.length} tasks • {totalParsedSteps} steps
                      </Text>
                    </View>
                    {parsedTasks.map((pt, idx) => (
                      <View key={`${pt.title}-${idx}`} style={styles.previewItem}>
                        <Text style={styles.previewItemTitle}>
                          {idx + 1}. {pt.title}
                        </Text>
                        <Text style={styles.previewMeta}>
                          {pt.priority.toUpperCase()}
                          {pt.due_date ? ` • ${formatDisplayDate(pt.due_date)}` : ''}
                          {pt.steps.length > 0 ? ` • ${pt.steps.length} steps` : ''}
                        </Text>
                        {pt.steps.map((s, sIdx) => (
                          <Text key={sIdx} style={styles.previewStep}>
                            • {s}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Task Title *</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Finalize mobile UI prototype"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, { height: 74, paddingTop: 10 }]}
                    multiline
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add details or acceptance criteria..."
                    placeholderTextColor={colors.textMuted}
                    textAlignVertical="top"
                  />
                </View>

                {/* Steps Builder */}
                <View style={styles.field}>
                  <Text style={styles.label}>Steps on how to finish ({steps.length})</Text>
                  {steps.map((st, idx) => (
                    <View key={idx} style={styles.draftStepRow}>
                      <Text style={styles.draftStepText}>
                        {idx + 1}. {st}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setSteps((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.stepAddRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={stepInput}
                      onChangeText={setStepInput}
                      placeholder="Add a step..."
                      placeholderTextColor={colors.textMuted}
                      onSubmitEditing={() => {
                        if (stepInput.trim()) {
                          setSteps((p) => [...p, stepInput.trim()]);
                          setStepInput('');
                        }
                      }}
                    />
                    <TouchableOpacity
                      style={styles.stepAddBtn}
                      onPress={() => {
                        if (stepInput.trim()) {
                          setSteps((p) => [...p, stepInput.trim()]);
                          setStepInput('');
                        }
                      }}
                    >
                      <Ionicons name="add" size={18} color="#09090b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* Shared Priority & Due Date */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {mode === 'ai_plan' ? 'Default Priority' : 'Priority'}
              </Text>
              <View style={styles.chipRow}>
                {priorities.map((p) => {
                  const active = priority === p;
                  const c = PRIORITY_COLORS[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.chip,
                        active && { backgroundColor: c.bg, borderColor: c.border },
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && { color: c.text },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Project (Optional)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, projectId === null && styles.chipActive]}
                  onPress={() => setProjectId(null)}
                >
                  <Text style={[styles.chipText, projectId === null && styles.chipTextActive]}>
                    General
                  </Text>
                </TouchableOpacity>
                {projects.map((proj) => (
                  <TouchableOpacity
                    key={proj.id}
                    style={[styles.chip, projectId === proj.id && styles.chipActive]}
                    onPress={() => setProjectId(proj.id)}
                  >
                    <Text
                      style={[styles.chipText, projectId === proj.id && styles.chipTextActive]}
                      numberOfLines={1}
                    >
                      {proj.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldTop}>
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity onPress={() => setDueDate(getTodayYMD())}>
                  <Text style={styles.aiLink}>Set Today</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="e.g. 2026-11-28"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetAndClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                ((mode === 'single' && !title.trim()) ||
                  (mode === 'ai_plan' && parsedTasks.length === 0)) && { opacity: 0.45 },
              ]}
              disabled={
                submitting ||
                (mode === 'single' && !title.trim()) ||
                (mode === 'ai_plan' && parsedTasks.length === 0)
              }
              onPress={handleSubmit}
            >
              <Text style={styles.submitBtnText}>
                {mode === 'ai_plan'
                  ? `Import ${parsedTasks.length} Task${parsedTasks.length === 1 ? '' : 's'}`
                  : 'Create Task'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (COLORS: ThemePalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '92%',
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  closeBtn: { padding: 4 },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  modeBtnActive: { backgroundColor: '#27272a' },
  modeBtnAiActive: { backgroundColor: COLORS.violetSoft, borderWidth: 1, borderColor: COLORS.violetBorder },
  modeText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  modeTextActive: { color: COLORS.textPrimary },
  body: { paddingHorizontal: 16, paddingTop: 14, flexShrink: 1 },
  pastePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
  },
  field: { gap: 6 },
  fieldTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  aiCard: {
    backgroundColor: COLORS.violetSoft,
    borderWidth: 1,
    borderColor: COLORS.violetBorder,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  aiCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiCardTitle: { fontSize: 13, fontWeight: '700', color: '#ede9fe' },
  aiLink: { fontSize: 11, fontWeight: '700', color: COLORS.cyan },
  aiDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  aiBtnRow: { flexDirection: 'row', gap: 8 },
  aiPromptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    borderWidth: 1,
    borderColor: COLORS.violetBorder,
  },
  aiPromptBtnText: { fontSize: 12, fontWeight: '700', color: '#ede9fe' },
  aiFormatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiFormatBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  formatBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  formatCode: { fontSize: 10, color: COLORS.textSecondary, lineHeight: 15 },
  aiTextArea: { height: 130, fontSize: 12 },
  clearLink: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  previewBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 8,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  previewCount: { fontSize: 11, fontWeight: '700', color: '#c4b5fd' },
  previewItem: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 9,
    gap: 3,
  },
  previewItemTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  previewMeta: { fontSize: 10, color: COLORS.cyan, fontWeight: '600' },
  previewStep: { fontSize: 11, color: COLORS.textSecondary, paddingLeft: 6 },
  draftStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  draftStepText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  stepAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  stepAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  chipActive: { backgroundColor: COLORS.cyanSoft, borderColor: COLORS.cyanBorder },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: '#67e8f9' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bg,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  submitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 13, fontWeight: '800', color: '#09090b' },
});

