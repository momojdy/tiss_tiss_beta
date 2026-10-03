import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const C = { bg: '#F5F8F3', text: '#1A2517', muted: '#9AA595', green: '#3F6B37', tint: '#DCE8D2', strip: '#E6EDE1', pending: '#A56A12', declined: '#A33D3D' };
const FILTERS = ['All', 'Money', 'Points', 'Transfers'] as const;
type Filter = typeof FILTERS[number];
type Item = { id: string; createdAt: string; title: string; subtitle: string; amount: number; currency: string; direction: 'credit'|'debit'; status: string; category: Exclude<Filter,'All'>; points?: boolean; transactionType?: string; activityCategory?: string };

const dateText = (v:string) => { const d=new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); };
const statusText = (v:string) => ({succeeded:'Completed',failed:'Declined',cancelled:'Cancelled',processing:'Processing',pending:'Pending'} as Record<string,string>)[v.toLowerCase()] ?? (v ? v.charAt(0).toUpperCase()+v.slice(1) : 'Completed');
const category = (r:any): Exclude<Filter,'All'> => {
  const activityCategory = String(r.activity_category ?? '').toLowerCase();
  const type = String(r.transaction_type ?? '').toLowerCase();
  if (activityCategory === 'points') return 'Points';
  if (['send','receive','transfer','request','money_request'].includes(type)) return 'Transfers';
  return 'Money';
};

function Header({onBack}:{onBack?:()=>void}) {
  return <><View style={s.header}><Pressable onPress={onBack} style={s.headerButton} hitSlop={8}><MaterialIcons name="arrow-back" size={20} color={C.text}/></Pressable><Text style={s.headerTitle}>History</Text></View><View style={s.strip}/></>;
}

function Row({item}:{item:Item}) {
  const amount=item.points ? ((item.direction==='credit'?'+':'-')+Math.abs(item.amount).toLocaleString()+' pts') : ((item.direction==='credit'?'+':'-')+Math.abs(item.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+' '+item.currency);
  const status=statusText(item.status);
  return <View style={s.row}>
    <View style={s.rowIcon}><MaterialCommunityIcons name={item.points?'stars':item.category==='Transfers'?'swap-horiz':item.category==='Money'?'account-balance-wallet':'star-outline'} size={23} color={C.muted}/></View>
    <View style={s.copy}><Text style={s.title} numberOfLines={1}>{item.title}</Text><Text style={s.subtitle} numberOfLines={1}>{item.subtitle}</Text><Text style={s.date}>{dateText(item.createdAt)}</Text></View>
    <View style={s.right}><Text style={[s.amount,item.direction==='credit'&&s.credit]}>{amount}</Text><Text style={[s.status,status==='Declined'&&s.declined,(status==='Pending'||status==='Processing')&&s.pending]}>{status}</Text></View>
  </View>;
}

export default function WalletHistoryScreen({onBack}:{onBack?:()=>void}) {
  const [filter,setFilter]=useState<Filter>('All'); const [items,setItems]=useState<Item[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{ let active=true; (async()=>{
    try {
      const { data, error } = await supabase.rpc('get_my_wallet_activity', { p_filter: 'all', p_limit: 500, p_offset: 0 });
      if (error) throw error;
      const cutoff = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
      const mapped = (Array.isArray(data) ? data : []).map((r:any):Item => ({
        id: String(r.id),
        createdAt: String(r.created_at),
        title: String(r.title ?? 'Wallet transaction'),
        subtitle: String(r.subtitle ?? ''),
        amount: Number(r.activity_category === 'points' ? (r.points_amount ?? 0) : (r.money_amount ?? 0)),
        currency: String(r.activity_category === 'points' ? 'pts' : (r.money_currency ?? 'USD')),
        direction: String(r.direction ?? 'credit').toLowerCase() === 'debit' ? 'debit' : 'credit',
        status: String(r.status ?? 'completed'),
        category: category(r),
        points: String(r.activity_category ?? '').toLowerCase() === 'points',
        transactionType: String(r.transaction_type ?? ''),
        activityCategory: String(r.activity_category ?? ''),
      })).filter((x:Item) => new Date(x.createdAt).getTime() >= cutoff);
      if(active) setItems(mapped.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()));
    } catch(e) { console.error('Wallet history load error:',e); if(active) setItems([]); }
    finally { if(active) setLoading(false); }
  })(); return()=>{active=false};},[]);

  const filtered=useMemo(()=>{
    if(filter==='All') return items;
    if(filter==='Money') return items.filter(x=>x.category==='Money');
    if(filter==='Points') return items.filter(x=>x.category==='Points');
    return items.filter(x=>x.category==='Transfers');
  },[filter,items]);

  return <View style={s.page}><Header onBack={onBack}/>
    <View style={s.filterWrap}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{FILTERS.map(x=><Pressable key={x} onPress={()=>setFilter(x)} style={[s.filter,x===filter&&s.selected]}><Text style={[s.filterText,x===filter&&s.selectedText]}>{x}</Text></Pressable>)}</ScrollView></View>
    {loading?<View style={s.center}><ActivityIndicator size="small" color={C.text}/></View>:filtered.length===0?<View style={s.empty}><View style={s.emptyIcon}><MaterialCommunityIcons name="history" size={34} color={C.muted}/></View><Text style={s.emptyTitle}>No transactions yet</Text><Text style={s.emptyBody}>Your wallet activity will appear here once you make a payment, top up, or earn points.</Text></View>:<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>{filtered.map(x=><Row key={x.id} item={x}/>)}</ScrollView>}
  </View>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.bg}, header:{height:100,paddingHorizontal:10,paddingBottom:4,flexDirection:'row',alignItems:'flex-end',backgroundColor:C.bg}, headerButton:{width:36,height:36,borderRadius:12,backgroundColor:C.tint,alignItems:'center',justifyContent:'center'}, headerTitle:{marginLeft:12,paddingBottom:1,color:C.text,fontSize:19,lineHeight:23,fontFamily:'Inter_600SemiBold',transform:[{translateY:-4.5}]}, strip:{height:20,backgroundColor:C.strip},
 filterWrap:{paddingTop:18}, filters:{paddingHorizontal:16,gap:8}, filter:{paddingHorizontal:16,paddingVertical:9,borderRadius:999,backgroundColor:C.tint}, selected:{backgroundColor:C.text}, filterText:{color:C.green,fontSize:13,fontFamily:'Inter_600SemiBold'}, selectedText:{color:'#FFFFFF'},
 list:{paddingHorizontal:16,paddingTop:12,paddingBottom:30}, row:{minHeight:82,paddingVertical:14,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#D6DDD2'}, rowIcon:{width:42,height:44,borderRadius:22,backgroundColor:C.tint,alignItems:'center',justifyContent:'center',marginRight:12}, copy:{flex:1,minWidth:0}, title:{color:C.text,fontSize:14,fontFamily:'Inter_600SemiBold'}, subtitle:{color:C.muted,fontSize:12,fontFamily:'Inter_400Regular',marginTop:3}, date:{color:'#879184',fontSize:11,fontFamily:'Inter_400Regular',marginTop:3}, right:{alignItems:'flex-end',marginLeft:10,maxWidth:125}, amount:{color:C.text,fontSize:13,fontFamily:'Inter_600SemiBold',textAlign:'right'}, credit:{color:'#55764E'}, status:{color:C.muted,fontSize:10,fontFamily:'Inter_600SemiBold',marginTop:4},declined:{color:C.declined},pending:{color:C.pending},
 center:{flex:1,alignItems:'center',justifyContent:'center'}, empty:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:28,paddingBottom:100}, emptyIcon:{width:92,height:92,borderRadius:46,backgroundColor:C.tint,alignItems:'center',justifyContent:'center',marginBottom:20}, emptyTitle:{color:C.text,fontSize:20,fontFamily:'Inter_600SemiBold',marginBottom:8}, emptyBody:{color:C.muted,fontSize:14,lineHeight:20,fontFamily:'Inter_400Regular',textAlign:'center',maxWidth:330}
});