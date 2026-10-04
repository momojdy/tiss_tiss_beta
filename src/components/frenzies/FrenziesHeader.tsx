import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/frenziesTheme';
import { fonts } from '../../theme/frenziesFonts';

type Props = {
  points?: number | null;
  onBack?: () => void;
  title?: string;
  demo?: boolean;
  showPoints?: boolean;
};

export default function FrenziesHeader({ points, onBack, title = 'Frenzies', demo = false, showPoints = true }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.back}
      >
        <MaterialIcons name="arrow-back-ios-new" size={21} color={colors.textPrimary} />
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {demo && <View style={styles.demoPill}><View style={styles.demoDot} /><Text style={styles.demoText}>DEMO</Text></View>}
      </View>
      {showPoints && <View style={styles.pointsPill}>
        <MaterialCommunityIcons name="lightning-bolt" size={17} color={colors.header.bolt} />
        <Text style={styles.points}>{(points ?? 0).toLocaleString()}</Text>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 100,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.pageBg,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    paddingRight: 20,
alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  demoPill: {
    marginTop: 4,
    height: 18,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: colors.streak.shieldPill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gameCard.playBg, marginRight: 4 },
  demoText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 11, color: colors.textPrimary, includeFontPadding: false },
  pointsPill: {
    minWidth: 58,
    height: 32,
    marginBottom: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.header.pillBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  points: {
    marginLeft: 3,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
});
