import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { withAlpha } from '../../../lib/prezo/colors';
import type { ChipTone } from '../../../lib/prezo/campaignRules';
import { prezoLayout } from '../../../theme/prezoTheme';
import { PzText } from './PzText';

interface ChipProps {
  label: string;
  tone?: ChipTone;
  onArt?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Chip = ({ label, tone = 'plain', onArt = false, compact = false, style }: ChipProps) => {
  const { colors } = usePrezoTheme();
  let background = colors.s2;
  let color: 'tx' | 'mu' | 'on' | 'ok' = 'tx';
  let borderColor = 'transparent';
  if (tone === 'red') {
    background = colors.rd;
    color = 'on';
  } else if (tone === 'green') {
    background = withAlpha(colors.ok, 0.18);
    color = 'ok';
  } else if (tone === 'outline') {
    background = 'transparent';
    color = 'mu';
    borderColor = colors.ln;
  }
  if (onArt) {
    if (tone !== 'red') background = 'rgba(0,0,0,0.6)';
    color = 'on';
  }
  return (
    <View
      style={[
        styles.chip,
        compact ? styles.compact : null,
        {
          backgroundColor: background,
          borderColor,
          borderWidth: tone === 'outline' ? prezoLayout.hairline : 0,
        },
        style,
      ]}
    >
      <PzText size={compact ? 11 : 12} weight={600} tone={color} lineHeight={compact ? 16 : 18} numberOfLines={1}>
        {label}
      </PzText>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 11,
  },
  compact: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
});

