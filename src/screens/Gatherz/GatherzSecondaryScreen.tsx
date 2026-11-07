import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
type Mode = 'all' | 'msgs' | 'bs';
export default function GatherzSecondaryScreen({ mode }: { mode: Mode }) {
 const { repo, nav } = useGatherz(); const t = useGatherzTheme();
 const { data: events, loading } = useLoad(() => repo.listEvents(), [repo]);
 const title = mode === 'all' ? 'All events' : mode === 'msgs' ? 'Messages' : 'Ticket scanner';
 return <Page><Header title={title} onBack={nav.back} />
  {mode === 'all' ? <>
   {loading ? <Notice loading body="Loading events…" /> : null}
   {(events ?? []).map(e => <Pressable key={e.id} accessibilityRole="button" onPress={() => nav.push('event', e.id)} style={{ marginHorizontal: 20, marginBottom: 10, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: radius.card, padding: 15 }}>
    <Text style={{ color: t.text, fontFamily: fonts.bold }}>{e.title}</Text>
    <Text style={{ color: t.mute, marginTop: 5 }}>{e.venue} · {e.area}</Text>
   </Pressable>)}
   {!loading && !events?.length ? <Notice title="No events found" /> : null}
  </> : mode === 'msgs' ? <>
   <Notice title="No Gatherz messages" body="Demo transfer codes are shared using the system share sheet. Live Wantiss messaging is not connected to this frontend demo." />
   <Pressable accessibilityRole="button" onPress={() => nav.push('claim')} style={{ margin: 20, padding: 15, borderRadius: 99, backgroundColor: t.accent }}><Text style={{ color: t.onAccent, textAlign: 'center' }}>Claim a demo ticket</Text></Pressable>
  </> : <>
   <Notice title="Scanner unavailable in demo" body="Entry verification requires trusted organizer credentials and a live admission backend. The demo QR must not be treated as valid entry." />
   <Pressable accessibilityRole="button" onPress={() => nav.tab('tickets')} style={{ margin: 20, padding: 15, borderRadius: 99, backgroundColor: t.accent }}><Text style={{ color: t.onAccent, textAlign: 'center' }}>View demo tickets</Text></Pressable>
  </>}
 </Page>;
}
