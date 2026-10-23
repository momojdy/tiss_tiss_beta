import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { prezoLayout } from '../../../theme/prezoTheme';
import { Icon } from '../shared/Icon';
import { PzText } from '../shared/PzText';
import { SwitchToggle } from '../shared/SwitchToggle';

interface SettingRowProps {
  title: string;
  description?: string;
  last?: boolean;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitch?: (next: boolean) => void;
}

export const SettingRow = ({
  title,
  description,
  last = false,
  onPress,
  switchValue,
  onSwitch,
}: SettingRowProps) => {
  const { colors } = usePrezoTheme();
  const content = (
    <>
      <View style={styles.text}>
        <PzText weight={600}>{title}</PzText>
        {description ? (
          <PzText size={13} tone="mu">
            {description}
          </PzText>
        ) : null}
      </View>
      {switchValue !== undefined && onSwitch ? (
        <SwitchToggle value={switchValue} onChange={onSwitch} label={title} />
      ) : onPress ? (
        <Icon name="chevronRight" size={18} color={colors.mu} />
      ) : null}
    </>
  );
  const style = [
    styles.row,
    { borderBottomColor: colors.ln, borderBottomWidth: last ? 0 : prezoLayout.hairline },
  ];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={style}>
        {content}
      </Pressable>
    );
  }
  return <View style={style}>{content}</View>;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 13,
  },
  text: {
    flex: 1,
  },
});

