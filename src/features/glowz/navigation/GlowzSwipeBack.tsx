import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, Platform, View } from 'react-native';

const EDGE = 22;
const COMMIT = 90;
const QUICK_COMMIT = 55;
const QUICK_MS = 320;

interface Props {
  enabled: boolean;
  translateX: Animated.Value;
  onDragChange: (dragging: boolean) => void;
  onBack: () => void;
}

/**
 * iOS left-edge swipe back. A thin strip on the screen edge owns the gesture, so horizontal
 * carousels, the map and sliders elsewhere on screen never conflict with it. Android uses the system back.
 */
export function GlowzSwipeBack({ enabled, translateX, onDragChange, onBack }: Props) {
  const start = useRef(0);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = Date.now();
          onDragChange(true);
        },
        onPanResponderMove: (_e, g) => translateX.setValue(Math.max(0, g.dx)),
        onPanResponderRelease: (_e, g) => {
          const commit = g.dx >= COMMIT || (g.dx >= QUICK_COMMIT && Date.now() - start.current < QUICK_MS);
          if (commit) {
            Animated.timing(translateX, { toValue: 400, duration: 140, useNativeDriver: true }).start(() => {
              translateX.setValue(0);
              onDragChange(false);
              onBack();
            });
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(() => onDragChange(false));
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(() => onDragChange(false));
        },
      }),
    [onBack, onDragChange, translateX],
  );
  if (!enabled || Platform.OS !== 'ios') return null;
  return <View {...responder.panHandlers} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE, zIndex: 40 }} accessibilityElementsHidden importantForAccessibility="no" />;
}