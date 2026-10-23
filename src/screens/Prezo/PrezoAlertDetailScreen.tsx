import React from 'react';
import { StyleSheet } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { Button } from '../../components/prezo/shared/Button';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { NotFoundState } from '../../components/prezo/shared/StateViews';

export const PrezoAlertDetailScreen = ({ id }: { id: string }) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const alert = data.getAlert(id);
  const { markAlertRead } = data;
  const unread = !!alert && !alert.read;

  React.useEffect(() => {
    if (unread) markAlertRead(id).catch(() => undefined);
  }, [unread, id, markAlertRead]);

  if (!alert) {
    return (
      <ScreenScaffold>
        <NotFoundState title="Alert not found" message="This alert is no longer available." />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      <PageTitle>{alert.title}</PageTitle>
      <PzText size={13} tone="mu">
        {fmt.dateTime(alert.at)}
      </PzText>
      <PzText style={styles.message}>{alert.message}</PzText>
      {alert.target ? (
        <Button
          label="Open related item"
          onPress={() => alert.target && navigation.navigate(alert.target)}
        />
      ) : null}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  message: {
    marginVertical: 14,
  },
});

