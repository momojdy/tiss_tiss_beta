import { useGatherzActivity } from '../../features/gatherz/GatherzActivityContext';
import React, { useState } from 'react';
import { Alert, Pressable, Share, Text, TextInput, View } from 'react-native';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzTicketActionsScreen({ id, action }: { id: string; action: 'send' | 'claim' | 'rf' | 'dl' }) {
  const { repo, nav } = useGatherz();
  const activity = useGatherzActivity(); const t = useGatherzTheme();
  const [recipient, setRecipient] = useState(''); const [token, setToken] = useState(action === 'claim' ? id : '');
  const [recipientMode, setRecipientMode] = useState<'contact' | 'link'>('contact'); const [claimStatus, setClaimStatus] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const { data: ticket, error, loading, reload } = useLoad(async () => (await repo.listMyAdmissions()).find(a => a.id === id) ?? null, [repo, id]);
  const { data: transfers } = useLoad(async () => await repo.listDemoTransfers?.() ?? [], [repo]);
  const claimTransfer = transfers?.find(x => x.token === token.trim());
  const title = { send: 'Transfer Ticket', claim: 'Claim Ticket', rf: 'Request Refund', dl: 'Ticket Details' }[action];
  const run = async () => {
    setBusy(true); setMessage('');
    try {
      if (action === 'send') {
        if (!repo.createDemoTransfer) throw new Error('Transfer unavailable');
        const transfer = await repo.createDemoTransfer(id, recipient);
        setToken(transfer.token); setMessage('Transfer pending. Share the claim link with the recipient.'); activity.notify('transfers', 'Transfer pending', 'A demo transfer is awaiting acceptance.', 'ticket', id);
      } else if (action === 'claim') {
        if (!repo.claimDemoTransfer) throw new Error('Claim unavailable');
        await repo.claimDemoTransfer(token.trim()); setClaimStatus('accepted'); setMessage('Demo ticket accepted. The original credential was revoked.');
      } else if (action === 'rf') {
        if (!repo.requestDemoRefund) throw new Error('Refund unavailable');
        await repo.requestDemoRefund(id); setMessage('Demo admission marked refunded. No payment is returned.');
      }
      reload();
    } catch { setMessage('This action could not be completed. Please check the ticket status and try again.'); }
    finally { setBusy(false); }
  };
  const btn = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ marginTop: 12, borderRadius: 999, padding: 15, backgroundColor: disabled ? t.soft : t.accent, alignItems: 'center' }}><Text style={{ color: disabled ? t.mute : t.onAccent, fontFamily: fonts.bold }}>{label}</Text></Pressable>;
  return <Page><Header title={title} onBack={nav.back} />
    <View style={{ marginHorizontal: 20, gap: 8 }}>
      {loading ? <Notice loading body="Loading admission…" /> : null}
      {error ? <Notice title="Could not load ticket" body="Please try again." action="Retry" onAction={reload} /> : null}
      {!loading && !ticket && action !== 'claim' ? <Notice title="Ticket unavailable" body="Admission not found in this demo session." /> : null}
      {ticket ? <Text style={{ color: t.text, fontFamily: fonts.semibold }}>{ticket.tier.toUpperCase()} · {ticket.id} · {ticket.status.replace('_',' ')}</Text> : null}
      {action === 'send' && ticket?.status === 'valid' ? <>
        <Text style={{ color: t.mute }}>Send to a Wantiss contact or someone without Wantiss</Text>
        {btn('Wantiss contact' + (recipientMode === 'contact' ? ' ✓' : ''), () => setRecipientMode('contact'))}
        {btn('Someone without Wantiss · claim link' + (recipientMode === 'link' ? ' ✓' : ''), () => setRecipientMode('link'))}
        <TextInput value={recipient} onChangeText={setRecipient} placeholder="Recipient" placeholderTextColor={t.mute} style={{ color: t.text, backgroundColor: t.card, borderColor: t.line, borderWidth: 0.5, borderRadius: radius.card, padding: 14 }} />
        <Notice body="Transfers close two hours before the event. The QR stays hidden until accepted." />
        {btn(recipientMode === 'link' ? 'Create claim link' : 'Send demo transfer', run, busy || !recipient.trim())}
      </> : null}
      {action === 'send' && ticket?.status === 'pending_transfer' ? btn('Cancel pending transfer', async () => { try { await repo.cancelDemoTransfer?.(id); setMessage('Transfer canceled'); reload(); } catch (e) { setMessage('Could not cancel this transfer. Please try again.'); } }) : null}
      {action === 'claim' ? <>
        <Notice title={claimTransfer?.status === 'claimed' ? 'Already claimed' : claimTransfer?.status === 'canceled' ? 'Link revoked' : 'Ticket invitation'} body={claimTransfer ? 'Sent to ' + claimTransfer.recipient + ' · ' + claimTransfer.status : 'Open a demo claim link or enter its code. Invalid and expired links cannot be accepted.'} />
        <Text style={{ color: t.mute }}>Demo claim link or code</Text>
        <TextInput value={token} onChangeText={setToken} autoCapitalize="none" placeholder="DEMO-…" placeholderTextColor={t.mute} style={{ color: t.text, backgroundColor: t.card, borderColor: t.line, borderWidth: 0.5, borderRadius: radius.card, padding: 14 }} />
        {btn('Open in Wantiss (demo)', () => setClaimStatus('open'))}
        {btn('I do not have the app', () => setClaimStatus('install'))}
        {claimStatus === 'install' ? <Notice title="Install Wantiss and sign up" body="After creating an account, return to this claim link to resume." action="Resume claim" onAction={() => setClaimStatus('open')} /> : null}
        {btn('Accept ticket', run, busy || !token.trim() || claimTransfer?.status !== 'pending')}
        {claimStatus === 'accepted' ? btn('View my tickets', () => nav.tab('tickets')) : null}
      </> : null}
      {action === 'rf' && ticket?.status === 'valid' ? btn('Confirm demo refund', () => Alert.alert('Refund demo admission?', 'This revokes the demo credential. No money will be returned.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: run }]), busy) : null}
      {action === 'dl' && ticket ? <>
        <Notice title="Share demo pass details" body="Share the event and demo admission reference. This does not transfer ownership or create a valid ticket. For a safe handoff use Transfer ticket." />
        {btn('Share demo details', () => { Share.share({ message: 'Gatherz DEMO admission: ' + ticket.id + '\\nReference: ' + ticket.credentialCode + '\\nNOT VALID FOR ENTRY. Sharing does not transfer ownership.' }); })}
        {btn('Transfer ticket instead', () => nav.push('send', ticket.id), ticket.status !== 'valid')}
      </> : null}
      {token && action === 'send' ? btn('Share demo claim link', () => { Share.share({ message: 'Gatherz DEMO claim link: https://gatherz.link/claim/' + encodeURIComponent(token) + '. This is not a valid ticket.' }); }) : null}
      {message ? <Notice title="Demo status" body={message} /> : null}
      <Text style={{ color: t.mute, fontSize: 12, marginTop: 18 }}>All actions are local demo simulations. No messages, payments, or real tickets are issued.</Text>
    </View>
  </Page>;
}