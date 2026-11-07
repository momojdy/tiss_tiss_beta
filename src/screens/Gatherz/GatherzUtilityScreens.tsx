import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';

const articles = [
  ['Buying tickets', 'Pick a tier or group package, review the total and fees, then pay with your Wantiss Wallet. In this demo no money moves.'],
  ['Sending a ticket', 'Open a ticket and tap Send ticket. Pick a Wantiss contact or create a claim link. Your copy stays locked until the recipient accepts. Then it stops working and they get a new one.'],
  ['Downloading tickets', 'You can export your own ticket as an image. A downloaded copy can be forwarded, and forwarding does not cancel it. The first valid scan wins. Use Send ticket for a safe handoff.'],
  ['QR check-in', 'Show your QR at the door. Each admission admits one person once.'],
  ['Refunds', 'Organizers set refund rules, shown before checkout. Open a ticket and tap Refund when eligible.'],
  ['Moments', 'After you check in you can share up to 3 photos per event. Photos only. Keep them private or delete them anytime.'],
  ['Circles', 'Join public circles, request to join private ones, and report posts or members from the button next to them.'],
  ['Event changes', 'If an event is canceled, postponed or rescheduled you get a notification with your options.'],
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
    {articles.map(([title, body], i) => ({ title, body, i })).filter(x => (x.title + x.body).toLowerCase().includes(query.toLowerCase())).map(x => <Action key={x.i} title={x.title} description={x.body.slice(0, 60) + '…'} onPress={() => nav.push('ha', String(x.i))} />)}
    {supportCases.map(c => <Action key={c.id} title={c.id + ' · ' + c.topic} description={c.resolved ? 'Resolved' : 'Open'} onPress={() => nav.push('sc', c.id)} />)}
    <Action title="Contact support" onPress={() => nav.push('cs')} />
    <Action title="Report an event" onPress={() => nav.push('rp')} />
  </Page>;
}
export function GatherzHelpArticleScreen({ id }: { id: string }) {
  const { nav } = useGatherz(); const t = useGatherzTheme(); const [helpful, setHelpful] = useState<'yes' | 'no' | null>(null);
  const article = articles[Number(id)];
  return <Page><Header title={article?.[0] ?? 'Help article'} onBack={nav.back} />
    {article ? <><View style={{ marginHorizontal: 20, padding: 16, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card }}><Text style={{ color: t.text, fontFamily: fonts.regular, lineHeight: 22 }}>{article[1]}</Text></View>
      <Action title="Was this helpful? · Yes" selected={helpful === 'yes'} onPress={() => setHelpful('yes')} />
      <Action title="No" selected={helpful === 'no'} onPress={() => setHelpful('no')} />
      {helpful === 'no' ? <Action title="Contact support" onPress={() => nav.push('cs')} /> : null}
    </> : <Notice title="Article not found" />}
  </Page>;
}
export function GatherzSupportScreen({ id }: { id?: string }) {
  const { nav } = useGatherz(); const t = useGatherzTheme(); const [topic, setTopic] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const existing = supportCases.find(c => c.id === id);
  if (id) return <Page><Header title={'Case ' + id} onBack={nav.back} />{existing ? <><Notice title={existing.topic + ' · ' + (existing.resolved ? 'Resolved' : 'Open')} body={existing.message + '\nReceived ' + existing.created + '. This case is stored in demo memory only.'} />{!existing.resolved ? <Action title="Mark as resolved" onPress={() => { existing.resolved = true; nav.back(); }} /> : null}</> : <Notice title="Case not found" />}</Page>;
  return <Page><Header title="Contact support" onBack={nav.back} /><Text style={{ color: t.mute, marginHorizontal: 20 }}>Topic</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8, marginTop: 12 }}>{['Tickets','Payments','Transfers','Moments','Circles','Other'].map(x => <Pressable key={x} accessibilityRole="button" onPress={() => setTopic(x)} style={{ borderWidth: 0.5, borderColor: topic === x ? t.accent : t.line, borderRadius: 99, padding: 11, backgroundColor: topic === x ? t.soft : t.card }}><Text style={{ color: t.text }}>{x}</Text></Pressable>)}</View>
    <TextInput multiline value={message} onChangeText={setMessage} placeholder="Describe what happened (10+ characters)" placeholderTextColor={t.mute} style={{ margin: 20, minHeight: 125, padding: 14, textAlignVertical: 'top', color: t.text, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, backgroundColor: t.card }} />
    {error ? <Notice title="Check your request" body={error} /> : null}
    <Action title="Send demo request" onPress={() => { if (!topic) return setError('Choose a topic.'); if (message.trim().length < 10) return setError('Add at least 10 characters so we can help.'); const id = 'C-' + (1001 + supportCases.length); supportCases.unshift({ id, topic, message: message.trim(), resolved: false, created: new Date().toLocaleString() }); nav.push('sc', id); }} />
    <Notice body="Demo only. No support request is sent to Wantiss." />
  </Page>;
}
export function GatherzPreferencesScreen() {
  const { nav, toggleTheme } = useGatherz(); const [interests, setInterests] = useState<string[]>([]); const [area, setArea] = useState('Makati'); const [enabled, setEnabled] = useState<string[]>(notificationPrefs); const [visibility, setVisibility] = useState('Public'); const [reducedMotion, setReducedMotion] = useState(false);
  const toggle = (items: string[], set: (v: string[]) => void, id: string) => set(items.includes(id) ? items.filter(x => x !== id) : [...items, id]);
  return <Page><Header title="Preferences" onBack={nav.back} /><Notice body="Gatherz preferences. Account, wallet and messaging settings stay in your Wantiss account." />
    <Action title="Switch light / dark theme" onPress={toggleTheme} />
    <Text style={{ marginHorizontal: 20, marginTop: 20 }}>Interests · Recommended for you</Text>
    {['Music','Nightlife','Culture','Food','Sports'].map(x => <Action key={x} title={(interests.includes(x) ? '✓ ' : '') + x} selected={interests.includes(x)} onPress={() => toggle(interests, setInterests, x)} />)}
    <Text style={{ marginHorizontal: 20, marginTop: 20 }}>Discovery area</Text>
    {['Makati','BGC','Pasig'].map(x => <Action key={x} title={x} selected={area === x} onPress={() => setArea(x)} />)}
    <Text style={{ marginHorizontal: 20, marginTop: 20 }}>Notifications</Text>
    {notificationPrefs.map(x => <Action key={x} title={x + ': ' + (enabled.includes(x) ? 'on' : 'off')} selected={enabled.includes(x)} onPress={() => toggle(enabled, setEnabled, x)} />)}
    <Text style={{ marginHorizontal: 20, marginTop: 20 }}>Moments default visibility</Text>
    {['Public','Private'].map(x => <Action key={x} title={x} selected={visibility === x} onPress={() => setVisibility(x)} />)}
    <Action title={'Reduce motion: ' + (reducedMotion ? 'on' : 'off')} onPress={() => setReducedMotion(v => !v)} selected={reducedMotion} />
  </Page>;
}
export function GatherzNotificationsScreen() {
  const { nav } = useGatherz(); const [filter, setFilter] = useState('All');
  return <Page><Header title="Notifications" onBack={nav.back} />
    <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['All','Unread','Tickets','Transfers','Events','Circles','Moments'].map(x => <Pressable key={x} accessibilityRole="button" onPress={() => setFilter(x)} style={{ padding: 10, borderWidth: 0.5, borderRadius: 99, borderColor: filter === x ? '#8B7CC7' : '#999' }}><Text>{x}</Text></Pressable>)}</View>
    <Action title="Preferences" onPress={() => nav.push('prefs')} />
    <Notice title={filter === 'All' ? 'You are all caught up.' : 'Nothing in this filter.'} body="Demo notifications will appear here as Gatherz activity is connected." />
  </Page>;
}
