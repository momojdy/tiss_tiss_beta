import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { Txt } from './Txt';

export const Skeleton = ({ height = 16, width = '100%', radius = 8 }: { height?: number; width?: number | string; radius?: number }) => {
  const { colors } = useTheme();
  const v = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(v, { toValue: 0.4, duration: 700, useNativeDriver: true })]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={{ height, width: width as any, borderRadius: radius, backgroundColor: colors.placeholder, opacity: v }} />;
};

export const CardSkeleton = () => (
  <View style={{ gap: 10 }}>
    <Skeleton height={190} radius={20} />
    <Skeleton height={18} width="60%" />
    <Skeleton height={14} width="40%" />
  </View>
);

export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <View style={{ gap: 22 }}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </View>
);

interface StateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  tone?: 'brand' | 'danger';
}

export const StateView = ({ icon, title, body, action, onAction, tone = 'brand' }: StateProps) => {
  const { colors } = useTheme();
  const bg = tone === 'danger' ? colors.dangerSoft : colors.brandSoft;
  const fg = tone === 'danger' ? colors.danger : colors.brand;
  return (
    <View style={styles.state}>
      <View style={[styles.disc, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={36} color={fg} />
      </View>
      <Txt v="h2" center>
        {title}
      </Txt>
      {body ? (
        <Txt sub center>
          {body}
        </Txt>
      ) : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ alignSelf: 'stretch', marginTop: 8 }} /> : null}
    </View>
  );
};

export const ErrorView = ({ message, onRetry }: { message?: string; onRetry?: () => void }) => (
  <StateView icon="alert-circle-outline" tone="danger" title="Something went wrong" body={message || 'Please try again.'} action={onRetry ? 'Try again' : undefined} onAction={onRetry} />
);

export const OfflineView = ({ onRetry }: { onRetry?: () => void }) => (
  <StateView icon="cloud-offline-outline" title="You are offline" body="Check your connection and try again." action={onRetry ? 'Retry' : undefined} onAction={onRetry} />
);

const styles = StyleSheet.create({
  state: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 },
  disc: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
