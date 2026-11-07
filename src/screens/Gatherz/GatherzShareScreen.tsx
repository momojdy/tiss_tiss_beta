import React, { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Header, Notice, Page, Art } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
export default function GatherzShareScreen({ id }: { id: string }) {
 const { repo, nav } = useGatherz(); const t = useGatherzTheme();
 const { data: event, loading } = useLoad(() => repo.getEvent(id), [repo,id]);
 const [sent,setSent] = useState(false);
 const link = 'https://gatherz.link/e/' + encodeURIComponent(id);
 const btn = (label:string, action:()=>void) => <Pressable accessibilityRole="button" onPress={action} style={{ backgroundColor:t.accent, borderRadius:999, padding:15, marginTop:12, alignItems:'center' }}><Text style={{ color:t.onAccent, fontFamily:fonts.semibold }}>{label}</Text></Pressable>;
 return <Page><Header title="Share event" /><View style={{ marginHorizontal:20 }}>
 {loading ? <Notice loading body="Loading event…" /> : event ? <>
 <View style={{ borderWidth:0.5, borderColor:t.line, borderRadius:radius.card, backgroundColor:t.card, overflow:'hidden' }}>
 <Art index={event.art} style={{ height:150 }} />
 <View style={{ padding:16, gap:5 }}><Text style={{ color:t.text, fontFamily:fonts.bold, fontSize:20 }}>{event.title}</Text><Text style={{ color:t.mute }}>{new Date(event.startsAt).toLocaleString()} · {event.venue}</Text></View></View>
 <Text selectable style={{ color:t.mute, marginTop:18 }}>{link}</Text>
 {btn('Copy event link', () => { void Clipboard.setStringAsync(link); setSent(true); })}
 {btn('Share event', () => { void Share.share({ message:event.title + '\\n' + link }); })}
 {btn('Send in Wantiss Messages (demo)', () => { setSent(true); nav.push('msgs'); })}
 {sent ? <Notice title="Ready to share" body="The demo link is available. No real Wantiss message was delivered." /> : null}
 <Notice title="Your QR stays private" body="Sharing an event never includes your ticket QR or transfers ownership." />
 </> : <Notice title="Event not found" action="Go back" onAction={nav.back} />}
 </View></Page>;
}
