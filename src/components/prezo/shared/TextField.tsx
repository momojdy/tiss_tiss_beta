import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { prezoFonts, prezoLayout } from '../../../theme/prezoTheme';
import { PzText } from './PzText';

interface TextFieldProps extends TextInputProps {
  multiline?: boolean;
}

export const TextField = ({ multiline = false, style, ...rest }: TextFieldProps) => {
  const { colors } = usePrezoTheme();
  return (
    <TextInput
      placeholderTextColor={colors.mu}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...rest}
      style={[
        {
          height: multiline ? 120 : 46,
          width: '100%',
          borderRadius: 14,
          borderWidth: prezoLayout.hairline,
          borderColor: colors.ln,
          backgroundColor: colors.s1,
          color: colors.tx,
          paddingHorizontal: multiline ? 16 : 16,
          paddingVertical: multiline ? 12 : 0,
          fontFamily: prezoFonts.body400,
          fontSize: 15,
        },
        style,
      ]}
    />
  );
};

export const FieldLabel = ({ children }: { children: string }) => (
  <PzText size={13} tone="mu" style={{ marginTop: 12, marginBottom: 4 }}>
    {children}
  </PzText>
);

export const FieldError = ({ message }: { message: string | null }) =>
  message ? (
    <PzText size={13} tone="red" accessibilityRole="alert" style={{ marginTop: 6 }}>
      {message}
    </PzText>
  ) : null;

