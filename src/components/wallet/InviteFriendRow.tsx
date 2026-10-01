import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

const IMAGE: number | { uri: string } = {
  uri: 'https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/refs/heads/main/inviteFriends.png',
};

const OLIVE = '#1A2517';
const GREY = '#6C7280';

const ROW_HEIGHT = 120;
const IMG_TOP = 35;
const IMG_H = ROW_HEIGHT - IMG_TOP;

function useAspectRatio(source: number | { uri: string }) {
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    if (typeof source === 'number') {
      const { width, height } = Image.resolveAssetSource(source);
      setRatio(width && height ? width / height : 0);
      return;
    }

    Image.getSize(
      source.uri,
      (width, height) => {
        if (active) setRatio(width && height ? width / height : 0);
      },
      () => {
        if (active) setRatio(0);
      },
    );

    return () => {
      active = false;
    };
  }, [source]);

  return ratio;
}

type Props = {
  onPress?: () => void;
};

export default function InviteFriendRow({ onPress }: Props) {
  const ratio = useAspectRatio(IMAGE);
  const imageWidth = ratio ? IMG_H * ratio : 0;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={styles.row}
    >
      {ratio !== null && (
        <>
          {imageWidth > 0 && (
            <View style={styles.imagePad}>
              <View style={[styles.imageClip, { width: imageWidth }]}>
                <Image source={IMAGE} style={styles.image} resizeMode="contain" />
              </View>
            </View>
          )}

          <View style={styles.column}>
            <Text style={styles.title}>Invite a friend</Text>
            <Text style={styles.body}>
              {'Get 1,000 Wantiss Points for\nevery friend who joins and \ncompletes their first transaction.'}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagePad: {
    paddingLeft: 15,
    paddingTop: IMG_TOP,
  },
  imageClip: {
    height: IMG_H,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  column: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  title: {
    color: OLIVE,
    fontSize: 16,
    lineHeight: 19.36,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
  body: {
    marginTop: 6,
    color: GREY,
    fontSize: 13,
    lineHeight: 15.73,
    textAlign: 'left',
    fontFamily: 'Inter_400Regular',
    includeFontPadding: false,
  },
});
