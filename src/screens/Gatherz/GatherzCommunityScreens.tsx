import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Header, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzCommunity } from '../../features/gatherz/GatherzCommunityContext';
import { demoCircles } from '../../data/gatherz/communityDemo';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
const organizers = [{ id: 'o1', name: 'Skyline Collective' }, { id: 'o2', name: 'Riverside Events' }, { id: 'o3', name: 'Maison Arts' }];
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useGatherzTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={{ borderRadius: 99, borderWidth: 0.5, borderColor: active ? t.accent : t.line, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: active ? t.soft : t.card }}><Text style={{ color: active ? t.accent : t.text, fontFamily: fonts.semibold, fontSize: 12 }}>{label}</Text></Pressable>;
}
function Item({ title, detail, onPress, action }: { title: string; detail: string; onPress: () => void; action?: string }) {
  const t = useGatherzTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ marginHorizontal: 20, marginBottom: 9, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line, padding: 16, backgroundColor: t.card }}>
    <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 15 }}>{title}</Text>
    <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 5 }}>{detail}</Text>
    {action ? <Text style={{ color: t.accent, fontFamily: fonts.semibold, marginTop: 7 }}>{action}</Text> : null}
  </Pressable>;
}
function Filters({ values, selected, choose }: { values: string[]; selected: string; choose: (v: string) => void }) {
  return <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{values.map(v => <Chip key={v} label={v} active={selected === v} onPress={() => choose(v)} />)}</View>;
}
export function GatherzFavoritesScreen() {
  const { repo, nav } = useGatherz(); const c = useGatherzCommunity(); const [tab, setTab] = useState('Events'); const [cat, setCat] = useState('All');
  const { data: events, loading } = useLoadEvents(repo);
  const saved = (events ?? []).filter(e => c.savedEvents.includes(e.id) && (cat === 'All' || e.category === cat));
  return <Page><Header title="Favorites" subtitle="Events, organizers and circles you saved." />
    <Filters values={['Events', 'Organizers', 'Circles']} selected={tab} choose={setTab} />
    {tab === 'Events' ? <><Filters values={['All', 'Music', 'Nightlife', 'Culture', 'Food', 'Sports']} selected={cat} choose={setCat} />{loading ? <Notice loading body="Loading saved events…" /> : saved.length ? saved.map(e => <Item key={e.id} title={e.title} detail={e.venue + ' · ' + e.area} action="View event" onPress={() => nav.push('event', e.id)} />) : <Notice title="No saved events" body="Tap the heart on any event to save it here." action="Find events" onAction={() => nav.push('explore')} />}</> : null}
    {tab === 'Organizers' ? organizers.filter(o => c.savedOrganizers.includes(o.id)).map(o => <Item key={o.id} title={o.name} detail="Saved organizer" onPress={() => nav.push('org', o.id)} />) : null}
    {tab === 'Organizers' && !c.savedOrganizers.length ? <Notice title="No saved organizers" body="Follow an organizer from an event page." action="Find events" onAction={() => nav.push('explore')} /> : null}
    {tab === 'Circles' ? demoCircles.filter(o => c.savedCircles.includes(o.id)).map(o => <Item key={o.id} title={o.name} detail={o.members + ' members'} onPress={() => nav.push('ci', o.id)} />) : null}
    {tab === 'Circles' && !c.savedCircles.length ? <Notice title="No saved circles" body="Save a circle from its page." action="Browse circles" onAction={() => nav.tab('circles')} /> : null}
  </Page>;
}
import { useLoad } from '../../lib/gatherz/useLoad';
import type { GatherzRepository } from '../../types/gatherz';
function useLoadEvents(repo: GatherzRepository) { return useLoad(() => repo.listEvents(), [repo]); }
export function GatherzCirclesScreen() {
  const { nav } = useGatherz(); const c = useGatherzCommunity(); const t = useGatherzTheme();
  const [tab, setTab] = useState('Discover'); const [query, setQuery] = useState('');
  const list = demoCircles.filter(x => (tab === 'Discover' || c.joinedCircles.includes(x.id)) && x.name.toLowerCase().includes(query.toLowerCase()));
  return <Page><Header title="Circles" subtitle="Groups that meet again and again." />
    <Filters values={['Discover', 'My circles']} selected={tab} choose={setTab} />
    <TextInput value={query} onChangeText={setQuery} placeholder="Search circles" placeholderTextColor={t.mute} style={{ marginHorizontal: 20, marginBottom: 12, padding: 12, color: t.text, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card }} />
    {list.map(x => <Item key={x.id} title={x.name} detail={x.members + ' members · ' + x.category + (x.private ? ' · Private' : '') + (x.closed ? ' · Closed' : '')} action={c.joinedCircles.includes(x.id) ? 'Joined' : c.requestedCircles.includes(x.id) ? 'Request pending' : x.closed ? 'Read only' : 'View'} onPress={() => nav.push('ci', x.id)} />)}
    {!list.length ? <Notice title={tab === 'Discover' ? 'No circles match your search' : 'You have not joined a circle yet'} action={tab === 'My circles' ? 'Discover circles' : undefined} onAction={() => setTab('Discover')} /> : null}
  </Page>;
}
export function GatherzCircleDetailScreen({ id }: { id: string }) {
  const { nav } = useGatherz(); const c = useGatherzCommunity(); const x = demoCircles.find(x => x.id === id);
  if (!x) return <Page><Header title="Circle" onBack={nav.back} /><Notice title="Circle not found" /></Page>;
  const joined = c.joinedCircles.includes(id), requested = c.requestedCircles.includes(id);
  return <Page><Header title={x.name} onBack={nav.back} subtitle={x.members + ' members · ' + x.category} />
    <Filters values={['Discussion', 'Events', 'Members', 'Invite']} selected="Discussion" choose={() => {}} />
    <Item title={x.name} detail={x.private ? 'Private circle' : 'Public circle'} action={c.savedCircles.includes(id) ? 'Saved ★' : 'Save circle'} onPress={() => c.toggleSavedCircle(id)} />
    {x.closed ? <Notice title="Closed circle" body="This circle is read-only." /> : joined ? <><Notice title="You are a member" body="Circle discussions and invitations will be added in the next build." /><Item title="Leave circle" detail="Stop participating in this circle" onPress={() => c.leaveCircle(id)} /></> : <Item title={x.private ? requested ? 'Cancel join request' : 'Request to join' : 'Join circle'} detail={x.private ? 'Private circles require approval' : 'Join this public circle'} onPress={() => x.private ? c.requestCircle(id) : c.joinCircle(id)} />}
  </Page>;
}
export function GatherzMomentsScreen() {
  const { repo, nav } = useGatherz(); const c = useGatherzCommunity(); const [tab, setTab] = useState('Discover');
  const { data: admissions } = useLoad(() => repo.listMyAdmissions(), [repo]);
  const checked = (admissions ?? []).filter(a => a.status === 'checked_in');
  const shown = c.moments.filter(m => tab === 'My Moments' ? m.owner === 'me' : tab === 'Host highlights' ? m.official && m.public : m.public && !m.official);
  return <Page><Header title="Moments" subtitle="Photos from events people attended. Photos only." />
    <Filters values={['Discover', 'My Moments', 'Host highlights']} selected={tab} choose={setTab} />
    <SectionTitle title="Add to your events" />
    {checked.map(a => <Item key={a.id} title={'Event ' + a.eventId} detail="Checked in · eligible to add photos" action="Add photo" onPress={() => nav.push('mp', a.eventId)} />)}
    {!checked.length ? <Notice body="Check in at an event before sharing photos. Up to 3 photos per event." /> : null}
    <SectionTitle title={tab} />
    {shown.map(m => <Item key={m.id} title={m.caption || 'Untitled'} detail={m.public ? 'Public' : 'Private'} onPress={() => nav.push('mv', m.id)} />)}
    {!shown.length ? <Notice title="No moments yet" body="Photos from checked-in attendees will appear here." /> : null}
  </Page>;
}
