import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { Task } from '../types';
import { formatDisplayDate, getTodayYMD } from '../utils/date';

interface NotificationsModalProps {
  visible: boolean;
  tasks: Task[];
  onClose: () => void;
  onSelectTask: (task: Task) => void;
}

export default function NotificationsModal({
  visible,
  tasks,
  onClose,
  onSelectTask,
}: NotificationsModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const today = getTodayYMD();

  const overdue = useMemo(
    () => tasks.filter((t) => t.status !== 'completed' && t.due_date && t.due_date < today),
    [tasks, today]
  );

  const dueToday = useMemo(
    () => tasks.filter((t) => t.status !== 'completed' && t.due_date === today),
    [tasks, today]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="notifications-outline" size={18} color={colors.cyan} />
              <Text style={styles.title}>Reminders &amp; Alerts</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 12, paddingBottom: 28 }}>
            {overdue.length === 0 && dueToday.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle-outline" size={28} color={colors.emerald} />
                <Text style={styles.emptyText}>No overdue or due-today reminders!</Text>
              </View>
            ) : (
              <>
                {overdue.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.sectionLabel, { color: colors.rose }]}>
                      OVERDUE ({overdue.length})
                    </Text>
                    {overdue.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.row, { borderLeftWidth: 3, borderLeftColor: colors.rose }]}
                        onPress={() => {
                          onClose();
                          onSelectTask(t);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>{t.title}</Text>
                          <Text style={[styles.rowSub, { color: colors.rose }]}>
                            Was due {formatDisplayDate(t.due_date!)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {dueToday.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.sectionLabel, { color: colors.amber }]}>
                      DUE TODAY ({dueToday.length})
                    </Text>
                    {dueToday.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.row, { borderLeftWidth: 3, borderLeftColor: colors.amber }]}
                        onPress={() => {
                          onClose();
                          onSelectTask(t);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>{t.title}</Text>
                          <Text style={styles.rowSub}>{t.project_name || 'Personal'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderTopWidth: 1,
      borderColor: COLORS.border,
      maxHeight: '80%',
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderSubtle,
    },
    title: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { paddingTop: 12 },
    sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: COLORS.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 12,
    },
    rowTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
    rowSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    emptyBox: {
      padding: 24,
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    emptyText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  });
