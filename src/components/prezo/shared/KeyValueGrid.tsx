import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { prezoLayout } from '../../../theme/prezoTheme';
import { PzText } from './PzText';

export interface KeyValueItem {
  label: string;
  value: string;
}

interface KeyValueGridProps {
  items: KeyValueItem[];
}

const GAP = 16;

export const KeyValueGrid = ({ items }: KeyValueGridProps) => {
  const { colors } = usePrezoTheme();
  const window = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const columns = window.width >= 520 ? 4 : 2;
  const cellWidth = width > 0 ? (width - GAP * (columns - 1)) / columns : 0;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.grid,
        {
          borderTopWidth: prezoLayout.hairline,
          borderBottomWidth: prezoLayout.hairline,
          borderColor: colors.ln,
        },
      ]}
    >
      {cellWidth > 0
        ? items.map((item) => (
            <View key={item.label} style={[styles.cell, { width: cellWidth }]}>
              <PzText size={12} tone="mu" lineHeight={18}>
                {item.label}
              </PzText>
              <PzText size={15} weight={500}>
                {item.value}
              </PzText>
            </View>
          ))
        : null}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GAP,
    marginVertical: 14,
  },
  cell: {
    paddingVertical: 9,
  },
});

