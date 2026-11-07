import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzActivity } from '../../features/gatherz/GatherzActivityContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, useGatherzTheme } from '../../theme/gatherzTheme';
import { Pressable } from 'react-native';
export default function GatherzDemoControlsScreen() {
 const { repo, nav, demoAccount, switchDemoAccount } = useGatherz(); const activity = useGatherzActivity(); const t = useGatherzTheme();
 const { data: events } = useLoad(() => repo.listEvents(), [repo]);
 const { data: admissions, reload: reloadAdmissions } = useLoad(() => repo.listMyAdmissions(), [repo]);
 const { data: orders, reload: reloadOrders } = useLoad(async () => await repo.listOrders?.() ?? [], [repo]);
 const [selected, setSelected] = useState('');
 const event = events?.find(e => e.id === selected) ?? events?.[0];
 return <Page><Header title="Demo controls" onBack={nav.back} />
  <Notice title="Demo controls" body="Try Gatherz flows without sending messages, charging a wallet, or changing real tickets. Controls affect this demo session only." />
  <View style={{ marginHorizontal: 20, marginTop: 14, gap: 10 }}>
    <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 18 }}>Demo account · {demoAccount ?? 'Connected account'}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {['Alex','Jamie','Sam','Staff','Host'].map(name => <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: demoAccount === name }} disabled={!switchDemoAccount} onPress={() => switchDemoAccount?.(name)} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 0.5, borderColor: demoAccount === name ? t.accent : t.line, backgroundColor: t.card }}><Text style={{ color: demoAccount === name ? t.accent : t.text }}>{name}</Text></Pressable>)}
    </View>
    <Text style={{ color: t.mute }}>Each demo account has its own ticket and order state. Switching returns to Home and clears the current screen's temporary state.</Text>
    <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 18 }}>Demo session summary</Text>
    <Text style={{ color: t.mute }}>{(admissions ?? []).length} admissions · {(admissions ?? []).filter(a => a.status === 'valid').length} valid · {(admissions ?? []).filter(a => a.status === 'checked_in').length} checked in · {(orders ?? []).length} orders</Text>
    <Pressable accessibilityRole="button" onPress={() => { reloadAdmissions(); reloadOrders(); }} style={{ padding: 12, borderWidth: 0.5, borderColor: t.line, borderRadius: 12 }}><Text style={{ color: t.accent }}>Refresh demo counts</Text></Pressable>
    <Notice title="Demo limitations" body="Accounts are isolated within this app session. No actual user authentication or remote messages are involved. Fault injection and simulated time controls are not yet available." />
    <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 18 }}>Tools</Text>
    {([{ label: 'Wantiss Messages', route: 'msgs' }, { label: 'Check-in tool', route: 'bs' }, { label: 'My tickets', route: 'tickets' }, { label: 'Purchase history', route: 'ords' }, { label: 'Notifications', route: 'notif' }] as const).map(x => <Pressable key={x.route} accessibilityRole="button" onPress={() => x.route === 'tickets' ? nav.tab('tickets') : nav.push(x.route)} style={{ padding: 15, borderRadius: 16, borderWidth: .5, borderColor: t.line, backgroundColor: t.card }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>{x.label}</Text></Pressable>)}
    <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 18, marginTop: 12 }}>Simulate event updates</Text>
  </View>
  {(events ?? []).map(e => <Pressable key={e.id} accessibilityRole="button" onPress={() => setSelected(e.id)} style={{ padding: 12, marginHorizontal: 20, borderBottomWidth: 0.5, borderColor: t.line }}><Text style={{ color: selected === e.id ? t.accent : t.text, fontFamily: fonts.semibold }}>{e.title}</Text></Pressable>)}
  {event ? <View style={{ margin: 20, gap: 10 }}>{(['Rescheduled','Postponed','Canceled'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" onPress={() => { activity.notify('events', 'Event ' + kind.toLowerCase(), event.title + ': ' + kind + ' (demo notice only). Check with the organizer for official details.', 'event', event.id); nav.push('notif'); }} style={{ padding: 15, borderRadius: 999, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card }}><Text style={{ color: t.text, textAlign: 'center' }}>{'Simulate ' + kind.toLowerCase() + ' notice'}</Text></Pressable>)}</View> : null}
 </Page>;
}
