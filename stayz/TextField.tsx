import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from './Txt';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export const TextField = ({ label, error, style, ...rest }: Props) => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt v="small" bold>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor={colors.sub}
        {...rest}
        style={[styles.input, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.line, color: colors.text }, rest.multiline && styles.multi, style]}
      />
      {error ? (
        <Txt v="small" color={colors.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  multi: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
});
