import React,{useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {C,loadContent,onContent,label as platformLabel} from '../../features/Goodies/content';
import {resolveGoodiesText} from '../../features/Goodies/i18n/resolveText';
import {wantissLocale} from '../../lib/locales';
import {getGoodiesSettlement,getGoodiesPayoutOptions,getGoodiesSettlementLedger,requestGoodiesPayout,payGoodiesCommission,registerGoodiesDestination,ensureGoodiesWallet,quoteGoodiesReceive,type GoodiesPayoutMethod} from '../../services/goodiesSettlement';
import {useApp,useS,useTheme,useQ,ago,uuid,Btn,Chips,Row,Divided,Empty,ErrBox,Loading,Pill,Seg,Field,SheetShell} from './BusinessSpaceShared';
const names=(label=platformLabel)=>({wal:label('lbl.settlement.wallet','Wantiss Wallet'),moncash:'MonCash',natcash:'NatCash',gcash:'GCash',bank:label('lbl.settlement.bank','Bank transfer')});
const timing=(method:string,label=platformLabel)=>method==='wal'?label('lbl.settlement.instant','Instant once earnings are available'):method==='bank'?label('lbl.settlement.bankTiming','7–14 business days'):label('lbl.settlement.digitalTiming','2 days');
function failureText(error:any,label=platformLabel){
 switch(error?.code){case 'P4001':return label('lbl.settlement.walletFunds','Add funds to your Wantiss Wallet before paying commission.');case 'P4101':return label('lbl.settlement.methodUnavailable','Currently unavailable');case 'P4102':case 'P4103':return label('lbl.settlement.quoteExpired','Refresh payout methods to get a current exchange quote.');default:return label('lbl.settlement.failed','Could not complete this request. Check your history and try again.');}
}
function statusText(status:string,label=platformLabel){switch(status){case 'completed':return label('lbl.settlement.statusCompleted','Completed');case 'posted':return label('lbl.settlement.statusRecorded','Recorded');case 'pending':return label('lbl.settlement.pending','Pending');case 'requested':return label('lbl.settlement.statusRequested','Requested');case 'processing':return label('lbl.settlement.statusProcessing','Processing');case 'held':return label('lbl.settlement.statusHeld','On hold');case 'failed':return label('lbl.settlement.statusFailed','Failed');case 'reversed':return label('lbl.settlement.statusReversed','Reversed');case 'verified':return label('lbl.settlement.statusVerified','Verified');case 'rejected':return label('lbl.settlement.statusRejected','Rejected');default:return label('lbl.settlement.statusReview','Under review');}}
function entryText(type:string,label=platformLabel){switch(type){case 'sale':return label('lbl.settlement.entrySale','Sale');case 'fee':return label('lbl.settlement.entryFee','Commission owed');case 'commission_payment':return label('lbl.settlement.entryCommissionPaid','Commission paid');case 'refund':return label('lbl.settlement.entryRefund','Refund');case 'payout':return label('lbl.settlement.entryPayout','Payout');default:return label('lbl.settlement.entryOther','Settlement');}}
function useSettlementLabels(){
 const app=useApp(),[,rerender]=useState(0),locale=wantissLocale(app.lang);
 useEffect(()=>{const stop=onContent(()=>rerender(value=>value+1));void loadContent();return stop;},[]);
 return {label:(id:string,fallback:string)=>resolveGoodiesText(C?.labels?.find((row:any)=>row.id===id)?.t,locale,false)||fallback,money:(amount:number,currency='USD')=>new Intl.NumberFormat(locale==='ht'?'fr-HT':locale,{style:'currency',currency}).format(amount),locale};
}
function useMounted(){const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);return active;}
export function GoodiesPayoutsPanel(){
 const app=useApp(),s=useS(),t=useTheme(),active=useMounted(),{label,money,locale}=useSettlementLabels();
 const sum=useQ(()=>getGoodiesSettlement(app.biz.id),[app.biz.id,app.tick]);
 const [tab,setTab]=useState('Ledger'),[filter,setFilter]=useState('All'),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 const lock=useRef(false),commissionKey=useRef(uuid());
 const ledgerType=tab==='Payout history'?'payout':({Sales:'sale',Fees:'fee',Refunds:'refund',Payouts:'payout'} as Record<string,string>)[filter]||null;
 const rows=useQ(()=>getGoodiesSettlementLedger(app.biz.id,page*30,ledgerType),[app.biz.id,page,app.tick,ledgerType]);
 const ready=!!sum.d&&!sum.e&&!sum.l,owner=app.biz.role==='owner',d=sum.d;
 const run=async(work:()=>Promise<unknown>)=>{if(lock.current)return;lock.current=true;setBusy(true);setFailure('');try{await work();if(active.current){commissionKey.current=uuid();app.bump();}}catch(error){if(active.current)setFailure(failureText(error,label));}finally{lock.current=false;if(active.current)setBusy(false);}};
 const filterLabels=[['All',label('lbl.settlement.all','All')],['Sales',label('lbl.settlement.sales','Sales')],['Fees',label('lbl.settlement.fees','Fees')],['Refunds',label('lbl.settlement.refunds','Refunds')],['Payouts',label('lbl.settlement.payouts','Payouts')]];
 const visible=(rows.d||[]).filter(row=>tab!=='Payout history'||row.type==='payout');
 return <View style={{gap:12}}>
  <View style={{borderRadius:22,backgroundColor:'#2D5BFF',padding:16}}><Text style={{fontSize:10,fontWeight:'800',color:'#DDE5FF'}}>{label('lbl.settlement.available','GOODIES AVAILABLE')}</Text><Text style={{fontSize:28,fontWeight:'800',color:'#fff',marginTop:6}}>{sum.l?label('lbl.settlement.loading','Loading…'):!ready?label('lbl.settlement.unavailable','Unavailable'):money(d!.available)}</Text><Text style={{color:'#DDE5FF',marginTop:6,fontSize:12}}>{label('lbl.settlement.pending','Pending')}: {ready?money(d!.pending):'—'}</Text></View>
  {sum.e?<ErrBox e={label('lbl.settlement.summaryFailed','Goodies settlement details are unavailable.')} retry={sum.reload}/>:null}
  {ready?<>
   {owner&&!d!.wallet_ready?<Btn kind="soft" label={label('lbl.settlement.createWallet','Create Wantiss Wallet')} busy={busy} disabled={busy} onPress={()=>void run(()=>ensureGoodiesWallet())}/>:null}
   <Text style={s.mut}>{label('lbl.settlement.hold','Earnings become available 24 hours after confirmed delivery. Disputed amounts remain held.')}</Text>
   {d!.recovery_due>0?<Text style={{color:t.badFg}}>{label('lbl.settlement.recovery','Balance requiring review')}: {money(d!.recovery_due)}</Text>:null}
   <View style={s.card}><Text style={s.rt}>{label('lbl.settlement.cashCommission','Cash-order commission')}</Text><Text style={s.mut}>{label('lbl.settlement.cashSales','Cash sales awaiting settlement')}: {money(d!.cash_sales_htg,'HTG')} / {money(d!.cash_sales_limit_htg,'HTG')}</Text><Text style={s.mut}>{label('lbl.settlement.owed','Commission and platform fees owed')}: {money(d!.commission_due)}</Text>{d!.settlement_due_at?<Text style={{color:d!.cash_paused?t.badFg:t.mute}}>{label('lbl.settlement.due','Settle by')}: {new Date(d!.settlement_due_at).toLocaleString(locale)}</Text>:null}{d!.cash_paused?<Text style={{color:t.badFg}}>{label('lbl.settlement.paused','New cash orders are paused until settlement. Accepted orders continue.')}</Text>:null}
   {owner&&d!.commission_due>0?<Btn kind="soft" label={label('lbl.settlement.openWallet','Open Wantiss Wallet')} disabled={busy} onPress={app.onWallet||app.onBuyer}/>:null}{owner?<Btn kind="soft" label={label('lbl.settlement.payCommission','Pay commission with Wantiss Wallet')} busy={busy} disabled={busy||d!.commission_due<=0} onPress={()=>void run(async()=>{const result=await payGoodiesCommission(app.biz.id,commissionKey.current);if(result?.status!=='completed')throw Error('Unconfirmed payment');})}/>:null}</View>
  </>:null}
  {failure?<ErrBox e={failure} retry={()=>{setFailure('');sum.reload();rows.reload();}}/>:null}
  <Btn label={label('lbl.settlement.request','Request payout')} disabled={!ready||!owner||app.biz.verification==='restricted'||d!.available<=0} onPress={()=>app.sheet('request')}/>
  {owner?<Btn kind="soft" label={label('lbl.settlement.methods','Manage payout methods')} onPress={()=>app.sheet('payout')}/>:null}
  <Seg items={[label('lbl.settlement.ledger','Ledger'),label('lbl.settlement.history','Payout history')]} value={tab==='Ledger'?label('lbl.settlement.ledger','Ledger'):label('lbl.settlement.history','Payout history')} onChange={(value:string)=>{setTab(value===label('lbl.settlement.ledger','Ledger')?'Ledger':'Payout history');setPage(0);}}/>
  {tab==='Ledger'?<Chips items={filterLabels.map(row=>row[1])} value={filterLabels.find(row=>row[0]===filter)?.[1]} onChange={(value:string)=>{setFilter(filterLabels.find(row=>row[1]===value)?.[0]||'All');setPage(0);}}/>:null}
  {rows.e?<ErrBox e={label('lbl.settlement.historyFailed','Could not load settlement history.')} retry={rows.reload}/>:rows.l?<Loading/>:visible.length?<Divided>{visible.map(row=><Row key={row.id} title={row.type==='payout'?label('lbl.settlement.entryPayout','Payout'):row.type==='commission_payment'?label('lbl.settlement.entryCommissionPaid','Commission paid'):row.label} sub={`${ago(row.created_at)} · ${row.method?names(label)[row.method as GoodiesPayoutMethod]||row.method:entryText(row.type,label)}${row.details?.eta_to&&row.method!=='wal'?' · '+new Date(row.details.eta_from).toLocaleDateString(locale)+' – '+new Date(row.details.eta_to).toLocaleDateString(locale):''}`} right={<View><Text style={{color:t.ink,fontWeight:'800'}}>{money(Number(row.amount))}</Text>{row.details?.receive_amount?<Text style={s.mut}>{money(Number(row.details.receive_amount),row.details.receive_currency)}</Text>:null}<Pill tone={row.status==='completed'||row.status==='posted'?'good':row.status==='failed'?'bad':'warn'}>{statusText(row.status,label)}</Pill></View>}/>)}</Divided>:<Empty icon="bank-transfer" title={label('lbl.settlement.noHistory','No settlement transactions yet')}/>}
  <View style={{flexDirection:'row',gap:8}}><Btn small kind="soft" label={label('lbl.settlement.previous','Previous page')} disabled={page===0||rows.l} onPress={()=>setPage(page-1)}/><Btn small kind="soft" label={label('lbl.settlement.next','Next page')} disabled={rows.l||(rows.d||[]).length<30} onPress={()=>setPage(page+1)}/></View>
 </View>;
}
export function GoodiesPayoutRequestSheet(){
 const app=useApp(),s=useS(),t=useTheme(),active=useMounted(),{label,money}=useSettlementLabels(),summary=useQ(()=>getGoodiesSettlement(app.biz.id),[app.biz.id,app.tick]),options=useQ(()=>getGoodiesPayoutOptions(app.biz.id),[app.biz.id,app.tick]);
 const [method,setMethod]=useState<GoodiesPayoutMethod>('wal'),[destination,setDestination]=useState(''),[amount,setAmount]=useState(''),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 const locked=useRef(false),intent=useRef<{key:string;signature:string}|null>(null);
 const createWallet=async()=>{if(locked.current)return;locked.current=true;setBusy(true);setFailure('');try{await ensureGoodiesWallet();if(active.current)await summary.reload();}catch(error){if(active.current)setFailure(failureText(error,label));}finally{locked.current=false;if(active.current)setBusy(false);}};
 const ready=!summary.l&&!summary.e&&!!summary.d&&!options.l&&!options.e&&!!options.d;
 const [quoteNow,setQuoteNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setQuoteNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const dest=options.d?.destinations.find(row=>row.id===destination&&row.method===method&&row.status==='verified'&&row.usable!==false);
 const currency=method==='wal'?'USD':dest?.country==='HT'?'HTG':dest?.country==='PH'?'PHP':'USD';
 const rate=currency==='USD'?'1':options.d?.rates.find(row=>row.currency===currency&&Date.parse(row.expires_at)>quoteNow)?.rate;
 const value=Number(amount),receive=rate==null?NaN:quoteGoodiesReceive(amount,rate);
 useEffect(()=>{if(summary.d&&!amount&&!intent.current)setAmount(summary.d.available.toFixed(2));},[summary.d]); // eslint-disable-line react-hooks/exhaustive-deps
 const enabled=options.d?.channels.some(row=>row.method===method&&row.enabled);
 const valid=app.biz.role==='owner'&&ready&&enabled&&(method!=='wal'||summary.d!.wallet_ready)&&/^\d+(\.\d{1,2})?$/.test(amount)&&value>0&&value<=summary.d!.available&&Number.isFinite(receive)&&receive>0&&(method==='wal'||!!dest);
 async function send(){
  if(!valid||locked.current)return;locked.current=true;setBusy(true);setFailure('');
  const signature=JSON.stringify([method,destination,amount,receive]);
  if(intent.current&&intent.current.signature!==signature){setFailure(label('lbl.settlement.checkHistory','Check payout history before changing an unresolved request.'));locked.current=false;setBusy(false);return;}
  intent.current??={key:uuid(),signature};
  try{const result=await requestGoodiesPayout(app.biz.id,value,method,method==='wal'?null:destination,intent.current.key,receive);if(!result?.id||!['requested','processing','completed'].includes(result.status))throw Error('Unconfirmed payout');if(active.current){app.toast(result.status==='completed'?label('lbl.settlement.walletSent','Sent to your Wantiss Wallet'):label('lbl.settlement.requested','Payout requested. Check history for its status.'));app.bump();app.closeSheet();}}
  catch{if(active.current)setFailure(label('lbl.settlement.failed','Could not complete this request. Check your history and try again.'));}
  finally{locked.current=false;if(active.current)setBusy(false);}
 }
 return <SheetShell title={label('lbl.settlement.request','Request payout')} onClose={app.closeSheet} tall>
  {!ready?summary.e||options.e?<ErrBox e={label('lbl.settlement.summaryFailed','Goodies settlement details are unavailable.')} retry={()=>{summary.reload();options.reload();}}/>:<Loading/>:<>
   <Text style={s.mut}>{label('lbl.settlement.available','GOODIES AVAILABLE')}: {money(summary.d!.available)}</Text>
   <Divided>{options.d!.channels.map(channel=><Row key={channel.method} onPress={()=>{if(!busy&&channel.enabled){setMethod(channel.method);setDestination('');}}} title={`${method===channel.method?'● ':''}${names(label)[channel.method]}`} sub={channel.enabled?timing(channel.method,label):label('lbl.settlement.methodUnavailable','Currently unavailable')}/>)}</Divided>
   {method!=='wal'?<Divided>{options.d!.destinations.filter(row=>row.method===method&&row.status==='verified').map(row=><Row key={row.id} title={`${row.id===destination?'● ':''}•••• ${row.masked}`} sub={row.usable===false?label('lbl.settlement.methodUnavailable','Currently unavailable'):undefined} onPress={()=>{if(!busy&&row.usable!==false)setDestination(row.id);}}/>)}</Divided>:null}
   <Field label={label('lbl.settlement.amount','Amount (USD)')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy}/>
   {method!=='wal'&&dest&&rate==null?<ErrBox e={label('lbl.settlement.quoteExpired','Refresh payout methods to get a current exchange quote.')} retry={options.reload}/>:null}
   {Number.isFinite(receive)&&receive>0?<Text style={s.mut}>{label('lbl.settlement.receive','You receive')}: {money(receive,currency)} · {timing(method,label)}</Text>:null}
   {method!=='wal'&&!dest?<Btn kind="soft" label={label('lbl.settlement.methods','Manage payout methods')} onPress={()=>app.sheet('payout')}/>:null}
   {failure?<><Text style={{color:t.badFg}}>{failure}</Text><Btn kind="soft" label={label('lbl.settlement.history','Payout history')} onPress={()=>{app.bump();app.closeSheet();}}/></>:null}
   {method==='wal'&&!summary.d!.wallet_ready?<Btn kind="soft" label={label('lbl.settlement.createWallet','Create Wantiss Wallet')} disabled={busy} onPress={()=>void createWallet()}/>:null}
   <Btn label={label('lbl.settlement.confirm','Confirm payout')} busy={busy} disabled={!valid||busy} onPress={()=>void send()}/>
  </>}
 </SheetShell>;
}
export function GoodiesPayoutSetupSheet(){
 const app=useApp(),s=useS(),t=useTheme(),active=useMounted(),{label}=useSettlementLabels(),options=useQ(()=>getGoodiesPayoutOptions(app.biz.id),[app.biz.id,app.tick]);
 const [method,setMethod]=useState('moncash'),[country,setCountry]=useState('HT'),[holder,setHolder]=useState(''),[account,setAccount]=useState(''),[bank,setBank]=useState(''),[routing,setRouting]=useState(''),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');const lock=useRef(false);
 const countries=[['HT',label('lbl.settlement.countryHT','Haiti')],['PH',label('lbl.settlement.countryPH','Philippines')],['US',label('lbl.settlement.countryUS','United States')]];
 const save=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setFailure('');try{await registerGoodiesDestination(app.biz.id,method,method==='gcash'?'PH':method==='bank'?country:'HT',holder,{account,bank,routing});if(active.current){setAccount('');setRouting('');app.toast(label('lbl.settlement.reviewPending','Payout details submitted for verification.'));app.bump();options.reload();}}catch{if(active.current)setFailure(label('lbl.settlement.saveFailed','Could not save payout details. Check the fields and try again.'));}finally{lock.current=false;if(active.current)setBusy(false);}};
 return <SheetShell title={label('lbl.settlement.methods','Manage payout methods')} onClose={app.closeSheet} tall>
  {options.e?<ErrBox e={label('lbl.settlement.optionsFailed','Payout methods are unavailable.')} retry={options.reload}/>:options.l?<Loading/>:<>
   {app.biz.role!=='owner'?<Text style={s.mut}>{label('lbl.settlement.ownerRequired','Only a business owner can request payouts or manage payout details.')}</Text>:null}
   <Text style={s.mut}>{label('lbl.settlement.walletAutomatic','Wantiss Wallet is available without an external payout account.')}</Text>
   {(options.d?.destinations||[]).map(row=><Row key={row.id} title={`${names(label)[row.method]} · •••• ${row.masked}`} sub={statusText(row.status,label)}/>)}
   <Chips items={(['moncash','natcash','gcash','bank'] as GoodiesPayoutMethod[]).map(key=>names(label)[key])} value={names(label)[method as GoodiesPayoutMethod]} onChange={(value:string)=>{if(!busy)setMethod((['moncash','natcash','gcash','bank'] as GoodiesPayoutMethod[]).find(key=>names(label)[key]===value)||'moncash');}}/>
   {method==='bank'?<Chips items={countries.map(row=>row[1])} value={countries.find(row=>row[0]===country)?.[1]} onChange={(value:string)=>{if(!busy)setCountry(countries.find(row=>row[1]===value)?.[0]||'HT');}}/>:null}
   <Field label={label('lbl.settlement.holder','Account holder')} value={holder} onChangeText={setHolder} editable={!busy}/>
   <Field label={method==='bank'?label('lbl.settlement.account','Account number'):label('lbl.settlement.phone','Wallet phone number')} value={account} onChangeText={setAccount} editable={!busy} autoCapitalize="none"/>
   {method==='bank'?<><Field label={label('lbl.settlement.bankName','Bank name')} value={bank} onChangeText={setBank} editable={!busy}/><Field label={label('lbl.settlement.routing','Routing / SWIFT code')} value={routing} onChangeText={setRouting} editable={!busy}/></>:null}
   <Text style={s.mut}>{label('lbl.settlement.destinationReview','External payout details require verification before use.')}</Text>
   {failure?<Text style={{color:t.badFg}}>{failure}</Text>:null}
   <Btn label={label('lbl.settlement.save','Submit for verification')} busy={busy} disabled={app.biz.role!=='owner'||busy||holder.trim().length<2||account.trim().length<6||(method==='bank'&&(bank.trim().length<2||routing.trim().length<4))} onPress={()=>void save()}/>
  </>}
 </SheetShell>;
}
