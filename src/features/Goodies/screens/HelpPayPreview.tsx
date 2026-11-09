import React, {useMemo, useState} from 'react';
import {View, Pressable, ScrollView} from 'react-native';
import {Bar, Card, Cta, Row, T, Ttl, useTheme} from '../components/ui';
import {S, totals, money, navBack, emit} from '../store';

/**
 * UI-only sandbox. Does not create payment requests, orders or wallet debits.
 * Remove this screen and its checkout entry when the real funding backend is wired.
 */
export function HelpPayPreview() {
  const th = useTheme();
  const [mode, setMode] = useState<'share' | 'full'>('share');
  const [view, setView] = useState<'creator' | 'contributor'>('creator');
  const [demoPaid, setDemoPaid] = useState(0);
  const [createdAt] = useState(() => Date.now());
  const total = Math.max(0, Math.round(Number(totals().total || 0) * 100));
  const initial = mode === 'share' ? Math.ceil(total * 0.6) : 0;
  const shareable = total - initial;
  const paid = Math.min(shareable, demoPaid);
  const remaining = shareable - paid;
  const percent = total ? Math.round(((initial + paid) / total) * 100) : 0;
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id);}, []);
  const seconds = Math.max(0, Math.ceil((createdAt + 30 * 60_000 - now) / 1000));
  const time = useMemo(() => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, [seconds]);
  const amount = (cents: number) => money(cents / 100);
  return <View style={{flex: 1, backgroundColor: th.bg}}>
    <Bar title="Help Pay · Preview" onBack={() => {navBack(); emit();}} />
    <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 48, gap: 14}}>
      <T size={12} color={th.mut}>UI preview only · No payment, message or order will be created.</T>
      <Row style={{gap: 8}}>
        {(['share', 'full'] as const).map(m => <Pressable key={m} onPress={() => {setMode(m); setDemoPaid(0);}} style={{flex:1, padding:12, borderRadius:14, borderWidth:1, borderColor:mode===m?th.br:th.line, backgroundColor:mode===m?th.brt:th.soft}}><T weight="600" align="center">{m==='share'?'Share 40%':'Pay full bill'}</T></Pressable>)}
      </Row>
      <Card>
        <Ttl>Goodies order</Ttl>
        {S.cart.lines.map((line: any) => <Row key={line.k} sp style={{marginTop:8}}><T size={13}>{line.q}× {line.n}</T><T size={13}>{money(line.p * line.q)}</T></Row>)}
        <Row sp style={{marginTop:14}}><T weight="600">Bill total</T><T weight="600">{amount(total)}</T></Row>
        {mode==='share' && <Row sp style={{marginTop:8}}><T size={13}>Customer pays first (60%)</T><T size={13}>{amount(initial)}</T></Row>}
        <Row sp style={{marginTop:8}}><T size={13}>Help Pay amount</T><T size={13}>{amount(shareable)}</T></Row>
      </Card>
      <Row style={{gap:8}}>
        {(['creator','contributor'] as const).map(v => <Pressable key={v} onPress={()=>setView(v)} style={{flex:1,padding:10,borderRadius:12,backgroundColor:view===v?th.brt:th.soft}}><T align="center" weight="600">{v==='creator'?'Customer view':'Contributor view'}</T></Pressable>)}
      </Row>
      <Card>
        <Ttl>{view==='creator'?'Your Help Pay request':'Help pay this bill'}</Ttl>
        <T size={13} color={th.mut} style={{marginTop:8}}>Expires in {time} · Goodies 30-minute limit</T>
        <View style={{height:8,borderRadius:8,backgroundColor:th.soft,overflow:'hidden',marginTop:14}}><View style={{width:`${percent}%`,height:8,backgroundColor:th.br}} /></View>
        <Row sp style={{marginTop:8}}><T size={13}>{percent}% funded</T><T size={13} weight="600">{amount(remaining)} remaining</T></Row>
        {view==='creator' ? <View style={{marginTop:12}}><T size={13} weight="600">People who helped pay</T>{paid>0?<T size={13} style={{marginTop:5}}>Preview contributor · {amount(paid)}</T>:<T size={13} color={th.mut}>No contributions yet</T>}</View> : <T size={12} color={th.mut} style={{marginTop:12}}>Other contributors and their amounts are private.</T>}
      </Card>
      {view==='contributor' && remaining>0 && seconds>0 ? <Cta label={mode==='share'?'Simulate Wallet contribution':'Simulate full payment'} onPress={()=>setDemoPaid(v=>Math.min(shareable,v+(mode==='share'?Math.max(1,Math.ceil(shareable/4)):shareable)))} /> : null}
      {remaining===0 && shareable>0 ? <T weight="600" color={th.br}>Preview: fully funded. No real order was placed.</T> : null}
      <T size={12} color={th.mut}>The 60% initial payment shown above is simulated, not charged. The real flow must verify it on the server before sharing.</T>
    </ScrollView>
  </View>;
}
