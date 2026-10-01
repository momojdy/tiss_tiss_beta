import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import WalletHeader from '../components/wallet/WalletHeader';

type Props = {
  onBack?: () => void;
  onNotificationsPress?: () => void;
  onHelpPress?: () => void;
};

export default function WalletHomeScreen({
  onBack,
  onNotificationsPress,
  onHelpPress,
}: Props) {
  return (
    <View style={styles.page}>
      <WalletHeader
        onBack={onBack ?? (() => {})}
        onNotificationsPress={onNotificationsPress}
        onHelpPress={onHelpPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F5F8F3',
  },
  content: {
    flexGrow: 1,
  },
});
