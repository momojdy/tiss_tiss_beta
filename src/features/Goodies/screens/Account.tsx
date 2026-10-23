/* Account screens: settings, profile, addresses, payments, policies, support. Ported from v24. */
import React, {useState, useEffect, useRef} from 'react';
import {View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform} from 'react-native';
import {Icon} from '../components/Icon';
import {T, Bar, Cta, Card, Row, Badge, Ttl, Empty, Switch, Input, Chip, useTheme, Tile} from '../components/ui';
import {S, defAddr, money, emit, save, toast, ui, push, reset, STB} from '../store';
import {back, go, tab, togglePref} from '../actions';
import {setTheme} from '../store';
import {t as tr} from '../i18n';
import {providerInfo} from '../providers';
import {Home} from './Browse';
import {supabase} from '../../../lib/supabase';
import {legalDoc, supportTopics} from '../content';

const POL: Record<string, [string, string]> = {
  terms: ['Terms of use', 'These are placeholder terms for the Goodies prototype. By using Goodies you agree to order responsibly and provide accurate delivery details. Final legal text will replace this page.'],
  privacy: ['Privacy policy', 'Placeholder policy. In this prototype your data is stored only on this device. In the real app, your Wantiss account data and Goodies orders will be handled under the final privacy policy.'],
  refund: ['Refund and cancellation policy', 'Placeholder policy. Orders can be cancelled until the store finishes preparing them. Wallet payments are refunded to your wallet. Final rules will be published before launch.'],
};

const LRow = ({icon, title, sub, onPress, right}: {icon: string; title: string; sub?: string; onPress: () => void; right?: any}) => {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: th.line}}>
      <View style={{width: 38, height: 38, borderRadius: 12, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={19} color={th.ink} /></View>
      <View style={{flex: 1}}><T size={14.5} weight="700">{title}</T>{sub ? <T size={12.5} color={th.mut}>{sub}</T> : null}</View>
      {right || <Icon name="chevR" size={16} color={th.ink} />}
    </Pressable>
  );
};
const Avatar = ({z}: {z: number}) => {const th = useTheme(); return <View style={{width: z, height: z, borderRadius: z / 2, backgroundColor: th.br, alignItems: 'center', justifyContent: 'center'}}><T size={Math.round(z * 0.45)} weight="800" color="#fff">{S.pf.av || String(S.pf.n).charAt(0).toUpperCase()}</T></View>;};

function Settings() {
  const th = useTheme(), d = S.theme === 'dark';
  return (<View>
    <Bar title={tr('settings')} onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <Pressable onPress={() => go('profile')}><Card><Row><Avatar z={48} /><View style={{flex: 1}}><T weight="700">{S.pf.n}</T><T size={13} color={th.mut}>Wantiss account · view profile</T></View><Icon name="chevR" size={16} color={th.ink} /></Row></Card></Pressable>
      <Ttl>Notifications</Ttl>
      <Row sp style={{paddingVertical: 8, paddingHorizontal: 4}}><T>Order updates</T><Switch on={!!S.np.orders} label="Order updates" onPress={() => togglePref('orders')} /></Row>
      <Row sp style={{paddingVertical: 8, paddingHorizontal: 4}}><T>Offers and deals</T><Switch on={!!S.np.promos} label="Offers and deals" onPress={() => togglePref('promos')} /></Row>
      <Ttl>Account</Ttl>
      <LRow icon="pin" title="Saved addresses" sub={defAddr().t + ' · Wantiss default'} onPress={() => go('addresses')} />
      <LRow icon="wallet" title="Wallet and payment methods" sub={'Balance ' + money(S.wallet)} onPress={() => go('payments')} />
      <LRow icon="heart" title="Favorites" sub={S.fav.length + S.favp.length + ' saved'} onPress={() => go('favs')} />
      <LRow icon="tag" title="Coupons and offers" onPress={() => go('promos')} />

      <LRow icon="moon" title="Dark mode" sub="Goodies only. Other Wantiss features keep their theme." onPress={() => setTheme(d ? 'light' : 'dark')} right={<Switch on={d} label="Dark mode" onPress={() => setTheme(d ? 'light' : 'dark')} />} />
      <LRow icon="help" title="Help center" sub="FAQs and support" onPress={() => go('help')} />
      {providerInfo.demo ? (<><Ttl>Demo</Ttl><LRow icon="tag" title="Import Admin content" sub="Paste the export from Wantiss Admin" onPress={() => ui.sheet({kind: 'import'})} /><LRow icon="user" title="Reset Goodies demo data" sub="Clears orders, cart and checkout numbers" onPress={() => {require('../store').resetDemo(); toast('Demo data reset');}} /></>) : null}
      <T size={12} color={th.mut} align="center" style={{marginTop: 18}}>Goodies {providerInfo.demo ? '(demo)' : ''}</T>
    </View>
  </View>);
}

function Profile() {
  const th = useTheme(), p = S.pf;
  return (<View>
    <Bar title="Profile" onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <Card style={{alignItems: 'center'}}><Avatar z={76} /><T size={17} weight="800" style={{marginTop: 10}}>{p.n}</T><T size={13.5} color={th.mut} align="center" style={{lineHeight: 22}}>{p.e}{'\n'}{p.ph}</T><View style={{marginTop: 8}}><Badge label="Shared Wantiss account" /></View></Card>
      <LRow icon="pin" title="Saved addresses" sub="Shared with Wantiss" onPress={() => go('addresses')} />
      <LRow icon="bag" title="Order history" sub={S.orders.length + ' orders'} onPress={() => tab('orders')} />
      <LRow icon="heart" title="Favorites" onPress={() => go('favs')} />
      <LRow icon="wallet" title="Wallet and payments" onPress={() => go('payments')} />
      <LRow icon="bell" title="Notification preferences" onPress={() => go('settings')} />
      <LRow icon="help" title="Help and support" onPress={() => go('help')} />
      <LRow icon="tag" title="Terms and policies" onPress={() => go('policies')} />
    </View>
  </View>);
}

function Addresses() {
  const th = useTheme(), [edit, setEdit] = useState<any>(null);
  const zoneOf = (t: string) => {let x = 0; for (let i = 0; i < t.length; i++) x = (x * 31 + t.charCodeAt(i)) % 97; return Math.round((x % 5) * 9) / 10;};
  const saveAddr = () => {
    const t = (edit.t || '').trim(); if (t.length < 4) {toast('Enter the street and area'); return;}
    let a = S.addr.filter((x: any) => x.id === edit.id)[0]; const isNew = !a;
    if (isNew) {a = {id: Date.now(), def: 0}; S.addr.push(a);}
    if (isNew || a.t !== t) a.z = zoneOf(t);
    a.l = edit.l; a.cc = edit.cc || 'HT'; a.t = t; a.apt = (edit.apt || '').trim(); a.inst = (edit.inst || '').trim();
    if (edit.def && !a.def) {S.addr.forEach((x: any) => (x.def = 0)); a.def = 1;}
    if (isNew) S.as = a.id; setEdit(null); toast(isNew ? 'Address saved to your Wantiss account' : 'Address updated'); save(); emit();
  };
  return (<View>
    <Bar title="Saved addresses" onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <T size={13} color={th.mut} style={{marginBottom: 12, lineHeight: 19}}>These belong to your Wantiss account. Picking one for Goodies does not change your Wantiss default.</T>
      {S.addr.map((a: any) => (
        <Card key={a.id}>
          <Row sp style={{flexWrap: 'wrap'}}><T weight="700">{a.l}</T><Row style={{gap: 6}}>{a.def ? <Badge green label="Wantiss default" /> : null}{a.id === S.as ? <Badge label="Delivering here" /> : null}</Row></Row>
          <T size={14} style={{marginTop: 6}}>{a.t}{a.apt ? ', ' + a.apt : ''}</T>{a.inst ? <T size={12.5} color={th.mut}>Note: {a.inst}</T> : null}
          <Row style={{marginTop: 10, gap: 14, flexWrap: 'wrap'}}>
            <Pressable onPress={() => setEdit({...a})}><T size={13.5} weight="700" color={th.br}>Edit</T></Pressable>
            {a.id !== S.as ? <Pressable onPress={() => {S.as = a.id; toast('Goodies will deliver to ' + a.l); save(); emit();}}><T size={13.5} weight="700" color={th.br}>Use for Goodies</T></Pressable> : null}
            {!a.def ? <Pressable onPress={() => {S.addr.forEach((x: any) => (x.def = x.id === a.id ? 1 : 0)); toast('Wantiss default address updated'); save(); emit();}}><T size={13.5} weight="700" color={th.br}>Set as Wantiss default</T></Pressable> : null}
            {S.addr.length > 1 ? <Pressable onPress={() => {S.addr = S.addr.filter((x: any) => x.id !== a.id); if (a.def) S.addr[0].def = 1; if (S.as === a.id) S.as = defAddr().id; toast('Address deleted'); save(); emit();}}><T size={13.5} weight="700" color={th.red}>Delete</T></Pressable> : <></>}
          </Row>
        </Card>
      ))}
      {edit ? (
        <Card>
          <T size={17} weight="800">{edit.id ? 'Edit' : 'New'} address</T>
          <Row style={{marginTop: 10, gap: 8}}>{['Home', 'Work', 'Other'].map(x => <Chip key={x} label={x} on={edit.l === x} onPress={() => setEdit({...edit, l: x})} />)}</Row>
          <Input label="Street and area" value={edit.t || ''} onChange={v => setEdit({...edit, t: v})} />
          <Input label="Apartment, building, floor or landmark" value={edit.apt || ''} onChange={v => setEdit({...edit, apt: v})} />
          <Input label="Delivery instructions" value={edit.inst || ''} onChange={v => setEdit({...edit, inst: v})} />
          <T size={13} weight="700" style={{marginTop: 10, marginBottom: 6}}>Country</T>
          <Row style={{gap: 8}}>{[['HT', 'Haiti'], ['DO', 'Dominican Republic'], ['US', 'United States'], ['XX', 'Other']].map(x => <Chip key={x[0]} label={x[1]} on={(edit.cc || 'HT') === x[0]} onPress={() => setEdit({...edit, cc: x[0]})} />)}</Row>
          <Pressable disabled={!!edit.def && !!edit.id} onPress={() => setEdit({...edit, def: edit.def ? 0 : 1})} style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14}}><View style={{width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: th.br, backgroundColor: edit.def ? th.br : 'transparent'}} /><T>{edit.def && edit.id ? 'This is your Wantiss default address' : 'Make this my default Wantiss address'}</T></Pressable>
          <View style={{marginTop: 14}}><Cta label="Save address" onPress={saveAddr} /></View>
        </Card>
      ) : <Cta label="+ Add new address" onPress={() => setEdit({id: 0, l: 'Home', t: '', apt: '', inst: '', def: 0, cc: 'HT'})} />}
    </View>
  </View>);
}

function Payments() {
  const th = useTheme(), [f, setF] = useState<any>(null);
  return (<View>
    <Bar title="Wallet and payments" onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <View style={{borderRadius: 18, padding: 14, backgroundColor: th.br, marginBottom: 12}}>
        <T size={13} color="#fff" style={{opacity: 0.9}}>Wantiss Wallet (demo)</T><T size={34} weight="800" color="#fff" style={{marginTop: 4, marginBottom: 14}}>{money(S.wallet)}</T>
        <Pressable onPress={() => ui.sheet({kind: 'topup'})} style={{height: 44, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'}}><T size={15} weight="800" color={th.brd}>Top up wallet</T></Pressable>
      </View>
      {!S.hasWallet ? <Card><T weight="700">You do not have a wallet yet</T><T size={13} color={th.mut} style={{marginVertical: 4}}>Create one to pay with it and to receive refunds. You can withdraw from it later.</T><Cta small label="Create wallet" onPress={() => require('../actions').createWallet()} /></Card> : null}
      <Ttl>Saved cards</Ttl>
      {S.cards.length ? S.cards.map((c: any, i: number) => <Card key={i}><Row><Icon name="card" size={22} color={th.ink} /><View style={{flex: 1}}><T weight="700">{c.b} •••• {c.l4}</T><T size={12.5} color={th.mut}>{c.n} · exp {c.e}</T></View><Pressable accessibilityLabel="Remove card" onPress={() => {S.cards.splice(i, 1); save(); emit();}}><Icon name="trash" size={18} color={th.red} /></Pressable></Row></Card>) : <T size={14} color={th.mut} style={{marginBottom: 12}}>No cards saved yet.</T>}
      {f ? (<Card><Input label="Name on card" value={f.n} onChange={v => setF({...f, n: v})} /><Input label="Card number" value={f.num} keyboard="number-pad" onChange={v => setF({...f, num: v.replace(/\D/g, '')})} /><Input label="Expiry (MM/YY)" value={f.e} onChange={v => setF({...f, e: v})} /><View style={{marginTop: 12}}><Cta label="Save card" onPress={() => {if (f.num.length < 12 || !f.n.trim()) {toast('Enter a valid card'); return;} S.cards.unshift({b: /^4/.test(f.num) ? 'Visa' : /^5/.test(f.num) ? 'Mastercard' : 'Card', l4: f.num.slice(-4), n: f.n.trim(), e: f.e}); setF(null); save(); emit(); toast('Card saved');}} /></View></Card>) : <Cta ghost label="+ Add a card" onPress={() => setF({n: '', num: '', e: ''})} />}
      <T size={12} color={th.mut} style={{marginTop: 10}}>Only the last 4 digits are kept. Demo only.</T>
    </View>
  </View>);
}


function StoreChat({id}: {id: string}) {
  const th = useTheme(), store = STB[id], listRef = useRef<ScrollView>(null);
  const [userId, setUserId] = useState(''), [conversationId, setConversationId] = useState(''), [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState(''), [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [problem, setProblem] = useState(''), [attempt, setAttempt] = useState(0);
  const loadMessages = async (cid: string) => {
    const {data, error} = await supabase.from('messages').select('id,sender_id,body,created_at').eq('conversation_id', cid).order('created_at', {ascending: true});
    if (error) throw error;
    setMessages(data || []);
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {data: auth, error: authError} = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = auth.user;
        if (!user) throw new Error('Sign in to message this store. Your conversation will appear here after you sign in.');
        if (!active) return;
        setUserId(user.id);
        const {data: mapping, error: mappingError} = await supabase.from('goodies_store_schedules').select('business_id').eq('store_id', id).eq('is_live', true).maybeSingle();
        if (mappingError) throw mappingError;
        if (!mapping?.business_id) throw new Error('This store has not enabled live store messaging yet.');
        const {data: found, error: findError} = await supabase.from('conversations').select('id').eq('business_id', mapping.business_id).eq('feature', 'goodies').eq('ref_id', id).eq('customer_id', user.id).limit(1).maybeSingle();
        if (findError) throw findError;
        let cid = found?.id;
        if (!cid) {
          const {data: created, error: createError} = await supabase.from('conversations').insert({business_id: mapping.business_id, participant_ids: [user.id], customer_id: user.id, customer_name: S.pf.n || 'Customer', feature: 'goodies', ref_id: id, ref_label: store?.n || 'Goodies store', title: store?.n || 'Goodies store', last_body: '', unread_business: 0, unread_customer: 0}).select('id').single();
          if (createError) throw createError;
          cid = created.id;
        }
        if (!active) return;
        setConversationId(cid);
        await loadMessages(cid);
      } catch (e: any) { if (active) setProblem(e?.message || 'Could not open this store conversation.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, attempt]);
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel('goodies-store-chat-' + conversationId).on('postgres_changes', {event: '*', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + conversationId}, () => { loadMessages(conversationId).catch(e => setProblem(e?.message || 'Could not refresh messages.')); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId]);
  const send = async () => {
    const body = draft.trim(); if (!body || !conversationId || !userId || sending) return;
    setSending(true);
    try {
      const {error} = await supabase.from('messages').insert({conversation_id: conversationId, sender_id: userId, body});
      if (error) throw error;
      const {error: threadError} = await supabase.from('conversations').update({last_body: body, updated_at: new Date().toISOString(), unread_business: 1}).eq('id', conversationId);
      if (threadError) throw threadError;
      setDraft('');
      await loadMessages(conversationId);
    } catch (e: any) { setProblem(e?.message || 'Message could not be sent.'); }
    finally { setSending(false); }
  };
  return (
    <View style={{flex: 1, minHeight: 430}}>
      <Bar title={store ? store.n : 'Message store'} onBack={back} />
      {store ? <View style={{paddingHorizontal: 16, paddingBottom: 10}}><Card><Row style={{gap: 10, alignItems: 'center'}}><Tile e={store.e} bg={store.bg} size={42} /><View style={{flex: 1}}><T weight="800">{store.n}</T><T size={12} color={th.mut}>Private conversation with the store</T></View><Badge label="Goodies" /></Row></Card></View> : null}
      {problem ? <View style={{marginHorizontal: 16, marginBottom: 8}}><Card style={{borderColor: th.red}}><T size={13} color={th.red}>{problem}</T><Pressable onPress={() => {setProblem(''); setLoading(true); setConversationId(''); setAttempt(v => v + 1);}}><T size={13} weight="800" color={th.br} style={{marginTop: 8}}>Try again</T></Pressable></Card></View> : null}
      {loading ? <View style={{padding: 24, alignItems: 'center'}}><T color={th.mut}>Opening conversation…</T></View> : <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={listRef} style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexGrow: 1, justifyContent: messages.length ? 'flex-end' : 'center'}} keyboardShouldPersistTaps="handled" onContentSizeChange={() => listRef.current?.scrollToEnd({animated: true})}>
          {messages.length ? messages.map(m => {const mine = m.sender_id === userId; return <View key={m.id} style={{maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? th.br : th.soft, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10}}><T size={14} color={mine ? '#FFFFFF' : th.ink}>{m.body}</T><T size={10} color={mine ? '#FFFFFF' : th.mut} style={{marginTop: 4}}>{new Date(m.created_at).toLocaleString()}</T></View>;}) : <View style={{alignItems: 'center', padding: 22}}><Text style={{fontSize: 42}}>💬</Text><T weight="800" style={{marginTop: 8}}>Start the conversation</T><T size={13} color={th.mut} align="center" style={{marginTop: 5}}>Ask the store about its menu, availability, or your order. Replies from the store will appear here.</T></View>}
        </ScrollView>
        <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: th.line}}>
          <TextInput value={draft} onChangeText={setDraft} multiline placeholder="Write a message…" placeholderTextColor={th.mut} style={{flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, color: th.ink, backgroundColor: th.soft, textAlignVertical: 'top'}} />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || !conversationId || sending} onPress={send} style={{height: 44, minWidth: 58, paddingHorizontal: 13, borderRadius: 14, backgroundColor: !draft.trim() || !conversationId || sending ? th.line : th.br, alignItems: 'center', justifyContent: 'center'}}><T size={13} weight="800" color="#fff">{sending ? '…' : 'Send'}</T></Pressable>
        </View>
      </KeyboardAvoidingView>}
    </View>
  );
}

function Contact({p}: {p: any}) {
  const th = useTheme(), [topic, setTopic] = useState(p && p.o ? 'Order problem' : 'Other'), [oid, setOid] = useState(p && p.oid ? p.oid : ''), [msg, setMsg] = useState('');
  return (<View>
    <Bar title="Contact support" onBack={back} />
    <View style={{paddingHorizontal: 16}}>
      <T size={13} weight="700" style={{marginTop: 6, marginBottom: 8}}>Topic</T>
      <Row style={{flexWrap: 'wrap', gap: 8}}>{supportTopics(['Order problem', 'Payment', 'Account', 'Other']).map((x: string) => <Chip key={x} label={x} on={topic === x} onPress={() => setTopic(x)} />)}</Row>
      <T size={13} weight="700" style={{marginTop: 14, marginBottom: 8}}>Order (optional)</T>
      <Row style={{flexWrap: 'wrap', gap: 8}}><Chip label="None" on={!oid} onPress={() => setOid('')} />{S.orders.map((o: any) => <Chip key={o.id} label={o.id + ' · ' + STB[o.sid].n} on={oid === o.id} onPress={() => setOid(o.id)} />)}</Row>
      <Input label="Message" value={msg} onChange={setMsg} placeholder="Tell us what happened (at least 10 characters)" multiline />
      <View style={{marginTop: 14}}><Cta label="Send message" onPress={() => {if (msg.trim().length < 10) {toast('Please write at least 10 characters'); return;} const tk = 'GS-' + Math.floor(1000 + Math.random() * 9000); S.stack.pop(); push('supdone', tk);}} /></View>
      <T size={12} color={th.mut} style={{marginTop: 10}}>Demo only. No real support team receives this.</T>
    </View>
  </View>);
}

export function Account({r, p}: {r: string; p: any}): any {
  const th = useTheme();
  switch (r) {
    case 'settings': return <Settings />;
    case 'profile': return <Profile />;
    case 'addresses': return <Addresses />;
    case 'payments': return <Payments />;
    case 'contact': return <Contact p={p} />;
    case 'storechat': return <StoreChat id={String(p || '')} />;
    case 'supdone': return <View style={{padding: 16, paddingTop: 50, alignItems: 'center'}}><Text style={{fontSize: 64}}>💬</Text><T size={22} weight="800" style={{marginTop: 10}}>Message sent</T><T color={th.mut} align="center" style={{marginVertical: 8, marginBottom: 20}}>Ticket {p} (demo). We would reply within one business day.</T><View style={{alignSelf: 'stretch'}}><Cta label="Back to Goodies" onPress={() => tab('home')} /></View></View>;
    case 'policies': return <View><Bar title="Terms and policies" onBack={back} /><View style={{paddingHorizontal: 16}}>{Object.keys(POL).map(k => <LRow key={k} icon="help" title={POL[k][0]} onPress={() => go('policy', k)} />)}</View></View>;
    case 'policy': return POL[p] ? <View><Bar title={POL[p][0]} onBack={back} /><View style={{paddingHorizontal: 16}}><Card><T size={14.5} style={{lineHeight: 23}}>{legalDoc(({terms: 'legal.terms', privacy: 'legal.privacy', refund: 'legal.refund'} as any)[p]) || POL[p][1]}</T></Card></View></View> : <View><Bar title="Policy" onBack={back} /><Empty emoji="📄" title="Page not found" button="Back" onPress={() => tab('home')} /></View>;
    case 'ndetail': { const n = S.notifs.filter((x: any) => x.id == p)[0]; return n ? <View><Bar title="Notification" onBack={back} /><View style={{paddingHorizontal: 16}}><Card><T size={17} weight="800">{n.t}</T><T color={th.mut} style={{marginTop: 8, lineHeight: 21}}>{n.d}</T></Card><Cta label={n.r === 'track' ? 'View order' : 'See details'} onPress={() => (n.r === 'track' ? go('track', n.p) : n.r === 'promos' ? go('promos') : go('catlist', n.p || 'all'))} /></View></View> : <View><Bar title="Notification" onBack={back} /><Empty emoji="🔔" title="Notification not found" button="Back to Goodies" onPress={() => tab('home')} /></View>; }
    default: return <Home />;
  }
}
