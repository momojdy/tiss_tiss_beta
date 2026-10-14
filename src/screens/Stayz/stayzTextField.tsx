import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useStayzTheme } from './stayzThemeContext';
import { StayzTxt } from './stayzTxt';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export const StayzTextField = ({ label, error, style, ...rest }: Props) => {
  const { colors } = useStayzTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <StayzTxt v="small" bold>
          {label}
        </StayzTxt>
      ) : null}
      <TextInput
        placeholderTextColor={colors.sub}
        {...rest}
        style={[styles.input, { backgroundColor: colors.card, borderColor: error ? colors.danger : colors.line, color: colors.text }, rest.multiline && styles.multi, style]}
      />
      {error ? (
        <StayzTxt v="small" color={colors.danger}>
          {error}
        </StayzTxt>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  multi: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
});
