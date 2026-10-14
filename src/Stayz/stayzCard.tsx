import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useStayzTheme } from './stayzThemeContext';

export const StayzCard = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useStayzTheme();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
});
