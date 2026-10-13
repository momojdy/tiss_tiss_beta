import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const PhotoSlot = ({ uri, style, icon = 'image-outline' }: Props) => {
  const { colors } = useTheme();
  const [ok, setOk] = useState(true);
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={[styles.box, { backgroundColor: colors.placeholder }, style]}>
      {!loaded || !uri || !ok ? <Ionicons name={icon} size={30} color={colors.brand} style={{ opacity: 0.55 }} /> : null}
      {uri && ok ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoad={() => setLoaded(true)} onError={() => setOk(false)} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
