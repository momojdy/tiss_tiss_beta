import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';

interface PriceSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  label: string;
}

const THUMB = 22;

export const PriceSlider = ({ min, max, value, onChange, label }: PriceSliderProps) => {
  const { colors } = usePrezoTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const boundsRef = useRef({ min, max });
  const changeRef = useRef(onChange);
  boundsRef.current = { min, max };
  changeRef.current = onChange;

  const emit = (locationX: number) => {
    const usable = Math.max(1, widthRef.current - THUMB);
    const ratio = Math.min(1, Math.max(0, (locationX - THUMB / 2) / usable));
    const bounds = boundsRef.current;
    changeRef.current(Math.round(bounds.min + ratio * (bounds.max - bounds.min)));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => emit(event.nativeEvent.locationX),
      onPanResponderMove: (event) => emit(event.nativeEvent.locationX),
    }),
  ).current;

  const onLayout = (event: LayoutChangeEvent) => {
    widthRef.current = event.nativeEvent.layout.width;
    setWidth(event.nativeEvent.layout.width);
  };

  const ratio = max > min ? (value - min) / (max - min) : 1;
  const left = ratio * Math.max(0, width - THUMB);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const step = Math.max(1, Math.round((max - min) / 20));
        const next = event.nativeEvent.actionName === 'increment' ? value + step : value - step;
        onChange(Math.min(max, Math.max(min, next)));
      }}
      onLayout={onLayout}
      style={styles.touch}
      {...responder.panHandlers}
    >
      <View style={[styles.track, { backgroundColor: colors.s2 }]} pointerEvents="none">
        <View style={[styles.fill, { backgroundColor: colors.rd, width: left + THUMB / 2 }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left, backgroundColor: colors.rd, borderColor: colors.bg }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  touch: {
    height: 36,
    justifyContent: 'center',
    width: '100%',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
  },
});

