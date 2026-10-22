import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { usePrezoTheme } from '../../features/prezo/PrezoThemeContext';
import { usePrezoToast } from '../../features/prezo/PrezoToastContext';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { EmptyState } from '../../components/prezo/shared/EmptyState';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { LoadFailureState } from '../../components/prezo/shared/StateViews';

export const PrezoAlertsScreen = () => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const toast = usePrezoToast();
  const { colors } = usePrezoTheme();
  const alerts = data.alerts.data;
  const allRead = alerts.every((alert) => alert.read);

  const markAll = async () => {
    try {
      await data.markAllAlertsRead();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Couldn’t update alerts.');
    }
  };

  return (
    <ScreenScaffold>
      <PageTitle>Alerts</PageTitle>
      <PzText size={13} tone="mu">
        Shared Wantiss inbox, with Prezo updates.
      </PzText>
      {data.alerts.status === 'error' ? (
        <LoadFailureState
          title="Couldn’t load alerts"
          message={data.alerts.message}
          onRetry={() => data.reload(['alerts'])}
        />
      ) : alerts.length ? (
        <>
          {alerts.map((alert) => (
            <Box
              key={alert.id}
              style={styles.item}
              onPress={() => navigation.navigate({ name: 'alert', id: alert.id })}
            >
              <View style={styles.titleRow}>
                {alert.read ? null : (
                  <View style={[styles.unread, { backgroundColor: colors.rd2 }]} />
                )}
                <PzText weight={600} style={styles.title}>
                  {alert.title}
                </PzText>
              </View>
              <PzText size={13} tone="mu">
                {alert.message}
              </PzText>
              <PzText size={13} tone="mu">
                {fmt.dateTime(alert.at)}
              </PzText>
            </Box>
          ))}
          {allRead ? (
            <PzText size={13} tone="mu">
              You’re all caught up.
            </PzText>
          ) : (
            <Button label="Mark all read" variant="ghost" onPress={markAll} />
          )}
        </>
      ) : (
        <EmptyState
          title="No alerts yet"
          message="Updates on your campaigns, orders and waitlists appear here."
        />
      )}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  item: {
    marginVertical: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unread: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  title: {
    flexShrink: 1,
  },
});

