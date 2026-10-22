import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

interface SpinnerProps {
  color?: string;
  trackColor?: string;
  size?: number;
}

export const Spinner = ({
  color = '#ffffff',
  trackColor = 'rgba(255,255,255,0.4)',
  size = 16,
}: SpinnerProps) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: trackColor,
          borderTopColor: color,
          transform: [{ rotate: spin }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  ring: {
    borderWidth: 2,
  },
});

