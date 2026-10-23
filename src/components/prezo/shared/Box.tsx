import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { prezoLayout, prezoRadii } from '../../../theme/prezoTheme';

interface BoxProps {
  panel?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
}

export const Box = ({ panel = false, onPress, style, children, accessibilityLabel }: BoxProps) => {
  const { colors } = usePrezoTheme();
  const base: ViewStyle = panel
    ? {
        backgroundColor: colors.s1,
        borderWidth: prezoLayout.hairline,
        borderColor: colors.ln,
        borderRadius: prezoRadii.r2,
        padding: 14,
      }
    : {
        borderTopWidth: prezoLayout.hairline,
        borderTopColor: colors.ln,
        paddingVertical: 12,
      };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={[base, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
};

