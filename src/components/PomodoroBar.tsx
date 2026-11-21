import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';

interface PomodoroBarProps {
  visible: boolean;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export default function PomodoroBar({ visible, onClose, onNotify }: PomodoroBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          const nextMode = mode === 'focus' ? 'break' : 'focus';
          setMode(nextMode);
          onNotify?.(
            nextMode === 'break'
              ? 'Focus session complete! Time for a 5-minute break.'
              : 'Break finished! Ready to focus.'
          );
          return nextMode === 'break' ? BREAK_SECONDS : FOCUS_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, mode, onNotify]);

  if (!visible) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const switchMode = (next: 'focus' | 'break') => {
    setRunning(false);
    setMode(next);
    setSecondsLeft(next === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Ionicons
          name="timer-outline"
          size={18}
          color={mode === 'focus' ? colors.cyan : colors.emerald}
        />
        <Text style={styles.clock}>{formatted}</Text>
        <TouchableOpacity
          style={[styles.modeChip, mode === 'focus' && styles.modeChipActive]}
          onPress={() => switchMode('focus')}
        >
          <Text style={[styles.modeText, mode === 'focus' && styles.modeTextActive]}>Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeChip, mode === 'break' && styles.modeChipActive]}
          onPress={() => switchMode('break')}
        >
          <Text style={[styles.modeText, mode === 'break' && styles.modeTextActive]}>Break</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => setRunning((r) => !r)}
        >
          <Ionicons name={running ? 'pause' : 'play'} size={14} color="#09090b" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => switchMode(mode)}
        >
          <Ionicons name="refresh" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
          <Ionicons name="close" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemePalette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: COLORS.card,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderSubtle,
      gap: 8,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    clock: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, fontVariant: ['tabular-nums'] },
    modeChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    modeChipActive: { backgroundColor: COLORS.cyanSoft, borderColor: COLORS.cyanBorder },
    modeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
    modeTextActive: { color: COLORS.cyan },
    right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    playBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: COLORS.cyan,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
