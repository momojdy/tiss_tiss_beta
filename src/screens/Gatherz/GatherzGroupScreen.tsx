import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzGroupScreen({ id }: { id: string }) {
  const { repo, nav } = useGatherz(); const t = useGatherzTheme();
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
      {data.owned.map((a, i) => <Pressable key={a.id} accessibilityRole="button" onPress={() => nav.push('ticket', a.id)} style={{ backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, padding: 16 }}>
        <Text style={{ color: t.text, fontFamily: fonts.bold }}>Admission {i + 1} · {a.tier.toUpperCase()}</Text>
        <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 5 }}>{a.credentialCode}</Text>
        <Text style={{ color: t.accent, fontFamily: fonts.semibold, marginTop: 8 }}>View pass</Text>
      </Pressable>)}
      <Notice title="Transfer and assignment" body="Each admission has its own credential. Transfer and attendee assignment will be enabled in the next phase; no invitation links are sent in demo mode." />
    </View> : null}
  </Page>;
}