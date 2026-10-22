import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { mixColors } from '../../../lib/prezo/colors';
import { prezoLayout, prezoRadii } from '../../../theme/prezoTheme';
import { PzText } from './PzText';

interface OptionPillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const OptionPill = ({ label, selected, onPress, disabled = false }: OptionPillProps) => {
  const { colors } = usePrezoTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? mixColors(colors.rd, colors.s1, 0.09) : colors.s1,
          borderColor: selected ? colors.rd : colors.ln,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <PzText size={14} weight={500} lineHeight={21}>
        {label}
      </PzText>
    </Pressable>
  );
};

export const OptionRow = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.optionRow}>{children}</View>
);

interface FilterPillProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export const FilterPill = ({ label, selected = false, onPress, accessibilityLabel }: FilterPillProps) => {
  const { colors } = usePrezoTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.filter,
        {
          backgroundColor: selected ? colors.tx : 'transparent',
          borderColor: selected ? colors.tx : colors.ln,
        },
      ]}
    >
      <PzText size={14} weight={500} lineHeight={21} style={{ color: selected ? colors.bg : colors.mu }}>
        {label}
      </PzText>
    </Pressable>
  );
};

interface PayOptionProps {
  title: string;
  detail?: string | null;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  trailing?: string | null;
}

export const PayOption = ({
  title,
  detail,
  selected,
  onPress,
  disabled = false,
  trailing,
}: PayOptionProps) => {
  const { colors } = usePrezoTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.pay,
        {
          backgroundColor: selected ? mixColors(colors.rd, colors.s1, 0.09) : colors.s1,
          borderColor: selected ? colors.rd : colors.ln,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.radio,
          selected
            ? { borderWidth: 5, borderColor: colors.rd }
            : { borderWidth: 2, borderColor: colors.ln },
        ]}
      />
      <View style={styles.payBody}>
        <View style={styles.payTitleRow}>
          <PzText size={15} weight={600}>
            {title}
          </PzText>
          {trailing ? (
            <PzText size={12} tone="mu">
              {trailing}
            </PzText>
          ) : null}
        </View>
        {detail ? (
          <PzText size={13} tone="mu">
            {detail}
          </PzText>
        ) : null}
      </View>
    </Pressable>
  );
};

interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
}

export const Checkbox = ({ checked, onChange, children }: CheckboxProps) => {
  const { colors } = usePrezoTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.checkboxRow}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? colors.rd : colors.s1,
            borderColor: checked ? colors.rd : colors.ln,
          },
        ]}
      >
        {checked ? <View style={[styles.checkMark, { borderColor: colors.on }]} /> : null}
      </View>
      <View style={styles.checkboxBody}>{children}</View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: prezoRadii.r1,
    borderWidth: prezoLayout.hairline,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  filter: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: prezoRadii.pill,
    borderWidth: prezoLayout.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pay: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: prezoRadii.r1,
    borderWidth: prezoLayout.hairline,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 2,
  },
  payBody: {
    flex: 1,
  },
  payTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    width: 5,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }, { translateY: -1 }],
  },
  checkboxBody: {
    flex: 1,
  },
});

