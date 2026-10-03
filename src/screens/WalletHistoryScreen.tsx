import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const C = { bg: '#F5F8F3', text: '#1A2517', muted: '#5F6B5A', tint: '#DCE8D2', strip: '#E6EDE1', pending: '#A56A12', declined: '#A33D3D' };
const FILTERS = ['All', 'Payments', 'Top ups', 'Rewards'] as const;
type Filter = typeof FILTERS[number];
type Item = { id: string; createdAt: string; title: string; subtitle: string; amount: number; currency: string; direction: 'credit'|'debit'; status: string; category: Exclude<Filter,'All'>; points?: boolean };

const dateText = (v:string) => { const d=new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); };
const statusText = (v:string) => ({succeeded:'Completed',failed:'Declined',cancelled:'Cancelled',processing:'Processing',pending:'Pending'} as Record<string,string>)[v.toLowerCase()] ?? (v ? v.charAt(0).toUpperCase()+v.slice(1) : 'Completed');
const category = (r:any): Exclude<Filter,'All'> => { const v=String(r.activity_type??r.feature_name??'').toLowerCase(); return v.includes('top')||v.includes('fund')||v.includes('deposit') ? 'Top ups' : 'Payments'; };

function Header({onBack}:{onBack?:()=>void}) {
  return <><View style={s.header}><Pressable onPress={onBack} style={s.headerButton} hitSlop={8}><MaterialIcons name="arrow-back" size={20} color={C.text}/></Pressable><Text style={s.headerTitle}>History</Text></View><View style={s.strip}/></>;
}

function Row({item}:{item:Item}) {
  const amount=item.points ? ((item.direction==='credit'?'+':'-')+Math.abs(item.amount).toLocaleString()+' pts') : ((item.direction==='credit'?'+':'-')+Math.abs(item.amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+' '+item.currency);
  const status=statusText(item.status);
  return <View style={s.row}>
    <View style={s.rowIcon}><MaterialCommunityIcons name={item.points?'star-outline':item.category==='Top ups'?'arrow-down-circle-outline':'swap-horizontal'} size={23} color={C.muted}/></View>
    <View style={s.copy}><Text style={s.title} numberOfLines={1}>{item.title}</Text><Text style={s.subtitle} numberOfLines={1}>{item.subtitle}</Text><Text style={s.date}>{dateText(item.createdAt)}</Text></View>
    <View style={s.right}><Text style={[s.amount,item.direction==='credit'&&s.credit]}>{amount}</Text><Text style={[s.status,status==='Declined'&&s.declined,(status==='Pending'||status==='Processing')&&s.pending]}>{status}</Text></View>
  </View>;
}

export default function WalletHistoryScreen({onBack}:{onBack?:()=>void}) {
  const [filter,setFilter]=useState<Filter>('All'); const [items,setItems]=useState<Item[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{ let active=true; (async()=>{ try {
    const [{data:tx},{data:pts}]=await Promise.all([
      supabase.from('wallet_transactions').select('id,created_at,status,description,amount,original_currency,wallet_amount,wallet_currency,feature_name,activity_type,direction').order('created_at',{ascending:false}),
      supabase.from('wallet_points_transactions').select('id,created_at,status,title,subtitle,points_amount,direction').order('created_at',{ascending:false})
    ]);
    const a=(tx??[]).map((r:any):Item=>({id:r.id,createdAt:r.created_at,title:r.description||r.activity_type||'Wallet payment',subtitle:r.feature_name||'Wallet transaction',amount:Number(r.wallet_amount??r.amount??0),currency:r.wallet_currency||r.original_currency||'USD',direction:r.direction==='credit'?'credit':'debit',status:r.status||'completed',category:category(r)}));
    const b=(pts??[]).map((r:any):Item=>({id:'points-'+r.id,createdAt:r.created_at,title:r.title||'Points activity',subtitle:r.subtitle||'Rewards & points',amount:Number(r.points_amount??0),currency:'pts',direction:r.direction==='earn'?'credit':'debit',status:r.status||'completed',category:'Rewards',points:true}));
    if(active)setItems([...a,...b].sort((x,y)=>new Date(y.createdAt).getTime()-new Date(x.createdAt).getTime()));
  } catch(e){console.error('Wallet history load error:',e);if(active)setItems([]);} finally{if(active)setLoading(false);}})(); return()=>{active=false};},[]);
  const filtered=useMemo(()=>filter==='All'?items:items.filter(x=>x.category===filter),[filter,items]);
  return <View style={s.page}><Header onBack={onBack}/>
    <View style={s.filterWrap}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{FILTERS.map(x=><Pressable key={x} onPress={()=>setFilter(x)} style={[s.filter,x===filter&&s.selected]}><Text style={[s.filterText,x===filter&&s.selectedText]}>{x}</Text></Pressable>)}</ScrollView></View>
    {loading?<View style={s.center}><ActivityIndicator size="small" color={C.text}/></View>:filtered.length===0?<View style={s.empty}><View style={s.emptyIcon}><MaterialCommunityIcons name="history" size={34} color={C.muted}/></View><Text style={s.emptyTitle}>No transactions yet</Text><Text style={s.emptyBody}>Your wallet activity will appear here once you make a payment, top up, or earn points.</Text></View>:<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>{filtered.map(x=><Row key={x.id} item={x}/>)}</ScrollView>}
  </View>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.bg}, header:{height:100,paddingHorizontal:10,paddingBottom:4,flexDirection:'row',alignItems:'flex-end',backgroundColor:C.bg}, headerButton:{width:36,height:36,borderRadius:12,backgroundColor:C.tint,alignItems:'center',justifyContent:'center'}, headerTitle:{marginLeft:12,paddingBottom:1,color:C.text,fontSize:19,lineHeight:23,fontFamily:'Inter_600SemiBold',transform:[{translateY:-4.5}]}, strip:{height:20,backgroundColor:C.strip},
 filterWrap:{paddingTop:18}, filters:{paddingHorizontal:16,gap:8}, filter:{paddingHorizontal:16,paddingVertical:9,borderRadius:999,backgroundColor:'#E0E3E7'}, selected:{backgroundColor:'#8FAF84'}, filterText:{color:C.muted,fontSize:13,fontFamily:'Inter_600SemiBold'}, selectedText:{color:C.text},
 list:{paddingHorizontal:16,paddingTop:12,paddingBottom:30}, row:{minHeight:82,paddingVertical:14,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#D6DDD2'}, rowIcon:{width:44,height:44,borderRadius:22,backgroundColor:C.tint,alignItems:'center',justifyContent:'center',marginRight:12}, copy:{flex:1,minWidth:0}, title:{color:C.text,fontSize:14,fontFamily:'Inter_600SemiBold'}, subtitle:{color:C.muted,fontSize:12,fontFamily:'Inter_400Regular',marginTop:3}, date:{color:'#879184',fontSize:11,fontFamily:'Inter_400Regular',marginTop:3}, right:{alignItems:'flex-end',marginLeft:10,maxWidth:125}, amount:{color:C.text,fontSize:13,fontFamily:'Inter_600SemiBold',textAlign:'right'}, credit:{color:'#55764E'}, status:{color:C.muted,fontSize:10,fontFamily:'Inter_600SemiBold',marginTop:4},declined:{color:C.declined},pending:{color:C.pending},
 center:{flex:1,alignItems:'center',justifyContent:'center'}, empty:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:28,paddingBottom:100}, emptyIcon:{width:92,height:92,borderRadius:46,backgroundColor:C.tint,alignItems:'center',justifyContent:'center',marginBottom:20}, emptyTitle:{color:C.text,fontSize:20,fontFamily:'Inter_600SemiBold',marginBottom:8}, emptyBody:{color:C.muted,fontSize:14,lineHeight:20,fontFamily:'Inter_400Regular',textAlign:'center',maxWidth:330}
});