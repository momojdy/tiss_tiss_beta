import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { qrPayload } from '../../lib/gatherz/rules';
import GatherzPassV2 from '../../components/gatherz/GatherzPassV2';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';

import { Header, Notice, Page } from '../../components/gatherz/shared';
export default function GatherzTicketScreen({ id }: { id: string }) {
  const t = useGatherzTheme(); const { repo, nav } = useGatherz();
  const [scanMode, setScanMode] = useState(false);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const strapLength = Math.max(80, Math.min(screenH * 0.15, 130));
  const cardHeight = Math.max(Math.min(screenH - strapLength - 22 - 175, Math.min(300, screenW * 0.74) * 1.5), 300);
  const cardBottom = 34 + strapLength + 22 + cardHeight - 26;
  const { data, error, loading, reload } = useLoad(async () => { const a = (await repo.listMyAdmissions()).find(x => x.id === id); return a ? { a, e: await repo.getEvent(a.eventId) } : null; }, [repo, id]);
  if (loading) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice loading body="Loading ticket…" /></Page>;
  if (error) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice title="Ticket could not load" body="Please try again." action="Try again" onAction={reload} /></Page>;
  if (!data || !data.e) return <Page><Header title="Ticket Details" onBack={nav.back} /><Notice title="Ticket not found" body="It may have been transferred or refunded." action="Back to tickets" onAction={() => nav.tab('tickets')} /></Page>;
  const { a, e } = data, usable = a.status === 'valid' || a.status === 'checked_in';
  return (
    <Page>
      <Header title="Ticket Details" onBack={nav.back} />

      {usable ? <GatherzPassV2 admission={a} event={e} scanMode={scanMode} onCloseScan={() => setScanMode(false)} /> : <Notice title="This ticket cannot be used for entry" body={`Status: ${a.status.replace('_', ' ')}`} />}
      {!scanMode && (
        <View style={{ paddingHorizontal: 12, marginTop: cardBottom + 25 - screenH, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'space-between' }}>
            {([
              { icon: 'paper-plane-outline', label: 'Transfer', route: 'send', target: a.id },
              { icon: 'return-down-back-outline', label: 'Refund', route: 'rf', target: a.id },
              { icon: 'download-outline', label: 'Save', route: 'dl', target: a.id },
              { icon: 'calendar-outline', label: 'Event', route: 'event', target: e.id },
              { icon: 'receipt-outline', label: 'Order', route: 'grp', target: a.orderId },
            ] as const).map(item => (
              <Pressable key={item.route} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => nav.push(item.route, item.target)}
                style={{ flex: 1, minWidth: 0, height: 54, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Ionicons name={item.icon} size={18} color={t.text} />
                <Text numberOfLines={1} style={{ color: t.text, fontFamily: fonts.semibold, fontSize: 9 }}>{item.label}</Text>
              </Pressable>
            ))}
            {usable && (
              <Pressable accessibilityRole="button" accessibilityLabel="Show entry QR code" onPress={() => setScanMode(true)}
                style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
                <QRCode value={qrPayload(a)} size={36} color={t.text} backgroundColor="transparent" />
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Page>
  );
}