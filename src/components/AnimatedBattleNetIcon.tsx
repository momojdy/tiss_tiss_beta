import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

const ORANGE = '#EE6B2E';

/*
 * Custom Battle.net-inspired three-strand animation.
 *
 * Each strand is an individual curved ribbon. The ribbons are arranged
 * 120 degrees apart and each follows its own small circular orbit.
 * They never rotate as one complete logo.
 *
 * The motion is deliberately continuous:
 * strand 1 -> phase 0
 * strand 2 -> phase 120deg
 * strand 3 -> phase 240deg
 */

const STRAND =
  'M 256 128 C 294 143 337 169 374 203 C 387 215 398 226 407 238 L 369 259 C 352 238 331 218 307 201 C 286 187 269 179 256 174 C 249 172 243 165 243 155 C 243 144 248 134 256 128 Z';

const CENTER = 256;

type StrandProps = {
  phase: number;
  duration: number;
  radius: number;
  rotation: number;
};

function AnimatedStrand({
  phase,
  duration,
  radius,
  rotation,
}: StrandProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [duration, progress]);

  const animatedProps = useAnimatedProps(() => {
    const angle = progress.value * Math.PI * 2 + phase;

    // Small circular orbit: this is the actual flowing motion.
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    // A tiny amount of counter-rotation makes the ribbon feel like
    // it is following the circular flow instead of simply sliding.
    const localRotation =
      Math.sin(angle + Math.PI / 2) * rotation;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${localRotation}deg` },
      ],
    };
  });

  return (
    <AnimatedG
      animatedProps={animatedProps}
      originX={CENTER}
      originY={CENTER}
    >
      <Path d={STRAND} fill={ORANGE} />
    </AnimatedG>
  );
}

export default function AnimatedBattleNetIcon({
  size = 52,
}: {
  size?: number;
}) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
      >
        <AnimatedStrand
          phase={0}
          duration={5600}
          radius={8}
          rotation={2.5}
        />

        <AnimatedStrand
          phase={(Math.PI * 2) / 3}
          duration={6200}
          radius={9}
          rotation={2.8}
        />

        <AnimatedStrand
          phase={(Math.PI * 4) / 3}
          duration={5900}
          radius={8.5}
          rotation={2.6}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
