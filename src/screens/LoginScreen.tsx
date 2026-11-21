import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('admin@taskflow.dev');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoBox}>
            <Ionicons name="checkmark-done" size={28} color={COLORS.cyan} />
          </View>
          <Text style={styles.brandName}>TaskFlow</Text>
          <Text style={styles.brandSub}>Mobile Workspace • UI Preview</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to your workspace</Text>
          <Text style={styles.cardHint}>
            UI prototype mode is active — tap Sign In to explore all mobile screens.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => onLogin(email.trim() || 'admin@taskflow.dev')}
          >
            <Text style={styles.primaryBtnText}>Sign In to Workspace</Text>
            <Ionicons name="arrow-forward" size={16} color="#09090b" />
          </TouchableOpacity>
        </View>

        <View style={styles.footerBadge}>
          <View style={styles.dot} />
          <Text style={styles.footerText}>Cross-Device Sync Ready • iOS & Android</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: -6,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  primaryBtn: {
    marginTop: 4,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090b',
  },
  footerBadge: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.emerald,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
