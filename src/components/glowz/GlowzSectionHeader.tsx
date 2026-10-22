import React from 'react';
import { Pressable, View } from 'react-native';
import { useGutter } from '../../styles/Glowz/LayoutContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzText } from './GlowzText';

interface Props {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

export function GlowzSectionHeader({ title, subtitle, onSeeAll }: Props) {
  const { c } = useGlowzTheme();
  const g = useGutter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 20, marginBottom: 10, paddingLeft: g.left, paddingRight: g.right }}>
      <View style={{ flex: 1 }}>
        <GlowzText kind="display" size={22} accessibilityRole="header">{title}</GlowzText>
        {subtitle ? <GlowzText kind="small" muted>{subtitle}</GlowzText> : null}
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} accessibilityRole="button" accessibilityLabel={`See all ${title}`} hitSlop={8}>
          <GlowzText kind="small" weight={500} color={c.roseInk} style={{ textDecorationLine: 'underline' }}>See all</GlowzText>
        </Pressable>
      ) : null}
    </View>
  );
}
