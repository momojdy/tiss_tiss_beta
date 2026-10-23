import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { usePrezoTheme } from '../../features/prezo/PrezoThemeContext';
import { AddAddressSheet } from '../../components/prezo/checkout/AddAddressSheet';
import { AddressManagerSheet } from '../../components/prezo/profile/AddressManagerSheet';
import { SettingRow } from '../../components/prezo/profile/SettingRow';
import { Avatar } from '../../components/prezo/shared/Avatar';
import { Box } from '../../components/prezo/shared/Box';
import { EmptyState } from '../../components/prezo/shared/EmptyState';
import { PageTitle, SubHeading } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { LoadFailureState } from '../../components/prezo/shared/StateViews';
import { usePrezoToast } from '../../features/prezo/PrezoToastContext';

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export const PrezoProfileScreen = () => {
  const data = usePrezoData();
  const navigation = usePrezoNavigation();
  const toast = usePrezoToast();
  const { mode, setMode } = usePrezoTheme();
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const profile = data.profile.data;
  const notifications = data.preferences.data.notifications;

  const setPreference = async (key: 'progress' | 'waitlist' | 'orders', value: boolean) => {
    try {
      await data.setNotificationPreference(key, value);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Couldn’t save your preference.');
    }
  };

  return (
    <ScreenScaffold>
      <View style={styles.wrap}>
        {data.profile.status === 'error' ? (
          <LoadFailureState
            title="Couldn’t load your profile"
            message={data.profile.message}
            onRetry={() => data.reload(['profile'])}
          />
        ) : profile ? (
          <View style={styles.header}>
            <Avatar text={initialsOf(profile.name)} />
            <View style={styles.headerText}>
              <PageTitle>{profile.name}</PageTitle>
              <PzText tone="mu">{profile.email} (shared Wantiss profile)</PzText>
            </View>
          </View>
        ) : data.profile.status === 'ready' ? (
          <EmptyState title="Profile unavailable" message="Your Wantiss profile isn’t connected yet." />
        ) : null}
        <Box style={styles.section}>
          <SubHeading>Notifications</SubHeading>
          <SettingRow
            title="Campaign progress"
            description="Progress and outcome updates"
            switchValue={notifications.progress}
            onSwitch={(value) => setPreference('progress', value)}
          />
          <SettingRow
            title="Waitlist"
            description="Offers and expiry"
            switchValue={notifications.waitlist}
            onSwitch={(value) => setPreference('waitlist', value)}
          />
          <SettingRow
            title="Orders and refunds"
            description="Payments, fallback deadlines, fulfilment"
            switchValue={notifications.orders}
            onSwitch={(value) => setPreference('orders', value)}
            last
          />
        </Box>
        <Box>
          <SettingRow
            title="Saved campaigns"
            onPress={() => navigation.navigate({ name: 'me', tab: 'saved' })}
          />
          <SettingRow title="Addresses" onPress={() => setAddressesOpen(true)} />
          <SettingRow
            title="Dark mode"
            switchValue={mode === 'dark'}
            onSwitch={(value) => {
              const next = value ? 'dark' : 'light';
              setMode(next);
              data.persistTheme(next);
            }}
          />
          <SettingRow
            title="Help and policies"
            onPress={() => navigation.navigate({ name: 'help' })}
            last
          />
        </Box>
      </View>
      <AddressManagerSheet
        visible={addressesOpen}
        onClose={() => setAddressesOpen(false)}
        onAdd={() => setAddOpen(true)}
      />
      <AddAddressSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 22,
  },
  headerText: {
    flex: 1,
  },
  section: {
    marginBottom: 14,
  },
});

