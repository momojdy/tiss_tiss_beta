import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StayzCard } from './stayzCard';
import { StayzChip } from './stayzChip';
import { StayzScreen } from './stayzScreen';
import { StayzStateView } from './stayzStates';
import { StayzTextField } from './stayzTextField';
import { StayzTxt } from './stayzTxt';
import { FAQS, FAQ_CATEGORIES } from './stayzFaq';
import { useStayzTheme } from './stayzThemeContext';

export const StayzHelpScreen = () => {
  const { colors } = useStayzTheme();
  const [cat, setCat] = useState<string>('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return FAQS.filter(f => (cat === 'All' || f.cat === cat) && (!term || f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term)));
  }, [cat, q]);

  return (
    <StayzScreen title="Help">
      <StayzTextField value={q} onChangeText={setQ} placeholder="Search help" returnKeyType="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {['All', ...FAQ_CATEGORIES].map(c => (
          <StayzChip key={c} label={c} on={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>
      {list.length === 0 ? (
        <StayzStateView icon="help-circle-outline" title="No answers found" body="Try different words or another category." />
      ) : (
        list.map(f => {
          const on = open === f.q;
          return (
            <Pressable key={f.q} accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setOpen(on ? null : f.q)}>
              <StayzCard style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StayzTxt v="h3" style={{ flex: 1 }}>
                    {f.q}
                  </StayzTxt>
                  <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={18} color={colors.sub} />
                </View>
                {on ? <StayzTxt sub>{f.a}</StayzTxt> : null}
              </StayzCard>
            </Pressable>
          );
        })
      )}
    </StayzScreen>
  );
};
