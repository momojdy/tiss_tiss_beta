import React from 'react';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';

export const PrezoSupportScreen = () => {
  const navigation = usePrezoNavigation();
  return (
    <ScreenScaffold>
      <PageTitle>Contact support</PageTitle>
      <Box panel style={{ marginTop: 14 }}>
        <PzText tone="mu" style={{ marginBottom: 12 }}>
          Tell us about an order or campaign and we’ll route it to the seller or Wantiss.
        </PzText>
        <Button
          label="Start a request"
          onPress={() => navigation.navigate({ name: 'report', relatedId: null })}
        />
      </Box>
    </ScreenScaffold>
  );
};

