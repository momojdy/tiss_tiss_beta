import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { PzText } from '../shared/PzText';

interface OrderTimelineProps {
  steps: string[];
  reached: number;
}

export const OrderTimeline = ({ steps, reached }: OrderTimelineProps) => {
  const { colors } = usePrezoTheme();
  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={`Order progress: ${steps[Math.min(reached, steps.length - 1)]}`}
      style={styles.row}
    >
      {steps.map((step, index) => {
        const done = index <= reached;
        const first = index === 0;
        const last = index === steps.length - 1;
        return (
          <View key={step} style={styles.cell}>
            <View
              style={[
                styles.line,
                {
                  backgroundColor: done ? colors.rd : colors.ln,
                  left: first ? '50%' : 0,
                  right: last ? '50%' : 0,
                },
              ]}
            />
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: done ? colors.rd : colors.s2,
                  borderColor: done ? colors.rd : colors.ln,
                },
              ]}
            />
            <PzText size={10} tone={done ? 'tx' : 'mu'} lineHeight={15} align="center">
              {step}
            </PzText>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 6,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  line: {
    position: 'absolute',
    top: 5,
    height: 2,
  },
  dot: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});

