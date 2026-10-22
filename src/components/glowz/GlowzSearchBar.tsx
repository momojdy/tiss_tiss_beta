import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { bodyFont } from '../../styles/Glowz/typography';
import { GlowzIcon } from './GlowzIcon';
import { GlowzIconButton } from './GlowzIconButton';
import { GlowzText } from './GlowzText';

const box = (c: { surface: string; line: string }) => ({
  flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 16, height: 50,
});

/** Home search entry: looks like the field but opens Explore. */
export function GlowzSearchButton({ placeholder, onPress }: { placeholder: string; onPress: () => void }) {
  const { c } = useGlowzTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="search" accessibilityLabel={placeholder} style={box(c)}>
      <GlowzIcon name="explore" size={19} color={c.mocha} strokeWidth={1.9} />
      <GlowzText color={c.muted} numberOfLines={1} style={{ flex: 1 }}>{placeholder}</GlowzText>
    </Pressable>
  );
}

interface FieldProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  inputRef?: React.Ref<TextInput>;
}

/** Explore search field with a clear button. */
export function GlowzSearchField({ value, onChangeText, placeholder, inputRef }: FieldProps) {
  const { c } = useGlowzTheme();
  return (
    <View style={[box(c), { flex: 1 }]}>
      <GlowzIcon name="explore" size={19} color={c.mocha} strokeWidth={1.9} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        accessibilityLabel="Search services, salons or areas"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[bodyFont(400), { flex: 1, minWidth: 0, height: '100%', color: c.ink, fontSize: 15, padding: 0 }]}
      />
      {value ? <GlowzIconButton icon="close" size={30} iconSize={14} borderless background={c.tint} label="Clear search" onPress={() => onChangeText('')} /> : null}
    </View>
  );
}
