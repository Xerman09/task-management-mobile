import React, { useMemo } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';

interface UpdateModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  apkUrl: string;
  onDismiss: () => void;
}

export default function UpdateModal({
  visible,
  currentVersion,
  latestVersion,
  apkUrl,
  onDismiss,
}: UpdateModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleDownload = async () => {
    try {
      await Linking.openURL(apkUrl);
    } catch {
      // ignore if cannot open URL
    }
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons name="cloud-download-outline" size={26} color={colors.cyan} />
          </View>
          <Text style={styles.title}>New Update Available</Text>
          <Text style={styles.message}>
            A newer version of TaskFlow ({latestVersion}) is ready to install. You are currently on{' '}
            {currentVersion}.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.laterBtn} onPress={onDismiss}>
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
              <Ionicons name="download-outline" size={16} color="#09090b" />
              <Text style={styles.downloadText}>Download Update</Text>
            </TouchableOpacity>
          </View>
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
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 20,
      alignItems: 'center',
      gap: 10,
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: COLORS.cyanSoft,
      borderWidth: 1,
      borderColor: COLORS.cyanBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    title: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
    message: {
      fontSize: 13,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
    laterBtn: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    laterText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
    downloadBtn: {
      flex: 1.5,
      height: 42,
      borderRadius: 10,
      backgroundColor: COLORS.cyan,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    downloadText: { fontSize: 13, fontWeight: '800', color: '#09090b' },
  });

