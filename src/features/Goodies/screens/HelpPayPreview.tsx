import {label} from '../content';
import React, {useEffect, useState} from 'react';
import {View, Pressable, ScrollView, TextInput, Alert} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {Bar, Card, Cta, Row, T, Ttl, useTheme} from '../components/ui';
import {S, totals, money, navBack, emit} from '../store';

/** Isolated, interactive walkthrough. No messages, wallet writes or orders are created. */
type Mode = 'share' | 'full';
type Step = 'setup' | 'invite' | 'pay' | 'progress' | 'complete';
const STEPS: Step[] = ['setup', 'invite', 'pay', 'progress', 'complete'];
const stepNames = (): Record<Step, string> => ({
  setup: label('lbl.helpPay.step.setup','Choose how to split'), invite: label('lbl.helpPay.step.invite','Send to friends'),
  pay: label('lbl.helpPay.step.pay','Friend chooses an amount'), progress: label('lbl.helpPay.step.progress','Track contributions'), complete: label('lbl.helpPay.step.complete','Order is fully funded'),
});
export function HelpPayPreview() {
  const th = useTheme();
  const friends=[label('lbl.helpPay.friendA','Friend A'),label('lbl.helpPay.friendB','Friend B'),label('lbl.helpPay.friendC','Friend C')];
  const [mode, setMode] = useState<Mode>('share');
  const [step, setStep] = useState<Step>('setup');
  const [percent, setPercent] = useState(25);
  const [customPercent, setCustomPercent] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [amountMode, setAmountMode] = useState<'percent'|'amount'>('percent');
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
  const enteredPercent = customPercent.trim() === '' ? percent : Number(customPercent);
  const selectedCents = amountMode === 'amount' ? Math.round(Number(customAmount || 0) * 100) : Math.round(remaining * enteredPercent / 100);
  const validChoice = mode === 'full' || (Number.isFinite(selectedCents) && selectedCents > 0 && selectedCents <= remaining && (amountMode === 'amount' || (Number.isFinite(enteredPercent) && enteredPercent > 0 && enteredPercent <= 100)));
  const chosen = mode === 'full' ? remaining : validChoice ? selectedCents : 0;
  const amount = (cents: number) => money(cents / 100);
  const reset = (next: Mode) => {setMode(next); setStep('setup'); setPaid(0); setContributions([]); setPercent(25); setCustomPercent(''); setCustomAmount(''); setAmountMode('percent'); setRecipient(0); setStartedAt(Date.now());};
  const shareBill = async () => {
    Alert.alert('Payment request not active','This checkout has not created a verified Help Pay request. A payable link cannot be shared yet.');
  };
  const next = () => setStep(s => STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(s) + 1)]);
  const previous = () => setStep(s => STEPS[Math.max(0, STEPS.indexOf(s) - 1)]);
  const addContribution = () => {
    if (!remaining || !expires || !validChoice) return;
    const cents = Math.min(chosen, remaining);
    setPaid(v => Math.min(pool, v + cents));
    setContributions(v => [...v, {name: recipient === 0 ? label('lbl.helpPay.friendA','Friend A') : recipient === 1 ? label('lbl.helpPay.friendB','Friend B') : label('lbl.helpPay.friendC','Friend C'), cents}]);
    setStep(cents >= remaining ? 'complete' : 'progress');
  };
  const option = (label: string, active: boolean, onPress: () => void) =>
    <Pressable accessibilityRole="button" onPress={onPress} style={{paddingVertical:11,paddingHorizontal:12,borderRadius:13,borderWidth:1,borderColor:active?th.br:th.line,backgroundColor:active?th.brt:th.bg}}>
      <T size={13} weight="600" color={active?th.br:th.ink} align="center">{label}</T>
    </Pressable>;
  return <View style={{flex:1,backgroundColor:th.bg}}>
    <Bar title={label("lbl.cms.24f236576f00", "Help Pay · Walkthrough")} onBack={() => {navBack();emit();}} />
    <ScrollView contentContainerStyle={{paddingHorizontal:20,paddingTop:20,paddingBottom:64,gap:16}}>
      <T size={12} color={th.mut}>{label("lbl.cms.78242f2aebe6", "Interactive preview · Nothing is charged, shared or ordered.")}</T>
      <T size={24} weight="600">Pay together, effortlessly.</T>
      <Row style={{gap:8}}>
        <View style={{flex:1}}>{option(label('lbl.helpPay.shareBill','Share bill · 60/40'),mode==='share',()=>reset('share'))}</View>
        <View style={{flex:1}}>{option(label('lbl.helpPay.fullPay','Help me fully pay'),mode==='full',()=>reset('full'))}</View>
      </Row>
      <Row sp>
        <T size={12} color={th.mut}>{label("lbl.cms.2aeeb41bb682", "Step ")}{STEPS.indexOf(step)+1} {label("lbl.cms.41f4298910ce", "of ")}{STEPS.length}</T>
        <T size={12} weight="600" color={th.br}>{label("lbl.cms.6e746ee8b4fe", "Goodies · ")}{timerLabel} {label("lbl.cms.046f168e2991", "left")}</T>
      </Row>
      <View style={{height:5,borderRadius:5,backgroundColor:th.soft,overflow:'hidden'}}>
        <View style={{height:5,width:`${(STEPS.indexOf(step)+1)*20}%`,backgroundColor:th.br}} />
      </View>
      <Ttl>{stepNames()[step]}</Ttl>
      <Card style={{borderRadius:22,padding:18}}>
        <Row sp><T weight="600">{label("lbl.cms.ec1cc0c94ace", "Goodies bill")}</T><T weight="600">{amount(total)}</T></Row>
        {S.cart.lines.map((line:any,i:number)=><Row key={String(line.k||i)} sp style={{marginTop:8}}><T size={12} color={th.mut}>{line.q}× {line.n}</T><T size={12}>{money(line.p*line.q)}</T></Row>)}
        <Row sp style={{marginTop:12}}><T size={13}>{label("lbl.cms.af5b6180fcea", "Customer's upfront share")}</T><T size={13} weight="600">{amount(initial)}</T></Row>
        <Row sp style={{marginTop:7}}><T size={13}>{label("lbl.cms.77261425ec6c", "Friends can cover")}</T><T size={13} weight="600">{amount(pool)}</T></Row>
        <Row sp style={{marginTop:7}}><T size={13}>{label("lbl.cms.5f964c1d13e4", "Still needed")}</T><T size={13} weight="600" color={th.br}>{amount(remaining)}</T></Row>
      </Card>
      {(step==='invite'||step==='pay'||step==='progress') ? <Card style={{borderRadius:22,padding:18,alignItems:'center'}}>
        <T size={15} weight="600">Scan to pay</T>
        <T size={12} color={th.mut} style={{textAlign:'center',marginTop:6,marginBottom:15}}>Wallet QR · {mode==='share'?'Share bill':'Full payment'}</T>
        <View style={{backgroundColor:'#FFFFFF',padding:14,borderRadius:18}}>
          <QRCode value={`wantiss://help-pay/preview?mode=${mode}&amount=${remaining}`} size={166} color="#1A2517" backgroundColor="#FFFFFF" />
        </View>
        <T size={12} color={th.mut} style={{textAlign:'center',marginTop:13}}>Demo QR only · no live payment request</T>
        <Pressable accessibilityRole="button" onPress={()=>void shareBill()} style={{marginTop:15,paddingHorizontal:24,paddingVertical:12,borderRadius:14,backgroundColor:th.br}}><T weight="600" color="#FFFFFF">Share bill with friends</T></Pressable>
      </Card> : null}
      {step==='setup' ? <>
        <Card>
          <T weight="600">{mode==='share'?label("lbl.cms.51f5915af4ef", "How the 60/40 split works"):label("lbl.cms.c460d20229b9", "How full payment works")}</T>
          <T size={13} color={th.mut} style={{marginTop:9}}>{mode==='share'?label("lbl.cms.24a1b0418c6e", "You pay 60% first. Friends can contribute any percentage of the remaining 40%, until it is fully covered. One friend can pay the whole 40%."):label("lbl.cms.248fefd7effd", "You request 100% of the bill from someone else. One person pays the full amount using an eligible payment method.")}</T>
          <T size={12} color={th.mut} style={{marginTop:9}}>{label("lbl.cms.3037855e4da5", "In the real checkout, the request is only shared after the required upfront payment is verified.")}</T>
        </Card>
        <Cta label={label("lbl.cms.4d841f662ff0", "Continue to friend selection")} onPress={next} />
      </> : null}
      {step==='invite' ? <>
        <Card>
          <T weight="600">{label("lbl.cms.51fd3576107d", "Choose friends · preview contacts")}</T>
          <T size={12} color={th.mut} style={{marginTop:7}}>{label("lbl.cms.0c815902b6b8", "The real version uses your Wantiss friend list. These are placeholders.")}</T>
          {friends.map((name,i)=><Pressable key={name} onPress={()=>setRecipient(i)} style={{paddingVertical:13,borderBottomWidth:i<2?1:0,borderColor:th.line}}>
            <Row sp><T weight={recipient===i?'600':undefined}>{name}</T><T color={recipient===i?th.br:th.mut}>{recipient===i?label("lbl.cms.439ba7bca2f9", "Selected"):label("lbl.cms.66d0ec6d4d70", "Select")}</T></Row>
          </Pressable>)}
        </Card>
        <T size={12} color={th.mut}>{label("lbl.cms.7b6022533f4d", "Forwarding shares the same request and remaining balance. It never resets the 30-minute timer.")}</T>
        <Cta label={label("lbl.cms.be8b08bcf8db", "Preview friend's message")} onPress={next} />
      </> : null}
      {step==='pay' ? <>
        <Card>
          <T size={12} color={th.mut}>{label("lbl.cms.421be83107c0", "Message preview · ")}{friends[recipient]}</T>
          <T weight="600" style={{marginTop:7}}>{label("lbl.cms.cb52931e4fa7", "Help pay a Goodies order")}</T>
          <T size={13} style={{marginTop:6}}>{amount(remaining)} {label("lbl.cms.1ffcbca434d7", "remaining · expires in ")}{timerLabel}</T>
          <T size={12} color={th.mut} style={{marginTop:8}}>{label("lbl.cms.1b446a360546", "Friends see the aggregate progress and their own payments, never the other contributors' identities or amounts.")}</T>
        </Card>
        {mode==='share' ? <Card>
          <T weight="600">{label("lbl.cms.c36ec498735d", "How much would you like to pay?")}</T>
          <T size={12} color={th.mut} style={{marginTop:7}}>{label("lbl.cms.38a73aeee517", "Choose a percentage of the remaining Help Pay amount.")}</T>
          <Row style={{gap:7,marginTop:12,flexWrap:'wrap'}}>
            {[10,25,50,75,100].map(v=><View key={v}>{option(v+'%',percent===v,()=>setPercent(v))}</View>)}
          </Row>
          <Row style={{gap:8,marginTop:14}}>
            <View style={{flex:1}}>{option('Custom %',amountMode==='percent'&&customPercent!=='',()=>{setAmountMode('percent');setCustomPercent(String(percent));})}</View>
            <View style={{flex:1}}>{option('Custom amount',amountMode==='amount',()=>setAmountMode('amount'))}</View>
          </Row>
          {amountMode==='percent'&&customPercent!==''?<TextInput keyboardType="decimal-pad" accessibilityLabel="Custom percentage" value={customPercent} onChangeText={setCustomPercent} placeholder="Percentage (0–100)" placeholderTextColor={th.mut} style={{marginTop:12,borderRadius:12,borderWidth:1,borderColor:th.line,color:th.ink,padding:12}}/>:null}
          {amountMode==='amount'?<TextInput keyboardType="decimal-pad" accessibilityLabel="Custom amount" value={customAmount} onChangeText={setCustomAmount} placeholder="Amount to contribute" placeholderTextColor={th.mut} style={{marginTop:12,borderRadius:12,borderWidth:1,borderColor:th.line,color:th.ink,padding:12}}/>:null}
          {!validChoice?<T size={12} color={th.red} style={{marginTop:8}}>Enter a valid amount within the remaining balance.</T>:null}
          <Row sp style={{marginTop:16}}><T>{label("lbl.cms.5742239db66e", "Selected ")}{amountMode==='percent'?enteredPercent+'%':'custom amount'}</T><T weight="600" color={th.br}>{amount(chosen)}</T></Row>
          <T size={12} color={th.mut} style={{marginTop:7}}>{label("lbl.cms.ca05018be110", "Equivalent to ")}{total?((chosen/total)*100).toFixed(1):'0'}{label("lbl.cms.19192368f257", "% of the original bill. Wallet only.")}</T>
        </Card> : <Card><T weight="600">{label("lbl.cms.f4a87149377d", "Full bill payment")}</T><T size={13} color={th.mut} style={{marginTop:7}}>{label("lbl.cms.666ec91f4a22", "This request requires one person to pay the entire ")}{amount(remaining)}{label("lbl.cms.6472bf2c1c5e", ". In the live flow, eligible Wallet and card payment options are offered.")}</T></Card>}
        <Cta label={label("lbl.cms.da77f6ee2ece", "Simulate paying {value0}").replace(/\{value0\}/g, String(amount(chosen)))} onPress={addContribution} />
      </> : null}
      {step==='progress'||step==='complete' ? <>
        <Card>
          <T weight="600">{step==='complete'?label("lbl.cms.8ff661770946", "Fully funded · preview"):label("lbl.cms.099a7872e3cb", "Customer funding overview")}</T>
          <View style={{height:9,borderRadius:9,backgroundColor:th.soft,overflow:'hidden',marginTop:15}}>
            <View style={{height:9,width:`${total?Math.min(100,Math.round(funded/total*100)):0}%`,backgroundColor:th.br}} />
          </View>
          <Row sp style={{marginTop:9}}><T size={13}>{total?Math.round(funded/total*100):0}{label("lbl.cms.05521fd984d2", "% funded")}</T><T size={13} weight="600">{amount(remaining)} {label("lbl.cms.046f168e2991", "left")}</T></Row>
          <T weight="600" style={{marginTop:17}}>{label("lbl.cms.e0f192b8b2cb", "Contributions · customer view only")}</T>
          {contributions.map((c,i)=><Row key={i} sp style={{marginTop:9}}><T size={13}>{c.name}</T><T size={13}>{amount(c.cents)}</T></Row>)}
          <T size={12} color={th.mut} style={{marginTop:12}}>{label("lbl.cms.84439715c11a", "Contributors cannot see this list or the number of people who paid.")}</T>
        </Card>
        {step==='progress'? <Cta label={label("lbl.cms.091a111ce415", "Preview another friend's contribution")} onPress={()=>{setRecipient(v=>(v+1)%3);setPercent(25);setCustomPercent('');setCustomAmount('');setAmountMode('percent');setStep('pay');}} />:
          <Card><T weight="600">{label("lbl.cms.54627b4c469e", "What happens next?")}</T><T size={13} color={th.mut} style={{marginTop:8}}>{label("lbl.cms.70ab53df00d6", "Once the server confirms all funds, checkout details and store availability must be revalidated. Only then can the real Goodies order be placed. If the request expires or fails, payments must be reversed.")}</T></Card>}
      </> : null}
      {step!=='setup' ? <Pressable onPress={previous} style={{paddingVertical:10,alignSelf:'flex-start'}}><T color={th.br} weight="600">{label("lbl.cms.5736a9bb3c88", "Previous step")}</T></Pressable> : null}
      <Pressable onPress={()=>reset(mode)} style={{paddingVertical:10,alignSelf:'flex-start'}}><T color={th.mut} size={13}>{label("lbl.cms.e5d115728d05", "Restart walkthrough")}</T></Pressable>
    </ScrollView>
  </View>;
}
