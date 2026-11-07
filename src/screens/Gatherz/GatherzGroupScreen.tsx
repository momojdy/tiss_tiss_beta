import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzGroupScreen({ id }: { id: string }) {
  const { repo, nav } = useGatherz(); const t = useGatherzTheme();
  const [names, setNames] = useState<Record<string, string>>({}); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    const admissions = await repo.listMyAdmissions();
    const owned = admissions.filter(a => a.orderId === id && a.status !== 'transferred');
    const event = owned[0] ? await repo.getEvent(owned[0].eventId) : null;
    return { owned, event };
  }, [repo, id]);
  return <Page><Header title="Group Tickets" onBack={nav.back} subtitle="Manage individual admissions in your package" />
    {loading ? <Notice loading body="Loading group…" /> : null}
    {error ? <Notice title="Group unavailable" body={error} action="Try again" onAction={reload} /> : null}
    {data && !data.owned.length ? <Notice title="No group tickets" body="This order has no active admissions in this demo session." /> : null}
    {data?.event ? <View style={{ paddingHorizontal: 20, gap: 10 }}>
      <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 20, marginVertical: 8 }}>{data.event.title}</Text>
      <Text style={{ color: t.mute, fontFamily: fonts.regular, marginBottom: 6 }}>{data.owned.length} individual admissions · {id}</Text>
      {data.owned.map((a, i) => <View key={a.id} style={{ backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, padding: 16 }}>
        <Text style={{ color: t.text, fontFamily: fonts.bold }}>Admission {i + 1} · {a.tier.toUpperCase()}</Text>
        <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 5 }}>{a.credentialCode}</Text>
        <Text style={{ color: t.mute, marginTop: 5 }}>Status: {a.status.replace('_', ' ')}</Text>
        {a.status === 'valid' ? <>
          <TextInput value={names[a.id] ?? a.holderName ?? ''} onChangeText={v => setNames(n => ({ ...n, [a.id]: v }))} placeholder="Attendee name" placeholderTextColor={t.mute} style={{ color: t.text, borderWidth: 0.5, borderColor: t.line, borderRadius: 12, padding: 10, marginTop: 12 }} />
          <Pressable accessibilityRole="button" disabled={busy} onPress={async () => { setBusy(true); try { await repo.assignDemoAdmission?.(a.id, names[a.id] ?? a.holderName ?? ''); setMessage('Attendee name saved.'); reload(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Assignment failed'); } finally { setBusy(false); } }} style={{ marginTop: 9, padding: 11, borderRadius: 99, backgroundColor: t.soft }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>Save attendee</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => nav.push('send', a.id)} style={{ padding: 11 }}><Text style={{ color: t.accent }}>Transfer this admission</Text></Pressable>
        </> : null}
        <Pressable accessibilityRole="button" onPress={() => nav.push('ticket', a.id)} style={{ padding: 11 }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>View pass</Text></Pressable>
      </View>)}
      {message ? <Notice title="Assignment" body={message} /> : null}
      <Notice title="Group admissions" body="Each admission has its own credential. Names and transfers are simulated locally; no invitations are sent." />
    </View> : null}
  </Page>;
}