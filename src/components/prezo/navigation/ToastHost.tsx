import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrezoToast } from '../../../features/prezo/PrezoToastContext';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { PzText } from '../shared/PzText';

interface ToastHostProps {
  bottomOffset: number;
}

export const ToastHost = ({ bottomOffset }: ToastHostProps) => {
  const { colors } = usePrezoTheme();
  const insets = useSafeAreaInsets();
  const toast = usePrezoToast();
  const progress = useRef(new Animated.Value(0)).current;
  const lastMessage = useRef<string>('');

  if (toast.message) lastMessage.current = toast.message;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: toast.message ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [toast.message, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          backgroundColor: colors.tx,
          bottom: bottomOffset + insets.bottom,
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          ],
        },
      ]}
    >
      <PzText size={15} weight={500} align="center" style={{ color: colors.bg }}>
        {lastMessage.current}
      </PzText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '90%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 99,
  },
});

