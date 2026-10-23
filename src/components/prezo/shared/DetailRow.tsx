import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { prezoLayout } from '../../../theme/prezoTheme';
import { PzText } from './PzText';

interface DetailRowProps {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  total?: boolean;
}

export const DetailRow = ({ label, value, valueNode, total = false }: DetailRowProps) => {
  const { colors } = usePrezoTheme();
  const size = total ? 17 : 15;
  return (
    <View
      style={[
        styles.row,
        total
          ? {
              borderTopWidth: prezoLayout.hairline,
              borderTopColor: colors.ln,
              marginTop: 6,
              paddingTop: 14,
            }
          : null,
      ]}
    >
      <PzText size={size} weight={total ? 600 : 400} tone={total ? 'tx' : 'mu'} style={styles.label}>
        {label}
      </PzText>
      {valueNode ?? (
        <PzText size={size} weight={total ? 600 : 400} style={styles.value}>
          {value}
        </PzText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 7,
  },
  label: {
    flexShrink: 1,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});

