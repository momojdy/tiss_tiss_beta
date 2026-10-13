import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { StateView } from '../components/States';
import { RootProps, RootStackParamList } from '../navigation/types';
import { useHost } from '../store/HostContext';
import { useSettings } from '../store/SettingsContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const InsufficientBalanceScreen = ({ route }: RootProps<'Insufficient'>) => {
  const nav = useNavigation<Nav>();
  const host = useHost();
  const { money } = useSettings();
  return (
    <Screen title="Payment">
      <StateView icon="wallet-outline" title="Not enough balance" body={`Your Wallet needs ${money(route.params.needed)} more to pay for this stay. Top up your Wallet or pay with another method.`} />
      <View style={{ gap: 10 }}>
        <Button title="Top up Wallet" onPress={host.onOpenWallet} />
        <Button title="Choose another method" kind="secondary" onPress={() => nav.replace('PaymentMethods')} />
      </View>
    </Screen>
  );
};
