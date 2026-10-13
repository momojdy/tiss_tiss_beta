import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { StateView } from '../components/States';
import { TextField } from '../components/TextField';
import { Txt } from '../components/Txt';
import { FAQS, FAQ_CATEGORIES } from '../data/faq';
import { useTheme } from '../theme/ThemeContext';

export const HelpScreen = () => {
  const { colors } = useTheme();
  const [cat, setCat] = useState<string>('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return FAQS.filter(f => (cat === 'All' || f.cat === cat) && (!term || f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term)));
  }, [cat, q]);

  return (
    <Screen title="Help">
      <TextField value={q} onChangeText={setQ} placeholder="Search help" returnKeyType="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {['All', ...FAQ_CATEGORIES].map(c => (
          <Chip key={c} label={c} on={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>
      {list.length === 0 ? (
        <StateView icon="help-circle-outline" title="No answers found" body="Try different words or another category." />
      ) : (
        list.map(f => {
          const on = open === f.q;
          return (
            <Pressable key={f.q} accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setOpen(on ? null : f.q)}>
              <Card style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt v="h3" style={{ flex: 1 }}>
                    {f.q}
                  </Txt>
                  <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={18} color={colors.sub} />
                </View>
                {on ? <Txt sub>{f.a}</Txt> : null}
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
};
