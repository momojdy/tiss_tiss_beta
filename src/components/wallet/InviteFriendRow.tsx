import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const IMAGE = {
  uri: 'https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/refs/heads/main/inviteFriends.png',
};

export default function InviteFriendRow() {
  return (
    <View style={styles.row}>
      <View style={styles.imageWrap}>
        <Image source={IMAGE} style={styles.image} resizeMode="contain" />
      </View>

      <View style={styles.column}>
        <Text style={styles.title}>Invite a friend</Text>
        <Text
          style={styles.description}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {'Get 1,000 Wantiss Points for\nevery friend who joins and \ncompletes their first transaction.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrap: {
    marginLeft: 15,
    marginTop: 35,
    width: 200,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  image: {
    width: 200,
    height: 200,
  },
  column: {
    flex: 1,
    marginLeft: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    color: '#1A2517',
    fontSize: 16,
    lineHeight: 19.36,
    letterSpacing: 0,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
  description: {
    marginTop: 6,
    color: '#6C7280',
    fontSize: 13,
    lineHeight: 15.73,
    letterSpacing: 0,
    fontFamily: 'Inter_400Regular',
    includeFontPadding: false,
  },
});
