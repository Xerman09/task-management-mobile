import React from 'react';
import { StyleSheet, View } from 'react-native';

interface TaskFlowIconProps {
  size?: number;
}

/**
 * Pure React Native version of TaskFlow's modular Swiss-grid "TF" squircle logo.
 */
export function TaskFlowIcon({ size = 28 }: TaskFlowIconProps) {
  const s = size / 48;

  return (
    <View
      style={[
        styles.squircle,
        {
          width: size,
          height: size,
          borderRadius: Math.round(12 * s),
          borderWidth: Math.max(1, 1.2 * s),
        },
      ]}
    >
      {/* Top Beam */}
      <View
        style={{
          position: 'absolute',
          left: 11 * s,
          top: 11 * s,
          width: 24 * s,
          height: 6 * s,
          borderRadius: 3 * s,
          backgroundColor: '#fafafa',
        }}
      />

      {/* Left Pillar */}
      <View
        style={{
          position: 'absolute',
          left: 11 * s,
          top: 20 * s,
          width: 6 * s,
          height: 15 * s,
          borderRadius: 3 * s,
          backgroundColor: '#d4d4d8',
        }}
      />

      {/* Active Flow Lane */}
      <View
        style={{
          position: 'absolute',
          left: 20 * s,
          top: 20 * s,
          width: 15 * s,
          height: 6 * s,
          borderRadius: 3 * s,
          backgroundColor: '#10b981',
        }}
      />

      {/* Precision Anchor Node */}
      <View
        style={{
          position: 'absolute',
          left: 20 * s,
          top: 29 * s,
          width: 6 * s,
          height: 6 * s,
          borderRadius: 3 * s,
          backgroundColor: '#52525b',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  squircle: {
    backgroundColor: '#121215',
    borderColor: '#27272a',
    overflow: 'hidden',
  },
});

