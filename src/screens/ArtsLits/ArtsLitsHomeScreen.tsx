import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { loadReference, withBridge } from './reference';

export default function ArtsLitsHomeScreen({ onBack }: { onBack: () => void }) {
  const ref = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const [html, setHtml] = useState<string>();
  const [error, setError] = useState<string>();
  const [dark, setDark] = useState(false);
  const source = useMemo(() => html ? { html: withBridge(html), baseUrl: 'https://arts-lits.invalid/' } : undefined, [html]);
  useEffect(() => {
    let active = true;
    loadReference().then(value => { if (active) setHtml(value); }).catch(e => { if (active) setError(String(e.message ?? e)); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (source && !error && ref.current) ref.current.injectJavaScript('if(window.artsLitsBack)window.artsLitsBack();true;');
      else onBack();
      return true;
    });
    return () => sub.remove();
  }, [source, error, onBack]);
  return <View style={{flex:1,backgroundColor:dark?'#142021':'#f4f0e8',paddingTop:insets.top,paddingBottom:Platform.OS==='ios'?insets.bottom:0}}>
    <StatusBar style={dark?'light':'dark'}/>
    {error ? <View style={{flex:1,justifyContent:'center',padding:24,gap:16}}><Text accessibilityRole="header">Arts &amp; Lits</Text><Text>{error}</Text><Pressable accessibilityRole="button" onPress={onBack}><Text>Return to Wantiss</Text></Pressable></View>
      : source ? <WebView ref={ref} source={source} originWhitelist={['*']} onShouldStartLoadWithRequest={r=>r.url==='about:blank'||r.url==='https://arts-lits.invalid/'||r.url.startsWith('data:text/html')}
        javaScriptEnabled domStorageEnabled allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} mixedContentMode="never"
        setSupportMultipleWindows={false} style={{flex:1,backgroundColor:'transparent'}} automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never"
        onMessage={e=>{const m=e.nativeEvent.data;if(m==='arts-lits:back')onBack();else if(m==='arts-lits:theme:dark')setDark(true);else if(m==='arts-lits:theme:light')setDark(false);}}
        onError={()=>setError('Unable to open the Arts & Lits reference.')}/>
      : <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator accessibilityLabel="Loading Arts and Lits"/></View>}
  </View>;
}
