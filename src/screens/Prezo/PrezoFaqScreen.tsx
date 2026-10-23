import React from 'react';
import { helpTopics } from '../../data/prezo/helpContent';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { NotFoundState } from '../../components/prezo/shared/StateViews';

export const PrezoFaqScreen = ({ topic }: { topic: string }) => {
  const navigation = usePrezoNavigation();
  const current = helpTopics.find((item) => item.key === topic);

  if (!current) {
    return (
      <ScreenScaffold>
        <NotFoundState title="Help topic not found" message="This help topic isn’t available." />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      <PageTitle>{current.title}</PageTitle>
      <PzText style={{ marginTop: 10 }}>{current.body}</PzText>
      <PzText size={13} tone="mu" style={{ marginTop: 18, marginBottom: 8 }}>
        Related
      </PzText>
      {helpTopics
        .filter((item) => item.key !== topic)
        .slice(0, 3)
        .map((item) => (
          <Box
            key={item.key}
            style={{ marginBottom: 8 }}
            onPress={() => navigation.navigate({ name: 'faq', topic: item.key })}
          >
            <PzText>{item.title}</PzText>
          </Box>
        ))}
      <Button
        label="Still stuck? Contact support"
        variant="ghost"
        onPress={() => navigation.navigate({ name: 'support' })}
      />
    </ScreenScaffold>
  );
};

