import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getApiBaseUrl, loginUser, registerUser, saveServerUrl } from '../api';
import { ThemePalette } from '../theme';
import { useTheme } from '../ThemeContext';
import { TaskFlowIcon } from '../components/TaskFlowLogo';
import { User } from '../types';

interface LoginScreenProps {
  initialServerUrl?: string;
  onAuthenticated: (user: User) => void;
}

export default function LoginScreen({ initialServerUrl, onAuthenticated }: LoginScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@taskflow.dev');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(initialServerUrl || getApiBaseUrl());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (authMode === 'register' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      await saveServerUrl(serverUrl);
      const res =
        authMode === 'login'
          ? await loginUser(trimmedEmail, password)
          : await registerUser(name.trim(), trimmedEmail, password);

      if (res.success && res.user) {
        onAuthenticated(res.user);
      } else {
        setError(res.message || 'Authentication failed. Check your credentials.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Ensure XAMPP Apache is running.`
          : 'Could not reach the backend API. Ensure XAMPP Apache is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <TaskFlowIcon size={58} />
            <Text style={styles.brandName}>TaskFlow</Text>
            <Text style={styles.brandSub}>Mobile Workspace • Connected to Backend</Text>
          </View>

          <View style={styles.card}>
            {/* Sign In / Create Account Toggle */}
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, authMode === 'login' && styles.modeBtnActive]}
                onPress={() => {
                  setAuthMode('login');
                  setError(null);
                }}
              >
                <Text style={[styles.modeText, authMode === 'login' && styles.modeTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, authMode === 'register' && styles.modeBtnActive]}
                onPress={() => {
                  setAuthMode('register');
                  setError(null);
                }}
              >
                <Text style={[styles.modeText, authMode === 'register' && styles.modeTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#fca5a5" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {authMode === 'register' && (
              <View style={styles.field}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              disabled={loading}
              onPress={handleSubmit}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#09090b" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {authMode === 'login' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#09090b" />
                </>
              )}
            </TouchableOpacity>

            {/* Optional Server URL Override */}
            <TouchableOpacity
              style={styles.serverToggle}
              onPress={() => setShowServerConfig((p) => !p)}
            >
              <Ionicons name="server-outline" size={13} color={colors.textMuted} />
              <Text style={styles.serverToggleText}>
                {showServerConfig ? 'Hide API Server URL' : 'Configure API Server URL'}
              </Text>
            </TouchableOpacity>

            {showServerConfig && (
              <View style={styles.field}>
                <Text style={styles.label}>Backend API URL</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, { fontSize: 12 }]}
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    placeholder="http://localhost/task_management/backend-php/api"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.footerBadge}>
            <View style={styles.dot} />
            <Text style={styles.footerText}>Live MySQL + Cross-Device Sync</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ThemePalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 24,
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
  modeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#27272a',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  modeTextActive: {
    color: COLORS.textPrimary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.roseSoft,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#fca5a5',
    lineHeight: 17,
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
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  serverToggleText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
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
