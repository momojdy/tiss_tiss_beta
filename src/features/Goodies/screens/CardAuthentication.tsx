import {label} from "../content";
import React, {useMemo, useState} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import {WebView} from 'react-native-webview';
import {Bar, Cta, Card, useTheme} from '../components/ui';

type Props = {
  clientSecret: string;
  publishableKey: string;
  onComplete: () => void;
  onCancel: () => void;
};

export function CardAuthentication({clientSecret, publishableKey, onComplete, onCancel}: Props) {
  const th = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const html = useMemo(() => {
    const secret = JSON.stringify(clientSecret);
    const key = JSON.stringify(publishableKey);
      return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial,sans-serif;color:#1A2517;padding:18px;text-align:center"><p>Securely verifying your card…</p><script src="https://js.stripe.com/v3/"></script><script>
      const send=x=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(x));
      const stripe=Stripe(${key});
      stripe.handleCardAction(${secret}).then(({paymentIntent,error})=>{
        if(error){send({error:error.message||'Card verification failed'});return;}
        send({status:paymentIntent&&paymentIntent.status||'unknown'});
      }).catch(e=>send({error:String(e&&e.message||e)}));
    </script></body></html>`;
  }, [clientSecret, publishableKey]);
  const onMessage = (event: any) => {
    let value: any;
    try {value = JSON.parse(event.nativeEvent.data);} catch {setProblem(label("lbl.page.screens.CardAuthentication.5ffd84b6ac", "Could not read the card verification result."));setBusy(false);return;}
    if (value.error) {setProblem(label('lbl.cardAuthenticationFailed', 'Your bank could not verify this card. Please try again or use another card.'));setBusy(false);return;}
    if (value.status === 'requires_capture' || value.status === 'succeeded') {setBusy(true);onComplete();return;}
    setProblem(label("lbl.page.screens.CardAuthentication.c95003d733", "Your card verification did not complete. Please try again or use another card."));
    setBusy(false);
  };
  return <View style={{flex: 1, backgroundColor: th.bg}}>
    <Bar title={label("lbl.page.screens.CardAuthentication.3b23875acd", "Verify card")} onBack={onCancel} />
    <View style={{padding: 16, gap: 12}}>
      <Card>
        <Text style={{color: th.ink, fontWeight: '600', fontSize: 15}}>{label("lbl.page.screens.CardAuthentication.45702cfdc7", "Your bank may ask you to approve this payment")}</Text>
        <Text style={{color: th.mut, fontSize: 13, lineHeight: 19, marginTop: 6}}>{label("lbl.page.screens.CardAuthentication.3b57f54f75", "Complete the secure verification from your bank. Your card is only captured after verification succeeds.")}</Text>
      </Card>
      <View style={{height: 330, overflow: 'hidden', borderRadius: 14, backgroundColor: '#fff'}}>
        <WebView source={{html, baseUrl: 'https://wantiss.app'}} originWhitelist={['*']} javaScriptEnabled domStorageEnabled onMessage={onMessage} onLoadStart={() => setBusy(true)} onLoadEnd={() => setBusy(false)} />
      </View>
      {busy ? <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><ActivityIndicator color={th.br} /><Text style={{color: th.mut, fontSize: 12}}>{label("lbl.page.screens.CardAuthentication.738fdf114d", "Waiting for secure card verification…")}</Text></View> : null}
      {problem ? <Text style={{color: th.red, fontSize: 13}}>{problem}</Text> : null}
      <Cta ghost label={label("lbl.page.screens.CardAuthentication.2ce006fd3e", "Cancel verification")} onPress={onCancel} disabled={busy} />
    </View>
  </View>;
}
