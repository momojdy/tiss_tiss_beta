import React, {useState} from 'react';
import {View, Text, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform} from 'react-native';
import {T, Cta, Row, Card, Badge, Input, Radio, SheetBox, useTheme} from './ui';
import {Icon} from './Icon';
import {S, STB, money, emit, save, toast, ui, addr, defAddr, done, phoneOK} from '../store';
import * as A from '../actions';
import {PROMO_DETAIL} from '../data/promoText';
import {bzLeave, bzDiscard, bzReset2} from '../builders/engine';
import {alcAge} from '../store';
import {rgText, importContent, clearContent, hasContent} from '../content';
import {TextInput} from 'react-native';

export function Sheets({sheet, close}: {sheet: any; close: () => void}) {
  const th = useTheme();
  if (!sheet) return null;
  const k = sheet.kind;
  const stars = (n: number, on: (v: number) => void) => <View style={{flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 10}}>{[1, 2, 3, 4, 5].map(v => <Pressable key={v} onPress={() => on(v)}><Icon name="star" size={32} color={n >= v ? '#FFB400' : th.line} fill /></Pressable>)}</View>;
  let content: any = null;
  if (k === 'newcart') content = (<><T size={20} weight="800">Start a new cart?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>Your cart has items from {sheet.from}. Orders are placed with one store at a time, so adding from {sheet.to} replaces them.</T><Cta label="Replace and add" onPress={A.newCart} /><View style={{height: 10}} /><Cta ghost label="Keep current cart" onPress={close} /></>);
  if (k === 'byoleave') content = (<><T size={20} weight="800">{sheet.edit ? 'Discard your changes?' : 'Leave this builder?'}</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>{sheet.edit ? 'The item in your cart stays as it was.' : 'Your choices can be saved as a draft so you can pick up where you left off.'}</T>{sheet.edit ? null : <><Cta label="Save draft and leave" onPress={bzLeave} /><View style={{height: 10}} /></>}<Pressable onPress={bzDiscard} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">Discard</T></Pressable><View style={{height: 10}} /><Cta ghost label="Keep editing" onPress={close} /></>);
  if (k === 'byoreset') content = (<><T size={20} weight="800">Start over?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>This clears your current choices. Items already in your cart are not affected.</T><Cta label="Start over" onPress={bzReset2} /><View style={{height: 10}} /><Cta ghost label="Keep editing" onPress={close} /></>);
  if (k === 'alcrules') { const a = alcAge(sheet.sid || (S.pend && S.pend[0] ? S.pend[0].s : null)); content = (<><View style={{alignItems: 'center', marginBottom: 6}}><Text style={{fontSize: 44}}>🪪</Text></View><T size={20} weight="800">Alcohol rules</T><T color={th.mut} style={{marginTop: 8, lineHeight: 21}}>{rgText('rg.rules', 'Alcohol is sold only to customers aged {age} or older. Minors may not buy alcohol. Valid government photo ID is required at delivery or pickup. If the ID check fails, you are refunded to your Wantiss wallet minus the delivery fee.', a.age)}</T><Card style={{marginTop: 12}}><T size={13.5}>• Minimum age here: <T weight="800">{a.age}</T></T><T size={13.5}>• The courier checks your ID at the door. At a pickup, the shop checks it.</T><T size={13.5}>• If it fails, you get a refund to your Wantiss wallet minus the delivery fee.</T></Card><View style={{height: 6}} /><Cta label="I understand" onPress={A.alcAccept} /><View style={{height: 10}} /><Cta ghost label="Cancel" onPress={close} /></>); }
  if (k === 'import') content = <ImportSheet close={close} />;
  if (k === 'contacts') content = <ContactsSheet close={close} />;
  if (k === 'ctform') content = <CtForm key={sheet.id || 'new'} id={sheet.id} />;
  if (k === 'topup') content = (<><T size={20} weight="800">Top up wallet</T><T color={th.mut} style={{marginTop: 6, marginBottom: 14}}>Demo: no real money moves.</T><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{[10, 20, 50, 100].map(v => <Pressable key={v} onPress={() => {S.wallet += v; close(); toast('Wallet topped up to ' + money(S.wallet)); save(); emit();}} style={{paddingVertical: 10, paddingHorizontal: 16, borderRadius: 18, backgroundColor: th.soft}}><T size={14} weight="700">+{money(v)}</T></Pressable>)}</View></>);
  if (k === 'replace') content = (<><T size={20} weight="800">Replace your cart?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>Your cart has items from {sheet.from}.</T><Cta label="Replace and reorder" onPress={A.runReorder} /><View style={{height: 10}} /><Cta ghost label="Keep current cart" onPress={close} /></>);
  if (k === 'clear') content = (<><T size={20} weight="800">Clear your cart?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>All items will be removed.</T><Pressable onPress={A.clearCart} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">Clear cart</T></Pressable><View style={{height: 10}} /><Cta ghost label="Cancel" onPress={close} /></>);
  if (k === 'cancel') content = (<><T size={20} weight="800">Cancel this order?</T><T color={th.mut} style={{marginVertical: 8, marginBottom: 18}}>You can cancel until the store finishes preparing it.</T><Pressable onPress={() => A.cancelOrder(sheet.id)} style={{height: 52, borderRadius: 16, backgroundColor: th.red, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color="#fff">Yes, cancel order</T></Pressable><View style={{height: 10}} /><Cta ghost label="Keep order" onPress={close} /></>);
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
          <Pressable accessibilityRole="button" accessibilityLabel="Read store reviews" onPress={() => {close(); A.go('reviews', sheet.id);}} style={{flex: 1}}><T size={13} color={th.br}>CUSTOMER RATING · VIEW REVIEWS</T><T size={18} weight="800">★ {s.r} <T size={12.5} color={th.mut} weight="500">({s.rv} reviews)</T></T></Pressable>
          <Badge label={s.open ? 'Open now' : 'Closed now'} />
        </Row>
        {row('Opening hours', s.h)}
        {row('Current status', s.open ? 'Accepting orders' : s.nx || 'Currently closed')}
        {s.businessAddress ? row('Address', [s.businessAddress, s.businessCity, s.businessCountry].filter(Boolean).join(', ')) : null}
        {s.businessPhone ? row('Phone', s.businessPhone) : null}
        {s.businessEmail ? row('Email', s.businessEmail) : null}
        {s.businessWebsite ? row('Website', s.businessWebsite) : null}
        {s.businessDeliveryModes?.length ? row('Available services', s.businessDeliveryModes.join(' and ')) : null}
        {row('Delivery fee', s.fee === 0 ? 'Free delivery' : money(s.fee))}
        {row('Minimum order', money(s.min))}
        {row('Distance', s.km.toFixed(1) + ' km away')}
        {row('Estimated delivery', s.eta + ' min')}
        {row('Order methods', 'Delivery and pickup')}
        {row('Scheduled orders', s.acceptScheduledOrders ? 'Available while closed' : 'Only while open')}
        {s.acceptScheduledOrders ? row('Minimum advance time', Math.max(0, Number(s.scheduledOrderStartMinutes ?? 60)) + ' minutes after opening') : null}
      </Card>
      <View style={{height: 12}} />
      <Cta label="Browse this store" onPress={() => {close(); A.go('store', sheet.id);}} />
    </>);
  }
  if (k === 'msg') content = (<><T size={20} weight="800" style={{marginBottom: 14}}>Message courier</T><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{['I am at the gate', 'Please call me', 'Leave it at the door', 'Running 5 min late'].map(x => <Pressable key={x} onPress={() => {close(); toast('Sent: ' + x);}} style={{paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: th.soft}}><T size={13.5} weight="700">{x}</T></Pressable>)}</View></>);
  if (k === 'review' || k === 'driver-review') content = <ReviewSheet key={String(sheet.id) + ':' + k} id={sheet.id} stars={stars} driver={k === 'driver-review'} />;
  if (k === 'addr') content = (<><T size={20} weight="800" style={{marginBottom: 4}}>Deliver to</T><T size={12.5} color={th.mut} style={{marginBottom: 12}}>Choosing an address here only changes Goodies. Your Wantiss default stays the same.</T>{S.addr.map((a: any) => <Radio key={a.id} on={a.id === S.as} onPress={() => A.selectAddr(a.id)}><Row style={{gap: 6}}><T weight="700">{a.l}</T>{a.def ? <Badge green label="Wantiss default" /> : null}</Row><T size={12.5} color={th.mut}>{a.t}</T></Radio>)}<Cta ghost label="Manage addresses" onPress={() => {close(); A.go('addresses');}} /></>);

  return (
    <Modal transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <Pressable onPress={close} style={{flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end'}}>
          <Pressable onPress={() => {}} style={{width: '100%', height: k === 'promo' && sheet.custom ? '68%' : k === 'sinfo' || k === 'promo' ? '100%' : undefined, maxHeight: k === 'promo' && sheet.custom ? '68%' : '92%', flexShrink: 1, minHeight: 0}}>
            <SheetBox large={k === 'sinfo' || k === 'promo'} onClose={close}><ScrollView style={{flex: 1, minHeight: 0}} contentContainerStyle={{paddingBottom: 28, flexGrow: 1}} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>{content}</ScrollView></SheetBox>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReviewSheet({id, stars, driver = false}: {id: string; stars: any; driver?: boolean}) {
  const [n, setN] = useState(S.rt || 0), [t, setT] = useState('');
  return (<>
    <T size={20} weight="800">{driver ? 'Rate your driver' : 'Rate your order'}</T>{stars(n, setN)}
    <Input value={t} onChange={setT} placeholder="Add a comment (optional)" multiline />
    <View style={{height: 12}} />
    <Cta label="Submit review" onPress={() => {
      const o = S.orders.filter((x: any) => x.id === id)[0];
      if (!o) {toast('Order not found'); return;}
      if (!n) {toast('Pick a star rating'); return;}
      if (driver) {
        S.driverRev = S.driverRev || {};
        S.driverRev[id] = {n: S.pf.n, r: n, t: t.trim(), d: 'Just now', orderId: id};
        o.driverRated = n;
      } else {
        (S.rev[o.sid] = S.rev[o.sid] || []).unshift({n: S.pf.n, r: n, t: t.trim(), d: 'Just now', you: 1, orderId: id});
        o.rated = n;
      }
      S.rt = 0; ui.close(); toast(driver ? 'Thanks for rating your driver!' : 'Thanks for your review!'); save(); emit();
    }} />
  </>);
}

function ContactsSheet({close}: {close: () => void}) {
  const th = useTheme();
  const rows = [{id: 'w', ph: S.pf.ph, l: 'Default Wantiss number', w: 1}].concat(S.gc.map((c: any) => ({id: c.id, ph: c.ph, l: c.l || 'Goodies number', w: 0})));
  return (<>
    <T size={20} weight="800" style={{marginBottom: 4}}>Contact number</T>
    <T size={12.5} color={th.mut} style={{marginBottom: 12}}>We use this number for this order only. Your Wantiss account number is never changed here.</T>
    {rows.map((r: any) => (
      <View key={r.id} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <View style={{flex: 1}}><Radio on={S.cc === r.id} onPress={() => {S.cc = r.id; close(); save(); emit();}}><T weight="700">{r.ph}</T><View style={{marginTop: 3}}>{r.w ? <Badge green label="Default Wantiss number" /> : <T size={12.5} color={th.mut}>Goodies checkout number · {r.l}</T>}</View></Radio></View>
        {r.w ? null : <><Pressable accessibilityLabel="Edit number" onPress={() => ui.sheet({kind: 'ctform', id: r.id})}><T size={13} weight="700" color={th.br}>Edit</T></Pressable>
        <Pressable accessibilityLabel="Remove number" onPress={() => {if (S.orders.some((o: any) => !done(o) && o.cid == r.id)) {toast('This number is used by an active order'); return;} S.gc = S.gc.filter((c: any) => c.id !== r.id); if (S.cc === r.id) S.cc = 'w'; toast('Number removed'); save(); emit(); ui.sheet({kind: 'contacts'});}}><Icon name="trash" size={18} color={th.red} /></Pressable></>}
      </View>
    ))}
    <Cta ghost label="+ Add another number" onPress={() => ui.sheet({kind: 'ctform', id: ''})} />
  </>);
}
function CtForm({id}: {id: any}) {
  const th = useTheme(), c = S.gc.filter((x: any) => x.id == id)[0] || {l: '', ph: ''};
  const [l, setL] = useState(c.l || ''), [ph, setPh] = useState(c.ph || '');
  const save_ = () => {
    const p = ph.trim();
    if (!phoneOK(p)) return toast('Enter a valid phone number (8 to 15 digits)');
    const dg = p.replace(/\\D/g, '');
    if (dg === S.pf.ph.replace(/\\D/g, '')) return toast('That is already your Wantiss number');
    if (S.gc.some((x: any) => x.id != id && String(x.ph).replace(/\\D/g, '') === dg)) return toast('You already saved that number');
    const cc = S.gc.filter((x: any) => x.id == id)[0];
    if (cc) {cc.ph = p; cc.l = l.trim();} else {const n = {id: Date.now(), ph: p, l: l.trim()}; S.gc.push(n); S.cc = n.id;}
    toast('Number saved for Goodies checkout'); save(); emit(); ui.sheet({kind: 'contacts'});
  };
  return (<>
    <T size={20} weight="800">{id ? 'Edit' : 'Add'} contact number</T>
    <T size={12.5} color={th.mut} style={{marginTop: 3}}>Saved for Goodies checkout only. Your Wantiss account number is not changed here. Country-code management will be handled in Wantiss settings.</T>
    <Input label="Label (optional)" value={l} onChange={setL} placeholder="e.g. Partner, Office" />
    <Input label="Phone number" value={ph} onChange={setPh} placeholder="Enter phone number" keyboard="phone-pad" />
    <View style={{height: 14}} /><Cta label="Save number" onPress={save_} /><View style={{height: 10}} /><Cta ghost label="Back" onPress={() => ui.sheet({kind: 'contacts'})} />
  </>);
}

/* DEMO: paste the JSON exported from Wantiss Admin (Goodies > Overview > Export content). Production fetches the same shape from the backend. */
function ImportSheet({close}: {close: () => void}) {
  const th = useTheme(), [txt, setTxt] = useState('');
  return (<>
    <T size={20} weight="800">Import Admin content</T>
    <T size={12.5} color={th.mut} style={{marginTop: 6, marginBottom: 10}}>Paste the content exported from Wantiss Admin. It replaces promo cards, categories, labels, fees, age rules, texts and artwork in this demo. {hasContent() ? 'Admin content is currently loaded.' : 'The built-in sample content is currently used.'}</T>
    <TextInput value={txt} onChangeText={setTxt} multiline placeholder="Paste JSON here" placeholderTextColor={th.mut} style={{minHeight: 120, maxHeight: 220, fontSize: 12, color: th.ink, backgroundColor: th.soft, borderWidth: 1, borderColor: th.line, borderRadius: 12, padding: 10, textAlignVertical: 'top'}} />
    <View style={{height: 12}} />
    <Cta label="Import" onPress={async () => {try {await importContent(txt.trim()); close(); toast('Admin content loaded'); emit();} catch (e: any) {toast(String(e && e.message ? e.message : 'That is not valid JSON'));}}} />
    {hasContent() ? <><View style={{height: 10}} /><Cta ghost label="Go back to sample content" onPress={async () => {await clearContent(); close(); toast('Using sample content'); emit();}} /></> : null}
  </>);
}
