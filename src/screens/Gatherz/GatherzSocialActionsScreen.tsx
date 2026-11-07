import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useGatherzCommunity } from '../../features/gatherz/GatherzCommunityContext';
import { demoCircles } from '../../data/gatherz/communityDemo';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { useLoad } from '../../lib/gatherz/useLoad';
type Mode = 'mp' | 'mv' | 'pst' | 'inv' | 'rp' | 'mem';
export default function GatherzSocialActionsScreen({ mode, id }: { mode: Mode; id: string }) {
  const { repo, nav } = useGatherz(); const c = useGatherzCommunity(); const t = useGatherzTheme();
  const [text, setText] = useState(''); const [uri, setUri] = useState(''); const [publicPhoto, setPublicPhoto] = useState(true); const [notice, setNotice] = useState('');
  const { data: admissions } = useLoad(() => repo.listMyAdmissions(), [repo]);
  const moment = c.moments.find(m => m.id === id), post = c.posts.find(p => p.id === id), circle = demoCircles.find(x => x.id === id);
  const eligible = (admissions ?? []).some(a => a.eventId === id && a.status === 'checked_in');
  const count = c.moments.filter(m => m.eventId === id && m.owner === 'me').length;
  const joined = c.joinedCircles.includes(id);
  const title = { mp: 'Upload Moment', mv: 'Moment', pst: 'Post & replies', inv: 'Invitations', rp: 'Report', mem: 'Members' }[mode];
  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={{ marginTop: 12, backgroundColor: disabled ? t.soft : t.accent, padding: 14, borderRadius: 999, alignItems: 'center' }}><Text style={{ color: disabled ? t.mute : t.onAccent, fontFamily: fonts.bold }}>{label}</Text></Pressable>;
  const input = (placeholder: string) => <TextInput multiline value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor={t.mute} style={{ minHeight: 55, color: t.text, padding: 14, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.line, borderRadius: radius.card, textAlignVertical: 'top' }} />;
  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setNotice('Photo library permission is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: .85 });
    if (!result.canceled && result.assets[0]?.uri) setUri(result.assets[0].uri);
  };
  return <Page><Header title={title} onBack={nav.back} /><View style={{ marginHorizontal: 20, gap: 10 }}>
    {mode === 'mp' ? eligible ? <>
      <Notice title={'Photos: ' + count + '/3'} body="Only checked-in attendees may add photos. Images stay on this device during the demo session." />
      {count < 3 ? <>{uri ? <Image source={{ uri }} style={{ width: '100%', height: 220, borderRadius: radius.card }} /> : null}
        {button(uri ? 'Change photo' : 'Select photo', pick)}
        {input('Optional caption')}
        {button(publicPhoto ? 'Visibility: Public' : 'Visibility: Private', () => setPublicPhoto(v => !v))}
        {button('Publish photo', () => { if (!uri || count >= 3) return; c.addMoment(id, text.trim(), publicPhoto, uri); nav.tab('moments'); }, !uri)}
      </> : <Notice title="Photo limit reached" body="Delete one of your three photos to add another." />}
    </> : <Notice title="Check-in required" body="Only checked-in attendees can publish event photos." /> : null}
    {mode === 'mv' ? moment ? <>
      {moment.uri ? <Image source={{ uri: moment.uri }} style={{ width: '100%', height: 320, borderRadius: radius.card }} resizeMode="contain" /> : null}
      <Text style={{ color: t.text, fontFamily: fonts.semibold }}>{moment.caption}</Text>
      <Text style={{ color: t.mute }}>{moment.public ? 'Public' : 'Private'} · {moment.owner}</Text>
      {moment.owner === 'me' ? <>{button(moment.public ? 'Make private' : 'Make public', () => c.setMomentVisibility(id, !moment.public))}
        {button('Delete photo', () => Alert.alert('Delete moment?', 'This cannot be undone.', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { c.removeMoment(id); nav.back(); } }]))}</> : null}
      {button('Report moment', () => nav.push('rp', 'moment:' + id))}
    </> : <Notice title="Moment not found" /> : null}
    {mode === 'pst' ? post ? <>
      <Notice title={post.author} body={post.text} />
      {post.replies.map(r => <Notice key={r.id} title={r.author} body={r.text} />)}
      {input('Write a reply')}
      {button('Reply', () => { if (!text.trim()) return; c.addReply(id, text.trim()); setText(''); }, !text.trim())}
      {button('Report post', () => nav.push('rp', 'post:' + id))}
    </> : <Notice title="Post not found" /> : null}
    {mode === 'inv' ? circle ? <>
      <Notice title={circle.name} body="Create a demo invitation. No external message is sent." />
      {joined ? <>{input('Invitee name or email')}{button('Create invitation', () => { if (!text.trim()) return; c.invite(id, text.trim()); setText(''); setNotice('Invitation created locally.'); }, !text.trim())}</> : <Notice title="Members only" body="Join this circle to invite someone." />}
      {c.invitations.filter(i => i.circleId === id).map(i => <View key={i.id}>
        <Notice title={i.recipient} body={'Invitation ' + i.status} />
        {i.status === 'pending' ? <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={() => c.respondInvitation(i.id, true)} style={{ padding: 12, borderRadius: 999, borderWidth: 0.5, borderColor: t.line }}><Text style={{ color: t.text }}>Accept (demo)</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => c.respondInvitation(i.id, false)} style={{ padding: 12, borderRadius: 999, borderWidth: 0.5, borderColor: t.line }}><Text style={{ color: t.text }}>Decline (demo)</Text></Pressable>
        </View> : null}
      </View>)}
    </> : <Notice title="Circle not found" /> : null}
    {mode === 'mem' ? circle ? <>
      <Notice title={circle.name} body={circle.members + ' members · Demo member directory'} />
      <Notice title="Circle organizer" body="Host · Demo profile" />
      {joined ? <Notice title="You" body="Member · Current demo user" /> : null}
      {button('Report member', () => nav.push('rp', 'member:host-' + id))}
    </> : <Notice title="Circle not found" /> : null}
    {mode === 'rp' ? <>
      <Notice title="Report content" body="Select a reason. This report is saved in demo memory only; it is not sent to moderators." />
      {['Spam', 'Harassment', 'Inappropriate content', 'Other'].map(reason => button(reason, () => { const [type, ...rest] = id.split(':'); if (type !== 'post' && type !== 'member' && type !== 'moment') { setNotice('Choose a post, member, or moment to report.'); return; } c.report(type, rest.join(':'), reason); setNotice('Demo report recorded.'); }))}
    </> : null}
    {notice ? <Notice title="Status" body={notice} /> : null}
  </View></Page>;
}
