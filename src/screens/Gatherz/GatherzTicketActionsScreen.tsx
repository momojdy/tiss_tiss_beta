import React, { useState } from 'react';
import { Alert, Pressable, Share, Text, TextInput, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzTicketActionsScreen({ id, action }: { id: string; action: 'send' | 'claim' | 'rf' | 'dl' }) {
  const { repo, nav } = useGatherz(); const t = useGatherzTheme();
  const [recipient, setRecipient] = useState(''); const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const { data: ticket, error, loading, reload } = useLoad(async () => (await repo.listMyAdmissions()).find(a => a.id === id) ?? null, [repo, id]);
  const title = { send: 'Transfer Ticket', claim: 'Claim Ticket', rf: 'Request Refund', dl: 'Ticket Details' }[action];
  const run = async () => {
    setBusy(true); setMessage('');
    try {
      if (action === 'send') {
        if (!repo.createDemoTransfer) throw new Error('Transfer unavailable');
        const transfer = await repo.createDemoTransfer(id, recipient);
        setToken(transfer.token); setMessage('Transfer created. Share the demo claim code with the recipient.');
      } else if (action === 'claim') {
        if (!repo.claimDemoTransfer) throw new Error('Claim unavailable');
        await repo.claimDemoTransfer(token.trim()); setMessage('Demo transfer claimed. The original credential is revoked.');
      } else if (action === 'rf') {
        if (!repo.requestDemoRefund) throw new Error('Refund unavailable');
        await repo.requestDemoRefund(id); setMessage('Demo admission marked refunded. No payment is returned.');
      }
      reload();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };
  const btn = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ marginTop: 12, borderRadius: 999, padding: 15, backgroundColor: disabled ? t.soft : t.accent, alignItems: 'center' }}><Text style={{ color: disabled ? t.mute : t.onAccent, fontFamily: fonts.bold }}>{label}</Text></Pressable>;
  return <Page><Header title={title} onBack={nav.back} />
    <View style={{ marginHorizontal: 20, gap: 8 }}>
      {loading ? <Notice loading body="Loading admission…" /> : null}
      {error ? <Notice title="Could not load ticket" body={error} action="Retry" onAction={reload} /> : null}
      {!loading && !ticket && action !== 'claim' ? <Notice title="Ticket unavailable" body="Admission not found in this demo session." /> : null}
      {ticket ? <Text style={{ color: t.text, fontFamily: fonts.semibold }}>{ticket.tier.toUpperCase()} · {ticket.id} · {ticket.status.replace('_',' ')}</Text> : null}
      {action === 'send' && ticket?.status === 'valid' ? <>
        <Text style={{ color: t.mute }}>Recipient email or name (demo only)</Text>
        <TextInput value={recipient} onChangeText={setRecipient} placeholder="Recipient" placeholderTextColor={t.mute} style={{ color: t.text, backgroundColor: t.card, borderColor: t.line, borderWidth: 0.5, borderRadius: radius.card, padding: 14 }} />
        {btn('Create demo transfer', run, busy || !recipient.trim())}
      </> : null}
      {action === 'send' && ticket?.status === 'pending_transfer' ? btn('Cancel pending transfer', async () => { try { await repo.cancelDemoTransfer?.(id); setMessage('Transfer canceled'); reload(); } catch (e) { setMessage(String(e)); } }) : null}
      {action === 'claim' ? <>
        <Text style={{ color: t.mute }}>Enter a demo claim code</Text>
        <TextInput value={token} onChangeText={setToken} autoCapitalize="none" placeholder="DEMO-…" placeholderTextColor={t.mute} style={{ color: t.text, backgroundColor: t.card, borderColor: t.line, borderWidth: 0.5, borderRadius: radius.card, padding: 14 }} />
        {btn('Claim demo ticket', run, busy || !token.trim())}
      </> : null}
      {action === 'rf' && ticket?.status === 'valid' ? btn('Confirm demo refund', () => Alert.alert('Refund demo admission?', 'This revokes the demo credential. No money will be returned.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: run }]), busy) : null}
      {action === 'dl' && ticket ? <Notice title="Demo pass" body="A valid downloadable ticket file is not available without a verified admission backend. Open Ticket Details to view the on-screen demo pass." /> : null}
      {token && action === 'send' ? btn('Share demo claim code', () => { Share.share({ message: 'Gatherz DEMO claim code: ' + token + '. This is not a valid ticket.' }); }) : null}
      {message ? <Notice title="Demo status" body={message} /> : null}
      <Text style={{ color: t.mute, fontSize: 12, marginTop: 18 }}>All actions are local demo simulations. No messages, payments, or real tickets are issued.</Text>
    </View>
  </Page>;
}