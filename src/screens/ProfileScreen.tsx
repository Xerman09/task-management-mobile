import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { User } from '../types';

interface ProfileScreenProps {
  user: User;
  totalTasks: number;
  completedTasks: number;
  onOpenAiImport: () => void;
  onRequestLogout: () => void;
}

export default function ProfileScreen({
  user,
  totalTasks,
  completedTasks,
  onOpenAiImport,
  onRequestLogout,
}: ProfileScreenProps) {
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'TF'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalTasks}</Text>
          <Text style={styles.statLbl}>Total Tasks</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: COLORS.emerald }]}>{completedTasks}</Text>
          <Text style={styles.statLbl}>Completed</Text>
        </View>
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuRow} onPress={onOpenAiImport} activeOpacity={0.75}>
          <View style={[styles.menuIcon, { backgroundColor: COLORS.violetSoft }]}>
            <Ionicons name="sparkles" size={18} color="#ddd6fe" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>AI Plan / Text Translator</Text>
            <Text style={styles.menuSub}>Copy AI prompt &amp; import tasks with steps</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.menuRow}>
          <View style={[styles.menuIcon, { backgroundColor: COLORS.emeraldSoft }]}>
            <Ionicons name="sync" size={18} color={COLORS.emerald} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Cross-Device Sync</Text>
            <Text style={styles.menuSub}>UI Prototype Mode (Mock Data)</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Ready</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onRequestLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.rose} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 100, gap: 14 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.cyan },
  name: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  email: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleText: { fontSize: 10, fontWeight: '700', color: COLORS.cyan },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
  },
  statVal: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  menuSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.borderSubtle, marginHorizontal: 14 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.emeraldSoft,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: COLORS.emerald },
  logoutBtn: {
    marginTop: 6,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.roseSoft,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: COLORS.rose },
});
