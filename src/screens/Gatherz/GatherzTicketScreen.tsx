import React from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { qrPayload } from '../../lib/gatherz/rules';
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
      {usable ? <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={{ padding: 16, borderRadius: radius.card, backgroundColor: '#C9C2E3' }}><QRCode value={qrPayload(a)} size={200} color="#0E0B1D" backgroundColor="#C9C2E3" /></View>
        <Text style={{ fontFamily: fonts.bold, color: '#C2415C', marginTop: 12 }}>DEMO · NOT VALID FOR ENTRY</Text>
        <Text style={{ fontFamily: fonts.regular, color: t.mute, marginTop: 4 }}>Admission {a.credentialCode}</Text>
      </View> : <Notice title="This ticket cannot be used for entry" body={`Status: ${a.status.replace('_', ' ')}`} />}
    </Page>
  );
}