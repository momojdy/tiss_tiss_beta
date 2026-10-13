import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type Profile = {
  owner_user_id?: string; display_name?: string | null; wantiss_number?: string | null;
  avatar_url?: string | null; bio?: string | null; membership_tier?: string | null;
  membership_visibility?: 'public' | 'private'; frenzies_rank?: number | null;
  frenzies_rank?: number | null;
  frenzies?: { rank?: number; lifetime_points?: number; total_games_played?: number; total_games_won?: number; current_win_streak?: number; best_win_streak?: number; rank?: number };
};
type Moment = { id: string; media_url: string; display_url?: string; media_type: 'image' | 'video'; caption: string; created_at: string };

export default function PublicBuyerProfileScreen({ profile, onBack, onOpenMoments, onPrivacyPress }: { profile: Profile; onBack: () => void; onOpenMoments?: (userId: string, name: string) => void; onPrivacyPress?: () => void }) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [friendState, setFriendState] = useState<'none'|'pending-sent'|'pending-received'|'friends'>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendBusy, setFriendBusy] = useState(false);
  const name = profile.display_name?.trim() || 'Wantiss member';
  const stats = profile.frenzies ?? {};
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || 'W';
  const isSelf = !!viewerId && viewerId === profile.owner_user_id;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!active) return;
        const current = auth.user?.id ?? null;
        setViewerId(current);
        if (profile.owner_user_id && current && current !== profile.owner_user_id) {
          const { data } = await supabase.from('user_friendships').select('id,requester_id,recipient_id,status')
            .or('and(requester_id.eq.' + current + ',recipient_id.eq.' + profile.owner_user_id + '),and(requester_id.eq.' + profile.owner_user_id + ',recipient_id.eq.' + current + ')').maybeSingle();
          if (active && data) {
            setFriendshipId(data.id);
            setFriendState(data.status === 'accepted' ? 'friends' : data.status === 'pending' ? (data.requester_id === current ? 'pending-sent' : 'pending-received') : 'none');
          }
        }
        if (profile.owner_user_id) {
          const { data: items } = await supabase.from('flyz_moments').select('id,media_url,media_type,caption,created_at')
            .eq('user_id', profile.owner_user_id).order('created_at', { ascending: false }).limit(6);
          if (active) { const rows=(items ?? []) as Moment[]; const signed=await Promise.all(rows.map(async item=>{const {data:media}=await supabase.storage.from('flyz-moments').createSignedUrl(item.media_url,3600);return {...item,display_url:media?.signedUrl};})); setMoments(signed); }
        }
      } catch { /* Optional sections must not block the basic profile. */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [profile.owner_user_id]);

  const addFriend = async () => {
    if (!profile.owner_user_id || !viewerId || isSelf) {
      if (!viewerId) Alert.alert('Sign in to connect', 'Sign in to send a friend request.');
      return;
    }
    setFriendBusy(true);
    try {
      if (friendState === 'pending-received' && friendshipId) {
        const { error } = await supabase.from('user_friendships').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', friendshipId);
        if (error) throw error;
        setFriendState('friends');
        Alert.alert('You are connected', 'Friend request accepted.');
      } else if (friendState === 'none') {
        const { data, error } = await supabase.from('user_friendships').insert({ requester_id: viewerId, recipient_id: profile.owner_user_id, status: 'pending' }).select('id').single();
        if (error) throw error;
        setFriendshipId(data.id); setFriendState('pending-sent');
      }
    } catch (error) { Alert.alert('Could not connect', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setFriendBusy(false); }
  };

  return <View style={styles.page}>
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back"><Ionicons name="chevron-back" size={23} color="#302536" /></Pressable>
      <Text style={styles.headerTitle}>Wantiss profile</Text><View style={{ flex: 1 }} />
      {isSelf ? <Pressable onPress={onPrivacyPress} style={styles.headerMark} accessibilityLabel="Profile privacy"><Ionicons name="settings-outline" size={17} color="#B85D91" /></Pressable> : <View style={styles.headerMark}><Ionicons name="sparkles" size={17} color="#B85D91" /></View>}
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.coverGlow} />
        <View style={styles.avatarRing}>{profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <View style={styles.avatarFallback}><Text style={styles.initials}>{initials}</Text></View>}</View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.wantissId}>{profile.wantiss_number ? 'WANTISS ID · ' + profile.wantiss_number : 'WANTISS MEMBER'}</Text>
        {profile.bio?.trim() ? <Text style={styles.bio}>{profile.bio.trim()}</Text> : <Text style={styles.bioHint}>A little hello goes a long way. Connect and get to know each other.</Text>}
        {profile.membership_visibility === 'public' && profile.membership_tier ? <View style={styles.tierPill}><Ionicons name="ribbon" size={17} color="#8E5B19" /><Text style={styles.tierText}>{profile.membership_tier} member</Text><Ionicons name="sparkles" size={13} color="#8E5B19" /></View> : <View style={styles.privatePill}><Ionicons name="shield-checkmark-outline" size={14} color="#7E7182" /><Text style={styles.privateText}>{profile.membership_visibility === 'public' ? 'Membership tier not set yet' : 'Membership kept private'}</Text></View>}
        {!isSelf ? <Pressable onPress={addFriend} disabled={friendBusy || friendState === 'friends' || friendState === 'pending-sent'} style={[styles.addButton, (friendBusy || friendState === 'friends' || friendState === 'pending-sent') && styles.addButtonMuted]}>
          {friendBusy ? <ActivityIndicator color="#FFF" /> : <Ionicons name={friendState === 'friends' ? 'checkmark-circle' : friendState === 'pending-sent' ? 'time-outline' : friendState === 'pending-received' ? 'person-add' : 'person-add-outline'} size={19} color="#FFF" />}
          <Text style={styles.addButtonText}>{friendState === 'friends' ? 'You’re friends' : friendState === 'pending-sent' ? 'Request sent' : friendState === 'pending-received' ? 'Accept friend request' : 'Add friend'}</Text>
        </Pressable> : null}
      </View>
      <View style={styles.quickRow}>
        <View style={styles.quickItem}><View style={[styles.quickIcon,{backgroundColor:'#FCE7F2'}]}><Ionicons name="game-controller-outline" size={19} color="#B72A7B" /></View><Text style={styles.quickLabel}>Frenzies</Text></View>
        <View style={styles.quickItem}><View style={[styles.quickIcon,{backgroundColor:'#E8F2FF'}]}><MaterialCommunityIcons name="star-four-points-outline" size={19} color="#315AA6" /></View><Text style={styles.quickLabel}>Moments</Text></View>
        <View style={styles.quickItem}><View style={[styles.quickIcon,{backgroundColor:'#EAF5E9'}]}><Ionicons name="people-outline" size={19} color="#477E4A" /></View><Text style={styles.quickLabel}>Friends</Text></View>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Frenzies</Text><Text style={styles.sectionSub}>Their game journey</Text></View><View style={styles.sectionIcon}><Ionicons name="game-controller-outline" size={19} color="#B72A7B" /></View></View>
        {Number(profile.frenzies_rank ?? stats.rank ?? 0) > 0 ? <View style={styles.rankPill}><Ionicons name="trophy-outline" size={15} color="#8E5B19"/><Text style={styles.rankText}>Frenzies rank #{profile.frenzies_rank ?? stats.rank}</Text></View> : null}{Number(stats.total_games_played ?? 0) > 0 ? <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{Number(stats.total_games_won ?? 0)}</Text><Text style={styles.statLabel}>WINS</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{Number(stats.total_games_played ?? 0)}</Text><Text style={styles.statLabel}>GAMES</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{Number(stats.lifetime_points ?? 0).toLocaleString()}</Text><Text style={styles.statLabel}>POINTS</Text></View>
        </View> : <View style={styles.emptyRow}><View style={styles.emptyIcon}><Ionicons name="game-controller-outline" size={22} color="#B72A7B" /></View><View style={{flex:1}}><Text style={styles.emptyTitle}>Their next win could be the first</Text><Text style={styles.emptyText}>No public Frenzies stats yet. Invite them to play!</Text></View></View>}
        {Number(stats.current_win_streak ?? 0) > 0 ? <Text style={styles.streak}><Ionicons name="flame" size={14} color="#D86B35" />  {stats.current_win_streak} win streak · best {stats.best_win_streak ?? stats.current_win_streak}</Text> : null}
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Frenzies livestreams</Text><Text style={styles.sectionSub}>Live games and shared replays</Text></View><View style={[styles.sectionIcon,{backgroundColor:'#FFF0F0'}]}><Ionicons name="videocam-outline" size={19} color="#C04C65" /></View></View>
        <View style={styles.liveEmpty}><View style={styles.liveIcon}><Ionicons name="radio-outline" size={20} color="#C04C65" /></View><View style={{flex:1}}><Text style={styles.emptyTitle}>No public livestreams right now</Text><Text style={styles.emptyText}>If they share a Frenzies stream or replay, it can appear here.</Text></View></View>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Flyz Moments</Text><Text style={styles.sectionSub}>Little highlights worth sharing</Text></View><Pressable onPress={() => profile.owner_user_id && onOpenMoments?.(profile.owner_user_id, name)}><Text style={styles.viewAll}>View all ›</Text></Pressable></View>
        {loading ? <ActivityIndicator color="#B85D91" style={{padding:22}} /> : moments.length ? <View style={styles.momentGrid}>{moments.slice(0,4).map(moment => <Pressable key={moment.id} style={styles.momentTile} onPress={() => profile.owner_user_id && onOpenMoments?.(profile.owner_user_id, name)}>{moment.media_type === 'image' ? <Image source={{uri:moment.display_url}} style={styles.momentImage} /> : <View style={styles.videoTile}><Ionicons name="play-circle" size={34} color="#FFF" /></View>}<View style={styles.momentOverlay}><Ionicons name={moment.media_type === 'video' ? 'videocam' : 'heart'} size={13} color="#FFF" /><Text numberOfLines={2} style={styles.momentCaption}>{moment.caption || 'A Flyz moment'}</Text></View></Pressable>)}</View> : <View style={styles.momentsEmpty}><View style={styles.emptyIcon}><Ionicons name="sparkles-outline" size={22} color="#315AA6" /></View><Text style={styles.emptyTitle}>Their story is just beginning</Text><Text style={styles.emptyText}>When they share a Moment on Flyz, their highlights can show up here.</Text></View>}
      </View>
      <View style={styles.footerNote}><Ionicons name="lock-closed-outline" size={16} color="#B85D91" /><Text style={styles.footerText}>Only information allowed by their privacy settings is shown here.</Text></View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
 page:{flex:1,backgroundColor:'#FFF8FC'}, header:{height:100,paddingHorizontal:14,paddingBottom:10,flexDirection:'row',alignItems:'flex-end',backgroundColor:'#FFF',borderBottomWidth:1,borderBottomColor:'#F0E5EC'},
 back:{width:38,height:38,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#FCE8F3'}, headerTitle:{fontSize:17,fontWeight:'700',color:'#302536',marginLeft:8,paddingBottom:8},
 headerMark:{width:34,height:34,borderRadius:17,backgroundColor:'#FFF0F7',alignItems:'center',justifyContent:'center',marginBottom:2}, content:{padding:16,paddingBottom:38,gap:14},
 hero:{alignItems:'center',padding:23,borderRadius:24,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E8B7D1',overflow:'hidden'}, coverGlow:{position:'absolute',top:0,left:0,right:0,height:105,backgroundColor:'#FFE2F0',borderBottomLeftRadius:70,borderBottomRightRadius:70},
 avatarRing:{width:94,height:94,borderRadius:47,padding:4,backgroundColor:'#FFF',borderWidth:2,borderColor:'#E8B7D1',marginTop:7}, avatarImage:{width:'100%',height:'100%',borderRadius:44},
 avatarFallback:{flex:1,borderRadius:44,alignItems:'center',justifyContent:'center',backgroundColor:'#F7D5E7'}, initials:{fontSize:27,fontWeight:'800',color:'#A52672'},
 name:{marginTop:15,fontSize:24,fontWeight:'800',color:'#302536',textAlign:'center'}, wantissId:{marginTop:6,fontSize:10,fontWeight:'800',letterSpacing:1,color:'#A14D80'},
 bio:{marginTop:12,fontSize:13,lineHeight:19,color:'#625464',textAlign:'center'}, bioHint:{marginTop:12,fontSize:12,lineHeight:18,color:'#958797',textAlign:'center',maxWidth:270},
 tierPill:{marginTop:14,flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:13,paddingVertical:8,borderRadius:99,backgroundColor:'#FFF1D9',borderWidth:1,borderColor:'#F1D29D'}, tierText:{fontSize:12,fontWeight:'800',color:'#805017'},
 privatePill:{marginTop:14,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:11,paddingVertical:7,borderRadius:99,backgroundColor:'#F5F1F5'}, privateText:{fontSize:11,fontWeight:'600',color:'#7E7182'},
 addButton:{marginTop:18,minHeight:46,paddingHorizontal:24,borderRadius:14,backgroundColor:'#C2007A',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,minWidth:190}, addButtonMuted:{backgroundColor:'#9B8B99'}, addButtonText:{fontSize:14,fontWeight:'800',color:'#FFF'},
 quickRow:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:4}, quickItem:{alignItems:'center',gap:6,width:'32%'}, quickIcon:{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center'}, quickLabel:{fontSize:11,fontWeight:'700',color:'#706274'},
 section:{padding:16,borderRadius:20,backgroundColor:'#FFF',borderWidth:1,borderColor:'#F0E2EC',gap:13}, sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, sectionTitle:{fontSize:18,fontWeight:'800',color:'#302536'}, sectionSub:{marginTop:4,fontSize:11,color:'#918291'}, sectionIcon:{width:36,height:36,borderRadius:12,backgroundColor:'#FCE7F2',alignItems:'center',justifyContent:'center'},
 rankPill:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:11,paddingVertical:7,borderRadius:99,backgroundColor:'#FFF1D9',borderWidth:1,borderColor:'#F1D29D'},rankText:{fontSize:12,fontWeight:'800',color:'#805017'},statsGrid:{flexDirection:'row',gap:8}, statCard:{flex:1,paddingVertical:14,borderRadius:14,alignItems:'center',backgroundColor:'#FFF5FA',borderWidth:1,borderColor:'#F5D9E9'}, statValue:{fontSize:20,fontWeight:'800',color:'#A52672'}, statLabel:{marginTop:5,fontSize:9,fontWeight:'800',letterSpacing:0.7,color:'#967A8E'},
 rankLine:{fontSize:12,fontWeight:'800',color:'#8E5B19'}, streak:{fontSize:12,fontWeight:'700',color:'#A65A35'}, emptyRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:9}, emptyIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#EAF1FF'}, emptyTitle:{fontSize:13,fontWeight:'800',color:'#3A2D3F'}, emptyText:{marginTop:4,fontSize:11,lineHeight:16,color:'#8A7D8B'},
 momentGrid:{flexDirection:'row',flexWrap:'wrap',gap:8}, momentTile:{width:'48%',height:140,borderRadius:14,overflow:'hidden',backgroundColor:'#D6E6F8'}, momentImage:{width:'100%',height:'100%'}, videoTile:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#315AA6'}, momentOverlay:{position:'absolute',left:0,right:0,bottom:0,padding:8,backgroundColor:'rgba(18,29,57,0.52)',flexDirection:'row',gap:5,alignItems:'flex-end'}, momentCaption:{flex:1,fontSize:10,fontWeight:'700',color:'#FFF'},
 momentsEmpty:{alignItems:'center',paddingVertical:18,paddingHorizontal:15,backgroundColor:'#F6F9FF',borderRadius:16}, viewAll:{fontSize:12,fontWeight:'800',color:'#315AA6'}, footerNote:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:14,borderRadius:15,backgroundColor:'#FFF'}, footerText:{flex:1,fontSize:11,lineHeight:16,color:'#8B7A8D'}
});