import React, {useState} from 'react';
import {View, Text, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, Share} from 'react-native';
import {T, Cta, Row, Card, Badge, Input, Radio, SheetBox, Bar, useTheme} from './ui';
import {Icon} from './Icon';
import {S, STB, money, emit, save, toast, ui, addr, defAddr, done, phoneOK, fmtDay, fmtTime, alcAge} from '../store';
import * as A from '../actions';
import {supabase} from '../../lib/supabase';
import {PROMO_DETAIL} from '../data/promoText';
import {bzLeave, bzDiscard, bzReset2} from '../builders/engine';
import {rgText, importContent, clearContent, hasContent, label} from '../content';
import {TextInput, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

export function Sheets({sheet, close}: {sheet: any; close: () => void}) {
  const th = useTheme(), insets = useSafeAreaInsets(), {height: windowHeight} = useWindowDimensions();
  if (!sheet) return null;
  const k = sheet.kind;
  const stars = (n: number, on: (v: number) => void) => <View style={{flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 10}}>{[1, 2, 3, 4, 5].map(v => <Pressable key={v} onPress={() => on(v)}><Icon name="star" size={32} color={n >= v ? '#FFB400' : th.line} fill /></Pressable>)}</View>;
  let content: any = null;
  if (k === 'newcart') content = (<><T size={20} weight="800">{label('lbl.sheetStartCart', 'Start a new cart?')}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>Your cart has items from {sheet.from}. Orders are placed with one store at a time, so adding from {sheet.to} replaces them.</T><Cta label={label('lbl.sheetReplace', 'Replace and add')} onPress={A.newCart} /><View style={{height: 10}} /><Cta ghost label={label('lbl.sheetKeepCart', 'Keep current cart')} onPress={close} /></>);
  if (k === 'byoleave') content = (<><T size={20} weight="800">{sheet.edit ? label('lbl.sheetDiscardTitle', 'Discard your changes?') : label('lbl.sheetLeaveTitle', 'Leave this builder?')}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{sheet.edit ? label('lbl.sheetDiscardText', 'The item in your cart stays as it was.') : label('lbl.sheetLeaveText', 'Your choices can be saved as a draft so you can pick up where you left off.')}</T>{sheet.edit ? null : <><Cta label={label('lbl.sheetBuilderSave', 'Save draft and leave')} onPress={bzLeave} /><View style={{height: 10}} /></>}<Pressable onPress={bzDiscard} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">{label('lbl.sheetDiscard', 'Discard')}</T></Pressable><View style={{height: 10}} /><Cta ghost label={label('lbl.sheetKeepEditing', 'Keep editing')} onPress={close} /></>);
  if (k === 'byoreset') content = (<><T size={20} weight="800">{label('lbl.sheetStartOver', 'Start over?')}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label("lbl.sheetAuto1DTRBEO", "This clears your current choices. Items already in your cart are not affected.")}</T><Cta label={label("lbl.sheetAutoT5109D", "Start over")} onPress={bzReset2} /><View style={{height: 10}} /><Cta ghost label={label('lbl.sheetKeepEditing', 'Keep editing')} onPress={close} /></>);
  if (k === 'alcrules') { const a = alcAge(sheet.sid || (S.pend && S.pend[0] ? S.pend[0].s : null)); content = (<><View style={{alignItems: 'center', marginBottom: 6}}><Text style={{fontSize: 44}}>🪪</Text></View><T size={20} weight="800">{label('lbl.sheetAlcoholRules', 'Alcohol rules')}</T><T color={th.mut} style={{marginTop: 8, lineHeight: 21}}>{rgText('rg.rules', 'Alcohol is sold only to customers aged {age} or older. Minors may not buy alcohol. Valid government photo ID is required at delivery or pickup. If the ID check fails, you are refunded to your Wantiss wallet minus the delivery fee.', a.age)}</T><Card style={{marginTop: 12}}><T size={13.5}>• Minimum age here: <T weight="800">{a.age}</T></T><T size={13.5}>{label("lbl.sheetAuto9O43A9", "• The courier checks your ID at the door. At a pickup, the shop checks it.")}</T><T size={13.5}>{label("lbl.sheetAuto1JBCM1P", "• If it fails, you get a refund to your Wantiss wallet minus the delivery fee.")}</T></Card><View style={{height: 6}} /><Cta label={label('lbl.sheetAlcoholAccept', 'I understand')} onPress={A.alcAccept} /><View style={{height: 10}} /><Cta ghost label={label("lbl.sheetAutoWFRFF9", "Cancel")} onPress={close} /></>); }
  if (k === 'group-order') content = <GroupOrderSheet close={close} />;
  if (k === 'schedule') content = <ScheduleSheet close={close} />;
  if (k === 'import') content = <ImportSheet close={close} />;
  if (k === 'contacts') content = <ContactsSheet close={close} />;
  if (k === 'ctform') content = <CtForm key={sheet.id || 'new'} id={sheet.id} />;
  if (k === 'topup') content = (<><T size={20} weight="800">{label('lbl.sheetTopup', 'Top up wallet')}</T><T color={th.mut} style={{marginTop: 6, marginBottom: 14}}>{label('lbl.sheetDemoMoney', 'Demo: no real money moves.')}</T><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{[10, 20, 50, 100].map(v => <Pressable key={v} onPress={() => {S.wallet += v; close(); toast(label('lbl.sheetWalletToppedUp', 'Wallet topped up to {amount}').replace('{amount}', money(S.wallet))); save(); emit();}} style={{paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, backgroundColor: th.soft}}><T size={14} weight="700">+{money(v)}</T></Pressable>)}</View></>);
  if (k === 'replace') content = (<><T size={20} weight="800">{label('lbl.sheetReplaceCart', 'Replace your cart?')}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>Your cart has items from {sheet.from}.</T><Cta label={label('lbl.sheetReorder', 'Replace and reorder')} onPress={A.runReorder} /><View style={{height: 10}} /><Cta ghost label={label('lbl.sheetKeepCart', 'Keep current cart')} onPress={close} /></>);
  if (k === 'remove-item') content = (<><T size={20} weight="800">{label('lbl.sheetRemoveItemTitle', 'Remove this item?')}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label('lbl.sheetRemoveItemBody', 'Remove {item} from your cart?').replace('{item}', String(sheet.itemName || 'this item'))}</T><Cta label={label('lbl.sheetRemoveItemConfirm', 'Remove item')} onPress={() => { A.qty(String(sheet.lineKey), -1); close(); }} /><View style={{height: 10}} /><Cta ghost label={label('lbl.sheetKeepItem', 'Keep item')} onPress={close} /></>);
  if (k === 'clear') content = (<><T size={20} weight="800">{label('lbl.sheetClearCart', 'Clear your cart?')}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label("lbl.sheetAuto1K2QIKR", "All items will be removed.")}</T><Pressable onPress={A.clearCart} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">{label('lbl.sheetClearCartAction', 'Clear cart')}</T></Pressable><View style={{height: 10}} /><Cta ghost label={label("lbl.sheetAutoWFRFF9", "Cancel")} onPress={close} /></>);
  if (k === 'cancel') content = (<><T size={20} weight="800">{label('lbl.sheetCancelOrder', 'Cancel this order?')}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label("lbl.sheetAutoFMXIAY", "You can cancel until the store finishes preparing it.")}</T><Pressable onPress={() => A.cancelOrder(sheet.id)} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">{label('lbl.sheetCancelConfirm', 'Yes, cancel order')}</T></Pressable><View style={{height: 10}} /><Cta ghost label={label("lbl.sheetAuto81YEJ2", "Keep order")} onPress={close} /></>);
  if (k === 'promo') {
    const d = PROMO_DETAIL[sheet.p as 'free' | 'points' | 'produce'], custom = sheet.custom || {};
    content = (<>
      <View style={{height: 150, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: d.bg, marginBottom: 12}}><Text style={{fontSize: 78}}>{custom.emoji || d.e}</Text></View>
      <T size={21} weight="800">{custom.title || d.t}</T>
      <T color={th.mut} style={{marginVertical: 8, marginBottom: 18, lineHeight: 21}}>{custom.sub || d.d}</T>
      <Cta label={custom.btn || d.b} onPress={() => {
        const target = String(custom.target || '');
        if (target.startsWith('category:')) A.promoGo(target.slice(9));
        else if (target === 'screen:wallet') {close(); A.go('payments');}
        else if (target === 'screen:promos') {close(); A.go('promos');}
        else if (target) {close(); A.go('catlist', 'all');}
        else A.promoGo(d.go);
      }} />
    </>);
  }
  if (k === 'sinfo') {
    const s = STB[sheet.id];
    const row = (a: string, b: string) => <View key={a} style={{flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: th.line}}><T color={th.mut} style={{width: '38%'}}>{a}</T><T color={th.ink} weight="700" style={{flex: 1, textAlign: 'right'}}>{b}</T></View>;
    content = (<>
      <T size={23} weight="800">{s.businessName || s.n}</T>
      <T color={th.mut} style={{marginTop: 6, marginBottom: 14, lineHeight: 21}}>{s.businessDescription || s.k}</T>
      <Card style={{padding: 16}}>
        <Row style={{gap: 10, alignItems: 'center', marginBottom: 10}}>
          <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.sheetAutoC0Z21F", "Read store reviews")} onPress={() => {close(); A.go('reviews', sheet.id);}} style={{flex: 1}}><T size={13} color={th.br}>{label('lbl.storeCustomerReviews', 'Customer reviews').toUpperCase()}</T><T size={18} weight="800">{s.rv > 0 ? label('lbl.sheetRatingSummary', '★ {rating} ({n} reviews)').replace('{rating}', s.r.toFixed(1)).replace('{n}', String(s.rv)) : label('lbl.storeNoReviewsYet', 'No reviews yet')}</T></Pressable>
          <Badge label={s.open ? label('lbl.sheetOpenNow', 'Open now') : label('lbl.sheetClosedNow', 'Closed now')} />
        </Row>
        {row(label('lbl.storeOpeningHours', 'Opening hours'), s.h)}
        {row(label('lbl.storeCurrentStatus', 'Current status'), s.open ? label('lbl.sheetAcceptingOrders', 'Accepting orders') : s.nx || label('lbl.storeCurrentlyClosed', 'Currently closed'))}
        {s.businessAddress ? row(label('lbl.storeAddress', 'Address'), [s.businessAddress, s.businessCity, s.businessCountry].filter(Boolean).join(', ')) : null}
        {s.businessPhone ? row(label('lbl.storePhone', 'Phone'), s.businessPhone) : null}
        {s.businessEmail ? row(label('lbl.storeEmail', 'Email'), s.businessEmail) : null}
        {s.businessWebsite ? row(label('lbl.storeWebsite', 'Website'), s.businessWebsite) : null}
        {s.businessDeliveryModes?.length ? row(label('lbl.storeServices', 'Available services'), s.businessDeliveryModes.join(' and ')) : null}
        {row(label('lbl.storeDeliveryFee', 'Delivery fee'), s.fee === 0 ? label('lbl.filterFree', 'Free delivery') : money(s.fee))}
        {row(label('lbl.storeMinimumOrder', 'Minimum order'), money(s.min))}
        {s.live ? (s.distanceReady ? row(label('lbl.storeDistance', 'Distance'), label('lbl.storeDistanceFromAddress', '{km} km from your address').replace('{km}', s.km.toFixed(1))) : null) : row(label('lbl.storeDistance', 'Distance'), label('lbl.sheetKmAway', '{km} km away').replace('{km}', s.km.toFixed(1)))}
        {row(label('lbl.storeEstimatedDelivery', 'Estimated delivery'), s.eta + ' min')}
        {row(label('lbl.storeOrderMethods', 'Order methods'), label('lbl.sheetDeliveryAndPickup', 'Delivery and pickup'))}
        {row(label('lbl.storeScheduledOrders', 'Scheduled orders'), s.acceptScheduledOrders ? label('lbl.sheetScheduledAvailable', 'Available while closed') : label('lbl.sheetScheduledOnlyOpen', 'Only while open'))}
        {s.acceptScheduledOrders ? row(label('lbl.storeAdvanceTime', 'Earliest order time'), String(s.scheduledOrderStartTime || '10:00').slice(0,5)) : null}
      </Card>
    </>);
  }
  if (k === 'msg') content = (<><T size={20} weight="800" style={{marginBottom: 14}}>{label('lbl.sheetCourierTitle', 'Message courier')}</T><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{[{id: 'lbl.sheetCourierAtGate', text: label('lbl.sheetCourierAtGate', 'I am at the gate')}, {id: 'lbl.sheetCourierCall', text: label('lbl.sheetCourierCall', 'Please call me')}, {id: 'lbl.sheetCourierDoor', text: label('lbl.sheetCourierDoor', 'Leave it at the door')}, {id: 'lbl.sheetCourierLate', text: label('lbl.sheetCourierLate', 'Running 5 min late')}].map(x => <Pressable key={x.id} onPress={() => {close(); toast(label('lbl.sheetCourierSent', 'Sent: {message}').replace('{message}', x.text));}} style={{paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: th.soft}}><T size={13.5} weight="700">{x.text}</T></Pressable>)}</View></>);
  if (k === 'review' || k === 'driver-review') content = <ReviewSheet key={String(sheet.id) + ':' + k} id={sheet.id} stars={stars} driver={k === 'driver-review'} initialStars={sheet.initialStars} />;
  if (k === 'addr') content = (<><T size={20} weight="800" style={{marginBottom: 4}}>{label('lbl.sheetDeliverToTitle', 'Deliver to')}</T><T size={12.5} color={th.mut} style={{marginBottom: 12}}>{label('lbl.sheetAddressScope', 'Choosing an address here only changes Goodies. Your Wantiss default stays the same.')}</T>{S.addr.map((a: any) => <Radio key={a.id} on={a.id === S.as} onPress={() => A.selectAddr(a.id)}><Row style={{gap: 6}}><T weight="700">{a.l}</T>{a.def ? <Badge green label={label("lbl.sheetAutoCKTN2B", "Wantiss default")} /> : null}{a.goodiesDefault ? <View style={{backgroundColor: '#FD802E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3}}><T size={10} weight="800" color="#fff">GOODIES</T></View> : null}</Row><T size={12.5} color={th.mut}>{a.t}</T></Radio>)}<Cta ghost label={label("lbl.sheetAuto16NJT2W", "Manage addresses")} onPress={() => {close(); A.go('addresses');}} /></>);

  const isRatingSheet = k === 'review' || k === 'driver-review';
  const isCenteredSheet = k === 'remove-item' || k === 'clear';
  return (
    <Modal transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,.5)', justifyContent:isCenteredSheet?'center':'flex-end', alignItems:isCenteredSheet?'center':'stretch', paddingHorizontal:isCenteredSheet?22:0}}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={label("lbl.sheetAutoKDBKGE", "Close sheet")} style={{position:'absolute',top:0,left:0,right:0,bottom:0}} />
          <View style={{width:isCenteredSheet?'100%':'100%', height: isRatingSheet ? Math.min(430, windowHeight * 0.68) : k==='schedule' ? Math.min(windowHeight * 0.86, 760) : undefined, maxHeight: isRatingSheet ? windowHeight * 0.68 : k==='promo'&&sheet.custom ? '68%' : k==='sinfo'||k==='promo' ? '92%' : isCenteredSheet?'60%':'90%', flexShrink:1, minHeight:0, marginBottom:0}}>
            <SheetBox centered={isCenteredSheet} large={isRatingSheet || k === 'sinfo' || (k === 'promo' && !sheet.custom)} compact={k === 'promo' && !!sheet.custom} onClose={close}><ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{paddingBottom:Math.max(16,insets.bottom),flexGrow:1}} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>{content}</ScrollView></SheetBox>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ScheduleSheet({close}: {close: () => void}) {
  const th = useTheme(), store: any = STB[S.cart.sid];
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const now = new Date();
  const roundedNow = new Date(now); roundedNow.setMinutes(Math.ceil(now.getMinutes()/5)*5,0,0);
  if (roundedNow.getTime() <= now.getTime()) roundedNow.setMinutes(roundedNow.getMinutes()+5);
  const minimumOrderTime = String(store?.scheduledOrderStartTime || '10:00').slice(0,5);
  const [minimumHour, minimumMinute] = minimumOrderTime.split(':').map(Number);
  const initialConfiguredMinimum = new Date(now);
  initialConfiguredMinimum.setHours(minimumHour || 0, minimumMinute || 0, 0, 0);
  const todayHours = store?.scheduleHours?.[dayNames[now.getDay()]];
  const openingMinimum = new Date(now);
  if (todayHours && !todayHours.closed && todayHours.open) {
    const [openHour, openMinute] = String(todayHours.open).split(':').map(Number);
    openingMinimum.setHours(openHour, openMinute || 0, 0, 0);
  } else openingMinimum.setHours(0, 0, 0, 0);
  const initialSchedule = new Date(Math.max(S.sch && S.sch > Date.now() ? S.sch : 0, roundedNow.getTime(), initialConfiguredMinimum.getTime(), openingMinimum.getTime()));
  const [dayOffset,setDayOffset] = useState(() => {
    if (!S.sch || S.sch <= Date.now()) return 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const chosen = new Date(S.sch); chosen.setHours(0,0,0,0);
    return Math.max(0,Math.min(6,Math.round((chosen.getTime()-today.getTime())/86400000)));
  });
  const [deliveryMode,setDeliveryMode] = useState(S.mode === 'pickup' ? 'pickup' : 'delivery');
  const [customHour,setCustomHour] = useState(String(initialSchedule.getHours()).padStart(2,'0'));
  const [customMinute,setCustomMinute] = useState(String(initialSchedule.getMinutes()).padStart(2,'0'));
  const [customMode,setCustomMode] = useState(true);
  const [selectedTs,setSelectedTs] = useState<number>(() => S.sch && S.sch > Date.now() ? S.sch : 0);
  const selectedDate = new Date(now);
  selectedDate.setDate(now.getDate()+dayOffset); selectedDate.setHours(0,0,0,0);
  const schedule = store?.scheduleHours || {};
  const hours = schedule[dayNames[selectedDate.getDay()]];
  const opening = hours && !hours.closed && hours.open ? String(hours.open) : '';
  const closing = hours && !hours.closed && hours.close ? String(hours.close) : '';
  const configuredMinimum = new Date(selectedDate);
  configuredMinimum.setHours(minimumHour || 0, minimumMinute || 0, 0, 0);
  let earliest = dayOffset === 0 ? new Date() : new Date(selectedDate);
  if (opening) {
    const [oh, om] = opening.split(':').map(Number);
    const opens = new Date(selectedDate); opens.setHours(oh, om || 0, 0, 0);
    earliest = new Date(Math.max(earliest.getTime(), opens.getTime(), configuredMinimum.getTime()));
  } else {
    earliest = new Date(Math.max(earliest.getTime(), configuredMinimum.getTime()));
  }
  const noSchedule = !store?.scheduleHours || !Object.keys(store.scheduleHours).length;
  const hasHours = !!(hours && !hours.closed && opening && closing);
  let startMinute=0, endMinute=24*60;
  if(hasHours) {
    const [oh,om]=opening.split(':').map(Number),[ch,cm]=closing.split(':').map(Number);
    startMinute=oh*60+(om||0); endMinute=ch*60+(cm||0);
  } else { startMinute=8*60; endMinute=22*60; }
  const candidates:number[]=[];
  if(hasHours || noSchedule) {
    for(let mins=startMinute;mins<endMinute;mins+=30) {
      const d=new Date(selectedDate);d.setHours(Math.floor(mins/60),mins%60,0,0);
      if(d.getTime()<=Date.now() || d.getTime()<earliest.getTime()) continue;
      candidates.push(d.getTime());
    }
  }
  const customDate = new Date(selectedDate);
  const validCustomDigits = /^\d{1,2}$/.test(customHour) && /^\d{1,2}$/.test(customMinute) && Number(customHour)>=0 && Number(customHour)<=23 && Number(customMinute)>=0 && Number(customMinute)<=59;
  if (validCustomDigits) customDate.setHours(Number(customHour),Number(customMinute),0,0);
  const customMinutes = customDate.getHours()*60+customDate.getMinutes();
  const customInHours = hasHours ? customMinutes>=startMinute && customMinutes<endMinute : noSchedule && customMinutes>=8*60 && customMinutes<22*60;
  const customValid = validCustomDigits && customDate.getTime()>Date.now() && customDate.getTime()>=earliest.getTime() && customInHours;
  const selected = customMode ? (customValid ? customDate.getTime() : 0) : candidates.find(ts=>ts===selectedTs);
  const choose = () => {
    if(!store){toast(label('lbl.sheetChooseStore', 'Choose a store before scheduling.'));return;}
    if(!store.acceptScheduledOrders){toast(label('lbl.sheetNoScheduleClosed', 'This store does not accept scheduled orders.'));return;}
    if(!selected){
      if(customMode && !customInHours) toast(label('lbl.sheetChooseWithinHours', 'Choose a time within the store opening hours.'));
      else if(customMode && customDate.getTime()<earliest.getTime()) toast(label('lbl.sheetEarliestAvailableTime', 'This store’s earliest available time is {time}.').replace('{time}', fmtTime(earliest)));
      else toast(label('lbl.sheetChooseFutureTime', 'Choose a valid future time or select an available time.'));
      return;
    }
    A.setSch(selected); A.setMode(deliveryMode);
    toast(label('lbl.sheetScheduledFor', 'Scheduled for {day}, {time}').replace('{day}', fmtDay(new Date(selected))).replace('{time}', fmtTime(new Date(selected))));
    close();
  };
  return <>
    <T size={21} weight="800">{label('lbl.sheetScheduleTitle', 'Schedule your order')}</T>
    <SegSchedule value={deliveryMode} onChange={setDeliveryMode}/>
    <T size={14} weight="800" style={{marginTop:12,marginBottom:8}}>{label('lbl.sheetChooseDay', 'Choose a day')}</T>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:8}}>
      {Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);const active=dayOffset===i;return <Pressable key={i} onPress={()=>{setDayOffset(i);setSelectedTs(0);setCustomMode(true);}} style={{minWidth:74,paddingVertical:10,paddingHorizontal:10,borderRadius:14,backgroundColor:active?th.br:th.soft,alignItems:'center',borderWidth:1,borderColor:active?th.br:th.line}}>
        <T size={11.5} weight="700" color={active?'#fff':th.mut}>{i===0?'Today':i===1?'Tomorrow':dayNames[d.getDay()].slice(0,3)}</T><T size={15} weight="800" color={active?'#fff':th.ink}>{d.getDate()}</T><T size={10.5} color={active?'#fff':th.mut}>{d.toLocaleDateString(undefined,{month:'short'})}</T>
      </Pressable>;})}
    </ScrollView>
    {store?.acceptScheduledOrders ? <T size={12} color={th.mut} style={{marginTop:8,marginBottom:4}}>{label('lbl.sheetScheduledMinimum', 'Earliest order time')}: {minimumOrderTime}{opening ? ' · Opens ' + opening : ''}</T> : store&&!store.open ? <T size={12} color={th.mut} style={{marginTop:8,marginBottom:4}}>{label('lbl.sheetNoScheduledClosed', 'This store is not accepting scheduled orders while closed.')}</T> : null}
    <T size={13} weight="800" style={{marginTop:12,marginBottom:6}}>{label('lbl.sheetExactTime', 'Choose a time')}</T>
    <View style={{alignItems:'center',paddingVertical:4}}>
      <DateTimePicker
        value={customDate}
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
        minuteInterval={5}
        onChange={(_, date) => {
          if (!date) return;
          const picked = new Date(selectedDate);
          picked.setHours(date.getHours(), date.getMinutes(), 0, 0);
          const safe = picked.getTime() < earliest.getTime() ? earliest : picked;
          setCustomHour(String(safe.getHours()).padStart(2,'0'));
          setCustomMinute(String(safe.getMinutes()).padStart(2,'0'));
          setCustomMode(true);
          setSelectedTs(0);
        }}
      />
    </View>
    {selected ? <T size={12.5} color={th.br} style={{marginTop:8}}>Selected: {fmtDay(new Date(selected))}, {fmtTime(new Date(selected))}</T>:null}
    <View style={{height:12}}/><Cta label={label('lbl.sheetApply', 'Apply')} disabled={!selected} onPress={choose}/>
  </>;
}
function SegSchedule({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  const th=useTheme();
  return <View style={{flexDirection:'row',gap:8}}>
    {(['delivery','pickup'] as const).map(v=><Pressable key={v} onPress={()=>onChange(v)} style={{flex:1,paddingVertical:11,borderRadius:13,alignItems:'center',backgroundColor:value===v?th.brt:th.soft,borderWidth:value===v?1:0,borderColor:th.br}}><T weight="800" color={value===v?th.br:th.ink}>{v==='delivery'?'Delivery':'Pick-up'}</T></Pressable>)}
  </View>;
}

function GroupOrderSheet({close}: {close: () => void}) {
  const th = useTheme();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [groupBusy, setGroupBusy] = useState(false);
  const [group, setGroup] = useState(() => {
    const saved = S.groupOrder;
    if (saved && typeof saved.code === 'string' && Array.isArray(saved.members)) return saved;
    const next = {code: '', host: S.pf.n || 'You', members: [], serverBacked: false};
    S.groupOrder = next; save(); return next;
  });
  const saveGroup = (next: any) => { setGroup(next); S.groupOrder = next; save(); emit(); };
  const createServerGroup = async () => {
    if (!S.cart.sid) {toast('Add an item from a store first, then create its group order.');return;}
    setGroupBusy(true);
    const {data,error}=await supabase.rpc('goodies_group_order_create',{p_store_id:S.cart.sid});
    setGroupBusy(false);
    const row=Array.isArray(data)?data[0]:data;
    if(error||!row?.invite_code){toast(error?.message||'Could not create the group invitation.');return;}
    saveGroup({...group,code:row.invite_code,groupId:row.group_id,storeId:S.cart.sid,expiresAt:row.expires_at,serverBacked:true});
    toast('A new group invitation is ready.');
  };
  const joinServerGroup = async () => {
    const code=inviteCode.trim().toUpperCase();
    if(!code){toast('Enter a group invite code.');return;}
    setGroupBusy(true);
    const {data,error}=await supabase.rpc('goodies_group_order_join',{p_invite_code:code});
    setGroupBusy(false);
    const row=Array.isArray(data)?data[0]:data;
    if(error||!row?.group_id){toast(error?.message||'Could not join this group order.');return;}
    saveGroup({code:row.invite_code,groupId:row.group_id,storeId:row.store_id,expiresAt:row.expires_at,host:S.pf.n||'You',members:group.members||[],serverBacked:true});
    toast('You joined the group order.');
  };
  const groupSubtotal = S.cart.lines.reduce((sum: number, line: any) => sum + Number(line.p || 0) * Number(line.q || 0), 0);
  const invite = async () => {
    if(!group.serverBacked||!group.code){toast('Create a group invitation first.');return;}
    try {await Share.share({message:'Join my Wantiss Goodies group order. Invite code: '+group.code+'. Open Goodies > Group order > Join with code.'});}
    catch (_) {toast('Invite code: '+group.code);}
  };
  return <>
    <T size={21} weight="800">{label('lbl.sheetGroupTitle', 'Group order')}</T>
    <T size={13} color={th.mut} style={{marginTop:5, marginBottom:12}}>{label('lbl.sheetGroupDescription', 'Start a shared cart, invite friends, and coordinate everyone’s items before checkout.')}</T>
    <Card style={{marginBottom:12}}>
      <Row sp><View style={{flex:1}}><T size={11.5} weight="800" color={th.mut}>{label('lbl.sheetInviteCode', 'GROUP INVITE CODE')}</T><T size={22} weight="800">{group.code}</T></View><Cta small label={label('lbl.sheetInvitePeople', 'Invite people')} onPress={invite} /></Row>
      {group.code ? <T size={12} color={th.mut} style={{marginTop:7}}>Server invitation · expires {new Date(group.expiresAt).toLocaleString()}</T> : <T size={12} color={th.mut} style={{marginTop:7}}>Create a server invitation for this store. Each new group order receives a fresh code.</T>}
      <View style={{height:9}}/>
      <Cta label={groupBusy?'Please wait…':group.serverBacked?'Create new invite code':'Create group invite'} onPress={()=>void createServerGroup()} />
      {group.serverBacked ? <View style={{height:8}}/> : null}
      {group.serverBacked ? <Cta small ghost label="Share invite code" onPress={()=>void invite()} /> : null}
    </Card>
    <Card style={{marginBottom:12}}>
      <T size={14} weight="800">{label('lbl.sheetSharedCart', 'Shared cart')}</T>
      {S.cart.lines.length ? S.cart.lines.map((line:any)=><Row key={line.k} sp style={{marginTop:8,alignItems:'flex-start'}}><View style={{flex:1}}><T size={13} weight="700">{line.q}× {line.n}</T>{line.d ? <T size={11.5} color={th.mut}>{line.d}</T> : null}</View><T size={13} weight="700">{money(line.p*line.q)}</T></Row>) : <T size={12.5} color={th.mut} style={{marginTop:7}}>{label("lbl.sheetAutoX38X9M", "Add items to the cart from the selected store. The host controls checkout.")}</T>}
      <Row sp style={{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:th.line}}><T weight="800">{label('lbl.sheetSubtotal', 'Subtotal')}</T><T weight="800">{money(S.cart.lines.reduce((sum:number,line:any)=>sum+line.p*line.q,0))}</T></Row>
      {S.cart.sid && STB[S.cart.sid] ? <T size={12} color={th.mut} style={{marginTop:5}}>Store: {STB[S.cart.sid].n}</T> : null}
      <View style={{height:10}}/><Cta ghost label={label('lbl.sheetViewCart', 'View cart')} onPress={()=>{close();A.go('cart');}} />
    </Card>
    <Card style={{marginBottom:12}}>
      <T size={14} weight="800">Join a group order</T>
      <T size={12} color={th.mut} style={{marginTop:4,marginBottom:8}}>Enter the invite code shared by your friend to join their active order.</T>
      <Input value={inviteCode} onChange={setInviteCode} placeholder="Enter group invite code" autoCapitalize="characters" />
      <View style={{height:8}}/><Cta ghost label={groupBusy?'Joining…':'Join group order'} onPress={()=>void joinServerGroup()} />
    </Card>
    <T size={15} weight="800" style={{marginBottom:7}}>{label('lbl.sheetGroupMembers', 'Group members')}</T>
    <Row style={{gap:8, marginBottom:10}}>
      <View style={{flex:1}}><Input value={name} onChange={setName} placeholder={label('lbl.sheetMemberPlaceholder', 'Enter member name')} /></View>
      <View style={{width:88}}><Cta label={label('lbl.sheetAddMember', 'Add')} onPress={() => {
        const n=name.trim(); if(!n) {toast(label('lbl.sheetEnterMemberName', 'Enter a member name')); return;}
        if(group.members.some((m:any)=>m.name.toLowerCase()===n.toLowerCase())) {toast(label('lbl.sheetMemberDuplicate', 'That member is already in the group')); return;}
        saveGroup({...group,members:[...group.members,{id:Date.now(),name:n,status:'Invited'}]}); setName('');
      }} /></View>
    </Row>
    <Card>
      <Row style={{gap:10, alignItems:'center', paddingVertical:4}}>
        <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.brt,alignItems:'center',justifyContent:'center'}}><Icon name="user" color={th.br} /></View>
        <View style={{flex:1}}><T weight="800">{group.host || S.pf.n || 'You'} (Host)</T><T size={12} color={th.mut}>{label('lbl.sheetGroupHostNote', 'Owns the group cart')}</T></View>
        <Badge green label={label("lbl.sheetAuto5VK7FH", "Active")} />
      </Row>
      {group.members.map((m:any)=><View key={m.id} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderTopWidth:1,borderTopColor:th.line}}>
        <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.soft,alignItems:'center',justifyContent:'center'}}><Icon name="user" color={th.mut} /></View>
        <View style={{flex:1}}><T weight="700">{m.name}</T><T size={12} color={th.mut}>{label('lbl.sheetWaitingToAdd', 'Waiting to add items')}</T></View>
        <Badge label={m.status || 'Invited'} />
        <Pressable accessibilityRole="button" accessibilityLabel={'Remove '+m.name} onPress={()=>saveGroup({...group,members:group.members.filter((x:any)=>x.id!==m.id)})}><Icon name="x" size={18} color={th.red}/></Pressable>
      </View>)}
      {!group.members.length ? <T size={13} color={th.mut} style={{paddingVertical:10}}>{label('lbl.sheetNoMembers', 'No members yet. Invite friends or add their names to plan the group.')}</T> : null}
    </Card>
    <View style={{height:12}}/>
    <T size={15} weight="800" style={{marginBottom:7}}>{label('lbl.sheetSharedCart', 'Shared cart')}</T>
    <Card>
      {S.cart.lines.length ? S.cart.lines.map((line:any)=><Row key={line.k} sp style={{paddingVertical:7,alignItems:'flex-start'}}><View style={{flex:1}}><T weight="700">{line.q}× {line.n}</T>{line.d ? <T size={11.5} color={th.mut}>{line.d}</T> : null}</View><T weight="700">{money(line.p*line.q)}</T></Row>) : <T size={12.5} color={th.mut}>{label("lbl.sheetAutoDGWG5R", "The host cart is empty. Add items from a store to start the group order.")}</T>}
      <View style={{borderTopWidth:1,borderTopColor:th.line,marginTop:5,paddingTop:10}}><Row sp><T weight="800">{label("lbl.sheetAuto1KZZ2LV", "Items subtotal")}</T><T weight="800">{money(groupSubtotal)}</T></Row><T size={11.5} color={th.mut} style={{marginTop:4}}>{label("lbl.sheetAuto17YI8XJ", "Delivery and service fees are calculated at checkout.")}</T></View>
    </Card>
    <View style={{height:12}} />
    <Cta label={label('lbl.sheetDone', 'Done')} onPress={close} />
    <View style={{height:8}} />
    <Cta ghost label={label('lbl.sheetEndGroup', 'End group order')} onPress={() => {S.groupOrder=null; save(); emit(); close(); toast(label('lbl.sheetGroupEnded', 'Group order ended'));}} />
  </>;
}

export function GroupOrderPage({onBack}: {onBack: () => void}) {
  const th = useTheme();
  return <View style={{flex: 1, backgroundColor: th.bg}}>
    <Bar title={label('lbl.sheetGroupTitle', 'Group order')} onBack={onBack} />
    <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 24}} keyboardShouldPersistTaps="handled"><GroupOrderSheet close={onBack} /></ScrollView>
  </View>;
}

function ReviewSheet({id, stars, driver = false, initialStars = 0}: {id: string; stars: any; driver?: boolean; initialStars?: number}) {
  const [n, setN] = useState(initialStars || S.rt || 0), [t, setT] = useState('');
  return (<>
    <T size={20} weight="800">{driver ? label('lbl.orderRateDriver', 'Rate your driver') : label('lbl.orderRate', 'Rate your order')}</T>{stars(n, setN)}
    <Input value={t} onChange={setT} placeholder={label('lbl.sheetReviewComment', 'Add a comment (optional)')} multiline />
    <View style={{height: 12}} />
    <Cta label={label('lbl.sheetSubmitReview', 'Submit review')} onPress={() => {
      const o = S.orders.filter((x: any) => x.id === id)[0];
      if (!o) {toast(label('lbl.sheetOrderNotFound', 'Order not found')); return;}
      if (!n) {toast(label('lbl.sheetPickRating', 'Pick a star rating')); return;}
      if (driver) {
        S.driverRev = S.driverRev || {};
        S.driverRev[id] = {n: S.pf.n, r: n, t: t.trim(), d: 'Just now', orderId: id};
        o.driverRated = n;
        o.driverReview = {r: n, t: t.trim(), d: 'Just now'};
      } else {
        S.rev[o.sid] = S.rev[o.sid] || [];
        S.rev[o.sid].unshift({n: S.pf.n, r: n, t: t.trim(), d: 'Just now', you: 1, orderId: id});
        o.rated = n;
        o.orderReview = {r: n, t: t.trim(), d: 'Just now'};
      }
      S.rt = 0; ui.close(); toast(driver ? label('lbl.sheetDriverReviewThanks', 'Thanks for rating your driver!') : label('lbl.sheetReviewThanks', 'Thanks for your review!')); save(); emit();
    }} />
  </>);
}

function ContactsSheet({close}: {close: () => void}) {
  const th = useTheme();
  const rows = [{id: 'w', ph: S.pf.ph, l: label('lbl.sheetDefaultNumber', 'Default Wantiss number'), w: 1}].concat(S.gc.map((c: any) => ({id: c.id, ph: c.ph, l: c.l || label('lbl.sheetGoodiesNumber', 'Goodies number'), w: 0})));
  return (<>
    <T size={20} weight="800" style={{marginBottom: 4}}>{label('lbl.sheetContactNumber', 'Contact number')}</T>
    <T size={12.5} color={th.mut} style={{marginBottom: 12}}>{label('lbl.sheetContactNumberHint', 'We use this number for this order only. Your Wantiss account number is never changed here.')}</T>
    {rows.map((r: any) => (
      <View key={r.id} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <View style={{flex: 1}}><Radio on={S.cc === r.id} onPress={() => {S.cc = r.id; close(); save(); emit();}}><T weight="700">{r.ph}</T><View style={{marginTop: 3}}>{r.w ? <Badge green label={label("lbl.sheetAuto1UP0O00", "Default Wantiss number")} /> : <T size={12.5} color={th.mut}>Goodies checkout number · {r.l}</T>}</View></Radio></View>
        {r.w ? null : <><Pressable accessibilityLabel={label('lbl.sheetEditNumber', 'Edit number')} onPress={() => ui.sheet({kind: 'ctform', id: r.id})}><T size={13} weight="700" color={th.br}>{label("lbl.sheetAuto1CISXZJ", "Edit")}</T></Pressable>
        <Pressable accessibilityLabel={label('lbl.sheetRemoveNumber', 'Remove number')} onPress={() => {if (S.orders.some((o: any) => !done(o) && o.cid == r.id)) {toast(label('lbl.sheetPhoneInUse', 'This number is used by an active order')); return;} S.gc = S.gc.filter((c: any) => c.id !== r.id); if (S.cc === r.id) S.cc = 'w'; toast(label('lbl.sheetNumberRemoved', 'Number removed')); save(); emit(); ui.sheet({kind: 'contacts'});}}><Icon name="trash" size={18} color={th.red} /></Pressable></>}
      </View>
    ))}
    <Cta ghost label={label("lbl.sheetAutoQWFBNT", "+ Add another number")} onPress={() => ui.sheet({kind: 'ctform', id: ''})} />
  </>);
}
function CtForm({id}: {id: any}) {
  const th = useTheme(), c = S.gc.filter((x: any) => x.id == id)[0] || {l: '', ph: ''};
  const [l, setL] = useState(c.l || ''), [ph, setPh] = useState(c.ph || '');
  const save_ = () => {
    const p = ph.trim();
    if (!phoneOK(p)) return toast(label('lbl.sheetPhoneInvalid', 'Enter a valid phone number (8 to 15 digits)'));
    const dg = p.replace(/\\D/g, '');
    if (dg === S.pf.ph.replace(/\\D/g, '')) return toast(label('lbl.sheetSameWantissPhone', 'That is already your Wantiss number'));
    if (S.gc.some((x: any) => x.id != id && String(x.ph).replace(/\\D/g, '') === dg)) return toast(label('lbl.sheetDuplicateNumber', 'You already saved that number'));
    const cc = S.gc.filter((x: any) => x.id == id)[0];
    if (cc) {cc.ph = p; cc.l = l.trim();} else {const n = {id: Date.now(), ph: p, l: l.trim()}; S.gc.push(n); S.cc = n.id;}
    toast(label('lbl.sheetNumberSaved', 'Number saved for Goodies checkout')); save(); emit(); ui.sheet({kind: 'contacts'});
  };
  return (<>
    <T size={20} weight="800">{id ? 'Edit' : 'Add'} contact number</T>
    <T size={12.5} color={th.mut} style={{marginTop: 3}}>{label("lbl.sheetAutoLZBAF5", "Saved for Goodies checkout only. Your Wantiss account number is not changed here. Country-code management will be handled in Wantiss settings.")}</T>
    <Input label={label("lbl.sheetAuto5601C6", "Label (optional)")} value={l} onChange={setL} placeholder={label("lbl.sheetAutoBBS3LN", "e.g. Partner, Office")} />
    <Input label={label("lbl.sheetAutoSTYZV6", "Phone number")} value={ph} onChange={setPh} placeholder={label("lbl.sheetAuto1JJXA6W", "Enter phone number")} keyboard="phone-pad" />
    <View style={{height: 14}} /><Cta label={label("lbl.sheetAuto9HY80N", "Save number")} onPress={save_} /><View style={{height: 10}} /><Cta ghost label={label("lbl.sheetAuto1LJ92XO", "Back")} onPress={() => ui.sheet({kind: 'contacts'})} />
  </>);
}

/* DEMO: paste the JSON exported from Wantiss Admin (Goodies > Overview > Export content). Production fetches the same shape from the backend. */
function ImportSheet({close}: {close: () => void}) {
  const th = useTheme(), [txt, setTxt] = useState('');
  return (<>
    <T size={20} weight="800">{label("lbl.sheetAuto1DJ0R80", "Import Admin content")}</T>
    <T size={12.5} color={th.mut} style={{marginTop: 6, marginBottom: 10}}>Paste the content exported from Wantiss Admin. It replaces promo cards, categories, labels, fees, age rules, texts and artwork in this demo. {hasContent() ? 'Admin content is currently loaded.' : 'The built-in sample content is currently used.'}</T>
    <TextInput value={txt} onChangeText={setTxt} multiline placeholder={label("lbl.sheetAutoAED84A", "Paste JSON here")} placeholderTextColor={th.mut} style={{minHeight: 120, maxHeight: 220, fontSize: 12, color: th.ink, backgroundColor: th.soft, borderWidth: 1, borderColor: th.line, borderRadius: 12, padding: 10, textAlignVertical: 'top'}} />
    <View style={{height: 12}} />
    <Cta label={label("lbl.sheetAuto1EXCTAI", "Import")} onPress={async () => {try {await importContent(txt.trim()); close(); toast(label('lbl.sheetAdminContentLoaded', 'Admin content loaded')); emit();} catch (e: any) {toast(String(e && e.message ? e.message : label('lbl.sheetInvalidJson', 'That is not valid JSON')));}}} />
    {hasContent() ? <><View style={{height: 10}} /><Cta ghost label={label("lbl.sheetAuto1U4P0PS", "Go back to sample content")} onPress={async () => {await clearContent(); close(); toast(label('lbl.sheetSampleContent', 'Using sample content')); emit();}} /></> : null}
  </>);
}
