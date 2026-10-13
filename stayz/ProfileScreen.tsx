import React from 'react';
import { Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { RootStackParamList } from '../navigation/types';
import { useHost } from '../store/HostContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const host = useHost();
  const { currency, dark, setDark } = useSettings();
  return (
    <Screen title="Profile" back={false}>
      <Section title="Preferences">
        <Card>
          <Row icon="cash-outline" label="Currency" value={currency} onPress={() => nav.navigate('Currency')} />
          <Row icon="moon-outline" label="Dark mode" chevron={false} right={<Switch value={dark} onValueChange={setDark} trackColor={{ true: colors.brand, false: colors.line }} />} />
          <Row icon="notifications-outline" label="Stay notifications" onPress={() => nav.navigate('Notifications')} />
        </Card>
      </Section>
      <Section title="Payments">
        <Card>
          <Row icon="wallet-outline" label="Wallet" onPress={host.onOpenWallet} />
          <Row icon="card-outline" label="Payment methods" onPress={() => nav.navigate('PaymentMethods')} />
        </Card>
      </Section>
      <Section title="More">
        <Card>
          <Row icon="help-circle-outline" label="Help" onPress={() => nav.navigate('Help')} />
          <Row icon="business-outline" label="List your property" onPress={host.onListProperty} />
          <Row icon="arrow-back-circle-outline" label="Back to Wantiss" onPress={host.onExitToWantiss} />
        </Card>
      </Section>
    </Screen>
  );
};
