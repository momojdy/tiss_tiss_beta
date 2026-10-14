import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStayzTheme } from './stayzThemeContext';

interface Props {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const StayzPhotoSlot = ({ uri, style, icon = 'image-outline' }: Props) => {
  const { colors } = useStayzTheme();
  const [ok, setOk] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (loaded || !uri || !ok) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.95, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loaded, ok, pulse, uri]);

  return (
    <View style={[styles.box, { backgroundColor: colors.placeholder }, style]}>
      {!loaded || !uri || !ok ? (
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.loading, { backgroundColor: colors.placeholder, opacity: pulse }]}>
          <Ionicons name={icon} size={28} color={colors.sub} style={{ opacity: 0.8 }} />
        </Animated.View>
      ) : null}
      {uri && ok ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFillObject, { opacity: loaded ? 1 : 0 }]}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
          onError={() => setOk(false)}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  loading: { alignItems: 'center', justifyContent: 'center' },
});
