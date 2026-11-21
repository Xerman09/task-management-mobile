import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, destructive ? styles.iconDanger : styles.iconCyan]}>
              <Ionicons
                name={destructive ? 'warning-outline' : 'help-circle-outline'}
                size={20}
                color={destructive ? COLORS.rose : COLORS.cyan}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive ? styles.confirmDanger : styles.confirmCyan]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: {
    backgroundColor: COLORS.roseSoft,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  iconCyan: {
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  confirmDanger: {
    backgroundColor: COLORS.rose,
  },
  confirmCyan: {
    backgroundColor: COLORS.cyan,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
