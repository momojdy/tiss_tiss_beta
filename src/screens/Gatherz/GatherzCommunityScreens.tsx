import React, { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Header, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzCommunity } from '../../features/gatherz/GatherzCommunityContext';
import { demoCircles } from '../../data/gatherz/communityDemo';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
const organizerBios: Record<string, string> = { 'Skyline Collective': 'Live music, nightlife and city experiences', 'Riverside Events': 'Food festivals and community gatherings', 'Maison Arts': 'Art, culture and creative experiences' };
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
  const { repo, nav } = useGatherz(); const c = useGatherzCommunity(); const t = useGatherzTheme(); const [tab, setTab] = useState('Events'); const [cat, setCat] = useState('All');
  const { data: events, loading } = useLoadEvents(repo);
  const saved = (events ?? []).filter(e => c.savedEvents.includes(e.id) && (cat === 'All' || e.category === cat));
  return <Page><Header title="Favorites" subtitle="Events, organizers and circles you saved." />
    <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><Chip label={`Events (${c.savedEvents.length})`} active={tab === 'Events'} onPress={() => setTab('Events')} /><Chip label={`Organizers (${c.savedOrganizers.length})`} active={tab === 'Organizers'} onPress={() => setTab('Organizers')} /><Chip label={`Circles (${c.savedCircles.length})`} active={tab === 'Circles'} onPress={() => setTab('Circles')} /></View>
    {tab === 'Events' ? <><Filters values={['All', 'Music', 'Nightlife', 'Culture', 'Food', 'Sports']} selected={cat} choose={setCat} />{loading ? <Notice loading body="Loading saved events…" /> : saved.length ? saved.map(e => <Item key={e.id} title={e.title} detail={e.venue + ' · ' + e.area} action="View event" onPress={() => nav.push('event', e.id)} />) : <Notice title="No saved events" body="Tap the heart on any event to save it here." action="Find events" onAction={() => nav.push('explore')} />}</> : null}
    {tab === 'Organizers' ? c.savedOrganizers.map(name => <Item key={name} title={name} detail={organizerBios[name] ?? 'Event organizer'} onPress={() => nav.push('org', name)} />) : null}
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
  const pending = c.invitations.filter(i => i.status === 'pending').length;
  return <Page><Header title="Circles" subtitle="Groups that meet again and again." />
    <Pressable accessibilityRole="button" onPress={() => nav.push('inv')} style={{ marginHorizontal: 20, marginTop: 12, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: 999, padding: 12, alignSelf: 'flex-start' }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>Invitations ({pending})</Text></Pressable>
    <Filters values={['Discover', 'My circles']} selected={tab} choose={setTab} />
    <TextInput value={query} onChangeText={setQuery} placeholder="Search circles" placeholderTextColor={t.mute} style={{ marginHorizontal: 20, marginBottom: 12, padding: 12, color: t.text, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card }} />
    {list.map(x => <Item key={x.id} title={x.name} detail={x.members + ' members · ' + x.category + (x.private ? ' · Private' : '') + (x.closed ? ' · Closed' : '')} action={c.joinedCircles.includes(x.id) ? 'Joined' : c.requestedCircles.includes(x.id) ? 'Request pending' : x.closed ? 'Read only' : 'View'} onPress={() => nav.push('ci', x.id)} />)}
    {!list.length ? <Notice title={tab === 'Discover' ? 'No circles match your search' : 'You have not joined a circle yet'} action={tab === 'My circles' ? 'Discover circles' : undefined} onAction={() => setTab('Discover')} /> : null}
  </Page>;
}
export function GatherzCircleDetailScreen({ id }: { id: string }) {
  const { nav } = useGatherz(); const c = useGatherzCommunity(); const t = useGatherzTheme();
  const [tab, setTab] = useState('Discussion'); const [draft, setDraft] = useState(''); const [notificationsOn, setNotificationsOn] = useState(true); const [confirmLeave, setConfirmLeave] = useState(false);
  const x = demoCircles.find(x => x.id === id);
  if (!x) return <Page><Header title="Circle" onBack={nav.back} /><Notice title="Circle not found" /></Page>;
  const joined = c.joinedCircles.includes(id), requested = c.requestedCircles.includes(id);
  const accessible = joined || !x.private;
  return <Page><Header title={x.name} onBack={nav.back} subtitle={x.members + ' members · ' + x.category} />
    <View style={{ marginHorizontal: 20, height: 108, backgroundColor: t.soft, borderRadius: radius.card, justifyContent: 'center', padding: 20 }}><Text style={{ color: t.accent, fontFamily: fonts.bold, fontSize: 23 }}>{x.name}</Text><Text style={{ color: t.mute, marginTop: 5 }}>{x.category} · {x.members} members</Text></View>
    <Filters values={['Discussion', 'Events', 'Members', 'Invite']} selected={tab} choose={setTab} />
    <Item title={x.name} detail={x.private ? 'Private circle' : 'Public circle'} action={c.savedCircles.includes(id) ? 'Saved ★' : 'Save circle'} onPress={() => c.toggleSavedCircle(id)} />
    {!joined && !x.closed ? <Item title={x.private ? requested ? 'Cancel join request' : 'Request to join' : 'Join circle'} detail={x.private ? 'Private circles require approval' : 'Join this public circle'} onPress={() => x.private ? c.requestCircle(id) : c.joinCircle(id)} /> : null}
    {x.closed ? <Notice title="Closed circle" body="This circle is read-only." /> : null}
    {!accessible ? <Notice title="Members only" body="Join this private circle to view discussions." /> : null}
    {tab === 'Discussion' && accessible ? <>
      {joined && !x.closed ? <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
        <TextInput multiline value={draft} onChangeText={setDraft} placeholder="Share something with your circle…" placeholderTextColor={t.mute} style={{ minHeight: 75, color: t.text, padding: 14, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: radius.card }} />
        <Chip label="Publish post" active={false} onPress={() => { if (!draft.trim()) return; c.addPost(id, draft.trim()); setDraft(''); }} />
      </View> : null}
      {c.posts.filter(p => p.circleId === id).map(p => <Item key={p.id} title={p.author} detail={p.text} action={p.replies.length + ' replies · Open discussion'} onPress={() => nav.push('pst', p.id)} />)}
      {!c.posts.some(p => p.circleId === id) ? <Notice title="No discussions yet" body="Members can start the conversation." /> : null}
    </> : null}
    {tab === 'Events' ? <CircleEvents category={x.category} /> : null}
    {tab === 'Members' && accessible ? <Item title="View members" detail={x.members + ' people in this circle'} onPress={() => nav.push('mem', id)} /> : null}
    {tab === 'Invite' ? <Item title="Invitations" detail="Invite another person to this circle" onPress={() => nav.push('inv', id)} /> : null}
    {joined ? <><Item title={'Notifications: ' + (notificationsOn ? 'On' : 'Off')} detail="Circle activity alerts" onPress={() => setNotificationsOn(v => !v)} /><Item title={confirmLeave ? 'Confirm leaving circle' : 'Leave circle'} detail={confirmLeave ? 'Tap again to leave this circle' : 'Stop participating in this circle'} onPress={() => { if (confirmLeave) { c.leaveCircle(id); setConfirmLeave(false); } else setConfirmLeave(true); }} /></> : null}
    <Item title="Report circle" detail="Report a concern about this circle" onPress={() => nav.push('rp', 'circle:' + id)} />
  </Page>;
}
export function GatherzMomentsScreen() {
  const { repo, nav } = useGatherz(); const c = useGatherzCommunity(); const [tab, setTab] = useState('Discover');
  const { data: admissions } = useLoad(() => repo.listMyAdmissions(), [repo]);
  const checked = (admissions ?? []).filter(a => a.status === 'checked_in');
  const { data: events } = useLoad(() => repo.listEvents(), [repo]);
  const t = useGatherzTheme();
  const eventName = (id: string) => events?.find(e => e.id === id)?.title ?? id;
  const checkedIds = [...new Set(checked.map(a => a.eventId))];
  const waitingIds = [...new Set((admissions ?? []).filter(a => a.status === 'valid').map(a => a.eventId))].filter(id => !checkedIds.includes(id));
  const shown = c.moments.filter(m => tab === 'My Moments' ? m.owner === 'me' : tab === 'Host highlights' ? m.official && m.public : m.public && !m.official);
  return <Page><Header title="Moments" subtitle="Photos from events people attended. Photos only." />
    <Filters values={['Discover', 'My Moments', 'Host highlights']} selected={tab} choose={setTab} />
    <SectionTitle title="Add to your events" />
    {checkedIds.map(id => <Item key={id} title={eventName(id)} detail={c.moments.filter(m => m.eventId === id && m.owner === 'me').length + ' of 3 photos used'} action="Add photo" onPress={() => nav.push('mp', id)} />)}
    {waitingIds.map(id => <Item key={id} title={eventName(id)} detail="Not checked in yet. Photos unlock after check-in." onPress={() => nav.push('event', id)} />)}
    {!checked.length ? <Notice body="Check in at an event before sharing photos. Up to 3 photos per event." /> : null}
    <SectionTitle title={tab} />
    <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12 }}>
      {[0, 1].map(col => <View key={col} style={{ flex: 1, gap: 12 }}>
        {shown.filter((_, index) => index % 2 === col).map(m => <Pressable key={m.id} accessibilityRole="button" onPress={() => nav.push('mv', m.id)} style={{ backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, overflow: 'hidden' }}>
          {m.uri ? <Image source={{ uri: m.uri }} style={{ width: '100%', height: 148 }} resizeMode="cover" /> : <View style={{ height: 148, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.mute }}>Photo</Text></View>}
          <View style={{ padding: 12, gap: 5 }}><Text numberOfLines={2} style={{ color: t.text, fontFamily: fonts.semibold }}>{m.caption || 'Photo moment'}</Text><Text style={{ color: t.mute, fontSize: 12 }}>{m.official ? 'Official · ' : ''}{m.public ? 'Public' : 'Private'}</Text></View>
        </Pressable>)}
      </View>)}
    </View>
    {!shown.length ? <Notice title="No moments yet" body="Photos from checked-in attendees will appear here." /> : null}
    <Notice title="Demo only" body="Photos and check-ins are simulated locally and are not published to Wantiss." />
  </Page>;
}

function CircleEvents({ category }: { category: string }) {
  const { repo, nav } = useGatherz();
  const { data, loading } = useLoad(() => repo.listEvents(), [repo]);
  const matches = (data ?? []).filter(e => e.category.toLowerCase() === category.toLowerCase());
  return <>{loading ? <Notice loading body="Loading circle events…" /> : matches.length ? matches.map(e => <Item key={e.id} title={e.title} detail={e.venue + ' · ' + e.area} action="View event" onPress={() => nav.push('event', e.id)} />) : <Notice title="No events in this category" body="Check back for more experiences." />}</>;
}
