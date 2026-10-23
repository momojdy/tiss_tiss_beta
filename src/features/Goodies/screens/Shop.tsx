import React, {useState, useEffect} from 'react';
import {View, Text, Pressable, ScrollView, useWindowDimensions, Image} from 'react-native';
import {Icon} from '../components/Icon';
import {T, Grad, Circ, Bar, Sh, Rail, Chips, Cta, Card, Row, Badge, Ttl, Empty, Tile, Radio, Seg, Stepper, Input, Switch, bgIdx, useTheme} from '../components/ui';
import {Dish, StoreCard, ItemRow} from '../components/cards';
import {fmtTime, fmtDay, hasAlcohol, alcAge, S, ST, STB, IT, DEALS, money, dp, addr, cnt, first, totals, isPk, ctOf, qtyIn, done, TL, TP, defAddr, emit, save, toast, refreshLiveSchedules} from '../store';
import {go, tab, back, browse, heart, favp, setSize, toggleDrink, productQty, productAdd, qty, clearAsk, promoApply, promoClear, goCheckout, checkoutNext, setMode, setTip, setSch, setPay, placeOrder, cancelAsk, reorder, setOrdersTab} from '../actions';
import {CHOOSE_SIZE_CATS, setConsent, createWallet, idResult} from '../actions';
import {rgText, stageLabels, fees, faq as faqList} from '../content';
import {providerInfo} from '../providers';
import {byoRows, byoOn, lineBad, bzEdit, bzRemove} from '../builders/engine';
import {SEED_REVIEWS} from '../data/seed';
import {t as tr} from '../i18n';
import {supabase} from '../../../lib/supabase';
import Svg, {Path, Circle} from 'react-native-svg';


const Hero = ({s, onBack, right}: any) => (
  <Grad idx={bgIdx(s.bg)} style={{height: 180, alignItems: 'center', justifyContent: 'center'}}>
    <Text style={{fontSize: 90}}>{s.e}</Text>
    <View style={{position: 'absolute', top: 50, left: 16}}><Circ icon="chevL" label={tr('back')} onPress={onBack} /></View>
    {right ? <View style={{position: 'absolute', top: 50, right: 16}}>{right}</View> : null}
  </Grad>
);

export function Store({id}: {id: string}) {
  useEffect(() => { void refreshLiveSchedules(); }, [id]);
  const th = useTheme(), s = STB[id], t = S.ss[id + 't'] || 'all', q = (S.ss[id] || '').toLowerCase();
  const l = s.it.filter((i, n) => (!q || i.n.toLowerCase().indexOf(q) > -1) && (t === 'all' || (t === 'pop' && n < 2) || (t === 'deal' && DEALS.some(d => d[0] === i.id))));
  const rows = t === 'all' || t === 'custom' ? byoRows(id, q) : null;
  const items = t === 'custom' ? [] : l;
  const reviews = SEED_REVIEWS.concat(S.rev[id] || []);
  const tabs: [string, string][] = [['all', 'All'], ['pop', 'Popular'], ['deal', 'Deals'], ...(byoOn(id) ? [['custom', 'Build your own'] as [string, string]] : [])];
  return (
    <View>
      <Hero s={s} onBack={back} right={<Circ icon="heart" label="Save store" color={S.fav.indexOf(id) > -1 ? '#FD802E' : undefined} fill={S.fav.indexOf(id) > -1} onPress={() => heart(id)} />} />
      <View style={{paddingHorizontal: 16}}>
        <T size={24} weight="800" style={{marginTop: 16}}>{s.n}</T>
        <T size={13} color={th.mut} style={{marginTop: 3}}>{s.k} · {s.km.toFixed(1)} km away</T>
        {!s.open ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T weight="700">Closed right now</T><T size={13} color={th.mut}>{s.acceptScheduledOrders ? s.nx + '. Scheduled orders are available for future opening-time slots.' : s.nx + '. Ordering is paused until then.'}</T></Card> : null}
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 4}}>
          <Pressable accessibilityRole="button" accessibilityLabel="Read store reviews" onPress={() => go('reviews', id)}><Badge green label={'★ ' + s.r.toFixed(1) + ' (' + s.rv + ')'} /></Pressable><Badge label={s.eta + ' min'} /><Badge label={s.fee === 0 ? tr('freeDelivery') : money(s.fee) + ' ' + tr('delivery')} /><Badge label={'Min. ' + money(s.min)} /><Badge label="Delivery + pickup" />{s.pr ? <Badge label={s.pr} /> : null}
        </View>
        <View style={{flexDirection: 'row', gap: 8, marginTop: 10}}>
          <Cta small ghost label="Store info" onPress={() => require('../store').ui.sheet({kind: 'sinfo', id})} />
          <Cta small ghost label="Message store" onPress={() => go('contact', {storeContact: true, storeId: id})} />
        </View>
        <View style={{marginTop: 14}}><Input value={S.ss[id] || ''} onChange={v => {S.ss[id] = v; emit();}} placeholder={'Search in ' + s.n} /></View>
      </View>
      <View style={{marginTop: 8}}><Chips list={tabs} on={t} onPick={k => {S.ss[id + 't'] = k; emit();}} /></View>
      <View style={{paddingHorizontal: 16, marginTop: 4}}>
        {rows || items.length ? (<>{rows}{items.map(i => <ItemRow key={i.id} i={i} />)}</>) : <Empty emoji="🔎" title="No items found" text="Try another word." />}
        <T size={19} weight="800" style={{marginTop: 24, marginBottom: 8}}>Reviews</T>
        {reviews.map((v: any, k: number) => (
          <Card key={k} style={{marginBottom: 8}}>
            <Row sp><Row style={{gap: 6}}><T weight="700">{v.n}</T>{v.you ? <Badge label="Your review" /> : null}</Row><Row style={{gap: 3}}><Icon name="star" size={13} color="#FFB400" fill /><T size={13} weight="700">{v.r}</T></Row></Row>
            <T size={13.5} color={th.mut} style={{marginTop: 4}}>{v.t || 'No comment'}</T>
            <T size={11.5} color={th.mut} style={{marginTop: 4}}>{v.d}{v.you ? '' : ' · sample review'}</T>
          </Card>
        ))}
      </View>
    </View>
  );
}

export function StoreReviews({id}: {id: string}) {
  const th = useTheme(), s = STB[id];
  if (!s) return <View><Bar title="Store reviews" onBack={back} /><Empty emoji="⭐" title="Store not found" button="Back to stores" onPress={browse} /></View>;
  const reviews = SEED_REVIEWS.concat(S.rev[id] || []);
  return (
    <View>
      <Bar title="Reviews" onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Card style={{marginBottom: 14}}>
          <Row style={{alignItems: 'center', gap: 12}}>
            <View style={{width: 54, height: 54, borderRadius: 16, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 30}}>{s.e}</Text></View>
            <View style={{flex: 1}}><T size={18} weight="800">{s.n}</T><T size={13} color={th.mut}>Customer reviews</T></View>
            <View style={{alignItems: 'flex-end'}}><T size={22} weight="800">★ {s.r.toFixed(1)}</T><T size={11.5} color={th.mut}>{s.rv} reviews</T></View>
          </Row>
        </Card>
        {reviews.length ? reviews.map((v: any, k: number) => <Card key={k} style={{marginBottom: 10}}>
          <Row sp><Row style={{gap: 6}}><T weight="700">{v.n}</T>{v.you ? <Badge label="Your review" /> : null}</Row><Row style={{gap: 4}}><Icon name="star" size={13} color="#FFB400" fill /><T size={13} weight="700">{v.r}</T></Row></Row>
          <T size={13.5} style={{marginTop: 6}}>{v.t || 'No comment'}</T>
          <T size={11.5} color={th.mut} style={{marginTop: 5}}>{v.d}{v.you ? '' : ' · sample review'}</T>
        </Card>) : <Empty emoji="⭐" title="No reviews yet" text="Be the first customer to review this store." />}
        <Cta ghost label="Back to store" onPress={() => go('store', id)} />
      </View>
    </View>
  );
}

export function Product() {
  const th = useTheme(), {width} = useWindowDimensions(), h = S.sh, i = h && IT[h.id];
  if (!i) return <View><Bar title="Product" onBack={back} /><Empty emoji="📦" title="Product not found" button="Back to Goodies" onPress={browse} /></View>;
  const s = STB[i.s], o = CHOOSE_SIZE_CATS.indexOf(s.c) > -1, u = ['restaurants', 'bakery'].indexOf(s.c) > -1;
  const base = h.off ? dp(i, h.off) : i.p, unit = base + (h.size > 0 ? 1.5 : 0) + (h.drink ? 1 : 0);
  const rel = s.it.filter(x => x.id !== i.id).concat(ST.filter(x => x.c === s.c && x.id !== s.id).flatMap(x => x.it)).slice(0, 6);
  const fav = S.favp.indexOf(i.id) > -1;
  return (
    <View>
      <Bar title={s.n} onBack={back} stripe={false} right={<Circ icon="heart" label="Save item" color={S.favp.indexOf(i.id) > -1 ? '#FD802E' : undefined} fill={S.favp.indexOf(i.id) > -1} onPress={() => favp(i.id)} />} />
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {['bg0', 'bg1', 'bg2'].map((b, n) => <Grad key={b} idx={bgIdx(n ? b : s.bg)} style={{width, height: 210, alignItems: 'center', justifyContent: 'center'}}>{i.photo ? <Image source={{uri: i.photo}} style={{width, height: 210}} /> : <Text style={{fontSize: 96}}>{i.e}</Text>}</Grad>)}
      </ScrollView>
      <T size={12} color={th.mut} align="center" style={{marginTop: 6}}>Swipe for more photos</T>
      <View style={{paddingHorizontal: 16}}>
        <T size={23} weight="800" style={{marginTop: 10}}>{i.n}</T>
        <Pressable onPress={() => go('store', s.id)}><T size={13.5} weight="700" color={th.br}>{s.n} · ★ {s.r.toFixed(1)}</T></Pressable>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8}}>
          <T size={24} weight="800" color={th.br}>{money(base)}</T>
          {h.off ? <><T size={15} color={th.mut} style={{textDecorationLine: 'line-through'}}>{money(i.p)}</T><Badge label={'-' + h.off + '%'} /></> : null}
        </View>
        {i.w ? <T size={12.5} color={th.mut} style={{marginTop: 4}}>Estimated price. Final amount may vary with the exact weight.</T> : null}
        <T size={14.5} style={{marginTop: 12, lineHeight: 21}}>{i.d}</T>
        {i.al ? <T size={13} color={th.mut} style={{marginTop: 6}}>Allergens: {i.al}</T> : null}
        {(i as any).restriction === 'alcohol' ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T weight="800">Alcohol. Minors may not purchase.</T><T size={13} color={th.mut} style={{marginTop: 3}}>{rgText('rg.minors', 'Minors may not purchase alcohol.', alcAge(i.s).age)} Minimum age {alcAge(i.s).age}. Valid government photo ID is required at delivery or pickup.</T></Card> : null}
        {(i as any).restriction === 'otc' ? <T size={12.5} color={th.mut} style={{marginTop: 8}}>Over-the-counter product. Read the label and use as directed.</T> : null}
        <T size={13} weight="700" color={i.oos ? th.red : i.stock <= 5 ? th.brd : th.grn} style={{marginTop: 8}}>{i.oos ? 'Out of stock' : i.stock <= 5 ? 'Only ' + i.stock + ' left' : 'In stock'}</T>
        {o ? (<>
          <Row style={{marginTop: 18, marginBottom: 8, gap: 8}}><T size={15} weight="800">Size</T><Badge label="Required" /></Row>
          <Radio on={h.size === 0} onPress={() => setSize(0)}><T>Regular</T></Radio>
          <Radio on={h.size === 1} onPress={() => setSize(1)}><Row sp><T>Large</T><T weight="800">+$1.50</T></Row></Radio>
        </>) : null}
        {u ? <Radio on={!!h.drink} onPress={toggleDrink}><Row sp><T>Add a drink</T><T weight="800">+$1.00</T></Row></Radio> : null}
        <Input label="Special instructions" value={h.note || ''} onChange={v => {S.sh.note = v; emit();}} placeholder="Optional" multiline />
        <T size={18} weight="800" style={{paddingTop: 22, paddingBottom: 10}}>You may also like</T>
      </View>
      <Rail>{rel.map(x => <Dish key={x.id} i={x} />)}</Rail>
    </View>
  );
}
export function ProductFoot() {
  const th = useTheme(), h = S.sh, i = h && IT[h.id];
  if (!i) return null;
  const s = STB[i.s], o = CHOOSE_SIZE_CATS.indexOf(s.c) > -1, base = h.off ? dp(i, h.off) : i.p, unit = base + (h.size > 0 ? 1.5 : 0) + (h.drink ? 1 : 0);
  const blocked = i.oos || (!s.open && !s.acceptScheduledOrders) || (o && h.size < 0), lbl = i.oos ? 'Out of stock' : !s.open && !s.acceptScheduledOrders ? 'Store is closed' : !s.open ? 'Schedule order · ' + money(unit * h.q) : o && h.size < 0 ? 'Choose a size' : 'Add to cart · ' + money(unit * h.q);
  return <Row><Stepper q={h.q} onMinus={() => productQty(-1)} onPlus={() => productQty(1)} /><View style={{flex: 1}}><Cta label={lbl} disabled={!!blocked} onPress={productAdd} /></View></Row>;
}

const Sum = ({rows, total}: {rows: [string, string, 'g'?][]; total?: [string, string]}) => {
  const th = useTheme();
  return (
    <Card>
      {rows.map((r, k) => <View key={k} style={{flexDirection: 'row', justifyContent: 'space-between', marginVertical: 7}}><T size={14} color={r[2] === 'g' ? th.grn : th.mut} weight={r[2] === 'g' ? '700' : undefined}>{r[0]}</T><T size={14} color={r[2] === 'g' ? th.grn : th.mut} weight={r[2] === 'g' ? '700' : undefined} style={{maxWidth: '60%', textAlign: 'right'}}>{r[1]}</T></View>)}
      {total ? <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: th.line}}><T size={17} weight="800">{total[0]}</T><T size={17} weight="800">{total[1]}</T></View> : null}
    </Card>
  );
};

export function Cart() {
  const th = useTheme(), c = S.cart, [code, setCode] = useState(S.pin || '');
  if (!c.lines.length) return <View><Bar title="Your cart" onBack={back} /><Empty emoji="🛒" title="Your cart is empty" text="Explore nearby stores, check what's open, and discover products around your chosen address." button="Start browsing" onPress={() => go('explore')} /></View>;
  const t = totals(), st = t.st!, badLine = c.lines.some((l: any) => l.byo && lineBad(l)), short = t.sub < st.min || badLine;
  return (
    <View>
      <Bar title="Your cart" onBack={back} right={<Circ icon="trash" label="Clear cart" onPress={clearAsk} />} />
      <View style={{paddingHorizontal: 16}}>
        <Row style={{marginBottom: 8}}><Tile e={st.e} bg={st.bg} size={44} /><View style={{flex: 1}}><T weight="700">{st.n}</T><T size={13} color={th.mut}>Your order from this store · {st.eta} min</T></View></Row>
        {!st.open ? <Card style={{backgroundColor: th.brt, borderColor: th.br}}><T weight="700">{st.n} is closed</T><T size={13} color={th.mut}>{st.acceptScheduledOrders ? st.nx + '. Scheduled orders are available. The earliest time is set by this shop; choose a future slot at checkout.' : st.nx + '. You can keep these items, but this store does not currently accept scheduled orders.'}</T></Card> : null}
        {c.lines.map((l: any) => {
          const bad = l.byo ? lineBad(l) : '';
          return (
            <View key={l.k} style={{flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: th.line}}>
              <Tile e={l.e} bg="bg0" size={48} />
              <View style={{flex: 1}}>
                <T size={14.5} weight="700">{l.n}</T>
                {l.d ? <T size={12} color={th.mut} style={{lineHeight: 17}}>{l.d}</T> : null}
                {l.nt ? <T size={12.5} color={th.mut} style={{fontStyle: 'italic', marginTop: 3}}>Note: {l.nt}</T> : null}
                {bad ? <T size={12.5} weight="700" color={th.red} style={{marginTop: 4}}>{l.n} {bad}</T> : null}
                <T size={14} weight="800" style={{marginTop: 4}}>{money(l.p * l.q)}</T>
                {l.byo ? <View style={{flexDirection: 'row', gap: 16, marginTop: 6}}><Pressable onPress={() => bzEdit(l.k)}><T size={13} weight="700" color={th.br}>Edit</T></Pressable><Pressable onPress={() => bzRemove(l.k)}><T size={13} weight="700" color={th.red}>Remove</T></Pressable></View> : null}
              </View>
              <Stepper q={l.q} onMinus={() => qty(l.k, -1)} onPlus={() => qty(l.k, 1)} />
            </View>
          );
        })}
        <Pressable onPress={() => go('store', st.id)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.line, borderRadius: 16}}><T weight="700" style={{flex: 1}}>+ Continue shopping</T><Icon name="chevR" size={16} color={th.ink} /></Pressable>
        {hasAlcohol() ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 14}}><T weight="800">Your order includes alcohol</T><T size={13} color={th.mut} style={{marginTop: 3}}>{rgText('rg.rules', 'Alcohol is sold only to customers aged {age} or older. Minors may not buy alcohol. Valid government photo ID is required at delivery or pickup. If the ID check fails, you are refunded to your Wantiss wallet minus the delivery fee.', alcAge(c.sid).age)}</T></Card> : null}
        <Ttl>Promo code</Ttl>
        {S.promo ? (
          <Card style={{padding: 12}}><Row sp><View style={{flex: 1}}><Row style={{gap: 6}}><T weight="700">{S.promo}</T>{t.pok ? <Badge green label="Applied" /> : <Badge red label="Not valid" />}</Row>{t.perr ? <T size={12.5} color={th.mut} style={{marginTop: 4}}>{t.perr}</T> : null}</View><Pressable onPress={promoClear}><T weight="700" color={th.red}>Remove</T></Pressable></Row></Card>
        ) : (<>
          <Row><View style={{flex: 1}}><Input value={code} onChange={v => setCode(v.toUpperCase())} placeholder="Try GOODIES10" /></View><View style={{width: 90}}><Cta label="Apply" onPress={() => promoApply(code)} /></View></Row>
          <Pressable onPress={() => go('promos')}><T size={13} weight="700" color={th.br} style={{marginTop: 8}}>See available coupons</T></Pressable>
        </>)}
        <View style={{marginTop: 16}}><Sum rows={[['Subtotal', money(t.sub)], ['Delivery fee', isPk() ? 'Pickup' : t.free ? (first() ? 'Free (first order)' : 'Free') : money(t.fee), t.free ? 'g' : undefined as any], ['Service fee', money(t.svc)], ...(t.disc ? [['Discount', '-' + money(t.disc), 'g'] as any] : []), ...(t.tip ? [['Courier tip', money(t.tip)] as any] : [])]} total={['Total', money(t.total)]} /></View>
        {badLine ? <T size={13} color={th.red} align="center" style={{marginBottom: 10}}>Fix the items marked above to continue.</T> : t.sub < st.min ? <T size={13} color={th.mut} align="center" style={{marginBottom: 10}}>Add {money(st.min - t.sub)} more to reach the {money(st.min)} minimum.</T> : null}
        <Cta label={'Checkout · ' + money(t.total)} disabled={short} onPress={goCheckout} />
      </View>
    </View>
  );
}

function slots(store: any = STB[S.cart.sid]) {
  const out: {ts: number; l: string}[] = [];
  const F = fees();
  const now = Date.now();
  const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const lead = store && !store.open && store.acceptScheduledOrders ? Math.max(0, Number(store.scheduledOrderStartMinutes ?? 60)) : F.lead;
  const schedule = store?.scheduleHours;
  if (schedule && Object.keys(schedule).length) {
    for (let dayOffset = 0; dayOffset < 8 && out.length < F.slots; dayOffset++) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() + dayOffset);
      const h = schedule[names[dayDate.getDay()]];
      if (!h || h.closed || !h.open || !h.close) continue;
      const [oh, om] = String(h.open).split(':').map(Number), [ch, cm] = String(h.close).split(':').map(Number);
      const opening = new Date(dayDate); opening.setHours(oh, om || 0, 0, 0);
      const closing = new Date(dayDate); closing.setHours(ch, cm || 0, 0, 0);
      let slot = new Date(opening.getTime() + lead * 60000);
      if (slot.getTime() <= now) {
        const elapsed = Math.max(0, now - slot.getTime());
        slot = new Date(slot.getTime() + (Math.floor(elapsed / (30 * 60000)) + 1) * 30 * 60000);
      }
      while (slot < closing && slot.getTime() > now && out.length < F.slots) {
        const day = slot.toDateString() === new Date().toDateString() ? 'Today' : slot.toDateString() === new Date(Date.now() + 86400000).toDateString() ? 'Tomorrow' : fmtDay(slot);
        out.push({ts: slot.getTime(), l: day + ', ' + fmtTime(slot)});
        slot = new Date(slot.getTime() + 30 * 60000);
      }
    }
    return out;
  }
  let d: Date;
  if (store && !store.open && store.acceptScheduledOrders) {
    const opening = String(store.h || '').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    d = new Date();
    if (/tomorrow/i.test(String(store.nx || '')) || !opening) d.setDate(d.getDate() + 1);
    if (opening) {
      let hour = Number(opening[1]) % 12;
      if (opening[3].toLowerCase() === 'pm') hour += 12;
      d.setHours(hour, Number(opening[2] || 0), 0, 0);
      if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    } else d.setHours(9, 0, 0, 0);
    d = new Date(d.getTime() + lead * 60000);
  } else {
    d = new Date(now + F.lead * 60000);
    d.setMinutes(Math.ceil(d.getMinutes() / F.step) * F.step, 0, 0);
  }
  for (let n = 0; n < F.slots; n++) {
    const day = d.toDateString() === new Date().toDateString() ? 'Today' : d.toDateString() === new Date(Date.now() + 86400000).toDateString() ? 'Tomorrow' : fmtDay(d);
    out.push({ts: d.getTime(), l: day + ', ' + fmtTime(d)});
    d = new Date(d.getTime() + 30 * 60000);
  }
  return out.filter(x => x.ts > now);
}
const IcBox = ({icon}: {icon: string}) => {const th = useTheme(); return <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: th.brt, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} color={th.br} /></View>;};

export function Checkout() {
  useEffect(() => { void refreshLiveSchedules(); }, []);
  const th = useTheme(), t = totals(), pk = isPk(), a = addr(), st = t.st!, sl = slots(st), stp = ['Delivery', 'Time', 'Payment', 'Review'];
  const PAYON: any = fees().pay, allPays: [string, string, string, string][] = [['wallet', 'Wantiss Wallet', 'Balance ' + money(S.wallet), 'wallet'], ['moncash', 'MonCash', 'Simulated mobile wallet', 'phone'], ['card', 'Credit / debit card', S.cards.length ? S.cards[0].b + ' •••• ' + S.cards[0].l4 : 'Add a card (demo)', 'card'], ['cash', 'Cash on ' + (pk ? 'pickup' : 'delivery'), 'Pay when you receive it', 'bag']], pays = allPays.filter(p => PAYON[({wallet: 'Wallet', moncash: 'MonCash', card: 'Card', cash: 'Cash'} as any)[p[0]]]);
  const ct = ctOf();
  let body: any = null;
  if (S.cs === 0) body = (<>
    <Seg list={[['delivery', 'Delivery'], ['pickup', 'Pickup']]} on={pk ? 'pickup' : 'delivery'} onPick={k => {if (k === 'delivery' && st.far) return; setMode(k);}} />
    <Ttl>{pk ? 'Pickup from' : 'Deliver to'}</Ttl>
    <Card><Row><IcBox icon="pin" /><View style={{flex: 1}}>
      {pk ? <><T weight="700">{st.n}</T><T size={13} color={th.mut}>{st.km.toFixed(1)} km from you · open {st.h}</T></> : <><T weight="700">{a.l}</T><T size={13} color={th.mut}>{a.t}{a.apt ? ', ' + a.apt : ''}</T>{a.inst ? <T size={12.5} color={th.mut}>Note: {a.inst}</T> : null}<T size={11.5} color={th.mut} style={{marginTop: 3}}>Only for this order. Your Wantiss default is unchanged.</T></>}
    </View>{pk ? null : <Pressable onPress={() => go('addresses')}><T size={13} weight="700" color={th.br}>Change</T></Pressable>}</Row></Card>
    {st.far ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T weight="700">Pickup only</T><T size={13} color={th.mut}>{st.n} is {st.km.toFixed(1)} km from this address, beyond delivery range. Pick another address to get delivery.</T></Card> : null}
    {hasAlcohol() && !S.hasWallet ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T weight="800">Create a Wantiss wallet</T><T size={13} color={th.mut} style={{marginVertical: 4}}>{rgText('rg.wallet', 'Create a Wantiss wallet so any refund has somewhere to go. You can withdraw from it later.', alcAge(S.cart.sid).age)}</T><Cta small label="Create wallet" onPress={createWallet} /></Card> : null}
    <Ttl>Contact number</Ttl>
    <Card><Row><IcBox icon="phone" /><View style={{flex: 1}}><T weight="700">{ct.ph}</T><View style={{marginTop: 3, flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>{ct.w ? <Badge green label="Default Wantiss number" /> : <><Badge label="Goodies checkout number" /><T size={12.5} color={th.mut}>{ct.l}</T></>}</View></View><Pressable onPress={() => require('../store').ui.sheet({kind: 'contacts'})}><T size={13} weight="700" color={th.br}>Change</T></Pressable></Row></Card>
  </>);
  if (S.cs === 1) body = (<>
    <T size={15} weight="800" style={{marginBottom: 8}}>When do you want it?</T>
    {st.open ? <Radio on={!S.sch} onPress={() => setSch(0)}><T weight="700">ASAP</T><T size={12.5} color={th.mut}>{st.eta} min</T></Radio> : <T size={12.5} color={th.mut} style={{marginBottom: 10}}>Choose a future slot. This shop's minimum advance time is already applied; the store receives the order for that selected time.</T>}
    {sl.map(x => <Radio key={x.ts} on={S.sch === x.ts} onPress={() => setSch(x.ts)}><T weight="700">{x.l}</T></Radio>)}
    {pk ? null : (<><Ttl>Tip your courier</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{fees().tips.map((v: number) => <Pressable key={v} onPress={() => setTip(v)} style={{paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: S.tip === v ? th.br : th.soft}}><T size={13.5} weight="700" color={S.tip === v ? '#fff' : th.ink}>{v ? money(v) : 'No tip'}</T></Pressable>)}</View></>)}
    <Input label={pk ? 'Note for the store' : 'Delivery instructions'} value={S.note} onChange={v => {S.note = v; emit();}} placeholder="Optional" multiline />
  </>);
  if (S.cs === 2) body = (<>
    <T size={15} weight="800" style={{marginBottom: 8}}>Payment method</T>
    {pays.map(p => <Radio key={p[0]} on={S.pay === p[0]} onPress={() => setPay(p[0])}><Row><Icon name={p[3]} size={20} color={th.ink} /><View style={{flex: 1}}><T size={14.5} weight="700">{p[1]}</T><T size={12.5} color={th.mut}>{p[2]}</T></View></Row></Radio>)}
    <T size={12} color={th.mut}>Demo only. No real payment is taken.</T>
  </>);
  if (S.cs === 3) body = (<>
    <Card><T weight="700">{st.n}</T>{S.cart.lines.map((l: any) => <Row key={l.k} sp style={{marginTop: 8, alignItems: 'flex-start'}}><View style={{flex: 1}}><T size={14}>{l.q}× {l.n}</T>{l.d ? <T size={12} color={th.mut}>{l.d}</T> : null}</View><T size={14}>{money(l.p * l.q)}</T></Row>)}</Card>
    <Sum rows={[[pk ? 'Pickup' : 'Delivery to', pk ? st.n : a.t], ['When', S.sch ? fmtDay(new Date(S.sch)) + ', ' + fmtTime(new Date(S.sch)) : 'ASAP'], ['Contact', ct.ph], ['Payment', ({wallet: 'Wallet', moncash: 'MonCash', card: 'Card', cash: 'Cash'} as any)[S.pay]], ...(S.note ? [['Note', S.note] as any] : [])]} />
    {hasAlcohol() ? <Card style={{borderColor: th.br}}><T weight="800">Alcohol order. Please confirm.</T><T size={13} color={th.mut} style={{marginVertical: 6}}>{rgText('rg.refund', 'If the ID check fails, the alcohol returns to the store and you are refunded to your Wantiss wallet minus the delivery fee.', alcAge(S.cart.sid).age)}</T><Pressable onPress={() => setConsent(!S.alcConsent)} accessibilityRole="checkbox" accessibilityState={{checked: !!S.alcConsent}} style={{flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4}}><View style={{width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: th.br, backgroundColor: S.alcConsent ? th.br : 'transparent', alignItems: 'center', justifyContent: 'center'}}>{S.alcConsent ? <Icon name="check" size={14} color="#fff" /> : null}</View><T size={13.5} style={{flex: 1}}>{rgText('rg.consent', 'I am {age} or older and will show valid government photo ID on delivery or pickup.', alcAge(S.cart.sid).age)}</T></Pressable></Card> : null}
    <Sum rows={[['Subtotal', money(t.sub)], ['Delivery fee', pk ? 'Pickup' : t.free ? 'Free' : money(t.fee), t.free ? 'g' : undefined as any], ['Service fee', money(t.svc)], ...(t.disc ? [['Discount', '-' + money(t.disc), 'g'] as any] : []), ...(t.tip ? [['Tip', money(t.tip)] as any] : [])]} total={['Total', money(t.total)]} />
  </>);
  return (
    <View>
      <Bar title="Checkout" onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <View style={{flexDirection: 'row', gap: 6, marginBottom: 6}}>{stp.map((x, n) => <View key={x} style={{flex: 1, alignItems: 'center'}}><View style={{height: 5, borderRadius: 3, alignSelf: 'stretch', backgroundColor: n <= S.cs ? th.br : th.line}} /><T size={11.5} weight={n === S.cs ? '800' : '500'} style={{marginTop: 5}}>{x}</T></View>)}</View>
        {body}
      </View>
    </View>
  );
}
export const CheckoutFoot = () => <Cta label={S.cs === 3 ? 'Place order · ' + money(totals().total) : 'Continue'} disabled={S.cs === 3 && hasAlcohol() && !S.alcConsent} onPress={S.cs === 3 ? placeOrder : checkoutNext} />;

export function Confirm({id}: {id: string}) {
  const th = useTheme(), o = S.orders.filter((x: any) => x.id === id)[0];
  if (!o) return <View><Bar title="Order" onBack={back} /><Empty emoji="📦" title="Order not found" button="Go home" onPress={browse} /></View>;
  return (
    <View style={{paddingHorizontal: 16, paddingTop: 50, alignItems: 'center'}}>
      <Text style={{fontSize: 70}}>✅</Text>
      <T size={24} weight="800" style={{marginTop: 10, marginBottom: 4}}>Order placed</T>
      <T color={th.mut} align="center">Demo order {o.id} with {STB[o.sid].n}. Nothing was sent to a real store.</T>
      <View style={{alignSelf: 'stretch', marginTop: 20}}>
        <Sum rows={o.lines.map((l: any) => [l.q + '× ' + l.n, money(l.p * l.q)])} total={['Total', money(o.total)]} />
        <Cta label="Track order" onPress={() => go('track', o.id)} /><View style={{height: 10}} /><Cta ghost label="Back to Goodies" onPress={() => tab('home')} />
      </View>
    </View>
  );
}

function DeliveryRouteMap({order, storeName, destination}: {order: any; storeName: string; destination: string}) {
  const th = useTheme();
  const progress = Math.max(0.12, Math.min(0.86, (Number(order.st || 4) - 3) / 3));
  const x = 22 + progress * 250, y = 141 - progress * 112 - Math.sin(progress * Math.PI) * 12;
  return (
    <Card style={{padding: 12}}>
      <Row sp><T size={15} weight="800">Your delivery route</T><Badge label="Courier on the way" /></Row>
      <View style={{height: 190, borderRadius: 16, overflow: 'hidden', marginTop: 10, backgroundColor: '#F1F2E9'}}>
        <Svg width="100%" height="100%" viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice">
          <Path d="M-20 30 L340 160 M-20 95 L340 25 M20 -20 L95 220 M180 -20 L250 220 M-10 175 L330 80" stroke="#FFFFFF" strokeWidth="15" fill="none" />
          <Path d="M-20 30 L340 160 M-20 95 L340 25 M20 -20 L95 220 M180 -20 L250 220 M-10 175 L330 80" stroke="#DADFD2" strokeWidth="1.5" fill="none" />
          <Path d="M22 151 C55 145 65 119 90 112 S130 115 151 83 S211 52 286 24" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" fill="none" />
          <Path d="M22 151 C55 145 65 119 90 112 S130 115 151 83 S211 52 286 24" stroke="#FD802E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Circle cx="22" cy="151" r="7" fill="#FD802E" stroke="#FFFFFF" strokeWidth="3" />
          <Circle cx="286" cy="24" r="7" fill="#1B1B1F" stroke="#FFFFFF" strokeWidth="3" />
        </Svg>
        <View style={{position: 'absolute', left: 8, bottom: 8, backgroundColor: '#fff', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, maxWidth: '42%'}}>
          <T size={10.5} weight="800" color="#1B1B1F">PICKUP</T><T size={11.5} weight="700" lines={1}>{storeName}</T>
        </View>
        <View style={{position: 'absolute', right: 8, top: 7, backgroundColor: '#fff', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, maxWidth: '42%'}}>
          <T size={10.5} weight="800" color="#1B1B1F">DROP-OFF</T><T size={11.5} weight="700" lines={1}>{destination}</T>
        </View>
        <View style={{position: 'absolute', left: Math.max(0, Math.min(82, x / 320 * 100 - 8)) + '%', top: Math.max(16, Math.min(72, y / 190 * 100 - 10)) + '%', width: 46, height: 46, borderRadius: 23, backgroundColor: '#E8C5E8', borderWidth: 2, borderColor: '#8F267E', alignItems: 'center', justifyContent: 'center'}} pointerEvents="none">
          <Svg width={36} height={36} viewBox="0 0 64 64">
            <Circle cx="20" cy="44" r="6" fill="#F4C542" stroke="#8F267E" strokeWidth="2" />
            <Circle cx="44" cy="44" r="6" fill="#F4C542" stroke="#8F267E" strokeWidth="2" />
            <Path d="M13 31 L22 22 L31 31 L39 31 L34 22 L25 22" stroke="#F4C542" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d="M19 21 L31 21 L34 26 L24 27 Z" fill="#F4C542" stroke="#D8A91B" strokeWidth="1" />
            <Path d="M24 20 L20 14 L29 11 L34 20 Z" fill="#F25C9C" />
            <Path d="M21 7 Q24 1 29 5 L30 8 Z" fill="#242424" />
            <Path d="M22 14 L17 21 M30 14 L35 18" stroke="#F25C9C" strokeWidth="3.5" strokeLinecap="round" />
            <Path d="M23 20 L20 27 M29 20 L33 27" stroke="#252525" strokeWidth="3" strokeLinecap="round" />
          </Svg>
        </View>
      </View>
      <Row style={{gap: 7, marginTop: 9}}><View style={{width: 9, height: 9, borderRadius: 5, backgroundColor: '#FD802E'}} /><T size={11.5} color={th.mut}>Route</T><View style={{width: 9, height: 9, borderRadius: 5, backgroundColor: '#F25C9C', marginLeft: 8}} /><T size={11.5} color={th.mut}>Driver shirt</T><View style={{width: 9, height: 9, borderRadius: 5, backgroundColor: '#D946A8', marginLeft: 8}} /><T size={11.5} color={th.mut}>Motorcycle</T></Row>
      <T size={11} color={th.mut} style={{marginTop: 6}}>Illustrative demo route. Live GPS and turn-by-turn directions are not connected yet.</T>
    </Card>
  );
}

function PickupLocationMap({storeName}: {storeName: string}) {
  const th = useTheme();
  return (
    <Card style={{padding: 12}}>
      <Row sp><T size={15} weight="800">Pickup location</T><Badge label="Ready for pickup" /></Row>
      <View style={{height: 174, borderRadius: 16, overflow: 'hidden', marginTop: 10, backgroundColor: '#F1F2E9'}}>
        <Svg width="100%" height="100%" viewBox="0 0 320 174" preserveAspectRatio="xMidYMid slice">
          <Path d="M-20 22 L340 132 M-20 86 L340 42 M12 -20 L88 200 M160 -20 L225 200 M278 -20 L230 200 M-10 160 L330 95" stroke="#FFFFFF" strokeWidth="16" fill="none" />
          <Path d="M-20 22 L340 132 M-20 86 L340 42 M12 -20 L88 200 M160 -20 L225 200 M278 -20 L230 200 M-10 160 L330 95" stroke="#DADFD2" strokeWidth="1.5" fill="none" />
          <Path d="M35 142 C70 130 80 104 118 98 S177 110 205 72 S253 52 285 27" stroke="#FD802E" strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="5 6" />
          <Circle cx="35" cy="142" r="5" fill="#FD802E" stroke="#FFFFFF" strokeWidth="2" />
          <Path d="M285 18 L294 27 L285 36 L276 27 Z" fill="#F25C9C" stroke="#FFFFFF" strokeWidth="2" />
          <Path d="M280 26 L280 32 L290 32 L290 26 Z" fill="#FFFFFF" />
          <Path d="M279 25 L285 21 L291 25 Z" fill="#FFFFFF" />
          <Path d="M283 27 L283 29 L285 29 L285 27 M287 27 L287 29 L289 29 L289 27" stroke="#F25C9C" strokeWidth="1" />
        </Svg>
        <View style={{position: 'absolute', left: 8, bottom: 8, backgroundColor: '#fff', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, maxWidth: '70%'}}>
          <T size={10.5} weight="800" color="#1B1B1F">PICK UP YOUR ORDER</T><T size={11.5} weight="700" lines={1}>{storeName}</T>
        </View>
      </View>
      <T size={11} color={th.mut} style={{marginTop: 6}}>Illustrative pickup map. Exact store coordinates and live navigation are not connected yet.</T>
    </Card>
  );
}

export function Track({id}: {id: string}) {
  const th = useTheme(), o = S.orders.filter((x: any) => x.id === id)[0];
  useEffect(() => {
    if (!o?.backendId) return;
    let active = true;
    const sync = async () => {
      const {data, error} = await supabase.from('goodies_orders').select('status,scheduled_for').eq('id', o.backendId).maybeSingle();
      if (!active || error || !data) return;
      o.serverStatus = data.status;
      if (data.scheduled_for) o.sch = new Date(data.scheduled_for).getTime();
      o.cx = data.status === 'cancelled' ? 1 : 0;
      o.st = require('../store').stage(o);
      save(); emit();
    };
    void sync();
    const channel = supabase.channel('goodies-order-status-' + o.backendId).on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'goodies_orders', filter: 'id=eq.' + o.backendId}, () => { void sync(); }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [o?.backendId]);
  if (!o) return <View><Bar title="Order" onBack={back} /><Empty emoji="📦" title="Order not found" button="Go home" onPress={browse} /></View>;
  const s = STB[o.sid], T_ = stageLabels(!!o.pk, o.pk ? TP : TL), dn = done(o);
  const serverStatus = String(o.serverStatus || '').toLowerCase();
  const eta = o.cx ? 'Cancelled' : dn ? (o.pk ? 'Picked up' : 'Delivered') : o.backendId ? (serverStatus === 'scheduled' && o.sch && Date.now() < o.sch ? 'Scheduled for ' + fmtTime(new Date(o.sch)) : serverStatus === 'scheduled' || serverStatus === 'placed' ? 'Waiting for store to accept' : serverStatus === 'accepted' ? 'Order accepted by store' : serverStatus === 'preparing' ? 'Store is preparing your order' : serverStatus === 'ready' ? (o.pk ? 'Ready for pickup' : 'Ready for courier pickup') : 'Order update') : o.sch && Date.now() < o.sch ? 'Scheduled for ' + fmtTime(new Date(o.sch)) : 'Simulated ETA · ' + Math.max(1, T_.length - 1 - o.st) * 5 + ' sec';
  return (
    <View>
      <Bar title={'Order ' + o.id} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Card>
          <Row><Tile e={s.e} bg={s.bg} /><View style={{flex: 1}}><T weight="700">{s.n}</T><T size={13} color={th.mut}>{o.pk ? 'Pickup' : 'To ' + (o.ad ? o.ad.t + (o.ad.apt ? ', ' + o.ad.apt : '') : o.addr)}</T></View></Row>
          <View style={{marginTop: 10}}><Badge green={!!(dn && !o.cx)} label={eta} /></View>
          {o.cx ? <T size={14} color={th.mut} style={{marginTop: 12}}>This order was cancelled{o.pay === 'wallet' ? ' and refunded to your wallet.' : '.'}</T> : (<>
            <View style={{flexDirection: 'row', gap: 6, marginVertical: 14}}>{T_.map((x, i) => <View key={i} style={{flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= o.st ? th.br : th.line}} />)}</View>
            {T_.map((x, i) => <View key={i} style={{flexDirection: 'row', gap: 12, marginVertical: 12, alignItems: 'center'}}><View style={{width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: i <= o.st ? th.br : th.line, backgroundColor: i <= o.st ? th.br : 'transparent', alignItems: 'center', justifyContent: 'center'}}>{i <= o.st ? <Icon name="check" size={12} color="#fff" /> : null}</View><T size={14} color={i <= o.st ? th.ink : th.mut} weight={i <= o.st ? '700' : undefined}>{x}</T></View>)}
          </>)}
          <T size={11.5} color={th.mut}>Demo timeline: steps advance every few seconds.</T>
        </Card>
        {o.pk && o.st >= 3 && !o.cx ? <PickupLocationMap storeName={s.n} /> : null}
        {!o.pk && o.st >= 4 && !dn ? <DeliveryRouteMap order={o} storeName={s.n} destination={o.ad ? o.ad.l + ': ' + o.ad.t : o.addr} /> : null}
        {o.alc ? <Card style={{borderColor: o.alc.status === 'failed' ? th.red : th.br}}><Row><Text style={{fontSize: 26}}>🪪</Text><View style={{flex: 1}}><T weight="800">ID check · {o.alc.age}+ ({o.alc.who === 'shop' ? 'checked by the shop' : 'checked by the courier'})</T><T size={13} color={th.mut}>{o.alc.status === 'pending' ? 'Have your valid government photo ID ready. The order is completed only after it is checked.' : o.alc.status === 'passed' ? 'ID checked.' : (o.pay === 'cash' ? 'ID check failed. You were not charged.' : 'ID check failed. ' + money(o.refund || 0) + ' was refunded to your Wantiss wallet. The delivery fee is not refunded.')}</T></View></Row>{providerInfo.demo && o.alc.status === 'pending' && o.st >= (o.pk ? 3 : 5) ? <View style={{flexDirection: 'row', gap: 8, marginTop: 10}}><Cta small ghost label="Demo: ID valid" onPress={() => idResult(o.id, true)} /><Cta small ghost label="Demo: ID failed" onPress={() => idResult(o.id, false)} /></View> : null}</Card> : null}
        {dn && !o.cx && !o.rated ? <Card><T weight="700" align="center">How was your order?</T><View style={{flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10}}>{[1, 2, 3, 4, 5].map(k => <Pressable key={k} accessibilityRole="button" accessibilityLabel={'Rate order ' + k + ' stars'} onPress={() => {S.rt = k; require('../store').ui.sheet({kind: 'review', id: o.id});}}><Icon name="star" size={32} color="#FFB400" fill /></Pressable>)}</View></Card> : null}
        {o.rated ? <Card><T weight="700" align="center">Thanks for rating your order: {o.rated} ★</T></Card> : null}
        {dn && !o.cx && !o.rated ? <Cta ghost label="Write an order review" onPress={() => {S.rt = 0; require('../store').ui.sheet({kind: 'review', id: o.id});}} /> : null}
        {dn && !o.cx && !o.pk && !o.driverRated ? <Card><T weight="700" align="center">How was your driver?</T><T size={12.5} color={th.mut} align="center" style={{marginTop: 4}}>Your driver rating is separate from your store and order review.</T><View style={{flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10}}>{[1, 2, 3, 4, 5].map(k => <Pressable key={k} accessibilityRole="button" accessibilityLabel={'Rate driver ' + k + ' stars'} onPress={() => {S.rt = k; require('../store').ui.sheet({kind: 'driver-review', id: o.id});}}><Icon name="star" size={32} color="#FFB400" fill /></Pressable>)}</View></Card> : null}
        {o.driverRated ? <Card><T weight="700" align="center">Thanks for rating your driver: {o.driverRated} ★</T></Card> : null}
        <Sum rows={[...o.lines.map((l: any) => [l.q + '× ' + l.n, money(l.p * l.q)] as any), ['Fees', money(o.fee + o.svc)], ...(o.disc ? [['Discount', '-' + money(o.disc), 'g'] as any] : []), ...(o.tip ? [['Tip', money(o.tip)] as any] : []), ['Contact', (o.ph || 'n/a') + (o.phl ? ' (' + o.phl + ')' : '')], ...(o.ad && o.ad.inst ? [['Instructions', o.ad.inst] as any] : []), ...(o.note ? [['Note', o.note] as any] : [])]} total={['Total · ' + o.payl, money(o.total)]} />
        {!dn && o.st <= 2 ? <><Card style={{padding: 0, borderWidth: 0}}><Pressable onPress={() => cancelAsk(o.id)} style={{height: 52, borderRadius: 16, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color={th.red}>Cancel order</T></Pressable></Card></> : null}
        <Cta ghost label="Order again" onPress={() => reorder(o.id)} /><View style={{height: 10}} />
        {!o.cx ? <><Cta ghost label="Message store" onPress={() => go('storechat', o.sid)} /><View style={{height: 10}} /></> : null}
        <Cta ghost label="Get help with this order" onPress={() => go('contact', {o: true, oid: o.id})} /><View style={{height: 10}} />
        <Cta label="Go to Orders" onPress={() => tab('orders')} />
      </View>
    </View>
  );
}

export function Orders() {
  const th = useTheme(), a = S.orders.filter((o: any) => (S.ot === 'active' ? !done(o) : done(o)));
  const stTxt = (o: any) => (o.cx ? 'Cancelled' : stageLabels(!!o.pk, o.pk ? TP : TL)[o.st]);
  return (
    <View>
      <Bar title="Your orders" onBack={() => require('../actions').back()} />
      <View style={{paddingHorizontal: 16}}>
        <Seg list={[['active', 'Active'], ['past', 'Past']]} on={S.ot} onPick={setOrdersTab} />
        <View style={{height: 14}} />
        {a.length ? a.map((o: any) => {
          const s = STB[o.sid], d = new Date(o.t0);
          return (
            <Card key={o.id}>
              <Pressable onPress={() => go('track', o.id)} style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <Tile e={s.e} bg={s.bg} />
                <View style={{flex: 1}}><T weight="700">{s.n}</T><T size={12.5} color={th.mut}>{o.id} · {fmtDay(d)} · {money(o.total)}</T><View style={{marginTop: 5}}><Badge green={!!(done(o) && !o.cx)} label={stTxt(o)} /></View></View>
                <Icon name="chevR" size={16} color={th.ink} />
              </Pressable>
              <Row style={{marginTop: 12}}><Cta small ghost label="Reorder" onPress={() => reorder(o.id)} /><Cta small label={done(o) ? 'Details' : 'Track'} onPress={() => go('track', o.id)} /></Row>
            </Card>
          );
        }) : <Empty emoji={S.ot === 'active' ? '🍽️' : '🧾'} title={S.ot === 'active' ? 'No active orders' : 'No past orders yet'} text="Your orders will show up here." button="Browse stores" onPress={() => go('explore')} />}
      </View>
    </View>
  );
}

export function Favs() {
  const th = useTheme(), st = ST.filter(s => S.fav.indexOf(s.id) > -1), it = S.favp.map((id: string) => IT[id]).filter(Boolean);
  return (
    <View>
      <Bar title="Favorites" onBack={back} />
      <View style={{paddingHorizontal: 16}}><Seg list={[['stores', 'Stores (' + st.length + ')'], ['items', 'Items (' + it.length + ')']]} on={S.ft} onPick={k => {S.ft = k; emit();}} /></View>
      {S.ft === 'stores' ? (st.length ? <View style={{gap: 22, padding: 16}}>{st.map(s => <StoreCard key={s.id} s={s} />)}</View> : <Empty icon="heart" title="No favorite stores yet" text="Save the stores you love by tapping the heart on a store." button="Browse stores" onPress={browse} />)
        : (it.length ? <View style={{paddingHorizontal: 16, marginTop: 6}}>{it.map((i: any) => <ItemRow key={i.id} i={i} />)}</View> : <Empty icon="heart" title="No favorite items yet" text="Tap the heart on a product to keep it here for later." button="Browse stores" onPress={browse} />)}
    </View>
  );
}

const FAQ: [string, string][] = [['How do I track my order?', 'Open Orders, then tap Track on an active order. You also get a notification at every step.'], ['Delivery information', 'Delivery takes about 15 to 55 minutes depending on the store. Your first order ships free; after that each store sets its own fee.'], ['Payment information', 'Pay with your Wallet, MonCash, a saved card or cash. This prototype simulates payments only.'], ['Refunds and cancellation', 'You can cancel before the store finishes preparing your order. Wallet payments are refunded to your wallet. Full policy: placeholder for the demo.'], ['What if an item is missing?', 'Open the order, tap Get help, and tell us what happened.']];
export function Help() {
  const th = useTheme(), [open, setOpen] = useState(-1);
  return (
    <View>
      <Bar title="Help center" onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        {faqList(FAQ).map((x, k) => (
          <Pressable key={k} onPress={() => setOpen(open === k ? -1 : k)} style={{borderBottomWidth: 1, borderBottomColor: th.line, paddingVertical: 14, paddingHorizontal: 4}}>
            <T size={14.5} weight="700">{x[0]}</T>
            {open === k ? <T size={13.5} color={th.mut} style={{marginTop: 8, lineHeight: 20}}>{x[1]}</T> : null}
          </Pressable>
        ))}
        <View style={{height: 18}} /><Cta label="Contact support" onPress={() => go('contact')} /><View style={{height: 10}} />
        <Cta ghost label="Report an order problem" onPress={() => go('contact', {o: true, oid: ''})} /><View style={{height: 10}} />
        <Cta ghost label="Terms and policies" onPress={() => go('policies')} />
      </View>
    </View>
  );
}
