import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { useInsets } from '../../styles/Glowz/LayoutContext';
import { bodyFont } from '../../styles/Glowz/typography';

type ToastFn = (message: string) => void;
const ToastContext = createContext<ToastFn>(() => undefined);

export function GlowzToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const { c } = useGlowzTheme();
  const insets = useInsets();

  const show = useCallback<ToastFn>((m) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(m);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setMsg(null));
    }, 2200);
  }, [opacity]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { paddingBottom: 92 + insets.bottom }]}>
          <Animated.View style={[styles.toast, { backgroundColor: c.ink, opacity }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Text style={[styles.text, bodyFont(500), { color: c.inkOn }]}>{msg}</Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastFn => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { justifyContent: 'flex-end', alignItems: 'center', zIndex: 100 },
  toast: { maxWidth: '90%', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  text: { fontSize: 13, textAlign: 'center' },
});
