import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLayoutMode } from '../../../lib/prezo/useLayoutMode';
import { PzText } from './PzText';

interface PageTitleProps {
  children: string;
  size?: number;
}

export const PageTitle = ({ children, size }: PageTitleProps) => {
  const { pageTitleSize } = useLayoutMode();
  return (
    <PzText
      display={700}
      size={size ?? pageTitleSize}
      accessibilityRole="header"
      style={styles.title}
    >
      {children}
    </PzText>
  );
};

interface SectionHeaderProps {
  title: string;
  linkLabel?: string;
  onLinkPress?: () => void;
}

export const SectionHeader = ({ title, linkLabel, onLinkPress }: SectionHeaderProps) => (
  <View style={styles.section}>
    <PzText display={700} size={20} accessibilityRole="header">
      {title}
    </PzText>
    {linkLabel && onLinkPress ? (
      <Pressable accessibilityRole="link" onPress={onLinkPress}>
        <PzText size={13} tone="mu">
          {linkLabel}
        </PzText>
      </Pressable>
    ) : null}
  </View>
);

export const SubHeading = ({ children, marginTop = 0 }: { children: string; marginTop?: number }) => (
  <PzText display={700} size={17.5} accessibilityRole="header" style={{ marginTop, marginBottom: 10 }}>
    {children}
  </PzText>
);

const styles = StyleSheet.create({
  title: {
    marginTop: 12,
    marginBottom: 4,
  },
  section: {
    marginTop: 26,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
});

