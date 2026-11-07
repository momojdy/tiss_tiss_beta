import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzActivity, type ActivityCategory } from '../../features/gatherz/GatherzActivityContext';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';

const articles = [
  ['Buying tickets', 'Pick a tier or group package, review the total and fees, then pay with your Wantiss Wallet. In this demo no money moves.'],
  ['Sending a ticket', 'Open a ticket and tap Send ticket. Pick a Wantiss contact or create a claim link. Your copy stays locked until the recipient accepts. Then it stops working and they get a new one.'],
  ['Downloading tickets', 'The demo supports sharing reference details, not exporting a valid ticket image. Use Transfer ticket for a demo handoff.'],
  ['QR check-in', 'Show your QR at the door. Each admission admits one person once.'],
  ['Refunds', 'Organizers set refund rules, shown before checkout. Open a ticket and tap Refund when eligible.'],
  ['Moments', 'After you check in you can share up to 3 photos per event. Photos only. Keep them private or delete them anytime.'],
  ['Circles', 'Join public circles, request to join private ones, and report posts or members from the button next to them.'],
  ['Event changes', 'Demo event changes can be simulated from Help. They do not change schedules or issue refunds.'],
] as const;
type Case = { id: string; topic: string; message: string; resolved: boolean; created: string };
const supportCases: Case[] = [];
const notificationPrefs = ['tickets', 'transfers', 'events', 'circles', 'moments'];
function Action({ title, description, onPress, selected }: { title: string; description?: string; onPress: () => void; selected?: boolean }) {
  const t = useGatherzTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={{ marginHorizontal: 20, marginTop: 9, padding: 15, borderWidth: 0.5, borderColor: selected ? t.accent : t.line, backgroundColor: selected ? t.soft : t.card, borderRadius: radius.card }}>
    <Text style={{ color: t.text, fontFamily: fonts.semibold }}>{title}</Text>
    {description ? <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 5 }}>{description}</Text> : null}
  </Pressable>;
}
export function GatherzHelpScreen() {
  const { nav } = useGatherz(); const t = useGatherzTheme(); const [query, setQuery] = useState('');
  return <Page><Header title="Help" onBack={nav.back} />
    <TextInput value={query} onChangeText={setQuery} placeholder="Search help" placeholderTextColor={t.mute} style={{ marginHorizontal: 20, marginTop: 12, padding: 14, color: t.text, borderRadius: radius.card, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line }} />
    {!articles.some(([title, body]) => (title + body).toLowerCase().includes(query.toLowerCase())) ? <Notice title="No articles match" body="Try another search or contact support." action="Contact support" onAction={() => nav.push('cs')} /> : null}
    {articles.map(([title, body], i) => ({ title, body, i })).filter(x => (x.title + x.body).toLowerCase().includes(query.toLowerCase())).map(x => <Action key={x.i} title={x.title} description={x.body.slice(0, 60) + '…'} onPress={() => nav.push('ha', String(x.i))} />)}
    {supportCases.map(c => <Action key={c.id} title={c.id + ' · ' + c.topic} description={c.resolved ? 'Resolved' : 'Open'} onPress={() => nav.push('sc', c.id)} />)}
    <Action title="Contact support" onPress={() => nav.push('cs')} />
    <Action title="Report an event" onPress={() => nav.push('rp', 'event')} />
  </Page>;
}
export function GatherzHelpArticleScreen({ id }: { id: string }) {
  const { nav } = useGatherz(); const t = useGatherzTheme(); const [helpful, setHelpful] = useState<'yes' | 'no' | null>(null);
  const article = articles[Number(id)];
  return <Page><Header title={article?.[0] ?? 'Help article'} onBack={nav.back} />
    {article ? <><View style={{ marginHorizontal: 20, padding: 16, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card }}><Text style={{ color: t.text, fontFamily: fonts.regular, lineHeight: 22 }}>{article[1]}</Text></View>
      <Action title="Was this helpful? · Yes" selected={helpful === 'yes'} onPress={() => setHelpful('yes')} />
      <Action title="No" selected={helpful === 'no'} onPress={() => setHelpful('no')} />
      {helpful === 'yes' ? <Notice body="Thanks for the feedback." /> : null}
      {helpful === 'no' ? <><Notice body="Sorry this did not help. You can contact support for more assistance." /><Action title="Contact support" onPress={() => nav.push('cs')} /></> : null}
    </> : <Notice title="Article not found" />}
  </Page>;
}
export function GatherzSupportScreen({ id }: { id?: string }) {
  const { nav } = useGatherz(); const t = useGatherzTheme(); const [topic, setTopic] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const existing = supportCases.find(c => c.id === id);
  if (id) return <Page><Header title={'Case ' + id} onBack={nav.back} />{existing ? <><Notice title={existing.topic + ' · ' + (existing.resolved ? 'Resolved' : 'Open')} body={existing.message + '\nReceived ' + existing.created + '. We reply in Wantiss Messages. This is a demo request.'} />{!existing.resolved ? <Action title="Mark as resolved" onPress={() => { existing.resolved = true; nav.back(); }} /> : null}</> : <Notice title="Case not found" />}</Page>;
  return <Page><Header title="Contact support" onBack={nav.back} /><Text style={{ color: t.mute, marginHorizontal: 20 }}>Topic</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8, marginTop: 12 }}>{['Tickets','Payments','Transfers','Moments','Circles','Other'].map(x => <Pressable key={x} accessibilityRole="button" onPress={() => setTopic(x)} style={{ borderWidth: 0.5, borderColor: topic === x ? t.accent : t.line, borderRadius: 99, padding: 11, backgroundColor: topic === x ? t.soft : t.card }}><Text style={{ color: t.text }}>{x}</Text></Pressable>)}</View>
    <TextInput multiline value={message} onChangeText={setMessage} placeholder="Describe what happened (10+ characters)" placeholderTextColor={t.mute} style={{ margin: 20, minHeight: 125, padding: 14, textAlignVertical: 'top', color: t.text, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, backgroundColor: t.card }} />
    {error ? <Notice title="Check your request" body={error} /> : null}
    <Action title="Send request" onPress={() => { if (!topic) return setError('Choose a topic.'); if (message.trim().length < 10) return setError('Add at least 10 characters so we can help.'); const id = 'C-' + (1001 + supportCases.length); supportCases.unshift({ id, topic, message: message.trim(), resolved: false, created: new Date().toLocaleString() }); nav.push('sc', id); }} />
    <Notice body="Demo only. No support request is sent to Wantiss." />
  </Page>;
}
export function GatherzPreferencesScreen() {
  const { nav, toggleTheme } = useGatherz(); const { preferences: p, setPreferences } = useGatherzActivity();
  const update = (patch: Partial<typeof p>) => setPreferences({ ...p, ...patch });
  const toggle = (items: string[], id: string) => items.includes(id) ? items.filter(x => x !== id) : [...items, id];
  return <Page><Header title="Preferences" onBack={nav.back} /><Notice body="These preferences are shared across Gatherz screens for this session. Account and wallet settings stay in Wantiss." />
    <Text style={{ marginHorizontal: 20, marginTop: 18 }}>Theme</Text>
    <Action title="Switch light / dark theme" onPress={toggleTheme} />
    <Text style={{ marginHorizontal: 20, marginTop: 20 }}>Interests</Text>
    {['Music','Nightlife','Culture','Food','Sports'].map(x => <Action key={x} title={x} selected={p.interests.includes(x)} onPress={() => update({ interests: toggle(p.interests, x) })} />)}
    <Text style={{ marginHorizontal: 20, marginTop: 20 }}>Discovery area</Text>
    {['Makati','BGC','Pasig'].map(x => <Action key={x} title={x} selected={p.area === x} onPress={() => update({ area: x })} />)}
    <Text style={{ marginHorizontal: 20, marginTop: 20 }}>Notification categories</Text>
    {notificationPrefs.map(x => <Action key={x} title={x + ': ' + (p.enabled.includes(x as ActivityCategory) ? 'on' : 'off')} selected={p.enabled.includes(x as ActivityCategory)} onPress={() => update({ enabled: toggle(p.enabled, x) as ActivityCategory[] })} />)}
    <Text style={{ marginHorizontal: 20, marginTop: 20 }}>Moments default visibility</Text>
    {(['Public','Private'] as const).map(x => <Action key={x} title={x} selected={p.visibility === x} onPress={() => update({ visibility: x })} />)}
    <Action title={'Reduce motion: ' + (p.reducedMotion ? 'on' : 'off')} onPress={() => update({ reducedMotion: !p.reducedMotion })} selected={p.reducedMotion} />
    <Notice body="Discovery area is a demo preference, not your live location. Reduce motion applies to supported Gatherz animations." />
  </Page>;
}
export function GatherzNotificationsScreen() {
  const { nav } = useGatherz(); const t = useGatherzTheme(); const { items, preferences, markRead, markAllRead } = useGatherzActivity(); const [filter, setFilter] = useState('All');
  const shown = items.filter(n => preferences.enabled.includes(n.category) && (filter === 'All' || filter === 'Unread' && !n.read || n.category === filter.toLowerCase()));
  return <Page><Header title="Notifications" onBack={nav.back} />
    <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['All','Unread','Tickets','Transfers','Events','Circles','Moments'].map(x => <Pressable key={x} accessibilityRole="button" onPress={() => setFilter(x)} style={{ padding: 10, borderWidth: 0.5, borderRadius: 99, borderColor: filter === x ? t.accent : t.line, backgroundColor: t.card }}><Text style={{ color: t.text }}>{x}</Text></Pressable>)}</View>
    <Action title="Mark all as read" onPress={markAllRead} />
    <Action title="Notification preferences" onPress={() => nav.push('prefs')} />
    {shown.map(n => <View key={n.id} style={{ marginHorizontal: 20, marginTop: 10, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: radius.card, padding: 14 }}>
      <Pressable accessibilityRole="button" onPress={() => { markRead(n.id); if (n.route === 'home' || n.route === 'tickets' || n.route === 'circles' || n.route === 'favorites' || n.route === 'moments') nav.tab(n.route); else if (n.route === 'msgs') nav.push('msgs'); else if (n.route && ['event','ticket','ci','mv','rc','grp','ords'].includes(n.route)) nav.push(n.route as 'event' | 'ticket' | 'ci' | 'mv' | 'rc' | 'grp' | 'ords', n.targetId); }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} /> : null}<Text style={{ color: t.text, fontFamily: fonts.semibold, flex: 1 }}>{n.title}</Text></View>
        <Text style={{ color: t.mute, marginTop: 5 }}>{n.body}</Text><Text style={{ color: t.mute, fontSize: 12, marginTop: 5 }}>{n.category} · {n.read ? 'Read' : 'Unread'} · {new Date(n.createdAt).toLocaleString()}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => markRead(n.id)} style={{ marginTop: 10 }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{n.read ? 'Read' : 'Mark read'}</Text></Pressable>
    </View>)}
    {!shown.length ? <Notice title="No notifications in this filter" body="Activity from demo actions will appear here." /> : null}
  </Page>;
}
