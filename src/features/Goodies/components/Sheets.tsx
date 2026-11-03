import React, {useEffect, useState} from 'react';
import {View, Text, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, Share} from 'react-native';
import {T, Cta, Row, Card, Badge, Input, Radio, SheetBox, Bar, useTheme} from './ui';
import {Icon} from './Icon';
import {CameraView, useCameraPermissions} from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import {S, STB, money, emit, save, toast, ui, addr, defAddr, done, phoneOK, fmtDay, fmtTime, alcAge, syncGroupOrderCartLine, removeGroupOrderCartLine, refreshUserAddresses} from '../store';
import * as A from '../actions';
import {supabase} from '../../../lib/supabase';
import {PROMO_DETAIL} from '../data/promoText';
import {bzLeave, bzDiscard, bzReset2} from '../builders/engine';
import {rgText, importContent, clearContent, hasContent, label} from '../content';
import {TextInput, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {BottomSheet, ConfirmDialog} from './Overlays';

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
  if (k === 'ctform') content = <CtForm key={sheet.id || 'new'} id={sheet.id} bottomInset={insets.bottom} />;
  if (k === 'topup') content = (<><T size={20} weight="800">{label('lbl.sheetTopup', 'Top up wallet')}</T><T color={th.mut} style={{marginTop: 6, marginBottom: 14}}>{label('lbl.sheetDemoMoney', 'Demo: no real money moves.')}</T><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{[10, 20, 50, 100].map(v => <Pressable key={v} onPress={() => {S.wallet += v; close(); toast(label('lbl.sheetWalletToppedUp', 'Wallet topped up to {amount}').replace('{amount}', money(S.wallet))); save(); emit();}} style={{paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, backgroundColor: th.soft}}><T size={14} weight="700">+{money(v)}</T></Pressable>)}</View></>);
  if (k === 'replace') content = (<><T size={20} weight="800">{label('lbl.sheetReplaceCart', 'Replace your cart?')}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>Your cart has items from {sheet.from}.</T><Cta label={label('lbl.sheetReorder', 'Replace and reorder')} onPress={A.runReorder} /><View style={{height: 10}} /><Cta ghost label={label('lbl.sheetKeepCart', 'Keep current cart')} onPress={close} /></>);
  if (k === 'remove-number') content = (<>
    <T size={20} weight="800">{label('lbl.sheetRemoveNumberTitle', 'Remove this contact number?')}</T>
    <T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label('lbl.sheetRemoveNumberBody', 'Remove {number} from your Goodies checkout contacts?').replace('{number}', String(sheet.numberLabel || 'this number'))}</T>
    <Cta label={label('lbl.sheetRemoveNumberConfirm', 'Remove number')} onPress={() => { void sheet.onConfirm?.(); }} />
    <View style={{height: 10}} />
    <Cta ghost label={label('lbl.sheetKeepNumber', 'Keep number')} onPress={close} />
  </>);
  if (k === 'remove-address') content = (<>
    <T size={20} weight="800">{label('lbl.sheetDeleteAddressTitle', 'Delete this address?')}</T>
    <T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{label('lbl.sheetDeleteAddressBody', 'Remove {address} from your saved addresses?').replace('{address}', String(sheet.addressLabel || 'this address'))}</T>
    <Cta label={label('lbl.sheetDeleteAddressConfirm', 'Delete address')} onPress={() => { void sheet.onConfirm?.(); }} />
    <View style={{height: 10}} />
    <Cta ghost label={label('lbl.sheetKeepAddress', 'Keep address')} onPress={close} />
  </>);
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
  const isCenteredSheet = ['remove-item','remove-address','remove-number','clear','cancel','newcart','replace','byoleave','byoreset','alcrules'].includes(k);
  const sheetBody = (
    <View style={{width:'100%', height: isRatingSheet ? Math.min(430, windowHeight * 0.68) : k==='schedule' ? Math.min(560, windowHeight * 0.72) : k==='ctform' || k==='contacts' ? Math.min(560, windowHeight * 0.78) : undefined, maxHeight: k==='schedule' ? Math.min(560, windowHeight * 0.72) : k==='ctform' || k==='contacts' ? '86%' : isRatingSheet ? windowHeight * 0.68 : k==='promo'&&sheet.custom ? '68%' : k==='sinfo'||k==='promo' ? '92%' : isCenteredSheet?'60%':'90%', flexShrink:1, minHeight: isCenteredSheet ? 190 : k==='ctform' || k==='contacts' ? 300 : 0, marginBottom:0}}>
      <SheetBox centered={isCenteredSheet || k === 'contacts' || k === 'ctform'} large={isRatingSheet || k === 'sinfo' || k === 'schedule' || (k === 'promo' && !sheet.custom)} compact={k === 'promo' && !!sheet.custom} onClose={close}>{k === 'ctform' ? content : <ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={{paddingBottom:Math.max(16,insets.bottom),flexGrow:1}} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>{content}</ScrollView>}</SheetBox>
    </View>
  );
  if (isCenteredSheet) {
    return <ConfirmDialog visible onClose={close} accessibilityLabel={label("lbl.sheetAutoKDBKGE", "Close dialog")}>{sheetBody}</ConfirmDialog>;
  }
  return <BottomSheet visible onClose={close} keyboardAware={k === 'contacts' || k === 'ctform'} maxHeight={k==='schedule' ? Math.max(0, windowHeight - insets.top) : k==='ctform' || k==='contacts' ? '86%' : k==='sinfo'||k==='promo' ? '92%' : isRatingSheet ? windowHeight * 0.68 : '90%'}>{sheetBody}</BottomSheet>;
}

function ScheduleSheet({close}: {close: () => void}) {
  const th = useTheme(), store: any = STB[S.cart.sid];
  const zone = String(store?.scheduledOrderTimezone || 'UTC');
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const zonedParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
    const get = (key: string) => Number(parts.find(part => part.type === key)?.value || 0);
    return {year:get('year'),month:get('month'),day:get('day'),hour:get('hour'),minute:get('minute'),second:get('second')};
  };
  // A wall-clock Date is used only for the native wheel/calendar arithmetic; convert it
  // to an absolute instant with the store's IANA timezone before saving or comparing.
  const wallDateInZone = (date: Date) => {
    const p = zonedParts(date);
    return new Date(p.year,p.month-1,p.day,p.hour,p.minute,p.second,0);
  };
  const zonedInstant = (wall: Date) => {
    const target = Date.UTC(wall.getFullYear(),wall.getMonth(),wall.getDate(),wall.getHours(),wall.getMinutes(),0,0);
    let guess = target;
    for (let i=0;i<3;i++) {
      const p = zonedParts(new Date(guess));
      const represented = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second,0);
      guess += target-represented;
    }
    return new Date(guess);
  };
  const storeNow = wallDateInZone(new Date());
  const initialWall = S.sch && S.sch > Date.now() ? wallDateInZone(new Date(S.sch)) : storeNow;
  const [dayOffset,setDayOffset] = useState(() => {
    const a = Date.UTC(storeNow.getFullYear(),storeNow.getMonth(),storeNow.getDate());
    const b = Date.UTC(initialWall.getFullYear(),initialWall.getMonth(),initialWall.getDate());
    return Math.max(0,Math.min(6,Math.round((b-a)/86400000)));
  });
  const [deliveryMode,setDeliveryMode] = useState(S.mode === 'pickup' ? 'pickup' : 'delivery');
  const [customHour,setCustomHour] = useState(String(initialWall.getHours()).padStart(2,'0'));
  const [customMinute,setCustomMinute] = useState(String(Math.ceil(initialWall.getMinutes()/5)*5 % 60).padStart(2,'0'));
  const selectedDate = new Date(storeNow);
  selectedDate.setDate(storeNow.getDate()+dayOffset); selectedDate.setHours(0,0,0,0);
  const schedule = store?.scheduleHours || {};
  const hours = schedule[dayNames[selectedDate.getDay()]];
  const opening = hours && !hours.closed && hours.open ? String(hours.open) : '';
  const closing = hours && !hours.closed && hours.close ? String(hours.close) : '';
  const minimumOrderTime = String(store?.scheduledOrderStartTime || '10:00').slice(0,5);
  const [minimumHour,minimumMinute] = minimumOrderTime.split(':').map(Number);
  const configuredMinimum = new Date(selectedDate);
  configuredMinimum.setHours(minimumHour || 0,minimumMinute || 0,0,0);
  const hasHours = !!(hours && !hours.closed && opening && closing);
  const noSchedule = !store?.scheduleHours || !Object.keys(store.scheduleHours).length;
  const closedDay = (!hasHours && !noSchedule);
  let startMinute = 8*60, endMinute = 22*60;
  if (hasHours) {
    const [oh,om] = opening.split(':').map(Number), [ch,cm] = closing.split(':').map(Number);
    startMinute = oh*60+(om||0); endMinute = ch*60+(cm||0);
  }
  const earliestWall = new Date(selectedDate);
  const minWallTime = Math.max(startMinute, minimumHour*60+(minimumMinute||0));
  const currentWallTime = dayOffset===0 ? storeNow.getHours()*60+storeNow.getMinutes() : 0;
  const earliestMinute = Math.max(minWallTime, currentWallTime);
  earliestWall.setHours(Math.floor(earliestMinute/60),Math.ceil((earliestMinute%60)/5)*5,0,0);
  const earliestInstant = zonedInstant(earliestWall);
  const rawHour = Number(customHour), rawMinute = Number(customMinute);
  const validDigits = /^\d{1,2}$/.test(customHour) && /^\d{1,2}$/.test(customMinute) && rawHour>=0 && rawHour<=23 && rawMinute>=0 && rawMinute<=59;
  const customDate = new Date(selectedDate);
  if (validDigits) customDate.setHours(rawHour,rawMinute,0,0);
  const customMinutes = customDate.getHours()*60+customDate.getMinutes();
  const customInstant = validDigits ? zonedInstant(customDate) : new Date(0);
  const customWithinHours = customMinutes>=startMinute && customMinutes<endMinute;
  const customValid = validDigits && !closedDay && customWithinHours && customInstant.getTime()>Date.now() && customInstant.getTime()>=earliestInstant.getTime();
  const clampedWall = new Date(selectedDate);
  const latestMinute = Math.max(startMinute, endMinute-5);
  const safeMinute = Math.max(earliestMinute, Math.min(latestMinute, validDigits ? customMinutes : earliestMinute));
  clampedWall.setHours(Math.floor(safeMinute/60),Math.ceil((safeMinute%60)/5)*5,0,0);
  const noFutureSlot = closedDay || earliestMinute >= endMinute;
  const selected = customValid ? customInstant.getTime() : noFutureSlot ? 0 : zonedInstant(clampedWall).getTime();
  const reason = noFutureSlot
    ? label('lbl.sheetClosedDayReason','This store has no remaining scheduled times on that day. Choose another day.')
    : !customWithinHours
      ? label('lbl.sheetClampOpeningHours','Time adjusted to fit this store’s opening hours.')
      : !customValid
        ? label('lbl.sheetClampEarliest','Time adjusted to the earliest available order time.')
        : '';
  const formatStore = (ts: number, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined,{...options,timeZone:zone}).format(new Date(ts));
  const choose = () => {
    if (!store) {toast(label('lbl.sheetChooseStore','Choose a store before scheduling.'));return;}
    if (!store.acceptScheduledOrders) {toast(label('lbl.sheetNoScheduleClosed','This store does not accept scheduled orders.'));return;}
    if (!selected) {toast(reason || label('lbl.sheetChooseDay','Choose an available day.'));return;}
    A.setSch(selected); A.setMode(deliveryMode);
    toast(label('lbl.sheetScheduledFor','Scheduled for {day}, {time}').replace('{day}',formatStore(selected,{weekday:'short',month:'short',day:'numeric'})).replace('{time}',formatStore(selected,{hour:'numeric',minute:'2-digit'})));
    close();
  };
  return <>
    <T size={21} weight="800">{label('lbl.sheetScheduleTitle','Schedule your order')}</T>
    <SegSchedule value={deliveryMode} onChange={setDeliveryMode}/>
    <T size={14} weight="800" style={{marginTop:12,marginBottom:8}}>{label('lbl.sheetChooseDay','Choose a day')}</T>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:8}}>
      {Array.from({length:7},(_,i)=>{const d=new Date(storeNow);d.setDate(storeNow.getDate()+i);const active=dayOffset===i;return <Pressable key={i} onPress={()=>{setDayOffset(i);}} style={{minWidth:74,paddingVertical:10,paddingHorizontal:10,borderRadius:14,backgroundColor:active?th.br:th.soft,alignItems:'center',borderWidth:1,borderColor:active?th.br:th.line}}>
        <T size={11.5} weight="700" color={active?'#fff':th.mut}>{i===0?'Today':i===1?'Tomorrow':dayNames[d.getDay()].slice(0,3)}</T><T size={15} weight="800" color={active?'#fff':th.ink}>{d.getDate()}</T><T size={10.5} color={active?'#fff':th.mut}>{d.toLocaleDateString(undefined,{month:'short'})}</T>
      </Pressable>;})}
    </ScrollView>
    {store?.acceptScheduledOrders ? <T size={12} color={th.mut} style={{marginTop:8,marginBottom:4}}>{label('lbl.sheetScheduledMinimum','Earliest order time')}: {minimumOrderTime}{opening ? ' · Opens '+opening : ''} · {zone}</T> : null}
    <T size={13} weight="800" style={{marginTop:12,marginBottom:6}}>{label('lbl.sheetExactTime','Choose a time')}</T>
    <ScrollView style={{maxHeight:156,marginTop:6}} nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{flexDirection:'row',flexWrap:'wrap',gap:8,paddingBottom:4}}>
      {Array.from({length:Math.max(0,Math.floor((endMinute-1-Math.ceil(earliestMinute/15)*15)/15)+1)},(_,i)=>Math.ceil(earliestMinute/15)*15+i*15).map(minute=>{const hour=Math.floor(minute/60),mins=minute%60,key=String(hour).padStart(2,'0')+':'+String(mins).padStart(2,'0'),active=customHour===String(hour).padStart(2,'0')&&customMinute===String(mins).padStart(2,'0');return <Pressable key={key} onPress={()=>{setCustomHour(String(hour).padStart(2,'0'));setCustomMinute(String(mins).padStart(2,'0'));}} style={{width:'23%',minHeight:38,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:active?th.br:th.soft,borderWidth:active?0.5:0,borderColor:th.br}}><T size={12.5} weight="600" color={active?'#fff':th.ink}>{key}</T></Pressable>;})}
    </ScrollView>
    {reason ? <T size={12.5} color={th.red} style={{marginTop:6}}>{reason}</T> : null}
    {selected ? <T size={12.5} color={th.br} style={{marginTop:8}}>Selected: {formatStore(selected,{weekday:'short',month:'short',day:'numeric'})}, {formatStore(selected,{hour:'numeric',minute:'2-digit'})}</T> : null}
    <View style={{height:12}}/><Cta label={label('lbl.sheetApply','Apply')} disabled={!selected} onPress={choose}/>
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
  const [inviteCode, setInviteCode] = useState('');
  const [groupBusy, setGroupBusy] = useState(false);
  const [sharedItems, setSharedItems] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [membershipError, setMembershipError] = useState('');
  const [checkoutPreview, setCheckoutPreview] = useState<any>(null);
  const [checkoutEstimate, setCheckoutEstimate] = useState<any>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [groupCheckoutBusy, setGroupCheckoutBusy] = useState(false);
  const [groupCheckoutType, setGroupCheckoutType] = useState<'pickup'|'delivery'>('pickup');
  const [groupAddressId, setGroupAddressId] = useState<string|number>(()=>addr()?.id ?? '');
  const [groupDeliveryQuote, setGroupDeliveryQuote] = useState<any>(null);
  const [groupQuoteBusy, setGroupQuoteBusy] = useState(false);
  useEffect(() => {
    if(groupCheckoutType!=='delivery') return;
    let active=true;
    void refreshUserAddresses().then((addresses:any[])=>{
      if(!active||!addresses?.length) return;
      setGroupAddressId((current:any)=>addresses.some((item:any)=>String(item.id)===String(current))?current:addresses.find((item:any)=>item.def)?.id??addresses[0].id);
    }).catch((error:any)=>{if(active)toast(error?.message||'Could not load saved delivery addresses.');});
    return ()=>{active=false;};
  },[groupCheckoutType]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
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
    const synced=await Promise.all(S.cart.lines.map((line:any)=>syncGroupOrderCartLine(row.group_id,line)));
    const failed=synced.find((result:any)=>result.error);
    if(failed)toast('Group created, but one or more existing cart items could not be shared: '+failed.error.message);
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
  useEffect(() => {
    let active=true;
    void supabase.auth.getUser().then(({data})=>{if(active)setCurrentUserId(data.user?.id||'');});
    if (!group.serverBacked || !group.groupId) {setSharedItems([]);setGroupMembers([]);setMembershipError('');return ()=>{active=false;};}
    const loadItems=async () => {
      const {data,error}=await supabase.from('goodies_group_order_items')
        .select('id,user_id,line_key,quantity,options,note,product:goodies_products(name,price,photo_url,emoji)')
        .eq('group_id',group.groupId).order('created_at',{ascending:true});
      if(active){if(error)toast('Could not refresh the shared cart: '+error.message);else setSharedItems(data||[]);}
    };
    const loadMembers=async () => {
      const {data,error}=await supabase.rpc('goodies_group_order_list_members',{p_group_id:group.groupId});
      if(active){setMembershipError(error?.message||'');if(!error)setGroupMembers(data||[]);}
    };
    const refreshGroupStatus=async () => {
      const {data,error}=await supabase.rpc('goodies_group_order_get_status',{p_group_id:group.groupId});
      if(!active||error)return;
      const statusRow=Array.isArray(data)?data[0]:data;
      if(!statusRow||statusRow.status!=='open'||new Date(statusRow.expires_at).getTime()<=Date.now()){
        S.groupOrder=null; save(); emit(); setGroup({code:'',host:S.pf.n||'You',members:[],serverBacked:false});
        setSharedItems([]);setGroupMembers([]);setCheckoutPreview(null);
        toast(statusRow?.status==='cancelled'?'The group host ended this group order.':'This group order has closed or expired.');
      }
    };
    void loadItems(); void loadMembers(); void refreshGroupStatus();
    const channel=supabase.channel('goodies-group-live-'+group.groupId)
      .on('postgres_changes',{event:'*',schema:'public',table:'goodies_group_order_items',filter:'group_id=eq.'+group.groupId},()=>{void loadItems();})
      .on('postgres_changes',{event:'*',schema:'public',table:'goodies_group_order_members',filter:'group_id=eq.'+group.groupId},()=>{void loadMembers();})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'goodies_group_orders',filter:'id=eq.'+group.groupId},()=>{void refreshGroupStatus();})
      .subscribe();
    return ()=>{active=false;void supabase.removeChannel(channel);};
  },[group.serverBacked,group.groupId]);

  const invite = async () => {
    if(!group.serverBacked||!group.code){toast('Create a group invitation first.');return;}
    try {await Share.share({message:'Join my Wantiss Goodies group order. Invite code: '+group.code+'. Open Goodies > Group order > Join with code.'});}
    catch (_) {toast('Invite code: '+group.code);}
  };
  const calculateGroupDeliveryQuote = async () => {
    let addresses=S.addr||[];
    if(!addresses.length) addresses=await refreshUserAddresses();
    const selected=addresses.find((item:any)=>String(item.id)===String(groupAddressId))||addresses.find((item:any)=>item.id===S.as)||addresses[0];
    if(!selected?.t){toast('Add or select a complete delivery address first.');return;}
    setGroupQuoteBusy(true);
    try {
      const addressPayload={l:selected.l,t:selected.t,apt:selected.apt||'',inst:selected.inst||''};
      const quote=await supabase.functions.invoke('goodies-delivery-quote',{body:{store_id:group.storeId||checkoutPreview?.store_id,address:addressPayload}});
      if(quote.error||!quote.data?.quote_id){setGroupDeliveryQuote(null);toast(quote.data?.error||quote.error?.message||'Could not calculate delivery for this address.');return;}
      const quoteState={addressId:String(selected.id),quoteId:String(quote.data.quote_id),fee:Number(quote.data.fee||0),distanceKm:Number(quote.data.distance_km||0),expiresAt:Date.now()+4*60*1000};
      setGroupDeliveryQuote(quoteState);
      const estimate=await supabase.rpc('goodies_group_order_checkout_estimate',{p_group_id:group.id,p_order_type:'delivery',p_address:{...addressPayload,delivery_quote_id:quoteState.quoteId}});
      if(estimate.error) {setCheckoutEstimate(null);toast(estimate.error.message||'Could not calculate the final estimate.');}
      else setCheckoutEstimate(estimate.data);
    } catch(e:any) {
      setGroupDeliveryQuote(null);toast(e?.message||'Could not calculate delivery.');
    } finally {setGroupQuoteBusy(false);}
  };
  const checkoutGroupOrder = async () => {
    if(!group.serverBacked||!group.groupId){toast('Create a server-backed group order first.');return;}
    if(!groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host')){toast('Only the group host can check out.');return;}
    if(!checkoutPreview){toast('Review and validate the combined cart first.');return;}
    if(!S.pf.ph||!phoneOK(S.pf.ph)){toast('Add a valid contact phone number in your profile before checkout.');return;}
    setGroupCheckoutBusy(true);
    try {
      await A.refreshPaymentOptions();
      let addressPayload:any=null;
      if(groupCheckoutType==='delivery'){
        const selected=(S.addr||[]).find((item:any)=>String(item.id)===String(groupAddressId))||(S.addr||[]).find((item:any)=>item.id===S.as)||(S.addr||[])[0];
        if(!selected?.t){toast('Add or select a complete delivery address first.');return;}
        if(!groupDeliveryQuote||groupDeliveryQuote.addressId!==String(selected.id)||groupDeliveryQuote.expiresAt<=Date.now()){
          toast('Calculate the delivery fee and review it before placing the order.');return;
        }
        addressPayload={l:selected.l,t:selected.t,apt:selected.apt||'',inst:selected.inst||'',delivery_quote_id:groupDeliveryQuote.quoteId};
      }
      const {data,error}=await supabase.rpc('goodies_group_order_checkout',{
        p_idempotency_key:'group-'+group.groupId+'-'+Date.now().toString(36),
        p_group_id:group.groupId,
        p_order_type:groupCheckoutType,
        p_scheduled_for:null,
        p_address:addressPayload,
        p_contact_phone:S.pf.ph,
        p_tip:0,
        p_notes:null
      });
      const order=Array.isArray(data)?data[0]:data;
      if(error||!order?.id){toast(error?.message||'Group order checkout failed.');return;}
      toast('Group order placed. Order '+(order.order_code||order.id)+'. Paid with Wantiss Wallet.');
      S.groupOrder=null;save();emit();close();
    } catch(e:any) {
      toast(e?.message||'Could not complete group order checkout.');
    } finally {setGroupCheckoutBusy(false);}
  };
  const reviewSharedOrder = async () => {
    if(!group.serverBacked||!group.groupId){toast('Create or join a server-backed group order first.');return;}
    setPreviewBusy(true); setCheckoutPreview(null);
    const {data,error}=await supabase.rpc('goodies_group_order_checkout_preview',{p_group_id:group.groupId});
    setPreviewBusy(false);
    if(error){toast(error.message||'Could not validate the shared cart.');return;}
    setCheckoutPreview(data);
  };
  return <>
    <T size={21} weight="800">{label('lbl.sheetGroupTitle', 'Group order')}</T>
    <View>
      <Row sp><View style={{flex:1}}><T size={11.5} weight="800" color={th.mut}>{label('lbl.sheetInviteCode', 'GROUP INVITE CODE')}</T><T size={22} weight="800">{group.code}</T></View><Cta small label={label('lbl.sheetInvitePeople', 'Invite people')} onPress={invite} /></Row>
      {group.code && group.serverBacked ? <View style={{alignItems:'center',paddingVertical:12}}><QRCode value={group.code} size={142} backgroundColor="#FFFFFF" color="#111111"/><T size={11.5} color={th.mut} style={{marginTop:7}}>Scan to join this group</T></View> : null}
      <View style={{height:9}}/>
      <Cta label={groupBusy?'Please wait…':group.serverBacked?'Create new invite code':'Create group invite'} onPress={()=>void createServerGroup()} />
      {group.serverBacked ? <View style={{height:8}}/> : null}
      {group.serverBacked ? <Cta small ghost label="Share invite code" onPress={()=>void invite()} /> : null}
    </View>
    <View>
      <T size={14} weight="800">{label('lbl.sheetSharedCart', 'Shared cart')}</T>
      {S.cart.lines.length ? S.cart.lines.map((line:any)=><Row key={line.k} sp style={{marginTop:8,alignItems:'flex-start'}}><View style={{flex:1}}><T size={13} weight="700">{line.q}× {line.n}</T>{line.d ? <T size={11.5} color={th.mut}>{line.d}</T> : null}</View><T size={13} weight="700">{money(line.p*line.q)}</T></Row>) : <T size={12.5} color={th.mut} style={{marginTop:7}}>{label("lbl.sheetAutoX38X9M", "Add items to the cart from the selected store. The host controls checkout.")}</T>}
      <Row sp style={{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:th.line}}><T weight="800">{label('lbl.sheetSubtotal', 'Subtotal')}</T><T weight="800">{money(S.cart.lines.reduce((sum:number,line:any)=>sum+line.p*line.q,0))}</T></Row>
      {S.cart.sid && STB[S.cart.sid] ? <T size={12} color={th.mut} style={{marginTop:5}}>Store: {STB[S.cart.sid].n}</T> : null}
      <View style={{height:10}}/><Cta ghost label={label('lbl.sheetViewCart', 'View cart')} onPress={()=>{close();A.go('cart');}} />
    </View>
    <View>
      <T size={14} weight="800">Join a group order</T>
      <T size={12} color={th.mut} style={{marginTop:4,marginBottom:8}}>Enter the invite code shared by your friend to join their active order.</T>
      <Input value={inviteCode} onChange={setInviteCode} placeholder="Enter group invite code" />
      <View style={{height:8}}/><Cta ghost label="Scan QR code" onPress={async()=>{
        if(!cameraPermission?.granted){const result=await requestCameraPermission();if(!result.granted){toast('Camera permission is needed to scan a group QR code.');return;}}
        setScannerOpen(true);
      }} />
      <View style={{height:8}}/><Cta label={groupBusy?'Joining…':'Join group order'} onPress={()=>void joinServerGroup()} />
    </View>
    <T size={15} weight="800" style={{marginBottom:7}}>{label('lbl.sheetGroupMembers', 'Group members')}</T>
    <View>
      {membershipError ? <T size={12} color={th.red}>Could not load group members: {membershipError}</T> : null}
      {groupMembers.map((member:any)=>{
        const uid=String(member.user_id||'');
        const isYou=uid===currentUserId;
        return <Row key={uid} style={{gap:10,alignItems:'center',paddingVertical:9}}>
          <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.soft,alignItems:'center',justifyContent:'center'}}><Icon name="user" color={th.mut}/></View>
          <View style={{flex:1}}><T weight="700">{isYou?'You':member.display_name}</T><T size={12} color={th.mut}>{member.is_host?'Host':'Joined group order'}</T></View>
          {isYou?<Badge green label="You"/>:null}
        </Row>;
      })}
      {!groupMembers.length&&!membershipError?<T size={13} color={th.mut} style={{paddingVertical:10}}>No one has joined this group yet. Share the invite code to add members.</T>:null}
    </View>
    <View style={{height:12}}/>
    <T size={15} weight="800" style={{marginBottom:7}}>Live group cart</T>
    <View>
      {sharedItems.length ? sharedItems.map((item:any)=>{
        const product=Array.isArray(item.product)?item.product[0]:item.product;
        const contributor=groupMembers.find((member:any)=>String(member.user_id)===String(item.user_id));
        const contributorName=String(item.user_id)===currentUserId?'You':contributor?.display_name||'Group member';
        return <Row key={item.id} sp style={{paddingVertical:8,alignItems:'flex-start'}}>
          <View style={{flex:1}}><T weight="700">{item.quantity}× {product?.name || 'Unavailable product'}</T><T size={11.5} color={th.mut}>Added by {contributorName}{item.note ? ' · '+item.note : ''}</T></View>
          <View style={{alignItems:'flex-end',gap:7}}>
            <T weight="700">{product?.price!=null?money(Number(product.price)*Number(item.quantity)):'—'}</T>
            {group.serverBacked && String(item.user_id)===currentUserId ? <Pressable accessibilityRole="button" accessibilityLabel="Remove my shared cart item" onPress={async()=>{
              const {error}=await removeGroupOrderCartLine(group.groupId,item.line_key);
              if(error){toast('Could not remove this shared item: '+error.message);return;}
              const ownLine=S.cart.lines.find((line:any)=>line.k===item.line_key);
              if(ownLine){S.cart.lines=S.cart.lines.filter((line:any)=>line.k!==item.line_key);if(!S.cart.lines.length)S.cart.sid=null;save();emit();}
            }}><Icon name="trash-2" size={17} color={th.red}/></Pressable> : null}
          </View>
        </Row>;
      }) : <T size={12.5} color={th.mut}>No shared items yet. Members can add products from this store and they will appear here.</T>}
      <View style={{borderTopWidth:1,borderTopColor:th.line,marginTop:5,paddingTop:10}}>
        <Row sp><T weight="800">Shared base-price subtotal</T><T weight="800">{money(sharedItems.reduce((sum:number,item:any)=>{const product=Array.isArray(item.product)?item.product[0]:item.product;return sum+Number(product?.price||0)*Number(item.quantity||0);},0))}</T></Row>
       </View>
      <View style={{height:10}}/>
      {groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host')
        ? <Cta label={previewBusy?'Checking shared cart…':'Review combined cart'} onPress={()=>void reviewSharedOrder()} disabled={previewBusy||!group.serverBacked}/>
        : <T size={12} color={th.mut}>The group host will review the combined cart and continue to checkout.</T>}
    </View>
    {checkoutPreview ? <View>
      <T size={15} weight="800">Validated group cart</T>
      <T size={12} color={th.mut} style={{marginTop:4}}>Store: {checkoutPreview.store_name} · {checkoutPreview.item_count} shared lines</T>
      {(checkoutPreview.items||[]).map((item:any)=><Row key={item.item_id} sp style={{paddingVertical:7}}>
        <View style={{flex:1}}><T size={13} weight="700">{item.quantity}× {item.name}</T><T size={11} color={th.mut}>Current price with selected options</T></View>
        <T size={13} weight="700">{money(Number(item.unit_price)*Number(item.quantity))}</T>
      </Row>)}
      <Row sp style={{borderTopWidth:1,borderTopColor:th.line,paddingTop:10,marginTop:4}}><T weight="800">Validated item subtotal</T><T weight="800">{money(Number(checkoutPreview.subtotal||0))}</T></Row>
      <T size={11.5} color={th.mut} style={{marginTop:6}}>Prices include validated size, drink and active deal options. Delivery/service fees and payment are still handled at checkout.</T>
    </View>:null}
    {checkoutPreview && groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host') ? <View>
      <T size={15} weight="800">Host checkout</T>
      <T size={12} color={th.mut} style={{marginTop:5}}>Choose pickup or delivery. The host pays the full group order from their Wantiss Wallet.</T>
      <View style={{height:10}}/>
      <Row style={{gap:8}}>
        <View style={{flex:1}}><Radio on={groupCheckoutType==='pickup'} onPress={()=>{setGroupCheckoutType('pickup');setGroupDeliveryQuote(null);void supabase.rpc('goodies_group_order_checkout_estimate',{p_group_id:group.id,p_order_type:'pickup',p_address:{}}).then(({data,error}:any)=>{if(error){setCheckoutEstimate(null);toast(error.message||'Could not calculate the payment estimate.');}else setCheckoutEstimate(data);});}}>Pickup</Radio></View>
        <View style={{flex:1}}><Radio on={groupCheckoutType==='delivery'} onPress={()=>setGroupCheckoutType('delivery')}>Delivery</Radio></View>
      </Row>
      {groupCheckoutType==='delivery' ? <View style={{marginTop:10}}>
        <T size={12} weight="700" style={{marginBottom:6}}>Deliver to</T>
        {S.addr.map((item:any)=><Radio key={String(item.id)} on={String(groupAddressId)===String(item.id)} onPress={()=>{setGroupAddressId(item.id);setGroupDeliveryQuote(null);setCheckoutEstimate(null);}}>
          <View style={{flex:1}}><T size={13} weight="700">{item.l}{item.def?' · Default':''}</T><T size={11.5} color={th.mut}>{item.t}</T></View>
        </Radio>)}
        {!S.addr.length ? <T size={12} color={th.mut}>No saved addresses found. Add a delivery address to your profile first.</T> : null}
        <Cta ghost small label={groupQuoteBusy?'Calculating delivery…':'Calculate delivery fee'} onPress={()=>void calculateGroupDeliveryQuote()} disabled={groupQuoteBusy||!S.addr.length}/>
        {groupDeliveryQuote&&groupDeliveryQuote.addressId===String(groupAddressId)&&groupDeliveryQuote.expiresAt>Date.now() ? <View style={{marginTop:8,padding:10,borderRadius:10,backgroundColor:th.soft}}>
          <Row sp><T size={12} color={th.mut}>Delivery fee</T><T size={13} weight="800">{money(groupDeliveryQuote.fee)}</T></Row>
          {groupDeliveryQuote.distanceKm>0 ? <T size={11} color={th.mut} style={{marginTop:3}}>Approx. {groupDeliveryQuote.distanceKm.toFixed(1)} km by road</T> : null}
          <T size={11} color={th.mut} style={{marginTop:4}}>Quote expires shortly. Service fee, if applicable, is calculated by the server at checkout.</T>
        </View> : null}
        <Cta ghost small label="Manage delivery addresses" onPress={()=>{close();A.go('addresses');}}/>
      </View> : null}
      {checkoutEstimate ? <View style={{marginTop:12,padding:11,borderRadius:11,backgroundColor:th.soft}}>
        <T size={12} weight="800" style={{marginBottom:7}}>Server-calculated payment estimate</T>
        <Row sp><T size={12} color={th.mut}>Combined cart subtotal</T><T size={12} weight="700">{money(Number(checkoutEstimate.subtotal||0))}</T></Row>
        {groupCheckoutType==='delivery' ? <Row sp style={{marginTop:5}}><T size={12} color={th.mut}>Delivery fee</T><T size={12} weight="700">{money(Number(checkoutEstimate.delivery_fee||0))}</T></Row> : null}
        <Row sp style={{marginTop:5}}><T size={12} color={th.mut}>Service fee</T><T size={12} weight="700">{money(Number(checkoutEstimate.service_fee||0))}</T></Row>
        <View style={{height:1,backgroundColor:th.line,marginVertical:8}}/>
        <Row sp><T size={13} weight="800">Estimated total</T><T size={15} weight="800">{money(Number(checkoutEstimate.estimated_total||0))}</T></Row>
        {checkoutEstimate.first_order_delivery_waiver ? <T size={10.5} color={th.mut} style={{marginTop:6}}>Your first-order delivery-fee waiver has been applied.</T> : null}
        <T size={10.5} color={th.mut} style={{marginTop:4}}>Final payment is recalculated and checked by the server when you place the order.</T>
      </View> : null}
      <Row sp style={{marginTop:10}}><T size={12} color={th.mut}>Host Wallet balance</T><T weight="800">{money(Number(S.wallet||0))}</T></Row>
      <T size={11.5} color={th.mut} style={{marginTop:4}}>Your Wallet must cover the final server-calculated total.</T>
      <View style={{height:9}}/>
      <Cta label={groupCheckoutBusy?'Placing group order…':'Place group order · Wallet'} onPress={()=>void checkoutGroupOrder()} disabled={groupCheckoutBusy||(groupCheckoutType==='delivery'&&(!S.addr.length||!groupDeliveryQuote||groupDeliveryQuote.addressId!==String(groupAddressId)||groupDeliveryQuote.expiresAt<=Date.now()))}/>
    </View> : null}
    <View style={{height:12}} />
    <Cta label={label('lbl.sheetDone', 'Done')} onPress={close} />
    <View style={{height:8}} />
    <Cta ghost label={label('lbl.sheetEndGroup', 'End group order')} onPress={async () => {
      if (!group.serverBacked || !group.groupId) {toast('This group invitation is not server-backed.');return;}
      setGroupBusy(true);
      const {data,error}=await supabase.rpc('goodies_group_order_end',{p_group_id:group.groupId});
      setGroupBusy(false);
      if(error){toast(error.message||'Could not end this group order.');return;}
      S.groupOrder=null; save(); emit(); close();
      toast('Group order ended.');
    }} />
    <Modal visible={scannerOpen} animationType="slide" onRequestClose={()=>setScannerOpen(false)}>
      <View style={{flex:1,backgroundColor:'#000000'}}>
        <CameraView style={{flex:1}} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>{
          setScannerOpen(false);
          const code=String(data||'').trim().toUpperCase();
          setInviteCode(code);
          toast('QR code scanned. Review the invite code and tap Join group order.');
        }}/>
        <View style={{padding:18,backgroundColor:'#111111'}}>
          <T color="#FFFFFF" weight="700" align="center">Scan a Wantiss group invite QR code</T>
          <Cta label="Close scanner" onPress={()=>setScannerOpen(false)}/>
        </View>
      </View>
    </Modal>
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
        <Pressable accessibilityLabel={label('lbl.sheetRemoveNumber', 'Remove number')} onPress={() => {if (S.orders.some((o: any) => !done(o) && o.cid == r.id)) {toast(label('lbl.sheetPhoneInUse', 'This number is used by an active order')); return;} ui.sheet({kind: 'remove-number', numberLabel: r.l || r.ph, onConfirm: () => {S.gc = S.gc.filter((c: any) => c.id !== r.id); if (S.cc === r.id) S.cc = 'w'; toast(label('lbl.sheetNumberRemoved', 'Number removed')); save(); emit(); ui.sheet({kind: 'contacts'});}});}}><Icon name="trash" size={18} color={th.red} /></Pressable></>}
      </View>
    ))}
    <Cta ghost label={label("lbl.sheetAutoQWFBNT", "+ Add another number")} onPress={() => ui.sheet({kind: 'ctform', id: ''})} />
  </>);
}
function CtForm({id,bottomInset=0}: {id: any; bottomInset?: number}) {
  const th = useTheme(), c = S.gc.filter((x: any) => x.id == id)[0] || {l: '', ph: ''};
  const [l, setL] = useState(c.l || ''), [ph, setPh] = useState(c.ph || '');
  const save_ = () => {
    const p = ph.trim();
    if (!phoneOK(p)) return toast(label('lbl.sheetPhoneInvalid', 'Enter a valid phone number (8 to 15 digits)'));
    const dg = p.replace(/\D/g, '');
    if (dg === S.pf.ph.replace(/\D/g, '')) return toast(label('lbl.sheetSameWantissPhone', 'That is already your Wantiss number'));
    if (S.gc.some((x: any) => x.id != id && String(x.ph).replace(/\D/g, '') === dg)) return toast(label('lbl.sheetDuplicateNumber', 'You already saved that number'));
    const cc = S.gc.filter((x: any) => x.id == id)[0];
    if (cc) {cc.ph = p; cc.l = l.trim();} else {const n = {id: Date.now(), ph: p, l: l.trim()}; S.gc.push(n); S.cc = n.id;}
    toast(label('lbl.sheetNumberSaved', 'Number saved for Goodies checkout')); save(); emit(); ui.sheet({kind: 'contacts'});
  };
  return <View style={{flex:1,minHeight:0,paddingBottom:Math.max(0,bottomInset-20)}}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:12}}>
      <T size={20} weight="800">{id ? label('lbl.sheetEditContactNumber','Edit contact number') : label('lbl.sheetAddContactNumber','Add contact number')}</T>
      <T size={12.5} color={th.mut} style={{marginTop:3,marginBottom:10}}>{label("lbl.sheetAutoLZBAF5", "Saved for Goodies checkout only. Your Wantiss account number is not changed here. Country-code management will be handled in Wantiss settings.")}</T>
      <Input label={label("lbl.sheetAuto5601C6", "Label (optional)")} value={l} onChange={setL} placeholder={label("lbl.sheetAutoBBS3LN", "e.g. Partner, Office")} />
      <Input label={label("lbl.sheetAutoSTYZV6", "Phone number")} value={ph} onChange={setPh} placeholder={label("lbl.sheetAuto1JJXA6W", "Enter phone number")} keyboard="phone-pad" />
    </ScrollView>
    <View style={{paddingTop:8,borderTopWidth:1,borderTopColor:th.line}}>
      <Cta label={label("lbl.sheetAuto9HY80N", "Save number")} onPress={save_} />
      <View style={{height:8}}/><Cta ghost label={label("lbl.sheetAuto1LJ92XO", "Back")} onPress={() => ui.sheet({kind: 'contacts'})} />
    </View>
  </View>;
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
