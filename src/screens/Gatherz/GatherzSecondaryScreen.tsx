import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useGatherzActivity } from '../../features/gatherz/GatherzActivityContext';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
type Mode = 'all' | 'msgs' | 'bs';
export default function GatherzSecondaryScreen({ mode, section }: { mode: Mode; section?: string }) {
 const { repo, nav, now } = useGatherz(); const t = useGatherzTheme();
 const activity = useGatherzActivity(); const [code, setCode] = useState(''); const [scanResult, setScanResult] = useState(''); const [gate, setGate] = useState('Gate A'); const [log, setLog] = useState<string[]>([]);
 const { data: transfers, reload: reloadTransfers } = useLoad(async () => await repo.listDemoTransfers?.() ?? [], [repo]);
 const { data: admissions } = useLoad(() => repo.listMyAdmissions(), [repo]);
 const scan = () => { const admission = (admissions ?? []).find(a => a.credentialCode.toUpperCase() === code.trim().toUpperCase()); const result = !code.trim() ? 'Enter a demo credential code.' : !admission ? 'Credential not found in this demo account.' : admission.status !== 'valid' ? 'Credential unavailable: ' + admission.status.replace(/_/g, ' ') : 'Demo credential found. This does not authorize entry.'; setScanResult(result); setLog(v => [gate + ': ' + result, ...v].slice(0, 10)); };
 const { data: events, loading } = useLoad(() => repo.listEvents(), [repo]);
 const sectionTitle: Record<string,string> = { week:'Happening This Week',near:'Events Near You',trend:'Trending Now',friends:"Friends’ Plans",last:'Last-Minute Deals',new:'New in Your City',circ:'Popular Circles',rec:'Recommended for You' };
 const filtered = [...(events ?? [])].filter(e => {
  const until = Date.parse(e.startsAt) - now;
  if (section === 'week') return until >= 0 && until <= 7 * 864e5;
  if (section === 'last') return until >= 0 && until <= 48 * 3600000 && e.remaining > 0;
  if (section === 'trend') return until >= 0 && e.remaining > 0;
  if (section === 'new') return until >= 0;
  return true;
 }).sort((a, b) => section === 'trend' ? a.remaining - b.remaining : section === 'new' ? Date.parse(b.startsAt) - Date.parse(a.startsAt) : Date.parse(a.startsAt) - Date.parse(b.startsAt));
 const title = mode === 'all' ? (sectionTitle[section ?? ''] ?? 'All events') : mode === 'msgs' ? 'Messages' : 'Ticket scanner';
 return <Page><Header title={title} onBack={nav.back} />
  {mode === 'all' ? <>
   {loading ? <Notice loading body="Loading events…" /> : null}
   {filtered.map(e => <Pressable key={e.id} accessibilityRole="button" onPress={() => nav.push('event', e.id)} style={{ marginHorizontal: 20, marginBottom: 10, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: radius.card, padding: 15 }}>
    <Text style={{ color: t.text, fontFamily: fonts.bold }}>{e.title}</Text>
    <Text style={{ color: t.mute, marginTop: 5 }}>{e.venue} · {e.area}</Text>
   </Pressable>)}
   {!loading && !filtered.length ? <Notice title="Nothing here right now." /> : null}
  </> : mode === 'msgs' ? <>
   <Notice title="Gatherz messages · demo" body="Incoming transfer requests and shared events are simulated here. No real Wantiss messages are sent." />
   {(transfers ?? []).length ? (transfers ?? []).map(tr => <View key={tr.token} style={{ marginHorizontal: 20, marginBottom: 12, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, borderRadius: radius.card, padding: 16, gap: 8 }}>
     <Text style={{ color: t.text, fontFamily: fonts.bold }}>Incoming ticket transfer</Text>
     <Text style={{ color: t.mute }}>For {tr.recipient} · {tr.status}</Text>
     <Text style={{ color: t.mute }}>QR hidden until you accept</Text>
     {tr.status === 'pending' ? <>
       <Pressable accessibilityRole="button" onPress={() => nav.push('claim', tr.token)} style={{ padding: 12, backgroundColor: t.accent, borderRadius: 999 }}><Text style={{ color: t.onAccent, textAlign: 'center' }}>Review / Accept</Text></Pressable>
       <Pressable accessibilityRole="button" onPress={async () => { await repo.cancelDemoTransfer?.(tr.admissionId); reloadTransfers(); activity.notify('transfers','Transfer declined','A demo ticket invitation was declined.'); }} style={{ padding: 12, borderRadius: 999, borderWidth: 0.5, borderColor: t.line }}><Text style={{ color: t.text, textAlign: 'center' }}>Decline (demo)</Text></Pressable>
     </> : null}
   </View>) : <Notice title="No Gatherz messages" body="No messages from Gatherz in this demo account." />}
   <Pressable accessibilityRole="button" onPress={() => nav.push('dc')} style={{ marginHorizontal: 20, padding: 14 }}><Text style={{ color: t.accent }}>Switch accounts in Demo controls</Text></Pressable>
  </> : <>
   <Notice title="Demo check-in tool" body="For testing only. Scans never grant entry. Check-in opens two hours before an event and closes after it ends." />
   <View style={{ marginHorizontal: 20, gap: 10 }}>
    <Text style={{ color: t.text, fontFamily: fonts.semibold }}>Gate selection</Text>
    <View style={{ flexDirection: 'row', gap: 10 }}>{['Gate A','Gate B'].map(g => <Pressable key={g} accessibilityRole="button" onPress={() => setGate(g)} style={{ padding: 12, borderRadius: 999, backgroundColor: gate === g ? t.accent : t.card, borderWidth: 0.5, borderColor: t.line }}><Text style={{ color: gate === g ? t.onAccent : t.text }}>{g}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel="Manual credential code" value={code} onChangeText={setCode} placeholder="Enter demo credential" placeholderTextColor={t.mute} style={{ color: t.text, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.input, padding: 14 }} />
    <Pressable accessibilityRole="button" onPress={scan} style={{ backgroundColor: t.accent, padding: 15, borderRadius: 999 }}><Text style={{ color: t.onAccent, textAlign: 'center' }}>Scan code (demo)</Text></Pressable>
    {scanResult ? <Notice title="Scan result" body={scanResult} /> : null}
    <Notice title="Camera scanner" body="Camera verification is unavailable in this offline demo. Use manual entry to test the interface." />
    <Text style={{ color: t.text, fontFamily: fonts.bold }}>Scan log</Text>
    {log.length ? log.map((line,i) => <Text key={i} style={{ color: t.mute }}>{line}</Text>) : <Text style={{ color: t.mute }}>No scans yet.</Text>}
   </View>
  </>}
 </Page>;
}
