import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { admissionText, eventPhase, formatWhen, policyOf } from '../../lib/gatherz/rules';
import { Art, Header, Notice, Page, SectionTitle, styles } from '../../components/gatherz/shared';
export default function GatherzEventScreen({ id }: { id: string }) {
  const t = useGatherzTheme(); const { repo, nav, now } = useGatherz(); const community = useGatherzCommunity();
  const { data: e, error, loading, reload } = useLoad(() => repo.getEvent(id), [repo, id]);
  if (loading) return <Page><Header title="Event" onBack={nav.back} /><Notice loading body="Loading event…" /></Page>;
  if (error) return <Page><Header title="Event" onBack={nav.back} /><Notice title="Event could not load" body={error} action="Try again" onAction={reload} /></Page>;
  if (!e) return <Page><Header title="Event" onBack={nav.back} /><Notice title="Event not found" body="It may have been removed or the link is invalid." action="Back to Explore" onAction={() => nav.push('explore')} /></Page>;
  const p = policyOf(e), phase = eventPhase(e, now), sold = e.remaining <= 0;
  const Box = ({ title, body }: { title: string; body: string }) => <View style={{ marginHorizontal: 20, marginTop: 10, padding: 14, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card }}><Text style={{ fontFamily: fonts.bold, color: t.text }}>{title}</Text><Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 4, fontSize: 14 }}>{body}</Text></View>;
  return (
    <Page>
      <Header title={e.title} onBack={nav.back} />
      <Art index={e.art} style={{ height: 200, marginHorizontal: 20, borderRadius: 26 }} />
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: t.text }}>{e.title}</Text>
        <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 4 }}>{e.tagline}</Text>
        <Text style={{ fontFamily: fonts.semibold, color: t.text, marginTop: 10 }}>{formatWhen(e, now)} · {e.timezone.split('/')[1]} time</Text>
        <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 2 }}>{e.venue}, {e.area}</Text>
        <Text style={{ fontFamily: fonts.semibold, color: t.accent, marginTop: 8 }}>{phase === 'past' ? 'This event has ended' : sold ? 'Sold out' : `${e.remaining} tickets left`}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => community.toggleSavedEvent(e.id)} style={{ borderWidth: 0.5, borderColor: t.line, borderRadius: 999, padding: 12, backgroundColor: t.card }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{community.savedEvents.includes(e.id) ? '♥ Saved' : '♡ Save event'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => community.toggleSavedOrganizer(e.organizerName)} style={{ borderWidth: 0.5, borderColor: t.line, borderRadius: 999, padding: 12, backgroundColor: t.card }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{community.savedOrganizers.includes(e.organizerName) ? 'Following organizer' : 'Follow organizer'}</Text></Pressable>
      </View>
      <SectionTitle title="Tickets" />
      {e.tiers.map(x => <Box key={x.name} title={`${x.name} · ${x.price === 0 ? 'Free' : '$' + x.price}`} body={x.admissions > 1 ? `${x.admissions} separate admissions in one purchase` : '1 admission'} />)}
      <SectionTitle title="Organizer" />
      <Box title={e.organizerName} body="Public organizer profile arrives with the Organizer screen." />
      <SectionTitle title="Policies" />
      <Box title="Entry" body={admissionText(p)} />
      <Box title="Transfers" body={`Allowed until ${p.transferCutoffHours} hours before start. The recipient must accept first.`} />
      <Box title="Refunds" body={`Accepted until ${p.refundCutoffHours} hours before start.`} />
      <Box title="Age and entry" body={`${p.age}. ${p.reentry}.`} />
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: phase === 'past' || sold }} disabled={phase === 'past' || sold} onPress={() => nav.push('buy', e.id)} style={[styles.btn, { backgroundColor: phase === 'past' || sold ? t.soft : t.accent }]}><Text style={{ fontFamily: fonts.semibold, color: phase === 'past' || sold ? t.mute : t.onAccent }}>{phase === 'past' ? 'Event ended' : sold ? 'Sold out' : 'Get tickets'}</Text></Pressable>
      </View>
    </Page>
  );
}