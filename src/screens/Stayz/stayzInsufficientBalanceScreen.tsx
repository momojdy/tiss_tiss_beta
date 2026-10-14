import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzButton } from './stayzButton';
import { StayzScreen } from './stayzScreen';
import { StayzStateView } from './stayzStates';
import { RootProps, RootStackParamList } from './stayzNavigationTypes';
import { useStayzHost } from './stayzHostContext';
import { useStayzSettings } from './stayzSettingsContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const StayzInsufficientBalanceScreen = ({ route }: RootProps<'Insufficient'>) => {
  const nav = useNavigation<Nav>();
  const host = useStayzHost();
  const { money } = useStayzSettings();
  return (
    <StayzScreen title="Payment">
      <StayzStateView icon="wallet-outline" title="Not enough balance" body={`Your Wallet needs ${money(route.params.needed)} more to pay for this stay. Top up your Wallet or pay with another method.`} />
      <View style={{ gap: 10 }}>
        <StayzButton title="Top up Wallet" onPress={host.onOpenWallet} />
        <StayzButton title="Choose another method" kind="secondary" onPress={() => nav.replace('PaymentMethods')} />
      </View>
    </StayzScreen>
  );
};
