import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function triggerHaptic(type: 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // ignore on unsupported devices
  }
}

