import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { helpTopics } from '../../data/prezo/helpContent';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { EmptyState } from '../../components/prezo/shared/EmptyState';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { TextField } from '../../components/prezo/shared/TextField';

export const PrezoHelpScreen = () => {
  const navigation = usePrezoNavigation();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const topics = helpTopics.filter((topic) =>
    `${topic.title} ${topic.body}`.toLowerCase().includes(needle),
  );

  return (
    <ScreenScaffold>
      <PageTitle>Help</PageTitle>
      <View style={{ marginTop: 10 }}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search help topics"
          accessibilityLabel="Search help topics"
        />
      </View>
      {topics.length ? (
        topics.map((topic) => (
          <Box
            key={topic.key}
            style={styles.topic}
            onPress={() => navigation.navigate({ name: 'faq', topic: topic.key })}
          >
            <PzText weight={600}>{topic.title}</PzText>
          </Box>
        ))
      ) : (
        <EmptyState title="No help topics match" message="Try a different search." />
      )}
      <View style={styles.actions}>
        <Button label="Contact support" onPress={() => navigation.navigate({ name: 'support' })} />
        <Button
          label="Report a problem"
          variant="ghost"
          onPress={() => navigation.navigate({ name: 'report', relatedId: null })}
        />
        <Button
          label="Terms and policies"
          variant="ghost"
          onPress={() => navigation.navigate({ name: 'policy', topic: 'terms' })}
        />
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  topic: {
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
});

