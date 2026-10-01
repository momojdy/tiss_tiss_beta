import React, { useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const IMAGE = {
  uri: 'https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/refs/heads/main/earn_more_points_frenzies.PNG',
};

const OLIVE = '#1A2517';
const SAGE_TINT = '#DCE8D2';
const GREY = '#6C7280';

const CARD_HEIGHT = 130;
const IMG_W = 200;
const IMG_H = CARD_HEIGHT;
const IMG_PAD = 10;
const ALIGN_X = 1.32;
const ARROW_FORWARD = 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z';

type Props = {
  onExplore?: () => void;
};

export default function EarnMorePointsCard({ onExplore }: Props) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const childW = IMG_W + IMG_PAD * 2;
  const imageLeft = (width - childW) * ((ALIGN_X + 1) / 2) + IMG_PAD;

  return (
    <View style={styles.card} onLayout={onLayout}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.clip} pointerEvents="box-none">
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="star-four-points" size={40} color={OLIVE} />
            </View>

            <View style={styles.column}>
              <View style={styles.titlePadding}>
                <Text style={styles.title}>Earn More Points</Text>
              </View>

              <View style={styles.bodyPadding}>
                <Text style={styles.body}>{'Complete activities and\nget rewarded.'}</Text>
              </View>

              <View style={styles.buttonWrap}>
                <Pressable onPress={onExplore} style={styles.button}>
                  <Text style={styles.buttonText}>Explore Now</Text>
                  <View style={styles.arrowWrap}>
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                      <Path d={ARROW_FORWARD} fill="#FFFFFF" />
                    </Svg>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          {width > 0 && (
            <View pointerEvents="none" style={[styles.imageBox, { left: imageLeft }]}>
              <Image source={IMAGE} style={styles.image} resizeMode="contain" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: CARD_HEIGHT,
    backgroundColor: SAGE_TINT,
    borderRadius: 20,
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    paddingLeft: 10,
    paddingBottom: 80,
  },
  column: {
    height: CARD_HEIGHT,
    marginLeft: 8,
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  titlePadding: {
    paddingTop: 10,
  },
  title: {
    color: OLIVE,
    fontSize: 16,
    lineHeight: 19.36,
    letterSpacing: 0,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
  bodyPadding: {
    paddingBottom: 10,
  },
  body: {
    color: GREY,
    fontSize: 13,
    lineHeight: 15.73,
    letterSpacing: 0,
    fontFamily: 'Inter_400Regular',
    includeFontPadding: false,
  },
  buttonWrap: {
    alignSelf: 'center',
    paddingBottom: 8,
  },
  button: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 30,
    backgroundColor: OLIVE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 19.36,
    letterSpacing: 0,
    fontFamily: 'InterTight_500Medium',
    includeFontPadding: false,
  },
  arrowWrap: {
    marginLeft: 8,
  },
  imageBox: {
    position: 'absolute',
    top: 0,
    width: IMG_W,
    height: IMG_H,
    borderRadius: 8,
    overflow: 'hidden',
    opacity: 0.75,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
