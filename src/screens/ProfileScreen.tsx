import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiBaseUrl } from '../api';
import { ThemeId, ThemePalette, THEMES } from '../theme';
import { useTheme } from '../ThemeContext';
import { User } from '../types';

interface ProfileScreenProps {
  user: User;
  totalTasks: number;
  completedTasks: number;
  syncStatus: 'synced' | 'syncing' | 'error';
  onRefreshSync: () => void;
  onOpenAiImport: () => void;
  onOpenTools: (tab: 'automations' | 'integrations' | 'data') => void;
  onRequestLogout: () => void;
}

export default function ProfileScreen({
  user,
  totalTasks,
  completedTasks,
  syncStatus,
  onRefreshSync,
  onOpenAiImport,
  onOpenTools,
  onRequestLogout,
}: ProfileScreenProps) {
  const { colors, themeId, setThemeId } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          <Text style={[styles.statVal, { color: colors.emerald }]}>{completedTasks}</Text>
          <Text style={styles.statLbl}>Completed</Text>
        </View>
      </View>

      {/* Theme Selection */}
      <View style={styles.themeCard}>
        <View style={styles.themeHeader}>
          <Ionicons name="color-palette-outline" size={16} color={colors.cyan} />
          <Text style={styles.themeTitle}>Appearance &amp; Theme</Text>
        </View>
        <View style={styles.themeGrid}>
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const preset = THEMES[id];
            const active = themeId === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.themeChip, active && styles.themeChipActive]}
                onPress={() => setThemeId(id)}
                activeOpacity={0.8}
              >
                <View style={[styles.themeSwatch, { backgroundColor: preset.swatch }]} />
                <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>
                  {preset.name}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={15} color={colors.cyan} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuRow} onPress={onOpenAiImport} activeOpacity={0.75}>
          <View style={[styles.menuIcon, { backgroundColor: colors.violetSoft }]}>
            <Ionicons name="sparkles" size={18} color={colors.violet} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>AI Plan / Text Translator</Text>
            <Text style={styles.menuSub}>Copy AI prompt &amp; import tasks with steps</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuRow} onPress={onRefreshSync} activeOpacity={0.75}>
          <View style={[styles.menuIcon, { backgroundColor: colors.emeraldSoft }]}>
            <Ionicons name="sync" size={18} color={colors.emerald} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Cross-Device Sync</Text>
            <Text style={styles.menuSub} numberOfLines={1}>
              {getApiBaseUrl()}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'error' ? 'Retry' : 'Live'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => onOpenTools('automations')}
          activeOpacity={0.75}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.cyanSoft }]}>
            <Ionicons name="construct-outline" size={18} color={colors.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Workspace Tools</Text>
            <Text style={styles.menuSub}>Automations, Integrations &amp; Data Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onRequestLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color={colors.rose} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (COLORS: ThemePalette) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 100, gap: 14, maxWidth: 960, width: '100%', alignSelf: 'center' },
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
  themeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  themeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: '47%',
    flexGrow: 1,
  },
  themeChipActive: {
    backgroundColor: COLORS.cyanSoft,
    borderColor: COLORS.cyanBorder,
  },
  themeSwatch: { width: 12, height: 12, borderRadius: 6 },
  themeChipText: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  themeChipTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
});

