import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import type { MyPrezoTab } from '../../../types/prezo';
import { FilterPill } from '../shared/Selectors';

const tabs: { key: MyPrezoTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'active', label: 'Active' },
  { key: 'success', label: 'Successful' },
  { key: 'failed', label: 'Action needed' },
  { key: 'orders', label: 'Orders' },
  { key: 'wl', label: 'Waitlist' },
  { key: 'saved', label: 'Saved' },
];

export const MyPrezoTabs = ({ active }: { active: MyPrezoTab }) => {
  const navigation = usePrezoNavigation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => (
        <FilterPill
          key={tab.key}
          label={tab.label}
          selected={tab.key === active}
          onPress={() => navigation.replace({ name: 'me', tab: tab.key })}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { marginVertical: 12, flexGrow: 0 },
  content: { gap: 8 },
});

