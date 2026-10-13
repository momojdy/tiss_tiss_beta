import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type NotificationRow = {
  id: string; title: string | null; body: string | null; read: boolean | null;
  feature_name: string | null; notification_type?: string | null; destination?: string | null;
  metadata?: Record<string, unknown> | null; created_at: string;
};
const PINK = '#FBE8EF', MAGENTA = '#BF008E', INK = '#302631', MUTED = '#827783';
const FEATURE_COLORS: Record<string, string> = {
  wallet: '#24A148', flyz: '#2585E8', goodies: '#D88735', 'pumping goodies': '#D88735',
  frenzies: '#7DBD32', konsoliss: '#DDB52B', woulib: '#8D6CC8', general: MAGENTA,
};
const featureKey = (value?: string | null) => (value || 'general').trim().toLowerCase();
const featureColor = (value?: string | null) => FEATURE_COLORS[featureKey(value)] || MAGENTA;
const destinationFor = (n: NotificationRow): string | null => {
  const raw = (n.destination || String(n.metadata?.destination || '')).trim();
  const key = raw.toLowerCase() || featureKey(n.feature_name);
  const routes: Record<string, string> = { wallet: 'wallet', flyz: 'flyz', goodies: 'goodies', 'pumping goodies': 'goodies', frenzies: 'frenzies', konsoliss: 'konsoliss', woulib: 'woulib' };
  return routes[key] || routes[featureKey(n.feature_name)] || null;
};
export default function NotificationsScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate: (screen: string) => void }) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setItems([]); setLoading(false); setError('Sign in to view your notifications.'); return; }
    const { data, error: queryError } = await supabase.from('notifications')
      .select('id,title,body,read,feature_name,notification_type,destination,metadata,created_at')
      .eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(100);
    if (queryError) setError(queryError.message);
    else { setItems((data || []) as NotificationRow[]); setError(''); }
    setLoading(false);
  }, []);
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let alive = true;
    (async () => {
      await load();
      const { data } = await supabase.auth.getUser();
      if (!alive || !data.user) return;
      channel = supabase.channel('customer-notifications-' + data.user.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + data.user.id }, () => { void load(); })
        .subscribe();
    })();
    return () => { alive = false; if (channel) void supabase.removeChannel(channel); };
  }, [load]);
  const unread = useMemo(() => items.filter(n => !n.read).length, [items]);
  const markRead = async (n: NotificationRow) => {
    if (!n.read) {
      const { error: updateError } = await supabase.from('notifications').update({ read: true, updated_at: new Date().toISOString() }).eq('id', n.id);
      if (updateError) { setError(updateError.message); return; }
      setItems(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
    }
    const target = destinationFor(n);
    if (target) onNavigate(target);
  };
  const markAll = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || unread === 0) return;
    const { error: updateError } = await supabase.from('notifications').update({ read: true, updated_at: new Date().toISOString() }).eq('user_id', auth.user.id).eq('read', false);
    if (updateError) setError(updateError.message);
    else setItems(prev => prev.map(n => ({ ...n, read: true })));
  };
  return <View style={s.root}>
    <View style={s.header}>
      <Pressable onPress={onBack} hitSlop={12} style={s.back}><MaterialCommunityIcons name="arrow-left" size={23} color={INK}/></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>Notifications</Text><Text style={s.subtitle}>{unread ? unread + ' unread updates' : 'You’re all caught up'}</Text></View>
      {unread > 0 && <Pressable onPress={markAll}><Text style={s.markAll}>Read all</Text></Pressable>}
    </View>
    {loading ? <View style={s.center}><ActivityIndicator color={MAGENTA}/><Text style={s.emptyText}>Loading your notifications…</Text></View> :
      error ? <View style={s.center}><MaterialCommunityIcons name="alert-circle-outline" size={32} color={MAGENTA}/><Text style={s.emptyText}>{error}</Text><Pressable onPress={() => { setLoading(true); void load(); }} style={s.retry}><Text style={s.retryText}>Try again</Text></Pressable></View> :
      <ScrollView contentContainerStyle={s.list}>
        {items.length === 0 ? <View style={s.center}><View style={s.emptyIcon}><MaterialCommunityIcons name="bell-outline" size={30} color={MAGENTA}/></View><Text style={s.emptyTitle}>Nothing new yet</Text><Text style={s.emptyText}>Updates from your Wantiss features will appear here.</Text></View> :
          items.map(n => <Pressable key={n.id} onPress={() => void markRead(n)} style={[s.card, !n.read && s.unreadCard]}>
            <View style={[s.featureIcon, { backgroundColor: featureColor(n.feature_name) + '1B' }]}><MaterialCommunityIcons name="bell-outline" size={21} color={featureColor(n.feature_name)}/></View>
            <View style={{ flex: 1 }}><View style={s.cardTitleRow}><Text style={s.cardTitle}>{n.title || 'Wantiss update'}</Text>{!n.read && <View style={[s.unreadDot, { backgroundColor: featureColor(n.feature_name) }]}/>}</View>
              {!!n.body && <Text style={s.body}>{n.body}</Text>}
              <Text style={s.meta}>{(n.feature_name || 'Wantiss').replace(/^./, c => c.toUpperCase())} · {new Date(n.created_at).toLocaleString()}</Text>
              {destinationFor(n) && <Text style={s.openLabel}>Tap to open <MaterialCommunityIcons name="chevron-right" size={13} color={MAGENTA}/></Text>}
            </View>
          </Pressable>)}
      </ScrollView>}
  </View>;
}
const s = StyleSheet.create({
 root:{flex:1,backgroundColor:'#FFF'},header:{minHeight:86,paddingHorizontal:18,paddingTop:14,paddingBottom:14,backgroundColor:PINK,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#F0D7E4'},
 back:{width:38,height:38,alignItems:'center',justifyContent:'center',marginRight:8},title:{fontSize:21,fontWeight:'700',color:INK},subtitle:{fontSize:12,color:MUTED,marginTop:3},markAll:{color:MAGENTA,fontSize:12,fontWeight:'700',padding:8},
 list:{padding:14,paddingBottom:30},card:{flexDirection:'row',padding:14,borderRadius:14,backgroundColor:'#FFF',borderWidth:1,borderColor:'#F0E8ED',marginBottom:10,gap:12},unreadCard:{backgroundColor:'#FFFAFC',borderColor:'#EBC9DC'},
 featureIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},cardTitleRow:{flexDirection:'row',alignItems:'center',gap:8},cardTitle:{flex:1,fontSize:14,fontWeight:'700',color:INK},body:{fontSize:13,lineHeight:19,color:'#655B66',marginTop:5},meta:{fontSize:10,color:MUTED,marginTop:8},unreadDot:{width:7,height:7,borderRadius:4},openLabel:{fontSize:11,color:MAGENTA,fontWeight:'600',marginTop:7},
 center:{flex:1,alignItems:'center',justifyContent:'center',padding:28},emptyIcon:{width:62,height:62,borderRadius:22,backgroundColor:PINK,alignItems:'center',justifyContent:'center',marginBottom:14},emptyTitle:{fontSize:17,fontWeight:'700',color:INK},emptyText:{fontSize:13,color:MUTED,textAlign:'center',marginTop:8,lineHeight:19},retry:{marginTop:14,backgroundColor:MAGENTA,borderRadius:10,paddingHorizontal:18,paddingVertical:10},retryText:{color:'#FFF',fontWeight:'700'}
});
