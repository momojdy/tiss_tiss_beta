import React, { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzCommunity } from '../../features/gatherz/GatherzCommunityContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { admissionText, eventPhase, formatWhen, policyOf } from '../../lib/gatherz/rules';
import { Art, Header, Notice, Page, SectionTitle, styles } from '../../components/gatherz/shared';
export default function GatherzEventScreen({ id }: { id: string }) {
  const t = useGatherzTheme(); const { repo, nav, now } = useGatherz(); const community = useGatherzCommunity();
  const [expanded, setExpanded] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const { data: e, error, loading, reload } = useLoad(() => repo.getEvent(id), [repo, id]);
  if (loading) return <Page><Header title="Event" onBack={nav.back} /><Notice loading body="Loading event…" /></Page>;
  if (error) return <Page><Header title="Event" onBack={nav.back} /><Notice title="Event could not load" body="Please try again." action="Try again" onAction={reload} /></Page>;
  if (!e) return <Page><Header title="Event" onBack={nav.back} /><Notice title="Event not found" body="It may have been removed or the link is invalid." action="Back to Explore" onAction={() => nav.push('explore')} /></Page>;
  const p = policyOf(e), phase = eventPhase(e, now), sold = e.remaining <= 0;
  const Box = ({ title, body }: { title: string; body: string }) => <View style={{ marginHorizontal: 20, marginTop: 10, padding: 14, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card }}><Text style={{ fontFamily: fonts.bold, color: t.text }}>{title}</Text><Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 4, fontSize: 14 }}>{body}</Text></View>;
  return (
    <Page>
      <Header title={e.title} onBack={nav.back} />
      <View style={{ marginHorizontal: 20 }}>
        <Art index={e.art} style={{ height: 196, borderRadius: 26 }} />
        {sold || e.remaining <= 10 ? <View pointerEvents="none" style={{ position: 'absolute', top: 12, left: 12, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: t.accent }}><Text style={{ color: t.onAccent, fontFamily: fonts.semibold, fontSize: 11 }}>{sold ? 'SOLD OUT' : 'ALMOST GONE'}</Text></View> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => { void Share.share({ message: `${e.title} — ${e.venue}, ${e.area}. Find it on Gatherz by Wantiss.` }); }} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 0.5, borderColor: t.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: t.card }}><MaterialCommunityIcons name="share-variant-outline" size={18} color={t.accent} /><Text style={{ color: t.text, fontFamily: fonts.semibold }}>Share</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => nav.push('rp', 'event:' + e.id)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 0.5, borderColor: t.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: t.card }}><MaterialCommunityIcons name="flag-outline" size={18} color={t.mute} /><Text style={{ color: t.text }}>Report</Text></Pressable>
      </View>
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
      {sold && phase !== 'past' ? <Pressable accessibilityRole="button" onPress={() => setWaitlisted(v => !v)} style={{ marginHorizontal: 20, marginTop: 12, padding: 14, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: 999, alignItems: 'center' }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{waitlisted ? 'On the waitlist · Tap to leave' : 'Join waitlist (demo)'}</Text></Pressable> : null}
      <SectionTitle title="About this event" />
      <View style={{ marginHorizontal: 20, padding: 16, backgroundColor: t.card, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line }}>
        <Text style={{ color: t.text, lineHeight: 21 }}>{e.tagline}{expanded ? '\n\nJoin the experience at ' + e.venue + ' in ' + e.area + '. Check the event policies before purchasing.' : ''}</Text>
        <Pressable accessibilityRole="button" onPress={() => setExpanded(v => !v)} style={{ marginTop: 10 }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{expanded ? 'Read less' : 'Read more'}</Text></Pressable>
      </View>
      <SectionTitle title="Date & location" />
      <Box title={formatWhen(e, now)} body={e.venue + ', ' + e.area + ' · ' + e.timezone} />
      <SectionTitle title="Tickets" />
      {e.tiers.map(x => <Pressable key={x.name} accessibilityRole="button" accessibilityState={{ disabled: sold || phase === 'past' }} disabled={sold || phase === 'past'} onPress={() => nav.push('buy', e.id)} style={{ marginHorizontal: 20, marginTop: 10, padding: 14, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bold, color: t.text }}>{x.name}</Text><Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 4 }}>{x.admissions} {x.admissions === 1 ? 'admission' : 'admissions'} · {sold ? 'Sold out' : phase === 'past' ? 'Event ended' : 'Available'}</Text></View>
        <Text style={{ color: t.accent, fontFamily: fonts.semibold }}>{x.price === 0 ? 'Free' : '
      <SectionTitle title="Organizer" />
      <Pressable accessibilityRole="button" onPress={() => nav.push('org', e.organizerName)} style={{ marginHorizontal: 20, marginTop: 10, padding: 14, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card }}><Text style={{ fontFamily: fonts.bold, color: t.text }}>{e.organizerName}</Text><Text style={{ fontFamily: fonts.semibold, color: t.accent, marginTop: 4 }}>View organizer profile</Text></Pressable>
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
} + x.price.toFixed(2)}</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={t.mute} />
      </Pressable>)}
      <SectionTitle title="Organizer" />
      <Pressable accessibilityRole="button" onPress={() => nav.push('org', e.organizerName)} style={{ marginHorizontal: 20, marginTop: 10, padding: 14, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card }}><Text style={{ fontFamily: fonts.bold, color: t.text }}>{e.organizerName}</Text><Text style={{ fontFamily: fonts.semibold, color: t.accent, marginTop: 4 }}>View organizer profile</Text></Pressable>
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