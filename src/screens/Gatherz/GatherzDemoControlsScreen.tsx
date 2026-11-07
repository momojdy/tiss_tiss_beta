import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzActivity } from '../../features/gatherz/GatherzActivityContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, useGatherzTheme } from '../../theme/gatherzTheme';
import { Pressable } from 'react-native';
export default function GatherzDemoControlsScreen() {
 const { repo, nav } = useGatherz(); const activity = useGatherzActivity(); const t = useGatherzTheme();
 const { data: events } = useLoad(() => repo.listEvents(), [repo]);
 const [selected, setSelected] = useState('');
 const event = events?.find(e => e.id === selected) ?? events?.[0];
 return <Page><Header title="Demo event updates" onBack={nav.back} />
  <Notice title="Simulation only" body="Create a local event-change notification. This does not modify the actual event schedule, tickets, or organizer data." />
  {(events ?? []).map(e => <Pressable key={e.id} accessibilityRole="button" onPress={() => setSelected(e.id)} style={{ padding: 12, marginHorizontal: 20, borderBottomWidth: 0.5, borderColor: t.line }}><Text style={{ color: selected === e.id ? t.accent : t.text, fontFamily: fonts.semibold }}>{e.title}</Text></Pressable>)}
  {event ? <View style={{ margin: 20, gap: 10 }}>{(['Rescheduled','Postponed','Canceled'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" onPress={() => { activity.notify('events', 'Event ' + kind.toLowerCase(), event.title + ': ' + kind + ' (demo notice only). Check with the organizer for official details.', 'event', event.id); nav.push('notif'); }} style={{ padding: 15, borderRadius: 999, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card }}><Text style={{ color: t.text, textAlign: 'center' }}>{'Simulate ' + kind.toLowerCase() + ' notice'}</Text></Pressable>)}</View> : null}
 </Page>;
}
