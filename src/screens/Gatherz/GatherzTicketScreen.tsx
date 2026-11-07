import React from 'react';
import { Text, View } from 'react-native';
import GatherzPassV2 from '../../components/gatherz/GatherzPassV2';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';

import { Header, Notice, Page, TicketFront } from '../../components/gatherz/shared';
export default function GatherzTicketScreen({ id }: { id: string }) {
  const t = useGatherzTheme(); const { repo, nav } = useGatherz();
  const { data, error, loading, reload } = useLoad(async () => { const a = (await repo.listMyAdmissions()).find(x => x.id === id); return a ? { a, e: await repo.getEvent(a.eventId) } : null; }, [repo, id]);
  if (loading) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice loading body="Loading ticket…" /></Page>;
  if (error) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice title="Ticket could not load" body={error} action="Try again" onAction={reload} /></Page>;
  if (!data || !data.e) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice title="Ticket not found" body="It may have been transferred or refunded." action="Back to tickets" onAction={() => nav.tab('tickets')} /></Page>;
  const { a, e } = data, usable = a.status === 'valid' || a.status === 'checked_in';
  return (
    <Page>
      <Header title="Ticket Details" onBack={nav.back} />
      <View style={{ paddingHorizontal: 20 }}><TicketFront admission={a} event={e} width="100%" onPress={() => undefined} /></View>
      {usable ? <GatherzPassV2 admission={a} event={e} /> : <Notice title="This ticket cannot be used for entry" body={`Status: ${a.status.replace('_', ' ')}`} />}
    </Page>
  );
}