import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { getArtGradientIndex } from '../../../lib/prezo/campaignRules';
import { useLayoutMode } from '../../../lib/prezo/useLayoutMode';
import { prezoRadii } from '../../../theme/prezoTheme';
import type { Campaign } from '../../../types/prezo';
import { Icon } from '../shared/Icon';
import { PzText } from '../shared/PzText';
import { CampaignArt } from './CampaignArt';

const GAP = 6;

interface CampaignGalleryProps {
  campaign: Campaign;
}

export const CampaignGallery = ({ campaign }: CampaignGalleryProps) => {
  const { colors } = usePrezoTheme();
  const { isWide, height } = useLayoutMode();
  const images = campaign.images.filter(Boolean);
  const many = images.length > 1;
  const listRef = useRef<FlatList<string>>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const slideWidth = many ? containerWidth * 0.88 : containerWidth;
  const step = slideWidth + GAP;

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const span = Math.max(1, contentSize.width - layoutMeasurement.width);
      setIndex(Math.round((contentOffset.x / span) * (images.length - 1)));
    },
    [images.length],
  );

  const move = (direction: number) => {
    const next = Math.min(images.length - 1, Math.max(0, index + direction));
    listRef.current?.scrollToOffset({ offset: next * step, animated: true });
    setIndex(next);
  };

  const frame = {
    aspectRatio: 4 / 3,
    maxHeight: height * 0.52,
    borderRadius: prezoRadii.r2,
    backgroundColor: colors.s2,
    width: '100%' as const,
    overflow: 'hidden' as const,
  };

  if (!images.length) {
    return (
      <View style={frame}>
        <CampaignArt
          category={campaign.category}
          gradientIndex={getArtGradientIndex(campaign)}
          glyphWidth="28%"
          style={StyleSheet.absoluteFill}
        />
        <PzText size={12} tone="faint" align="center" style={styles.caption}>
          No photos supplied yet
        </PzText>
      </View>
    );
  }

  return (
    <View style={frame} onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      {containerWidth > 0 ? (
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          keyExtractor={(url, position) => `${position}-${url}`}
          showsHorizontalScrollIndicator={false}
          snapToInterval={many ? step : undefined}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={32}
          ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
          accessibilityLabel="Campaign photos"
          renderItem={({ item }) => (
            <View style={{ width: slideWidth, height: '100%', backgroundColor: colors.s2 }}>
              {failed[item] ? (
                <View style={[styles.failed, { backgroundColor: colors.s2 }]}>
                  <PzText size={13} tone="mu">
                    Photo unavailable
                  </PzText>
                </View>
              ) : (
                <Image
                  source={{ uri: item }}
                  accessibilityLabel={campaign.title}
                  style={styles.image}
                  resizeMode="cover"
                  onError={() => setFailed((prev) => ({ ...prev, [item]: true }))}
                />
              )}
            </View>
          )}
        />
      ) : null}
      {many && isWide ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous photo"
            onPress={() => move(-1)}
            style={[styles.arrow, { left: 8 }]}
          >
            <Icon name="chevronLeft" size={22} color="#ffffff" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next photo"
            onPress={() => move(1)}
            style={[styles.arrow, { right: 8 }]}
          >
            <Icon name="chevronRight" size={22} color="#ffffff" />
          </Pressable>
        </>
      ) : null}
      {many ? (
        <View pointerEvents="none" style={styles.dots}>
          {images.map((url, position) => (
            <View
              key={`${position}-${url}`}
              style={[
                styles.dot,
                position === index ? styles.dotOn : null,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  failed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotOn: {
    width: 14,
    backgroundColor: '#ffffff',
  },
});

