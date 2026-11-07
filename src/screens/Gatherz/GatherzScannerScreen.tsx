import React, { useCallback, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import { useLoad } from '../../lib/gatherz/useLoad';
import { radius, useGatherzTheme } from '../../theme/gatherzTheme';

/** A demo-only scanner. CameraView is unmounted as soon as this route leaves the stack. */
export default function GatherzScannerScreen() {
 const { repo } = useGatherz(); const t = useGatherzTheme();
 const [permission, requestPermission] = useCameraPermissions();
 const [cameraOn, setCameraOn] = useState(false);
 const [gate, setGate] = useState<'Gate A' | 'Gate B'>('Gate A');
 const [manual, setManual] = useState('');
 const [result, setResult] = useState('');
 const [log, setLog] = useState<string[]>([]);
 const [locked, setLocked] = useState(false);
 const { data: admissions } = useLoad(() => repo.listMyAdmissions(), [repo]);
 const scan = useCallback((value: string) => {
   if (!value.trim()) { setResult('Enter a demo credential code.'); return; }
   const ticket = (admissions ?? []).find(a => a.credentialCode.toUpperCase() === value.trim().toUpperCase());
   const message = !ticket ? 'Credential not found in this demo account.' : ticket.status !== 'valid' ? 'Credential unavailable: ' + ticket.status.replace(/_/g, ' ') : 'Demo credential found. This is NOT valid entry verification.';
   setResult(message); setLog(v => [gate + ' · ' + message, ...v].slice(0, 20));
   setLocked(true); setCameraOn(false);
 }, [admissions, gate]);
 const button = (label: string, onPress: () => void) => <Pressable accessibilityRole="button" onPress={onPress} style={{ backgroundColor: t.accent, padding: 14, borderRadius: 999, alignItems: 'center' }}><Text style={{ color: t.onAccent }}>{label}</Text></Pressable>;
 return <Page><Header title="Check-in tool" />
 <Notice title="Demo scanner" body="Camera scanning and manual entry are for UI testing only. No admission is checked in and no real entry is authorized." />
 <View style={{ marginHorizontal: 20, gap: 12 }}>
  <Text style={{ color: t.text }}>Choose gate</Text>
  <View style={{ flexDirection: 'row', gap: 10 }}>{(['Gate A','Gate B'] as const).map(g => <Pressable key={g} onPress={() => setGate(g)} style={{ padding: 12, borderWidth: 0.5, borderColor: t.line, borderRadius: 999, backgroundColor: gate === g ? t.accent : t.card }}><Text style={{ color: gate === g ? t.onAccent : t.text }}>{g}</Text></Pressable>)}</View>
  {!permission ? <Notice loading body="Checking camera permission…" /> : !permission.granted ? <>
   <Notice title={permission.canAskAgain ? 'Camera access required' : 'Camera permission denied'} body={permission.canAskAgain ? 'Allow camera access to scan a demo QR, or use manual entry below.' : 'Enable camera permission in device settings, or use manual entry below.'} />
   {permission.canAskAgain ? button('Allow camera', () => { void requestPermission(); }) : null}
  </> : cameraOn ? <>
   <View style={{ height: 280, overflow: 'hidden', borderRadius: radius.card }}>
    <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={locked ? undefined : ({ data }) => scan(data)} />
   </View>
   {button('Stop camera', () => setCameraOn(false))}
  </> : button('Start camera', () => { setLocked(false); setCameraOn(true); })}
  <Text style={{ color: t.text }}>Manual demo credential</Text>
  <TextInput accessibilityLabel="Demo credential" value={manual} onChangeText={setManual} placeholder="GZ-…" placeholderTextColor={t.mute} style={{ color: t.text, backgroundColor: t.card, borderColor: t.line, borderWidth: 0.5, borderRadius: radius.input, padding: 14 }} />
  {button('Check demo code', () => scan(manual))}
  {result ? <Notice title="Scan result" body={result} /> : null}
  <Text style={{ color: t.text }}>Scan log</Text>
  {log.length ? log.map((entry, i) => <Text key={i} style={{ color: t.mute }}>{entry}</Text>) : <Text style={{ color: t.mute }}>No scans yet.</Text>}
 </View></Page>;
}
