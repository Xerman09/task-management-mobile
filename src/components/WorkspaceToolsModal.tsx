import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import {
  createAutomationRule,
  createWebhook,
  deleteAutomationRule,
  deleteWebhook,
  getAutomationRules,
  getWebhooks,
  importTasksBulk,
  seedAutomationPresets,
  testWebhook,
  updateAutomationRule,
  updateWebhook,
} from '../api';
import { ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { AutomationRule, Task, WebhookConfig } from '../types';

export type WorkspaceToolTab = 'automations' | 'integrations' | 'data';

interface WorkspaceToolsModalProps {
  visible: boolean;
  initialTab?: WorkspaceToolTab;
  tasks: Task[];
  onClose: () => void;
  onWorkspaceChanged: () => Promise<void>;
  onShowToast: (msg: string) => void;
  onRequestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }) => void;
}

export default function WorkspaceToolsModal({
  visible,
  initialTab = 'automations',
  tasks,
  onClose,
  onWorkspaceChanged,
  onShowToast,
  onRequestConfirm,
}: WorkspaceToolsModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState<WorkspaceToolTab>(initialTab);
  const [loading, setLoading] = useState(false);

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [ruleName, setRuleName] = useState('');

  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whProvider, setWhProvider] = useState<'discord' | 'slack' | 'custom'>('discord');

  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, visible]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([getAutomationRules(), getWebhooks()])
      .then(([aRes, wRes]) => {
        if (aRes.success && aRes.rules) setRules(aRes.rules);
        if (wRes.success && wRes.webhooks) setWebhooks(wRes.webhooks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  const handleSeedPresets = async () => {
    try {
      const res = await seedAutomationPresets();
      if (res.success) {
        const list = await getAutomationRules();
        if (list.success && list.rules) setRules(list.rules);
        onShowToast('Preset rules added');
      } else {
        onShowToast(res.message || 'Failed to seed presets');
      }
    } catch {
      onShowToast('Network error seeding presets');
    }
  };

  const handleAddRule = async () => {
    const name = ruleName.trim();
    if (!name) return;
    try {
      const res = await createAutomationRule({
        name,
        trigger_type: 'status_changed',
        trigger_value: 'completed',
        action_type: 'notify',
        action_value: 'Task completed',
      });
      if (res.success && res.rule) {
        setRules((p) => [res.rule!, ...p]);
        setRuleName('');
        onShowToast('Automation rule created');
      } else {
        onShowToast(res.message || 'Failed to create rule');
      }
    } catch {
      onShowToast('Network error creating rule');
    }
  };

  const handleToggleRule = async (rule: AutomationRule) => {
    const next = !rule.is_active;
    setRules((p) => p.map((r) => (r.id === rule.id ? { ...r, is_active: next } : r)));
    try {
      const res = await updateAutomationRule({ id: rule.id, is_active: next });
      if (!res.success) {
        setRules((p) => p.map((r) => (r.id === rule.id ? { ...r, is_active: !next } : r)));
        onShowToast(res.message || 'Failed to update rule');
      }
    } catch {
      setRules((p) => p.map((r) => (r.id === rule.id ? { ...r, is_active: !next } : r)));
      onShowToast('Network error updating rule');
    }
  };

  const handleDeleteRule = (rule: AutomationRule) => {
    onRequestConfirm({
      title: 'Delete Automation',
      message: `Delete automation "${rule.name}"?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const res = await deleteAutomationRule(rule.id);
          if (res.success) {
            setRules((p) => p.filter((r) => r.id !== rule.id));
            onShowToast('Rule deleted');
          } else {
            onShowToast(res.message || 'Failed to delete rule');
          }
        } catch {
          onShowToast('Network error deleting rule');
        }
      },
    });
  };

  const handleAddWebhook = async () => {
    if (!whName.trim() || !whUrl.trim()) return;
    try {
      const res = await createWebhook({
        name: whName.trim(),
        provider: whProvider,
        webhook_url: whUrl.trim(),
        events: ['task_created_urgent', 'task_completed', 'status_changed'],
      });
      if (res.success && res.webhook) {
        setWebhooks((p) => [res.webhook!, ...p]);
        setWhName('');
        setWhUrl('');
        onShowToast('Integration added');
      } else {
        onShowToast(res.message || 'Failed to add integration');
      }
    } catch {
      onShowToast('Network error adding integration');
    }
  };

  const handleTestWebhook = async (id: number) => {
    try {
      const res = await testWebhook(id);
      onShowToast(res.success ? 'Test payload sent' : res.message || 'Webhook test failed');
    } catch {
      onShowToast('Network error testing webhook');
    }
  };

  const handleToggleWebhook = async (wh: WebhookConfig) => {
    const next = !wh.is_active;
    setWebhooks((p) => p.map((x) => (x.id === wh.id ? { ...x, is_active: next } : x)));
    try {
      const res = await updateWebhook({ id: wh.id, is_active: next });
      if (!res.success) {
        setWebhooks((p) => p.map((x) => (x.id === wh.id ? { ...x, is_active: !next } : x)));
        onShowToast(res.message || 'Failed to update integration');
      }
    } catch {
      setWebhooks((p) => p.map((x) => (x.id === wh.id ? { ...x, is_active: !next } : x)));
      onShowToast('Network error updating integration');
    }
  };

  const handleDeleteWebhook = (wh: WebhookConfig) => {
    onRequestConfirm({
      title: 'Delete Integration',
      message: `Remove webhook "${wh.name}"?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          const res = await deleteWebhook(wh.id);
          if (res.success) {
            setWebhooks((p) => p.filter((w) => w.id !== wh.id));
            onShowToast('Integration removed');
          } else {
            onShowToast(res.message || 'Failed to remove integration');
          }
        } catch {
          onShowToast('Network error removing integration');
        }
      },
    });
  };

  const handleCopyExport = async () => {
    const payload = JSON.stringify(
      tasks.map((t) => ({
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority,
        due_date: t.due_date || '',
        project: t.project_name || '',
      })),
      null,
      2
    );
    await Clipboard.setStringAsync(payload);
    onShowToast(`Copied ${tasks.length} tasks as JSON`);
  };

  const handleBulkImport = async () => {
    if (!importJson.trim() || importing) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        onShowToast('JSON must be an array of task objects');
        return;
      }
      const res = await importTasksBulk(parsed);
      if (res.success) {
        setImportJson('');
        await onWorkspaceChanged();
        onShowToast(`Imported ${res.imported_count || parsed.length} tasks`);
      } else {
        onShowToast(res.message || 'Import failed');
      }
    } catch {
      onShowToast('Invalid JSON format');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Workspace Tools</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            {(
              [
                { key: 'automations', label: 'Automations', icon: 'flash-outline' },
                { key: 'integrations', label: 'Integrations', icon: 'git-network-outline' },
                { key: 'data', label: 'Data Center', icon: 'server-outline' },
              ] as const
            ).map((t) => {
              const active = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                  onPress={() => setTab(t.key)}
                >
                  <Ionicons name={t.icon} size={14} color={active ? colors.cyan : colors.textMuted} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 12, paddingBottom: 28 }}>
            {loading && <ActivityIndicator size="small" color={colors.cyan} />}

            {tab === 'automations' && (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionLabel}>RULES ({rules.length})</Text>
                  <TouchableOpacity onPress={handleSeedPresets}>
                    <Text style={styles.linkText}>+ Seed Presets</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inlineRow}>
                  <TextInput
                    style={styles.input}
                    value={ruleName}
                    onChangeText={setRuleName}
                    placeholder="New rule name (e.g. Notify on Done)"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={handleAddRule}>
                    <Ionicons name="add" size={18} color="#09090b" />
                  </TouchableOpacity>
                </View>

                {rules.map((r) => (
                  <View key={r.id} style={styles.itemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{r.name}</Text>
                      <Text style={styles.itemSub}>
                        {r.trigger_type} → {r.action_type}
                      </Text>
                    </View>
                    <Switch value={r.is_active} onValueChange={() => handleToggleRule(r)} />
                    <TouchableOpacity onPress={() => handleDeleteRule(r)}>
                      <Ionicons name="trash-outline" size={16} color={colors.rose} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {tab === 'integrations' && (
              <>
                <Text style={styles.sectionLabel}>ADD WEBHOOK</Text>
                <View style={styles.cardBox}>
                  <View style={styles.providerRow}>
                    {(['discord', 'slack', 'custom'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.providerChip, whProvider === p && styles.providerChipActive]}
                        onPress={() => setWhProvider(p)}
                      >
                        <Text
                          style={[
                            styles.providerText,
                            whProvider === p && { color: colors.cyan },
                          ]}
                        >
                          {p.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.inputFull}
                    value={whName}
                    onChangeText={setWhName}
                    placeholder="Integration name (e.g. Team Discord)"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={styles.inputFull}
                    value={whUrl}
                    onChangeText={setWhUrl}
                    placeholder="https://discord.com/api/webhooks/..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleAddWebhook}>
                    <Text style={styles.primaryBtnText}>Connect Webhook</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>CONNECTED ({webhooks.length})</Text>
                {webhooks.map((w) => (
                  <View key={w.id} style={styles.itemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>
                        {w.name} ({w.provider})
                      </Text>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {w.webhook_url}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.testBtn} onPress={() => handleTestWebhook(w.id)}>
                      <Text style={styles.testBtnText}>Test</Text>
                    </TouchableOpacity>
                    <Switch
                      value={w.is_active}
                      onValueChange={() => void handleToggleWebhook(w)}
                    />
                    <TouchableOpacity onPress={() => handleDeleteWebhook(w)}>
                      <Ionicons name="trash-outline" size={16} color={colors.rose} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {tab === 'data' && (
              <>
                <View style={styles.cardBox}>
                  <Text style={styles.itemTitle}>Export Workspace Tasks</Text>
                  <Text style={styles.itemSub}>
                    Copy all {tasks.length} tasks as structured JSON to your clipboard.
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleCopyExport}>
                    <Ionicons name="copy-outline" size={15} color="#09090b" />
                    <Text style={styles.primaryBtnText}>Copy JSON Export</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardBox}>
                  <Text style={styles.itemTitle}>Bulk JSON Import</Text>
                  <Text style={styles.itemSub}>
                    Paste a JSON array of tasks (each with a &quot;title&quot; field).
                  </Text>
                  <TextInput
                    style={[styles.inputFull, { minHeight: 90, textAlignVertical: 'top' }]}
                    value={importJson}
                    onChangeText={setImportJson}
                    placeholder='[{"title": "Review Q4 roadmap", "priority": "high"}]'
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleBulkImport}
                    disabled={importing}
                  >
                    <Text style={styles.primaryBtnText}>
                      {importing ? 'Importing...' : 'Import JSON Tasks'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (COLORS: ThemePalette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderTopWidth: 1,
      borderColor: COLORS.border,
      maxHeight: '90%',
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    tabPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    tabPillActive: { backgroundColor: COLORS.cyanSoft, borderColor: COLORS.cyanBorder },
    tabText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
    tabTextActive: { color: COLORS.cyan },
    body: { maxHeight: 520 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.8 },
    linkText: { fontSize: 11, fontWeight: '700', color: COLORS.cyan },
    inlineRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 12,
      fontSize: 12,
      color: COLORS.textPrimary,
    },
    inputFull: {
      borderRadius: 10,
      backgroundColor: COLORS.bg,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 12,
      color: COLORS.textPrimary,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: COLORS.cyan,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: COLORS.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 12,
    },
    itemTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
    itemSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    cardBox: {
      backgroundColor: COLORS.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 14,
      gap: 10,
    },
    providerRow: { flexDirection: 'row', gap: 6 },
    providerChip: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
    },
    providerChipActive: { backgroundColor: COLORS.cyanSoft, borderColor: COLORS.cyanBorder },
    providerText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
    primaryBtn: {
      height: 40,
      borderRadius: 10,
      backgroundColor: COLORS.cyan,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    primaryBtnText: { fontSize: 12, fontWeight: '800', color: '#09090b' },
    testBtn: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    testBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.cyan },
  });

