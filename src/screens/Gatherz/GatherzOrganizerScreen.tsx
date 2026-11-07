import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Header, Notice, Page, SectionTitle } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzCommunity } from '../../features/gatherz/GatherzCommunityContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';

export default function GatherzOrganizerScreen({ id }: { id: string }) {
  const { repo, nav } = useGatherz();
  const community = useGatherzCommunity();
  const t = useGatherzTheme();
  const { data, loading, error, reload } = useLoad(async () => {
    const events = await repo.listEvents();
    const selected = events.filter(e => e.organizerName === id);
    return { events: selected, name: id };
  }, [repo, id]);
  const followed = community.savedOrganizers.includes(id);
  return <Page>
    <Header title={id || "Organizer"} subtitle="Public organizer profile" onBack={nav.back} />
    {loading ? <Notice loading body="Loading organizer…" /> : null}
    {error ? <Notice title="Organizer unavailable" body="Please try again." action="Try again" onAction={reload} /> : null}
    {data ? <>
      <View style={{ marginHorizontal: 20, padding: 18, backgroundColor: t.card, borderColor: t.line, borderWidth: 0.5, borderRadius: radius.card }}>
        <Text style={{ color: t.text, fontFamily: fonts.bold, fontSize: 24 }}>{data.name}</Text>
        <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 8 }}>{id === 'Skyline Collective' ? 'Live music, nightlife and city experiences.' : id === 'Riverside Events' ? 'Food festivals and community gatherings.' : id === 'Maison Arts' ? 'Art, culture and creative experiences.' : 'Discover upcoming experiences from this organizer.'}</Text>
        <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 8 }}>{data.events.length} upcoming {data.events.length === 1 ? 'event' : 'events'} in the demo catalog</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: followed }} onPress={() => community.toggleSavedOrganizer(id)} style={{ marginTop: 14, borderRadius: 99, borderWidth: 0.5, borderColor: t.accent, backgroundColor: followed ? t.soft : t.accent, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: followed ? t.accent : t.onAccent, fontFamily: fonts.bold }}>{followed ? 'Following ✓' : 'Follow organizer'}</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={() => nav.push('rp', 'host:' + id)} style={{ marginHorizontal: 20, marginTop: 12, padding: 12, alignSelf: 'flex-start' }}><Text style={{ color: t.accent, fontFamily: fonts.semibold }}>Report host</Text></Pressable>
      <SectionTitle title="Upcoming events" />
      {data.events.map(e => <Pressable key={e.id} accessibilityRole="button" onPress={() => nav.push('event', e.id)} style={{ marginHorizontal: 20, marginBottom: 10, padding: 16, borderRadius: radius.card, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card }}>
        <Text style={{ color: t.text, fontFamily: fonts.bold }}>{e.title}</Text>
        <Text style={{ color: t.mute, fontFamily: fonts.regular, marginTop: 6 }}>{e.venue} · {e.area}</Text>
      </Pressable>)}
      {!data.events.length ? <Notice title="No upcoming events" body="This organizer has no upcoming events in the demo catalog." /> : null}
    </> : null}
  </Page>;
}