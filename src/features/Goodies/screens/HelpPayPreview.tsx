import React, {useEffect, useState} from 'react';
import {View, Pressable, ScrollView} from 'react-native';
import {Bar, Card, Cta, Row, T, Ttl, useTheme} from '../components/ui';
import {S, totals, money, navBack, emit} from '../store';

/** Isolated, interactive walkthrough. No messages, wallet writes or orders are created. */
type Mode = 'share' | 'full';
type Step = 'setup' | 'invite' | 'pay' | 'progress' | 'complete';
const STEPS: Step[] = ['setup', 'invite', 'pay', 'progress', 'complete'];
const stepName: Record<Step, string> = {
  setup: 'Choose how to split', invite: 'Send to friends',
  pay: 'Friend chooses an amount', progress: 'Track contributions', complete: 'Order is fully funded',
};
export function HelpPayPreview() {
  const th = useTheme();
  const [mode, setMode] = useState<Mode>('share');
  const [step, setStep] = useState<Step>('setup');
  const [percent, setPercent] = useState(25);
  const [paid, setPaid] = useState(0);
  const [contributions, setContributions] = useState<{name:string; cents:number}[]>([]);
  const [recipient, setRecipient] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer);}, []);
  const total = Math.max(0, Math.round(Number(totals().total || 0) * 100));
  const initial = mode === 'share' ? Math.ceil(total * 0.6) : 0;
  const pool = total - initial;
  const remaining = Math.max(0, pool - paid);
  const funded = initial + paid;
  const expires = Math.max(0, Math.ceil((startedAt + 30 * 60_000 - now) / 1000));
  const timerLabel = `${Math.floor(expires / 60)}:${String(expires % 60).padStart(2, '0')}`;
  // Contributor's chosen percentage is of the currently unfunded Help Pay portion.
  // One person may cover the entire remaining 40% of the original bill.
  const chosen = mode === 'full' ? remaining : Math.min(remaining, Math.max(1, Math.round(remaining * percent / 100)));
  const amount = (cents: number) => money(cents / 100);
  const reset = (next: Mode) => {setMode(next); setStep('setup'); setPaid(0); setContributions([]); setPercent(25); setRecipient(0); setStartedAt(Date.now());};
  const next = () => setStep(s => STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(s) + 1)]);
  const previous = () => setStep(s => STEPS[Math.max(0, STEPS.indexOf(s) - 1)]);
  const addContribution = () => {
    if (!remaining || !expires) return;
    const cents = Math.min(chosen, remaining);
    setPaid(v => Math.min(pool, v + cents));
    setContributions(v => [...v, {name: recipient === 0 ? 'Friend A' : recipient === 1 ? 'Friend B' : 'Friend C', cents}]);
    setStep(cents >= remaining ? 'complete' : 'progress');
  };
  const option = (label: string, active: boolean, onPress: () => void) =>
    <Pressable accessibilityRole="button" onPress={onPress} style={{paddingVertical:11,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:active?th.br:th.line,backgroundColor:active?th.brt:th.soft}}>
      <T size={13} weight="600" color={active?th.br:th.ink} align="center">{label}</T>
    </Pressable>;
  return <View style={{flex:1,backgroundColor:th.bg}}>
    <Bar title="Help Pay · Walkthrough" onBack={() => {navBack();emit();}} />
    <ScrollView contentContainerStyle={{padding:16,paddingBottom:55,gap:13}}>
      <T size={12} color={th.mut}>Interactive preview · Nothing is charged, shared or ordered.</T>
      <Row style={{gap:8}}>
        <View style={{flex:1}}>{option('Share bill · 60/40',mode==='share',()=>reset('share'))}</View>
        <View style={{flex:1}}>{option('Help me fully pay',mode==='full',()=>reset('full'))}</View>
      </Row>
      <Row sp>
        <T size={12} color={th.mut}>Step {STEPS.indexOf(step)+1} of {STEPS.length}</T>
        <T size={12} weight="600" color={th.br}>Goodies · {timerLabel} left</T>
      </Row>
      <View style={{height:5,borderRadius:5,backgroundColor:th.soft,overflow:'hidden'}}>
        <View style={{height:5,width:`${(STEPS.indexOf(step)+1)*20}%`,backgroundColor:th.br}} />
      </View>
      <Ttl>{stepName[step]}</Ttl>
      <Card>
        <Row sp><T weight="600">Goodies bill</T><T weight="600">{amount(total)}</T></Row>
        {S.cart.lines.map((line:any,i:number)=><Row key={String(line.k||i)} sp style={{marginTop:8}}><T size={12} color={th.mut}>{line.q}× {line.n}</T><T size={12}>{money(line.p*line.q)}</T></Row>)}
        <Row sp style={{marginTop:12}}><T size={13}>Customer's upfront share</T><T size={13} weight="600">{amount(initial)}</T></Row>
        <Row sp style={{marginTop:7}}><T size={13}>Friends can cover</T><T size={13} weight="600">{amount(pool)}</T></Row>
        <Row sp style={{marginTop:7}}><T size={13}>Still needed</T><T size={13} weight="600" color={th.br}>{amount(remaining)}</T></Row>
      </Card>
      {step==='setup' ? <>
        <Card>
          <T weight="600">{mode==='share'?'How the 60/40 split works':'How full payment works'}</T>
          <T size={13} color={th.mut} style={{marginTop:9}}>{mode==='share'?'You pay 60% first. Friends can contribute any percentage of the remaining 40%, until it is fully covered. One friend can pay the whole 40%.':'You request 100% of the bill from someone else. One person pays the full amount using an eligible payment method.'}</T>
          <T size={12} color={th.mut} style={{marginTop:9}}>In the real checkout, the request is only shared after the required upfront payment is verified.</T>
        </Card>
        <Cta label="Continue to friend selection" onPress={next} />
      </> : null}
      {step==='invite' ? <>
        <Card>
          <T weight="600">Choose friends · preview contacts</T>
          <T size={12} color={th.mut} style={{marginTop:7}}>The real version uses your Wantiss friend list. These are placeholders.</T>
          {['Friend A','Friend B','Friend C'].map((name,i)=><Pressable key={name} onPress={()=>setRecipient(i)} style={{paddingVertical:13,borderBottomWidth:i<2?1:0,borderColor:th.line}}>
            <Row sp><T weight={recipient===i?'600':undefined}>{name}</T><T color={recipient===i?th.br:th.mut}>{recipient===i?'Selected':'Select'}</T></Row>
          </Pressable>)}
        </Card>
        <T size={12} color={th.mut}>Forwarding shares the same request and remaining balance. It never resets the 30-minute timer.</T>
        <Cta label="Preview friend's message" onPress={next} />
      </> : null}
      {step==='pay' ? <>
        <Card>
          <T size={12} color={th.mut}>Message preview · {['Friend A','Friend B','Friend C'][recipient]}</T>
          <T weight="600" style={{marginTop:7}}>Help pay a Goodies order</T>
          <T size={13} style={{marginTop:6}}>{amount(remaining)} remaining · expires in {timerLabel}</T>
          <T size={12} color={th.mut} style={{marginTop:8}}>Friends see the aggregate progress and their own payments, never the other contributors' identities or amounts.</T>
        </Card>
        {mode==='share' ? <Card>
          <T weight="600">How much would you like to pay?</T>
          <T size={12} color={th.mut} style={{marginTop:7}}>Choose a percentage of the remaining Help Pay amount.</T>
          <Row style={{gap:7,marginTop:12,flexWrap:'wrap'}}>
            {[10,25,50,75,100].map(v=><View key={v}>{option(v+'%',percent===v,()=>setPercent(v))}</View>)}
          </Row>
          <Row sp style={{marginTop:16}}><T>Selected {percent}%</T><T weight="600" color={th.br}>{amount(chosen)}</T></Row>
          <T size={12} color={th.mut} style={{marginTop:7}}>Equivalent to {total?((chosen/total)*100).toFixed(1):'0'}% of the original bill. Wallet only.</T>
        </Card> : <Card><T weight="600">Full bill payment</T><T size={13} color={th.mut} style={{marginTop:7}}>This request requires one person to pay the entire {amount(remaining)}. In the live flow, eligible Wallet and card payment options are offered.</T></Card>}
        <Cta label={`Simulate paying ${amount(chosen)}`} onPress={addContribution} />
      </> : null}
      {step==='progress'||step==='complete' ? <>
        <Card>
          <T weight="600">{step==='complete'?'Fully funded · preview':'Customer funding overview'}</T>
          <View style={{height:9,borderRadius:9,backgroundColor:th.soft,overflow:'hidden',marginTop:15}}>
            <View style={{height:9,width:`${total?Math.min(100,Math.round(funded/total*100)):0}%`,backgroundColor:th.br}} />
          </View>
          <Row sp style={{marginTop:9}}><T size={13}>{total?Math.round(funded/total*100):0}% funded</T><T size={13} weight="600">{amount(remaining)} left</T></Row>
          <T weight="600" style={{marginTop:17}}>Contributions · customer view only</T>
          {contributions.map((c,i)=><Row key={i} sp style={{marginTop:9}}><T size={13}>{c.name}</T><T size={13}>{amount(c.cents)}</T></Row>)}
          <T size={12} color={th.mut} style={{marginTop:12}}>Contributors cannot see this list or the number of people who paid.</T>
        </Card>
        {step==='progress'? <Cta label="Preview another friend's contribution" onPress={()=>{setRecipient(v=>(v+1)%3);setPercent(25);setStep('pay');}} />:
          <Card><T weight="600">What happens next?</T><T size={13} color={th.mut} style={{marginTop:8}}>Once the server confirms all funds, checkout details and store availability must be revalidated. Only then can the real Goodies order be placed. If the request expires or fails, payments must be reversed.</T></Card>}
      </> : null}
      {step!=='setup' ? <Pressable onPress={previous} style={{paddingVertical:10,alignSelf:'flex-start'}}><T color={th.br} weight="600">Previous step</T></Pressable> : null}
      <Pressable onPress={()=>reset(mode)} style={{paddingVertical:10,alignSelf:'flex-start'}}><T color={th.mut} size={13}>Restart walkthrough</T></Pressable>
    </ScrollView>
  </View>;
}
