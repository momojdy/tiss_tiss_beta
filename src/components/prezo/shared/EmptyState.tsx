import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { PzText } from './PzText';

interface EmptyStateProps {
  title?: string;
  message?: string;
  children?: React.ReactNode;
  alert?: boolean;
}

export const EmptyState = ({ title, message, children, alert = false }: EmptyStateProps) => {
  const { colors } = usePrezoTheme();
  return (
    <View
      accessibilityRole={alert ? 'alert' : undefined}
      style={styles.wrap}
    >
      <View style={[styles.dot, { backgroundColor: colors.s2 }]} />
      {title ? (
        <PzText size={17} weight={600} align="center" style={styles.title}>
          {title}
        </PzText>
      ) : null}
      {message ? (
        <PzText size={14} tone="mu" align="center">
          {message}
        </PzText>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 12,
  },
  title: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
});

