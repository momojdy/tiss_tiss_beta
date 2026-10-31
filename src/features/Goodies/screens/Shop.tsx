import React, {useState, useEffect} from 'react';
import {View, Text, Pressable, ScrollView, useWindowDimensions, Image} from 'react-native';
import {Icon} from '../components/Icon';
import {T, Grad, Circ, Bar, Sh, Rail, Chips, Cta, Card, Row, Badge, Ttl, Empty, Tile, Radio, Seg, Stepper, Input, Switch, bgIdx, useTheme} from '../components/ui';
import {Dish, StoreCard, ItemRow} from '../components/cards';
import {fmtTime, fmtDay, hasAlcohol, alcAge, S, ST, STB, IT, DEALS, money, dp, addr, cnt, first, totals, isPk, ctOf, qtyIn, done, TL, TP, defAddr, emit, save, toast, refreshLiveSchedules} from '../store';
import {go, tab, back, browse, heart, favp, setSize, toggleDrink, productQty, productAdd, qty, clearAsk, promoApply, promoClear, goCheckout, checkoutNext, setMode, setTip, setSch, setPay, setCard, placeOrder, cancelAsk, reorder, setOrdersTab, refreshPaymentOptions} from '../actions';
import {CHOOSE_SIZE_CATS, setConsent, createWallet, idResult} from '../actions';
import {rgText, stageLabels, fees, faq as faqList, label} from '../content';
import {providerInfo} from '../providers';
import {byoRows, byoOn, lineBad, bzEdit, bzRemove} from '../builders/engine';
import {SEED_REVIEWS} from '../data/seed';
import {t as tr} from '../i18n';
import {supabase} from '../../../lib/supabase';
import Svg, {Path, Circle} from 'react-native-svg';
import MapView, {Marker, Polyline} from 'react-native-maps';


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
  const reviews = s.live ? [] : SEED_REVIEWS.concat(S.rev[id] || []);
  const tabs: [string, string][] = [['all', label('lbl.storeAll', 'All')], ['pop', label('lbl.storePopular', 'Popular')], ['deal', label('lbl.storeDeals', 'Deals')], ...(byoOn(id) ? [['custom', label('lbl.storeCustom', 'Build your own')] as [string, string]] : [])];
  return (
    <View>
      <Hero s={s} onBack={back} right={<Circ icon="heart" label={label('lbl.storeSave', 'Save store')} color={S.fav.indexOf(id) > -1 ? '#FD802E' : undefined} fill={S.fav.indexOf(id) > -1} onPress={() => heart(id)} />} />
      <View style={{paddingHorizontal: 16}}>
        <T size={24} weight="800" style={{marginTop: 16}}>{s.n}</T>
        <T size={13} color={th.mut} style={{marginTop: 3}}>{s.k}{s.live ? ' · ' + label('lbl.storeDistanceUnavailable', 'Distance unavailable') : ' · ' + label('lbl.sheetKmAway', '{km} km away').replace('{km}', s.km.toFixed(1))}</T>
        {!s.open ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T weight="700">{label('lbl.storeClosed', 'Closed right now')}</T><T size={13} color={th.mut}>{s.acceptScheduledOrders ? s.nx + '. Scheduled orders are available for future opening-time slots.' : s.nx + '. Ordering is paused until then.'}</T></Card> : null}
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 4}}>
          <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.storeReadReviews', 'Read store reviews')} onPress={() => go('reviews', id)}><Badge green label={s.live && s.rv === 0 ? label('lbl.storeNewNoReviews', 'New · No reviews yet') : '★ ' + s.r.toFixed(1) + ' (' + s.rv + ')'} /></Pressable><Badge label={s.eta + ' min'} /><Badge label={s.fee === 0 ? tr('freeDelivery') : money(s.fee) + ' ' + tr('delivery')} /><Badge label={'Min. ' + money(s.min)} /><Badge label={label("lbl.shopAuto18E4IBZ", "Delivery + pickup")} />{s.pr ? <Badge label={s.pr} /> : null}
        </View>
        <View style={{flexDirection: 'row', gap: 8, marginTop: 10}}>
          <Cta small ghost label={label('lbl.storeInfo', 'Store info')} onPress={() => require('../store').ui.sheet({kind: 'sinfo', id})} />
          <Cta small ghost label={label('lbl.messageStore', 'Message store')} onPress={() => go('contact', {storeContact: true, storeId: id})} />
        </View>
        <View style={{marginTop: 14}}><Input value={S.ss[id] || ''} onChange={v => {S.ss[id] = v; emit();}} placeholder={label('lbl.storeSearch', 'Search in ' + s.n)} /></View>
      </View>
      <View style={{marginTop: 8}}><Chips list={tabs} on={t} onPick={k => {S.ss[id + 't'] = k; emit();}} /></View>
      <View style={{paddingHorizontal: 16, marginTop: 4}}>
        {rows || items.length ? (<>{rows}{items.map(i => <ItemRow key={i.id} i={i} />)}</>) : <Empty emoji="🔎" title={label('lbl.storeNoItems', 'No items found')} text={label('lbl.storeTryAnother', 'Try another word.')} />}
        <T size={19} weight="800" style={{marginTop: 24, marginBottom: 8}}>{label('lbl.storeReviews', 'Reviews')}</T>
        {reviews.map((v: any, k: number) => (
          <Card key={k} style={{marginBottom: 8}}>
            <Row sp><Row style={{gap: 6}}><T weight="700">{v.n}</T>{v.you ? <Badge label={label('lbl.storeYourReview', 'Your review')} /> : null}</Row><Row style={{gap: 3}}><Icon name="star" size={13} color="#FFB400" fill /><T size={13} weight="700">{v.r}</T></Row></Row>
            <T size={13.5} color={th.mut} style={{marginTop: 4}}>{v.t || label('lbl.storeNoComment', 'No comment')}</T>
            <T size={11.5} color={th.mut} style={{marginTop: 4}}>{v.d}{v.you ? '' : ' · ' + label('lbl.storeSampleReview', 'sample review')}</T>
          </Card>
        ))}
        {!reviews.length ? <Empty emoji="⭐" title={label('lbl.storeNoReviews', 'No reviews yet')} text={s.live && s.rv > 0 ? label('lbl.storeRatingsOnly', 'Ratings are available, but written review details are not available here yet.') : label('lbl.storeBeFirstReview', 'Be the first customer to review this store.')} /> : null}
      </View>
    </View>
  );
}

export function StoreReviews({id}: {id: string}) {
  const th = useTheme(), s = STB[id];
  if (!s) return <View><Bar title={label('lbl.storeReviewsTitle', 'Store reviews')} onBack={back} /><Empty emoji="⭐" title={label('lbl.storeNotFound', 'Store not found')} button={label('lbl.storeBackToStores', 'Back to stores')} onPress={browse} /></View>;
  const reviews = s.live ? [] : SEED_REVIEWS.concat(S.rev[id] || []);
  return (
    <View>
      <Bar title={label('lbl.storeReviews', 'Reviews')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Card style={{marginBottom: 14}}>
          <Row style={{alignItems: 'center', gap: 12}}>
            <View style={{width: 54, height: 54, borderRadius: 16, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 30}}>{s.e}</Text></View>
            <View style={{flex: 1}}><T size={18} weight="800">{s.n}</T><T size={13} color={th.mut}>{label('lbl.storeCustomerReviews', 'Customer reviews')}</T></View>
            <View style={{alignItems: 'flex-end'}}>{s.rv > 0 ? <><T size={22} weight="800">★ {s.r.toFixed(1)}</T><T size={11.5} color={th.mut}>{s.rv} reviews</T></> : <T size={12} color={th.mut}>{label('lbl.storeNoReviewsYet', 'No reviews yet')}</T>}</View>
          </Row>
        </Card>
        {reviews.length ? reviews.map((v: any, k: number) => <Card key={k} style={{marginBottom: 10}}>
          <Row sp><Row style={{gap: 6}}><T weight="700">{v.n}</T>{v.you ? <Badge label={label('lbl.storeYourReview', 'Your review')} /> : null}</Row><Row style={{gap: 4}}><Icon name="star" size={13} color="#FFB400" fill /><T size={13} weight="700">{v.r}</T></Row></Row>
          <T size={13.5} style={{marginTop: 6}}>{v.t || label('lbl.storeNoComment', 'No comment')}</T>
          <T size={11.5} color={th.mut} style={{marginTop: 5}}>{v.d}{v.you ? '' : ' · ' + label('lbl.storeSampleReview', 'sample review')}</T>
        </Card>) : <Empty emoji="⭐" title={label('lbl.storeNoReviews', 'No reviews yet')} text={s.live && s.rv > 0 ? label('lbl.storeRatingsOnly', 'Ratings are available, but written review details are not available here yet.') : label('lbl.storeBeFirstReview', 'Be the first customer to review this store.')} />}
        <Cta ghost label={label('lbl.storeBack', 'Back to store')} onPress={() => go('store', id)} />
      </View>
    </View>
  );
}

export function Product() {
  const th = useTheme(), {width} = useWindowDimensions(), h = S.sh, i = h && IT[h.id];
  if (!i) return <View><Bar title={label('lbl.productTitle', 'Product')} onBack={back} /><Empty emoji="📦" title={label('lbl.productNotFound', 'Product not found')} button={label('lbl.productBackGoodies', 'Back to Goodies')} onPress={browse} /></View>;
  const s = STB[i.s], o = CHOOSE_SIZE_CATS.indexOf(s.c) > -1, u = ['restaurants', 'bakery'].indexOf(s.c) > -1;
  const base = h.off ? dp(i, h.off) : i.p, unit = base + (h.size > 0 ? 1.5 : 0) + (h.drink ? 1 : 0);
  const rel = s.it.filter(x => x.id !== i.id).concat(ST.filter(x => x.c === s.c && x.id !== s.id).flatMap(x => x.it)).slice(0, 6);
  const fav = S.favp.indexOf(i.id) > -1;
  return (
    <View>
      <Bar title={s.n} onBack={back} stripe={false} right={<Circ icon="heart" label={label('lbl.productSaveItem', 'Save item')} color={S.favp.indexOf(i.id) > -1 ? '#FD802E' : undefined} fill={S.favp.indexOf(i.id) > -1} onPress={() => favp(i.id)} />} />
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {['bg0', 'bg1', 'bg2'].map((b, n) => <Grad key={b} idx={bgIdx(n ? b : s.bg)} style={{width, height: 210, alignItems: 'center', justifyContent: 'center'}}>{i.photo ? <Image source={{uri: i.photo}} style={{width, height: 210}} /> : <Text style={{fontSize: 96}}>{i.e}</Text>}</Grad>)}
      </ScrollView>
      <T size={12} color={th.mut} align="center" style={{marginTop: 6}}>{label('lbl.productPhotoHint', 'Swipe for more photos')}</T>
      <View style={{paddingHorizontal: 16}}>
        <T size={23} weight="800" style={{marginTop: 10}}>{i.n}</T>
        <Pressable onPress={() => go('store', s.id)}><T size={13.5} weight="700" color={th.br}>{s.n}{s.rv > 0 ? ' · ★ ' + s.r.toFixed(1) : ' · New store'}</T></Pressable>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8}}>
          <T size={24} weight="800" color={th.br}>{money(base)}</T>
          {h.off ? <><T size={15} color={th.mut} style={{textDecorationLine: 'line-through'}}>{money(i.p)}</T><Badge label={'-' + h.off + '%'} /></> : null}
        </View>
        {i.w ? <T size={12.5} color={th.mut} style={{marginTop: 4}}>{label('lbl.productEstimatedPrice', 'Estimated price. Final amount may vary with the exact weight.')}</T> : null}
        <T size={14.5} style={{marginTop: 12, lineHeight: 21}}>{i.d}</T>
        {i.al ? <T size={13} color={th.mut} style={{marginTop: 6}}>{label('lbl.productAllergens', 'Allergens')}: {i.al}</T> : null}
        {(i as any).restriction === 'alcohol' ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T weight="800">{label('lbl.productAlcoholWarning', 'Alcohol. Minors may not purchase.')}</T><T size={13} color={th.mut} style={{marginTop: 3}}>{rgText('rg.minors', 'Minors may not purchase alcohol.', alcAge(i.s).age)} Minimum age {alcAge(i.s).age}. Valid government photo ID is required at delivery or pickup.</T></Card> : null}
        {(i as any).restriction === 'otc' ? <T size={12.5} color={th.mut} style={{marginTop: 8}}>{label('lbl.productOtcWarning', 'Over-the-counter product. Read the label and use as directed.')}</T> : null}
        <T size={13} weight="700" color={i.oos ? th.red : i.stock <= 5 ? th.brd : th.grn} style={{marginTop: 8}}>{i.oos ? label('lbl.productStockOut', 'Out of stock') : i.stock <= 5 ? label('lbl.productStockLow', 'Only') + ' ' + i.stock + ' left' : label('lbl.productInStock', 'In stock')}</T>
        {o ? (<>
          <Row style={{marginTop: 18, marginBottom: 8, gap: 8}}><T size={15} weight="800">{label('lbl.productSize', 'Size')}</T><Badge label={label('lbl.productRequired', 'Required')} /></Row>
          <Radio on={h.size === 0} onPress={() => setSize(0)}><T>{label('lbl.productRegular', 'Regular')}</T></Radio>
          <Radio on={h.size === 1} onPress={() => setSize(1)}><Row sp><T>{label('lbl.productLarge', 'Large')}</T><T weight="800">+$1.50</T></Row></Radio>
        </>) : null}
        {u ? <Radio on={!!h.drink} onPress={toggleDrink}><Row sp><T>{label('lbl.productAddDrink', 'Add a drink')}</T><T weight="800">+$1.00</T></Row></Radio> : null}
        <Input label={label('lbl.productInstructions', 'Special instructions')} value={h.note || ''} onChange={v => {S.sh.note = v; emit();}} placeholder={label('lbl.productOptional', 'Optional')} multiline />
        <T size={18} weight="800" style={{paddingTop: 22, paddingBottom: 10}}>{label('lbl.productRecommendations', 'You may also like')}</T>
      </View>
      <Rail>{rel.map(x => <Dish key={x.id} i={x} />)}</Rail>
    </View>
  );
}
export function ProductFoot() {
  const th = useTheme(), h = S.sh, i = h && IT[h.id];
  if (!i) return null;
  const s = STB[i.s], o = CHOOSE_SIZE_CATS.indexOf(s.c) > -1, base = h.off ? dp(i, h.off) : i.p, unit = base + (h.size > 0 ? 1.5 : 0) + (h.drink ? 1 : 0);
  const blocked = i.oos || (!s.open && !s.acceptScheduledOrders) || (o && h.size < 0), lbl = i.oos ? label('lbl.productStockOut', 'Out of stock') : !s.open && !s.acceptScheduledOrders ? label('lbl.productStoreClosed', 'Store is closed') : !s.open ? label('lbl.productScheduleOrder', 'Schedule order') + ' · ' + money(unit * h.q) : o && h.size < 0 ? label('lbl.productChooseSize', 'Choose a size') : label('lbl.productAddToCart', 'Add to cart') + ' · ' + money(unit * h.q);
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
  if (!c.lines.length) return <View><Bar title={label('lbl.cartTitle', 'Your cart')} onBack={back} /><Empty emoji="🛒" title={label('lbl.cartEmptyTitle', 'Your cart is empty')} text={label('lbl.cartEmptyText', 'Explore nearby stores, check what\'s open, and discover products around your chosen address.')} button={label('lbl.cartBrowse', 'Start browsing')} onPress={() => go('explore')} /><View style={{paddingHorizontal:16,marginTop:12}}><Cta ghost label={label('lbl.cartGroupOrder', 'Start a group order')} onPress={() => require('../store').ui.sheet({kind:'group-order'})} /></View></View>;
  const t = totals(), st = t.st!, badLine = c.lines.some((l: any) => l.byo && lineBad(l)), short = t.sub < st.min || badLine;
  return (
    <View>
      <Bar title={label('lbl.cartTitle', 'Your cart')} onBack={back} right={<Circ icon="trash" label={label('lbl.cartClearAction', 'Clear cart')} onPress={clearAsk} />} />
      <View style={{paddingHorizontal: 16}}>
        <Row style={{marginBottom: 8}}><Tile e={st.e} bg={st.bg} size={44} /><View style={{flex: 1}}><T weight="700">{st.n}</T><T size={13} color={th.mut}>{label('lbl.cartStoreOrder', 'Your order from this store')} · {st.eta} min</T></View></Row>
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
                {l.byo ? <View style={{flexDirection: 'row', gap: 16, marginTop: 6}}><Pressable onPress={() => bzEdit(l.k)}><T size={13} weight="700" color={th.br}>{label('lbl.cartEditItem', 'Edit')}</T></Pressable><Pressable onPress={() => bzRemove(l.k)}><T size={13} weight="700" color={th.red}>{label("lbl.shopAutoU0R7PW", "Remove")}</T></Pressable></View> : null}
              </View>
              <Stepper q={l.q} onMinus={() => qty(l.k, -1)} onPlus={() => qty(l.k, 1)} />
            </View>
          );
        })}
        <Pressable onPress={() => go('store', st.id)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.line, borderRadius: 16}}><T weight="700" style={{flex: 1}}>{'+ ' + label('lbl.cartContinueShopping', 'Continue shopping')}</T><Icon name="chevR" size={16} color={th.ink} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={label('lbl.cartStartGroup', 'Start a group order')} onPress={() => require('../store').ui.sheet({kind:'group-order'})} style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:10,padding:14,borderWidth:1,borderColor:th.br,borderRadius:16,backgroundColor:th.brt}}>
          <View style={{width:42,height:42,borderRadius:13,backgroundColor:th.card,alignItems:'center',justifyContent:'center'}}><Icon name="user" size={21} color={th.br}/></View>
          <View style={{flex:1}}><T weight="800">{label('lbl.cartGroupOrder', 'Start a group order')}</T><T size={12.5} color={th.mut} style={{marginTop:3}}>{label('lbl.cartGroupOrderDesc', 'Invite friends and coordinate a shared cart')}</T></View>
          <Icon name="chevR" size={17} color={th.br}/>
        </Pressable>
        {hasAlcohol() ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 14}}><T weight="800">{label('lbl.cartAlcoholHeading', 'Your order includes alcohol')}</T><T size={13} color={th.mut} style={{marginTop: 3}}>{rgText('rg.rules', 'Alcohol is sold only to customers aged {age} or older. Minors may not buy alcohol. Valid government photo ID is required at delivery or pickup. If the ID check fails, you are refunded to your Wantiss wallet minus the delivery fee.', alcAge(c.sid).age)}</T></Card> : null}
        <Ttl>{label('lbl.cartPromoTitle', 'Promo code')}</Ttl>
        {S.promo ? (
          <Card style={{padding: 12}}><Row sp><View style={{flex: 1}}><Row style={{gap: 6}}><T weight="700">{S.promo}</T>{t.pok ? <Badge green label={label('lbl.cartApplied', 'Applied')} /> : <Badge red label={label('lbl.cartInvalid', 'Not valid')} />}</Row>{t.perr ? <T size={12.5} color={th.mut} style={{marginTop: 4}}>{t.perr}</T> : null}</View><Pressable onPress={promoClear}><T weight="700" color={th.red}>{label('lbl.cartRemove', 'Remove')}</T></Pressable></Row></Card>
        ) : (<>
          <Row><View style={{flex: 1}}><Input value={code} onChange={v => setCode(v.toUpperCase())} placeholder={label('lbl.cartPromoPlaceholder', 'Try GOODIES10')} /></View><View style={{width: 90}}><Cta label={label('lbl.cartApply', 'Apply')} onPress={() => promoApply(code)} /></View></Row>
          <Pressable onPress={() => go('promos')}><T size={13} weight="700" color={th.br} style={{marginTop: 8}}>{label('lbl.cartAvailableCoupons', 'See available coupons')}</T></Pressable>
        </>)}
        <View style={{marginTop: 16}}><Sum rows={[[label('lbl.cartSubtotal', 'Subtotal'), money(t.sub)], [label('lbl.cartDeliveryFee', 'Delivery fee'), isPk() ? 'Pickup' : t.free ? (first() ? 'Free (first order)' : 'Free') : money(t.fee), t.free ? 'g' : undefined as any], [label('lbl.cartServiceFee', 'Service fee'), money(t.svc)], ...(t.disc ? [[label('lbl.cartDiscount', 'Discount'), '-' + money(t.disc), 'g'] as any] : []), ...(t.tip ? [[label('lbl.cartCourierTip', 'Courier tip'), money(t.tip)] as any] : [])]} total={[label('lbl.cartTotal', 'Total'), money(t.total)]} /></View>
        {badLine ? <T size={13} color={th.red} align="center" style={{marginBottom: 10}}>{label('lbl.cartFixItems', 'Fix the items marked above to continue.')}</T> : t.sub < st.min ? <T size={13} color={th.mut} align="center" style={{marginBottom: 10}}>{label('lbl.cartMinMore', 'Add')} {money(st.min - t.sub)} {label('lbl.cartReachMinimum', 'more to reach the')} {money(st.min)} minimum.</T> : null}
        <Cta label={label('lbl.cartCheckout', 'Checkout') + ' · ' + money(t.total)} disabled={short} onPress={goCheckout} />
      </View>
    </View>
  );
}

const IcBox = ({icon}: {icon: string}) => {const th = useTheme(); return <View style={{width: 40, height: 40, borderRadius: 12, backgroundColor: th.brt, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} color={th.br} /></View>;};

export function Checkout() {
  useEffect(() => { void refreshLiveSchedules(); void refreshPaymentOptions(); }, []);
  const th = useTheme(), t = totals(), pk = isPk(), a = addr(), st = t.st!, stp = [label('lbl.checkoutDelivery', 'Delivery'), label('lbl.checkoutTime', 'Time'), label('lbl.checkoutPaymentMethod', 'Payment method'), label('lbl.checkoutReview', 'Review')];
  const [cashEligible, setCashEligible] = useState(false);
  useEffect(() => {
    let active = true;
    setCashEligible(false);
    if (!pk && st?.id && !providerInfo.demo) {
      void supabase.rpc('goodies_cash_on_delivery_available', {p_store_id: st.id})
        .then(({data, error}) => { if (active && !error) setCashEligible(data === true); });
    }
    return () => { active = false; };
  }, [st?.id, pk]);
  useEffect(() => { if (!cashEligible && S.pay === 'cash') { S.pay = 'wallet'; emit(); } }, [cashEligible]);
  const PAYON: any = fees().pay, allPays: [string, string, string, string][] = [['wallet', label('lbl.checkoutWallet', 'Wantiss Wallet'), S.hasWallet ? 'Balance ' + money(S.wallet) : 'Wallet not created', 'wallet'], ['moncash', label('lbl.checkoutMoncash', 'MonCash'), 'Not available for live Goodies orders', 'phone'], ['card', label('lbl.checkoutCard', 'Credit / debit card'), S.cards.length ? S.cards.length + ' saved card' + (S.cards.length === 1 ? '' : 's') : 'Add a card in Wallet settings', 'card'], ['cash', label('lbl.checkoutCash', 'Cash on') + ' ' + label('lbl.checkoutDelivery', 'delivery'), 'Only when this store and an available courier accept cash on delivery', 'bag']], pays = allPays.filter(p => PAYON[({wallet: 'Wallet', moncash: 'MonCash', card: 'Card', cash: 'Cash'} as any)[p[0]]] && (providerInfo.demo ? p[0] !== 'moncash' : p[0] !== 'moncash' && (p[0] !== 'cash' || cashEligible)));
  const ct = ctOf();
  let body: any = null;
  if (S.cs === 0) body = (<>
    <Seg list={[['delivery', label('lbl.checkoutDelivery', 'Delivery')], ['pickup', label('lbl.checkoutPickup', 'Pickup')]]} on={pk ? 'pickup' : 'delivery'} onPick={k => {if (k === 'delivery' && st.far) return; setMode(k);}} />
    <Ttl>{pk ? label('lbl.checkoutPickupFrom', 'Pickup from') : label('lbl.checkoutDeliverTo', 'Deliver to')}</Ttl>
    <Card><Row><IcBox icon="pin" /><View style={{flex: 1}}>
      {pk ? <><T weight="700">{st.n}</T><T size={13} color={th.mut}>{st.live ? label('lbl.storeDistanceUnavailable', 'Distance unavailable') : label('lbl.checkoutKmFromYou', '{km} km from you').replace('{km}', st.km.toFixed(1))} · {label('lbl.checkoutOpenHours', 'open {hours}').replace('{hours}', st.h)}</T></> : <><T weight="700">{a.l}</T><T size={13} color={th.mut}>{a.t}{a.apt ? ', ' + a.apt : ''}</T>{a.inst ? <T size={12.5} color={th.mut}>{label('lbl.checkoutNote', 'Note: {note}').replace('{note}', a.inst)}</T> : null}<T size={11.5} color={th.mut} style={{marginTop: 3}}>{label("lbl.shopAutoCOUOZX", "Only for this order. Your Wantiss default is unchanged.")}</T></>}
    </View>{pk ? null : <Pressable onPress={() => go('addresses')}><T size={13} weight="700" color={th.br} >{label('lbl.checkoutChange', 'Change')}</T></Pressable>}</Row></Card>
    {st.far && !st.live ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T weight="700">{label('lbl.checkoutPickupOnly', 'Pickup only')}</T><T size={13} color={th.mut}>{st.n} is {st.km.toFixed(1)} km from this address, beyond delivery range. Pick another address to get delivery.</T></Card> : null}
    {hasAlcohol() && !S.hasWallet ? <Card style={{backgroundColor: th.brt, borderColor: th.br, marginTop: 12}}><T weight="800">{label('lbl.checkoutCreateWallet', 'Create a Wantiss wallet')}</T><T size={13} color={th.mut} style={{marginVertical: 4}}>{rgText('rg.wallet', 'Create a Wantiss wallet so any refund has somewhere to go. You can withdraw from it later.', alcAge(S.cart.sid).age)}</T><Cta small label={label('lbl.checkoutCreateWallet', 'Create wallet')} onPress={createWallet} /></Card> : null}
    <Ttl>{label('lbl.checkoutContactNumber', 'Contact number')}</Ttl>
    <Card><Row><IcBox icon="phone" /><View style={{flex: 1}}><T weight="700">{ct.ph}</T><View style={{marginTop: 3, flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>{ct.w ? <Badge green label={label('lbl.checkoutDefaultPhone', 'Default Wantiss number')} /> : <><Badge label={label("lbl.shopAuto1TZ3XVT", "Goodies checkout number")} /><T size={12.5} color={th.mut}>{ct.l}</T></>}</View></View><Pressable onPress={() => require('../store').ui.sheet({kind: 'contacts'})}><T size={13} weight="700" color={th.br}>{label("lbl.shopAuto1YYH3EC", "Change")}</T></Pressable></Row></Card>
  </>);
  if (S.cs === 1) body = (<>
    <T size={15} weight="800" style={{marginBottom: 8}}>{label('lbl.checkoutWhen', 'When do you want it?')}</T>
    {st.open ? <Radio on={!S.sch} onPress={() => setSch(0)}><T weight="700">{label('lbl.checkoutAsap', 'ASAP')}</T><T size={12.5} color={th.mut}>{st.eta} min</T></Radio> : <T size={12.5} color={th.mut} style={{marginBottom: 10}}>{label("lbl.shopAuto1C7JJU5", "Choose a future slot. This shop's minimum advance time is already applied; the store receives the order for that selected time.")}</T>}
    <Card style={{marginTop:10}}>
      <Row sp style={{alignItems:'center'}}>
        <View style={{flex:1}}>
          <T weight="800">{S.sch ? label('lbl.checkoutScheduled', 'Scheduled order') : label('lbl.checkoutChooseDateTime', 'Choose a date & time')}</T>
          <T size={12.5} color={th.mut} style={{marginTop:3}}>{S.sch ? fmtDay(new Date(S.sch))+', '+fmtTime(new Date(S.sch)) : (st.open ? label('lbl.checkoutTimeHint', 'Choose an exact time, or keep ASAP.') : label('lbl.checkoutTimeAuto', 'The store’s minimum advance time is applied automatically.'))}</T>
        </View>
        <View style={{width:142}}><Cta small label={S.sch ? label('lbl.checkoutChangeTime', 'Change time') : label('lbl.checkoutChooseTime', 'Choose time')} onPress={() => require('../store').ui.sheet({kind:'schedule'})} /></View>
      </Row>
      {S.sch ? <Pressable onPress={()=>setSch(0)} style={{alignSelf:'flex-start',paddingTop:9}}><T size={12.5} weight="700" color={th.red}>{label('lbl.checkoutClearTime', 'Clear scheduled time')}</T></Pressable> : null}
    </Card>
    {pk ? null : (<><Ttl>{label('lbl.checkoutCourierTip', 'Tip your courier')}</Ttl><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{fees().tips.map((v: number) => <Pressable key={v} onPress={() => setTip(v)} style={{paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, backgroundColor: S.tip === v ? th.br : th.soft}}><T size={13.5} weight="700" color={S.tip === v ? '#fff' : th.ink}>{v ? money(v) : label('lbl.checkoutNoTip', 'No tip')}</T></Pressable>)}</View></>)}
    <Input label={pk ? label('lbl.checkoutStoreNote', 'Note for the store') : label('lbl.checkoutDeliveryInstructions', 'Delivery instructions')} value={S.note} onChange={v => {S.note = v; emit();}} placeholder={label('lbl.checkoutOptional', 'Optional')} multiline />
  </>);
  if (S.cs === 2) body = (<>
    <T size={15} weight="800" style={{marginBottom: 8}}>{label('lbl.checkoutPaymentMethod', 'Payment method')}</T>
    {pays.map(p => <Radio key={p[0]} on={S.pay === p[0]} onPress={() => setPay(p[0])}><Row><Icon name={p[3]} size={20} color={th.ink} /><View style={{flex: 1}}><T size={14.5} weight="700">{p[1]}</T><T size={12.5} color={th.mut}>{p[2]}</T></View></Row></Radio>)}
    {!providerInfo.demo && !S.hasWallet ? <Card style={{borderColor: th.br}}><T weight="800">{label('lbl.checkoutWalletNotFound', 'Wantiss wallet not found')}</T><T size={12.5} color={th.mut} style={{marginVertical: 6}}>{label('lbl.checkoutWalletHint', 'Create a wallet to pay for Goodies orders with your balance.')}</T><Cta label={label("lbl.shopAutoFLJ2MD", "Create wallet")} onPress={createWallet} /></Card> : null}
    {!providerInfo.demo && S.hasWallet && S.wallet < t.total ? <Card style={{borderColor: th.br, backgroundColor: th.brt}}><T weight="800">{label('lbl.checkoutInsufficient', 'Insufficient wallet balance')}</T><T size={12.5} color={th.mut} style={{marginTop: 4}}>Your balance is {money(S.wallet)}. You need {money(Math.max(0, t.total - S.wallet))} more to pay with your Wantiss wallet.</T><Cta small label={label('lbl.checkoutOpenWallet', 'Open Wallet')} onPress={() => go('payments')} /></Card> : null}
    {S.pay === 'card' ? <Card style={{marginTop: 10}}>
      <T weight="800">{label('lbl.checkoutSavedCard', 'Choose a saved card')}</T>
      {S.cards.length ? S.cards.map((card: any) => <Radio key={card.id} on={S.selectedCardId === card.id} onPress={() => setCard(card.id)}>
        <Row><Icon name="card" size={20} color={th.ink} /><View style={{flex: 1}}><T size={13.5} weight="700">{card.b} •••• {card.l4}{card.isDefault ? ' · Default' : ''}</T><T size={11.5} color={th.mut}>{card.expiryMonth && card.expiryYear ? 'Expires ' + String(card.expiryMonth).padStart(2,'0') + '/' + card.expiryYear : 'Saved securely with Stripe'}</T></View></Row>
      </Radio>) : <><Empty title={label('lbl.checkoutNoCards', 'No saved cards')} text={label("lbl.shopAuto1B7G8B0", "Add a card in Wallet settings to pay for Goodies orders.")} /><Cta label={label('lbl.checkoutAddCard', 'Add a card')} onPress={() => go('payments')} /></>}
    </Card> : null}
    {!providerInfo.demo ? <T size={12} color={th.mut}>{S.pay === 'card' ? 'Your saved card is authorized and charged securely by Stripe. If authorization fails, your order will not be placed.' : 'Wantiss Wallet payments debit your available balance.'}</T> : <T size={12} color={th.mut}>{label("lbl.shopAuto12HC9JV", "Demo only. No real payment is taken.")}</T>}
  </>);
  if (S.cs === 3) body = (<>
    <Card><T weight="700">{st.n}</T>{S.cart.lines.map((l: any) => <Row key={l.k} sp style={{marginTop: 8, alignItems: 'flex-start'}}><View style={{flex: 1}}><T size={14}>{l.q}× {l.n}</T>{l.d ? <T size={12} color={th.mut}>{l.d}</T> : null}</View><T size={14}>{money(l.p * l.q)}</T></Row>)}</Card>
    <Sum rows={[[pk ? 'Pickup' : 'Delivery to', pk ? st.n : a.t], ['When', S.sch ? fmtDay(new Date(S.sch)) + ', ' + fmtTime(new Date(S.sch)) : 'ASAP'], ['Contact', ct.ph], ['Payment', S.pay === 'card' ? 'Card •••• ' + ((S.cards.find((card: any) => card.id === S.selectedCardId) || S.cards[0])?.l4 || '') : ({wallet: 'Wallet', moncash: 'MonCash', cash: 'Cash'} as any)[S.pay]], ...(S.note ? [['Note', S.note] as any] : [])]} />
    {hasAlcohol() ? <Card style={{borderColor: th.br}}><T weight="800">{label('lbl.checkoutAlcoholConfirm', 'Alcohol order. Please confirm.')}</T><T size={13} color={th.mut} style={{marginVertical: 6}}>{rgText('rg.refund', 'If the ID check fails, the alcohol returns to the store and you are refunded to your Wantiss wallet minus the delivery fee.', alcAge(S.cart.sid).age)}</T><Pressable onPress={() => setConsent(!S.alcConsent)} accessibilityRole="checkbox" accessibilityState={{checked: !!S.alcConsent}} style={{flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4}}><View style={{width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: th.br, backgroundColor: S.alcConsent ? th.br : 'transparent', alignItems: 'center', justifyContent: 'center'}}>{S.alcConsent ? <Icon name="check" size={14} color="#fff" /> : null}</View><T size={13.5} style={{flex: 1}}>{rgText('rg.consent', 'I am {age} or older and will show valid government photo ID on delivery or pickup.', alcAge(S.cart.sid).age)}</T></Pressable></Card> : null}
    <Sum rows={[['Subtotal', money(t.sub)], ['Delivery fee', pk ? 'Pickup' : t.free ? 'Free' : money(t.fee), t.free ? 'g' : undefined as any], ['Service fee', money(t.svc)], ...(t.disc ? [['Discount', '-' + money(t.disc), 'g'] as any] : []), ...(t.tip ? [['Tip', money(t.tip)] as any] : [])]} total={['Total', money(t.total)]} />
  </>);
  return (
    <View>
      <Bar title={label('lbl.checkoutTitle', 'Checkout')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <View style={{flexDirection: 'row', gap: 6, marginBottom: 6}}>{stp.map((x, n) => <View key={x} style={{flex: 1, alignItems: 'center'}}><View style={{height: 5, borderRadius: 3, alignSelf: 'stretch', backgroundColor: n <= S.cs ? th.br : th.line}} /><T size={11.5} weight={n === S.cs ? '800' : '500'} style={{marginTop: 5}}>{x}</T></View>)}</View>
        {body}
      </View>
    </View>
  );
}
export const CheckoutFoot = () => <Cta label={S.cs === 3 ? label('lbl.checkoutPlaceOrder', 'Place order') + ' · ' + money(totals().total) : label('lbl.checkoutContinue', 'Continue')} disabled={S.cs === 3 && hasAlcohol() && !S.alcConsent} onPress={S.cs === 3 ? placeOrder : checkoutNext} />;

export function Confirm({id}: {id: string}) {
  const th = useTheme(), o = S.orders.filter((x: any) => x.id === id)[0];
  if (!o || !o.backendId || !STB[o.sid]) return <View><Bar title={label("lbl.shopAuto15CA8YK", "Order")} onBack={back} /><Empty emoji="📦" title={label('lbl.orderUnavailable', 'Order unavailable')} text={label('lbl.orderLiveUnavailable', 'This order is not available from the live Wantiss order service.')} button={label('lbl.orderGoHome', 'Go home')} onPress={browse} /></View>;
  return (
    <View style={{paddingHorizontal: 16, paddingTop: 50, alignItems: 'center'}}>
      <Text style={{fontSize: 70}}>✅</Text>
      <T size={24} weight="800" style={{marginTop: 10, marginBottom: 4}}>{label('lbl.confirmOrderPlaced', 'Order placed')}</T>
      <T color={th.mut} align="center">Order {o.id} with {STB[o.sid].n}.</T>
      <View style={{alignSelf: 'stretch', marginTop: 20}}>
        <Sum rows={o.lines.map((l: any) => [l.q + '× ' + l.n, money(l.p * l.q)])} total={['Total', money(o.total)]} />
        <Cta label={label('lbl.confirmTrackOrder', 'Track order')} onPress={() => go('track', o.id)} /><View style={{height: 10}} /><Cta ghost label={label('lbl.confirmBackGoodies', 'Back to Goodies')} onPress={() => tab('home')} />
      </View>
    </View>
  );
}

function DeliveryRouteMap({orderId, origin, destination, route}: {orderId: string; origin: any; destination: any; route: any}) {
  const th = useTheme();
  const [courier, setCourier] = useState<any>(null);
  const [assignmentStatus, setAssignmentStatus] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      const {data, error} = await supabase.from('goodies_delivery_assignments')
        .select('latitude,longitude,status,location_updated_at')
        .eq('order_id', orderId).maybeSingle();
      if (active && !error && data) {
        setAssignmentStatus(String(data.status || ''));
        if (Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude)) && data.latitude != null && data.longitude != null) {
          setCourier({latitude: Number(data.latitude), longitude: Number(data.longitude), updatedAt: data.location_updated_at});
        }
      }
    };
    void load();
    const channel = supabase.channel('goodies-courier-map-' + orderId)
      .on('postgres_changes', {event: '*', schema: 'public', table: 'goodies_delivery_assignments', filter: 'order_id=eq.' + orderId}, () => { void load(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [orderId]);
  const valid = (p: any) => p && p.latitude != null && p.longitude != null && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude));
  const routeCoords = Array.isArray(route?.coordinates) ? (route.type === 'MultiLineString' ? route.coordinates.flat(1) : route.coordinates).map((p:any)=>({latitude:Number(p[1]),longitude:Number(p[0])})).filter((p:any)=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)) : [];
  const points = [origin, destination, courier].filter(valid);
  const center = points.length ? {latitude: points.reduce((n,p)=>n+Number(p.latitude),0)/points.length, longitude: points.reduce((n,p)=>n+Number(p.longitude),0)/points.length} : null;
  return <Card style={{padding: 12}}>
    <T size={15} weight="800">{label('lbl.orderLiveTracking', 'Live delivery route')}</T>
    {center ? <MapView style={{height: 250, borderRadius: 14, marginTop: 10}} region={{...center,latitudeDelta:0.04,longitudeDelta:0.04}} showsCompass>
      {valid(origin) ? <Marker coordinate={origin} title={label('lbl.orderStoreOrigin','Store')} pinColor="#2E8B57" /> : null}
      {valid(destination) ? <Marker coordinate={destination} title={label('lbl.orderDeliveryDestination','Delivery address')} pinColor="#D97706" /> : null}
      {valid(courier) ? <Marker coordinate={courier} title={label('lbl.orderCourierLocation','Courier')} description={courier.updatedAt ? label('lbl.orderCourierUpdated','Updated {time}').replace('{time}',new Date(courier.updatedAt).toLocaleTimeString()) : ''} /> : null}
      {routeCoords.length > 1 ? <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor={th.br} /> : valid(origin) && valid(destination) ? <Polyline coordinates={[origin,destination]} strokeWidth={3} strokeColor={th.br} lineDashPattern={[5,5]} /> : null}
    </MapView> : <Empty title={label('lbl.orderMapPreparing','Preparing delivery map')} text={label('lbl.orderMapPreparingHint','The map appears when the delivery address has been geocoded.')} />}
    <T size={12} color={th.mut} style={{marginTop:8}}>{valid(courier) ? label('lbl.orderCourierLive','Courier GPS location is updating live.') : assignmentStatus === 'offered' ? label('lbl.orderCourierOffer','Waiting for the courier to accept the delivery.') : label('lbl.orderCourierPending','Waiting for courier assignment. The map will update when a courier starts sharing GPS.')}</T>
  </Card>;
}

function PickupLocationMap() {
  return <Card style={{padding: 12}}><T size={15} weight="800">{label('lbl.orderPickupLocation', 'Pickup location')}</T><Empty title={label('lbl.orderPickupUnavailable', 'Live location unavailable')} text={label("lbl.shopAuto1WOHU9O", "Pickup coordinates have not been provided by the store.")} /></Card>;
}

export function Track({id}: {id: string}) {
  const th = useTheme(), o = S.orders.filter((x: any) => x.id === id)[0];
  useEffect(() => {
    if (!o?.backendId) return;
    let active = true;
    const sync = async () => {
      const {data, error} = await supabase.from('goodies_orders').select('status,scheduled_for,acceptance_deadline_at,decline_reason_public,payment_status,payment_method,payment_provider_ref,store_latitude,store_longitude,delivery_latitude,delivery_longitude,delivery_route,courier_id').eq('id', o.backendId).maybeSingle();
      if (!active || error || !data) return;
      o.serverStatus = data.status;
      o.acceptanceDeadlineAt = data.acceptance_deadline_at;
      o.declineReasonPublic = data.decline_reason_public;
      o.paymentStatus = data.payment_status;
      o.storeLatitude = data.store_latitude == null ? null : Number(data.store_latitude);
      o.storeLongitude = data.store_longitude == null ? null : Number(data.store_longitude);
      o.deliveryLatitude = data.delivery_latitude == null ? null : Number(data.delivery_latitude);
      o.deliveryLongitude = data.delivery_longitude == null ? null : Number(data.delivery_longitude);
      o.deliveryRoute = data.delivery_route || null;
      o.courierId = data.courier_id || null;
      if (data.payment_method === 'card' && ['declined','expired','cancelled'].includes(String(data.status)) && ['paid','refund_pending'].includes(data.payment_status) && !o.refundRequested) {
        o.refundRequested = true;
        const refund = await supabase.functions.invoke('refund-goodies-card-order', { body: { order_id: o.backendId } });
        if (refund.error || refund.data?.error) o.refundRequested = false;
        else if (refund.data?.status) o.paymentStatus = refund.data.status;
      }
      o.declined = data.status === 'declined';
      o.expired = data.status === 'expired';
      if (data.scheduled_for) o.sch = new Date(data.scheduled_for).getTime();
      o.cx = ['cancelled', 'declined', 'expired'].includes(data.status) ? 1 : 0;
      o.st = require('../store').stage(o);
      save(); emit();
    };
    void sync();
    const channel = supabase.channel('goodies-order-status-' + o.backendId).on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'goodies_orders', filter: 'id=eq.' + o.backendId}, () => { void sync(); }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [o?.backendId]);
  if (!o) return <View><Bar title={label("lbl.shopAuto15CA8YK", "Order")} onBack={back} /><Empty emoji="📦" title={label('lbl.orderNotFound', 'Order not found')} button={label('lbl.orderGoHome', 'Go home')} onPress={browse} /></View>;
  const s = STB[o.sid], T_: string[] = stageLabels(!!o.pk, o.pk ? TP : TL), dn = done(o);
  const serverStatus = String(o.serverStatus || '').toLowerCase();
  const eta = o.declined ? label('lbl.orderStoreDeclined', 'Store declined the order') : o.expired ? label('lbl.orderExpired', 'Response window expired') : o.cx ? label('lbl.orderCancelled', 'Cancelled') : dn ? (o.pk ? label('lbl.orderPickedUp', 'Picked up') : label('lbl.orderDelivered', 'Delivered')) : o.backendId ? (serverStatus === 'scheduled' && o.sch && Date.now() < o.sch ? label('lbl.orderScheduledFor', 'Scheduled for {time}').replace('{time}', fmtTime(new Date(o.sch))) : serverStatus === 'scheduled' || serverStatus === 'placed' ? label('lbl.orderWaitingStore', 'Waiting for store to accept') : serverStatus === 'accepted' ? label('lbl.orderAccepted', 'Order accepted by store') : serverStatus === 'preparing' ? label('lbl.orderPreparing', 'Store is preparing your order') : serverStatus === 'ready' ? (o.pk ? label('lbl.orderReadyPickup', 'Ready for pickup') : label('lbl.orderReadyCourier', 'Ready for courier pickup')) : serverStatus === 'courier_assigned' ? label('lbl.orderCourierAssigned', 'A courier has been assigned') : serverStatus === 'picked_up' ? label('lbl.orderCourierPickedUp', 'Your courier has picked up the order') : label('lbl.orderUpdated', 'Order update')) : o.sch && Date.now() < o.sch ? label('lbl.orderScheduledFor', 'Scheduled for {time}').replace('{time}', fmtTime(new Date(o.sch))) : label('lbl.orderUpdated', 'Order update');
  return (
    <View>
      <Bar title={'Order ' + o.id} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        <Card>
          <Row><Tile e={s.e} bg={s.bg} /><View style={{flex: 1}}><T weight="700">{s.n}</T><T size={13} color={th.mut}>{o.pk ? label('lbl.orderPickupShort', 'Pickup') : label('lbl.orderToAddress', 'To {address}').replace('{address}', o.ad ? o.ad.t + (o.ad.apt ? ', ' + o.ad.apt : '') : o.addr)}</T></View></Row>
          <View style={{marginTop: 10}}><Badge green={!!(dn && !o.cx)} label={eta} /></View>
          {o.cx ? <T size={14} color={th.mut} style={{marginTop: 12}}>{o.declined ? label('lbl.orderDeclinedMessage', 'The store could not accept your order. {reason}').replace('{reason}', o.declineReasonPublic || label('lbl.orderDeclinedFallback', 'Please try another store.')) : o.expired ? label('lbl.orderExpiredMessage', 'The store did not respond within 15 minutes. Your order was cancelled.') : label('lbl.orderCancelledMessage', 'This order was cancelled')}{o.pay === 'card' ? (o.paymentStatus === 'refunded' ? ' Your card refund has been submitted. It may take a few business days to appear.' : ' Your card refund is being processed. It may take a few business days to appear.') : o.paymentStatus === 'refunded' || o.pay === 'wallet' ? ' Any applicable refund will be shown in your Wantiss wallet activity.' : ' You were not charged for this order.'}</T> : (<>
            <View style={{flexDirection: 'row', gap: 6, marginVertical: 14}}>{T_.map((x, i) => <View key={i} style={{flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= o.st ? th.br : th.line}} />)}</View>
            {T_.map((x, i) => <View key={i} style={{flexDirection: 'row', gap: 12, marginVertical: 12, alignItems: 'center'}}><View style={{width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: i <= o.st ? th.br : th.line, backgroundColor: i <= o.st ? th.br : 'transparent', alignItems: 'center', justifyContent: 'center'}}>{i <= o.st ? <Icon name="check" size={12} color="#fff" /> : null}</View><T size={14} color={i <= o.st ? th.ink : th.mut} weight={i <= o.st ? '700' : undefined}>{x}</T></View>)}
          </>)}
          <T size={11.5} color={th.mut}>{label('lbl.orderStatusHeading', 'Order status is provided by the live order service.')}</T>
        </Card>
        {o.pk && o.st >= 3 && !o.cx ? <PickupLocationMap /> : null}
        {!o.pk && o.st >= 4 && !dn && o.backendId ? <DeliveryRouteMap orderId={o.backendId} origin={{latitude:o.storeLatitude,longitude:o.storeLongitude}} destination={{latitude:o.deliveryLatitude,longitude:o.deliveryLongitude}} route={o.deliveryRoute} /> : null}
        {o.alc ? <Card style={{borderColor: o.alc.status === 'failed' ? th.red : th.br}}><Row><Text style={{fontSize: 26}}>🪪</Text><View style={{flex: 1}}><T weight="800">ID check · {o.alc.age}+ ({o.alc.who === 'shop' ? 'checked by the shop' : 'checked by the courier'})</T><T size={13} color={th.mut}>{o.alc.status === 'pending' ? 'Have your valid government photo ID ready. The order is completed only after it is checked.' : o.alc.status === 'passed' ? 'ID checked.' : (o.pay === 'cash' ? 'ID check failed. You were not charged.' : 'ID check failed. ' + money(o.refund || 0) + ' was refunded to your Wantiss wallet. The delivery fee is not refunded.')}</T></View></Row>{providerInfo.demo && o.alc.status === 'pending' && o.st >= (o.pk ? 3 : 5) ? <View style={{flexDirection: 'row', gap: 8, marginTop: 10}}><Cta small ghost label={label("lbl.shopAuto1RR9Q6U", "Demo: ID valid")} onPress={() => idResult(o.id, true)} /><Cta small ghost label={label("lbl.shopAuto2L0NX5", "Demo: ID failed")} onPress={() => idResult(o.id, false)} /></View> : null}</Card> : null}
        {dn && !o.cx && (!o.rated || (!o.pk && !o.driverRated)) ? <Card><Row sp style={{alignItems:'center'}}><View style={{flex:1}}><T weight="800">{label('lbl.orderRate', 'Rate your order')}</T><T size={12} color={th.mut}>{label('lbl.orderFeedback', 'Order and delivery feedback')}</T></View><View style={{flexDirection:'row',gap:3}}>{[1,2,3,4,5].map(k=><Pressable key={k} accessibilityRole="button" accessibilityLabel={label('lbl.a11yRateOrder', 'Rate order {n} stars').replace('{n}', String(k))} onPress={()=>{S.rt=k;require('../store').ui.sheet({kind:'review',id:o.id,initialStars:k});}}><Icon name="star" size={23} color={o.rated>=k?'#FFB400':th.line} fill /></Pressable>)}</View></Row>{o.rated ? <T size={12} color={th.mut} style={{marginTop:5}}>{label('lbl.orderYourRating', 'Your rating: {n} ★').replace('{n}', String(o.rated))}</T> : null}{!o.pk ? <><View style={{height:1,backgroundColor:th.line,marginVertical:10}}/><Row sp style={{alignItems:'center'}}><View style={{flex:1}}><T weight="800">{label('lbl.orderRateDriver', 'Rate your driver')}</T><T size={12} color={th.mut}>{label('lbl.orderDeliveryExperience', 'Delivery experience')}</T></View>{o.driverRated ? <T weight="700">{o.driverRated} ★</T> : <View style={{flexDirection:'row',gap:3}}>{[1,2,3,4,5].map(k=><Pressable key={k} accessibilityRole="button" accessibilityLabel={label('lbl.a11yRateDriver', 'Rate driver {n} stars').replace('{n}', String(k))} onPress={()=>{S.rt=k;require('../store').ui.sheet({kind:'driver-review',id:o.id,initialStars:k});}}><Icon name="star" size={23} color="#FFB400" fill /></Pressable>)}</View>}</Row></> : null}</Card> : null}
        {o.rated && (o.pk || o.driverRated) ? <Card>
          <T weight="700" align="center">{label('lbl.orderThanksFeedback', 'Thank you for your feedback!')}</T>
          {o.orderReview?.t ? <T size={12.5} color={th.mut} style={{marginTop:8}}>Your shop/order comment: “{o.orderReview.t}”</T> : null}
          {o.driverReview?.t ? <T size={12.5} color={th.mut} style={{marginTop:6}}>Your driver comment: “{o.driverReview.t}”</T> : null}
        </Card> : null}
        <Sum rows={[...o.lines.map((l: any) => [l.q + '× ' + l.n, money(l.p * l.q)] as any), ['Fees', money(o.fee + o.svc)], ...(o.disc ? [['Discount', '-' + money(o.disc), 'g'] as any] : []), ...(o.tip ? [['Tip', money(o.tip)] as any] : []), ['Contact', (o.ph || 'n/a') + (o.phl ? ' (' + o.phl + ')' : '')], ...(o.ad && o.ad.inst ? [['Instructions', o.ad.inst] as any] : []), ...(o.note ? [['Note', o.note] as any] : [])]} total={['Total · ' + o.payl, money(o.total)]} />
        {!dn && o.st <= 2 ? <><Card style={{padding: 0, borderWidth: 0}}><Pressable onPress={() => cancelAsk(o.id)} style={{height: 52, borderRadius: 16, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><T size={15.5} weight="800" color={th.red}>{label('lbl.orderCancelAction', 'Cancel order')}</T></Pressable></Card></> : null}
        <Cta ghost label={label('lbl.orderAgain', 'Order again')} onPress={() => reorder(o.id)} /><View style={{height: 10}} />
        {!o.cx ? <><Cta ghost label={label('lbl.orderMessageStore', 'Message store')} onPress={() => go('storechat', o.sid)} /><View style={{height: 10}} /></> : null}
        <Cta ghost label={label('lbl.orderGetHelp', 'Get help with this order')} onPress={() => go('contact', {o: true, oid: o.id})} /><View style={{height: 10}} />
        <Cta label={label('lbl.orderGoToOrders', 'Go to Orders')} onPress={() => tab('orders')} />
      </View>
    </View>
  );
}

export function Orders() {
  const backendIds = S.orders.map((o: any) => o.backendId).filter(Boolean).join(',');
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const start = async () => {
      const {data: auth} = await supabase.auth.getUser();
      if (!active || !auth.user || !backendIds) return;
      const ids = backendIds.split(',');
      const sync = async () => {
        const {data, error} = await supabase.from('goodies_orders')
          .select('id,status,scheduled_for,acceptance_deadline_at,decline_reason_public,payment_status')
          .eq('customer_id', auth.user!.id).in('id', ids);
        if (!active || error || !data) return;
        let changed = false;
        for (const row of data) {
          const order: any = S.orders.find((o: any) => o.backendId === row.id);
          if (!order) continue;
          order.serverStatus = row.status;
          order.acceptanceDeadlineAt = row.acceptance_deadline_at;
          order.declineReasonPublic = row.decline_reason_public;
          order.paymentStatus = row.payment_status;
          order.declined = row.status === 'declined';
          order.expired = row.status === 'expired';
          order.cx = ['cancelled', 'declined', 'expired'].includes(row.status) ? 1 : 0;
          if (row.scheduled_for) order.sch = new Date(row.scheduled_for).getTime();
          order.st = require('../store').stage(order);
          changed = true;
        }
        if (changed) { save(); emit(); }
      };
      await sync();
      if (!active) return;
      channel = supabase.channel('goodies-orders-list-' + auth.user.id)
        .on('postgres_changes', {event: 'UPDATE', schema: 'public', table: 'goodies_orders', filter: 'customer_id=eq.' + auth.user.id}, () => { void sync(); })
        .subscribe();
    };
    void start();
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [backendIds]);
  const th = useTheme(), a = S.orders.filter((o: any) => (S.ot === 'active' ? !done(o) : done(o)));
  const stTxt = (o: any) => (o.cx ? label('lbl.orderCancelled', 'Cancelled') : stageLabels(!!o.pk, o.pk ? TP : TL)[o.st]);
  return (
    <View>
      <Bar title={label('lbl.ordersTitle', 'Your orders')} onBack={() => require('../actions').back()} />
      <View style={{paddingHorizontal: 16}}>
        <Seg list={[['active', label('lbl.ordersActive', 'Active')], ['past', label('lbl.ordersPast', 'Past')]]} on={S.ot} onPick={setOrdersTab} />
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
              <Row style={{marginTop: 12}}><Cta small ghost label={label('lbl.ordersReorder', 'Reorder')} onPress={() => reorder(o.id)} /><Cta small label={done(o) ? label('lbl.ordersDetails', 'Details') : label('lbl.ordersTrack', 'Track')} onPress={() => go('track', o.id)} /></Row>
            </Card>
          );
        }) : <Empty emoji={S.ot === 'active' ? '🍽️' : '🧾'} title={S.ot === 'active' ? label('lbl.ordersNoActive', 'No active orders') : label('lbl.ordersNoPast', 'No past orders yet')} text={label('lbl.ordersEmptyText', 'Your orders will show up here.')} button={label('lbl.ordersBrowse', 'Browse stores')} onPress={() => go('explore')} />}
      </View>
    </View>
  );
}

export function Favs() {
  const th = useTheme(), st = ST.filter(s => S.fav.indexOf(s.id) > -1), it = S.favp.map((id: string) => IT[id]).filter(Boolean);
  return (
    <View>
      <Bar title={label('lbl.favoritesTitle', 'Your favorites')} onBack={back} />
      <View style={{paddingHorizontal: 16}}><Seg list={[['stores', label('lbl.searchTabStores', 'Stores ({n})').replace('{n}', String(st.length))], ['items', label('lbl.searchTabItems', 'Items ({n})').replace('{n}', String(it.length))]]} on={S.ft} onPick={k => {S.ft = k; emit();}} /></View>
      {S.ft === 'stores' ? (st.length ? <View style={{gap: 22, padding: 16}}>{st.map(s => <StoreCard key={s.id} s={s} />)}</View> : <Empty icon="heart" title={label('lbl.favoritesEmpty', 'Nothing saved yet')} text={label('lbl.favoritesEmptyText', 'Save stores and products to find them here.')} button={label("lbl.shopAuto1GWRJAO", "Browse stores")} onPress={browse} />)
        : (it.length ? <View style={{paddingHorizontal: 16, marginTop: 6}}>{it.map((i: any) => <ItemRow key={i.id} i={i} />)}</View> : <Empty icon="heart" title={label('lbl.favoritesEmpty', 'Nothing saved yet')} text={label('lbl.favoritesEmptyText', 'Save stores and products to find them here.')} button={label("lbl.shopAuto1GWRJAO", "Browse stores")} onPress={browse} />)}
    </View>
  );
}

const FAQ: [string, string][] = [['How do I track my order?', 'Open Orders, then tap Track on an active order. You also get a notification at every step.'], ['Delivery information', 'Delivery takes about 15 to 55 minutes depending on the store. Your first order ships free; after that each store sets its own fee.'], ['Payment information', 'Pay with your Wallet, MonCash, a saved card or cash. This prototype simulates payments only.'], ['Refunds and cancellation', 'You can cancel before the store finishes preparing your order. Wallet payments are refunded to your wallet. Full policy: placeholder for the demo.'], ['What if an item is missing?', 'Open the order, tap Get help, and tell us what happened.']];
export function Help() {
  const th = useTheme(), [open, setOpen] = useState(-1);
  return (
    <View>
      <Bar title={label('lbl.helpTitle', 'Help center')} onBack={back} />
      <View style={{paddingHorizontal: 16}}>
        {faqList(FAQ).map((x, k) => (
          <Pressable key={k} onPress={() => setOpen(open === k ? -1 : k)} style={{borderBottomWidth: 1, borderBottomColor: th.line, paddingVertical: 14, paddingHorizontal: 4}}>
            <T size={14.5} weight="700">{x[0]}</T>
            {open === k ? <T size={13.5} color={th.mut} style={{marginTop: 8, lineHeight: 20}}>{x[1]}</T> : null}
          </Pressable>
        ))}
        <View style={{height: 18}} /><Cta label={label('lbl.helpContact', 'Contact support')} onPress={() => go('contact')} /><View style={{height: 10}} />
        <Cta ghost label={label('lbl.helpOrders', 'Report an order problem')} onPress={() => go('contact', {o: true, oid: ''})} /><View style={{height: 10}} />
        <Cta ghost label={label('lbl.accountTermsPolicies', 'Terms and policies')} onPress={() => go('policies')} />
      </View>
    </View>
  );
}
