import React from 'react';
import { StyleProp, TextInput, TextInputProps, TextStyle } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { bodyFont } from '../styles/typography';

interface Props extends TextInputProps {
  focused?: boolean;
  style?: StyleProp<TextStyle>;
}

/** Bordered input used in sheets, promo code, address and chat. */
export const GlowzTextField = React.forwardRef<TextInput, Props>(function GlowzTextField({ style, multiline, ...rest }, ref) {
  const { c } = useGlowzTheme();
  const [focus, setFocus] = React.useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={c.muted}
      multiline={multiline}
      onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
      style={[
        bodyFont(400),
        { borderWidth: 1, borderColor: focus ? c.mocha : c.line, backgroundColor: c.surface, color: c.ink, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: multiline ? 70 : undefined, textAlignVertical: multiline ? 'top' : 'center' },
        style,
      ]}
      {...rest}
    />
  );
});
