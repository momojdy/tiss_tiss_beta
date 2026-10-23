import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { prezoLayout } from '../../../theme/prezoTheme';
import { PzText } from './PzText';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'white' | 'ghost' | 'text' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  small?: boolean;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  small = false,
  block = false,
  disabled = false,
  loading = false,
  height,
  style,
  accessibilityLabel,
}: ButtonProps) => {
  const { colors } = usePrezoTheme();
  const isText = variant === 'text';
  const resolvedHeight = height ?? (isText || small ? 36 : 44);
  const horizontal = isText ? 8 : small ? 14 : 20;
  const fontSize = small ? 13 : 15;

  let background = colors.rd;
  let textColor = colors.on;
  let borderColor = 'transparent';
  let borderWidth = 0;
  if (variant === 'white') {
    background = '#ffffff';
    textColor = '#000000';
  } else if (variant === 'ghost') {
    background = 'transparent';
    textColor = colors.tx;
    borderColor = colors.ln;
    borderWidth = prezoLayout.hairline;
  } else if (variant === 'text') {
    background = 'transparent';
    textColor = colors.tx;
  } else if (variant === 'danger') {
    background = 'transparent';
    textColor = colors.rd2;
    borderColor = colors.rd;
    borderWidth = prezoLayout.hairline;
  }

  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: resolvedHeight,
          paddingHorizontal: horizontal,
          backgroundColor: background,
          borderColor,
          borderWidth,
          opacity: disabled ? 0.45 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <Spinner
            color={variant === 'ghost' || variant === 'text' ? colors.tx : '#ffffff'}
            trackColor={
              variant === 'ghost' || variant === 'text' ? colors.ln : 'rgba(255,255,255,0.4)'
            }
          />
        ) : null}
        <PzText
          size={fontSize}
          weight={600}
          lineHeight={fontSize * 1.2}
          style={{ color: textColor }}
          underline={isText}
        >
          {label}
        </PzText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

