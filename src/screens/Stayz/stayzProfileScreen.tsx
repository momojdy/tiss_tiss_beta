import React from 'react';
import { Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzCard } from './stayzCard';
import { StayzRow } from './stayzRow';
import { StayzScreen } from './stayzScreen';
import { StayzSection } from './stayzSection';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzHost } from './stayzHostContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const StayzProfileScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const host = useStayzHost();
  const { currency, dark, setDark } = useStayzSettings();
  return (
    <StayzScreen title="Profile">
      <StayzSection title="Preferences">
        <StayzCard>
          <StayzRow icon="cash-outline" label="Currency" value={currency} onPress={() => nav.navigate('Currency')} />
          <StayzRow icon="moon-outline" label="Dark mode" chevron={false} right={<Switch value={dark} onValueChange={setDark} trackColor={{ true: colors.brand, false: colors.line }} />} />
          <StayzRow icon="notifications-outline" label="Stay notifications" onPress={() => nav.navigate('Notifications')} />
        </StayzCard>
      </StayzSection>
      <StayzSection title="Payments">
        <StayzCard>
          <StayzRow icon="wallet-outline" label="Wallet" onPress={host.onOpenWallet} />
          <StayzRow icon="card-outline" label="Payment methods" onPress={() => nav.navigate('PaymentMethods')} />
        </StayzCard>
      </StayzSection>
      <StayzSection title="More">
        <StayzCard>
          <StayzRow icon="help-circle-outline" label="Help" onPress={() => nav.navigate('Help')} />
          <StayzRow icon="business-outline" label="List your property" onPress={host.onListProperty} />
          <StayzRow icon="arrow-back-circle-outline" label="Back to Wantiss" onPress={host.onExitToWantiss} />
        </StayzCard>
      </StayzSection>
    </StayzScreen>
  );
};
