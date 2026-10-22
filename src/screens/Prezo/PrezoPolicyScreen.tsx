import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { policyTopics } from '../../data/prezo/helpContent';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { EmptyState } from '../../components/prezo/shared/EmptyState';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { FilterPill } from '../../components/prezo/shared/Selectors';
import { LoadFailureState } from '../../components/prezo/shared/StateViews';
import type { PolicyDocument } from '../../types/prezo';

export const PrezoPolicyScreen = ({ topic }: { topic: string }) => {
  const data = usePrezoData();
  const navigation = usePrezoNavigation();
  const [document, setDocument] = useState<PolicyDocument | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { loadPolicy } = data;
  const label = policyTopics.find((item) => item.key === topic)?.label ?? 'Policies';

  useEffect(() => {
    let active = true;
    setStatus('loading');
    loadPolicy(topic)
      .then((result) => {
        if (!active) return;
        setDocument(result);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : null);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [topic, loadPolicy, attempt]);

  return (
    <ScreenScaffold>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {policyTopics.map((item) => (
          <FilterPill
            key={item.key}
            label={item.label.split(' ')[0]}
            accessibilityLabel={item.label}
            selected={item.key === topic}
            onPress={() => navigation.replace({ name: 'policy', topic: item.key })}
          />
        ))}
      </ScrollView>
      {status === 'error' ? (
        <LoadFailureState
          title="Couldn’t load this policy"
          message={message}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      ) : status === 'ready' && !document ? (
        <>
          <PageTitle>{label}</PageTitle>
          <EmptyState
            title="Policy text isn’t available yet"
            message="This policy hasn’t been published for your account."
          />
        </>
      ) : document ? (
        <>
          <PageTitle>{document.title}</PageTitle>
          <PzText style={{ marginTop: 10 }}>{document.body}</PzText>
        </>
      ) : null}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  tabs: { marginVertical: 12, flexGrow: 0 },
  tabsContent: { gap: 8 },
});

