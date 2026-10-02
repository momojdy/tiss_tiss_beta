import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, KeyboardAvoidingView, PanResponder,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useFonts, Manrope_500Medium, Manrope_600SemiBold,
  Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

const C = {
  olive: '#1A2517', oliveDk: '#12190F', sage: '#ACC8A2',
  sageTint: '#DCE8D2', ink: '#1A2517', muted: '#5C6B57',
  line: '#E4EAE1', bg: '#F5F8F3', white: '#FFFFFF',
  danger: '#E5484D', ok: '#3F6B37',
};
type Props = { onBack?: () => void };
type Field = 'number' | 'expiry' | 'name' | 'cvc';

const digitsOnly = (v: string) => v.replace(/\D/g, '');
const luhn = (v: string) => {
  const d = digitsOnly(v);
  if (d.length < 12) return false;
  let sum = 0;
  const parity = d.length % 2;
  for (let i = 0; i < d.length; i += 1) {
    let n = Number(d[i]);
    if (i % 2 === parity) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
};
const getBrand = (v: string) => {
  const d = digitsOnly(v);
  if (/^4/.test(d)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'MASTERCARD';
  if (/^3[47]/.test(d)) return 'AMEX';
  if (/^6(?:011|5)/.test(d)) return 'DISCOVER';
  return 'CARD';
};
const formatNumber = (v: string) => digitsOnly(v).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (v: string) => {
  const d = digitsOnly(v).slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
};

function CardDots({ value, amex }: { value: string; amex: boolean }) {
  const lengths = amex ? [4, 6, 5] : [4, 4, 4, 4];
  let cursor = 0;
  return (
    <View style={styles.dots}>
      {lengths.map((len, gi) => {
        const group = value.slice(cursor, cursor + len);
        cursor += len;
        return (
          <View key={gi} style={styles.dotGroup}>
            {Array.from({ length: len }).map((_, i) => (
              <View key={i} style={[styles.dot, i < group.length && styles.dotFilled]} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function CardFront({ number, expiry, name, brand, active }: {
  number: string; expiry: string; name: string; brand: string; active: Field | null;
}) {
  return (
    <View style={[styles.face, styles.front]}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.top}>
        <Text style={styles.wantiss}>wantiss</Text>
        <MaterialIcons name="contactless" size={23} color={C.white} />
      </View>
      <View style={styles.chip}>
        <View style={styles.chipV1} /><View style={styles.chipV2} /><View style={styles.chipH} />
      </View>
      <View style={styles.numberArea}>
        <CardDots value={digitsOnly(number)} amex={brand === 'AMEX'} />
        <Text style={[styles.numberText, active === 'number' && styles.activeText]}>
          {number ? formatNumber(number).replace(/\d/g, '•') : '•••• •••• •••• ••••'}
        </Text>
      </View>
      <View style={styles.bottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.caption}>CARDHOLDER</Text>
          <Text numberOfLines={1} style={styles.nameText}>{name || 'YOUR NAME'}</Text>
        </View>
        <View>
          <Text style={styles.caption}>EXPIRES</Text>
          <Text style={[styles.expiryText, active === 'expiry' && styles.activeText]}>{expiry || '••/••'}</Text>
        </View>
      </View>
      <Text style={styles.network}>{brand}</Text>
    </View>
  );
}

function CardBack({ cvc, brand, active }: { cvc: string; brand: string; active: boolean }) {
  return (
    <View style={[styles.face, styles.back]}>
      <Text style={styles.backBrand}>wantiss</Text>
      <View style={styles.stripe} />
      <View style={styles.signatureRow}>
        <View style={styles.signature}><Text style={styles.signatureLabel}>AUTHORIZED SIGNATURE</Text></View>
        <View style={[styles.cvcBox, active && styles.cvcActive]}>
          <Text style={styles.cvcText}>{cvc || '•••'}</Text>
        </View>
      </View>
      <Text style={styles.backLegal}>This card is issued for use with Wantiss. If found, please return to the cardholder.</Text>
      <Text style={styles.network}>{brand}</Text>
    </View>
  );
}

export default function WalletAddNewCardScreen({ onBack }: Props) {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  });
  const { width: windowWidth } = useWindowDimensions();
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [name, setName] = useState('');
  const [cvc, setCvc] = useState('');
  const [focused, setFocused] = useState<Field | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const numberRef = useRef<TextInput>(null);
  const expiryRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const cvcRef = useRef<TextInput>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const brand = useMemo(() => getBrand(number), [number]);
  const numberValid = useMemo(() => {
    const d = digitsOnly(number);
    return d.length >= 12 && d.length <= 19 && luhn(d);
  }, [number]);
  const expiryValid = useMemo(() => {
    const d = digitsOnly(expiry);
    if (d.length !== 4) return false;
    const month = Number(d.slice(0, 2));
    if (month < 1 || month > 12) return false;
    const year = 2000 + Number(d.slice(2));
    const now = new Date();
    return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
  }, [expiry]);
  const cvcValid = cvc.length === (brand === 'AMEX' ? 4 : 3);
  const nameValid = name.trim().length >= 2;
  const valid = numberValid && expiryValid && cvcValid && nameValid;

  const flipTo = (to: number) => {
    Animated.timing(flip, {
      toValue: to, duration: reduceMotion ? 0 : 360,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
    }).start();
  };
  const focusField = (field: Field) => {
    setFocused(field);
    flipTo(field === 'cvc' ? 180 : 0);
  };
  const next = (field: Field) => {
    if (field === 'number') expiryRef.current?.focus();
    else if (field === 'expiry') nameRef.current?.focus();
    else if (field === 'name') cvcRef.current?.focus();
  };

  const dragStart = useRef(0);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => {
      flip.stopAnimation(value => { dragStart.current = Number(value); });
    },
    onPanResponderMove: (_, g) => {
      if (!reduceMotion) {
        const next = Math.max(0, Math.min(180, dragStart.current - g.dx * 0.9));
        flip.setValue(next);
      }
    },
    onPanResponderRelease: (_, g) => {
      const current = dragStart.current - g.dx * 0.9;
      const target = current >= 90 || g.dx < -35 ? 180 : 0;
      Animated.spring(flip, {
        toValue: target, useNativeDriver: true, damping: 18, stiffness: 180, mass: 0.7,
      }).start();
      setFocused(target === 180 ? 'cvc' : null);
      if (target === 180) cvcRef.current?.focus();
      else cvcRef.current?.blur();
    },
  }), [reduceMotion, flip]);

  const submit = () => {
    setSubmitted(true);
    if (valid) {
      // Stripe SetupIntent wiring is intentionally left out until the Stripe RN
      // dependency and Wantiss setup-intent Edge Function are present.
      return;
    }
    Animated.sequence([
      Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 4, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  if (!fontsLoaded) return null;
  const frontRotate = flip.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const invalid = submitted && !valid;
  // Keep a stable 348pt design canvas and uniformly scale it to the available
  // width. This makes every internal card dimension scale together instead of
  // mixing a responsive outer card with fixed inner typography/padding.
  const cardWidth = Math.min(Math.max(windowWidth - 40, 260), 348);
  const cardHeight = cardWidth / 1.586;
  const cardScale = cardWidth / 348;
  const cardBaseHeight = 348 / 1.586;

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Add New Card</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.subtitle}>Add a debit or credit card for faster payments.</Text>

        <Animated.View
          style={[styles.cardScene, { width: cardWidth, height: cardHeight, transform: [{ translateX: shake }] }]}
          {...pan.panHandlers}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cardLayer,
              {
                width: 348,
                height: cardBaseHeight,
                left: (cardWidth - 348) / 2,
                top: (cardHeight - cardBaseHeight) / 2,
                transform: [{ perspective: 1100 }, { scale: cardScale }, { rotateY: frontRotate }],
              },
            ]}
          >
            <CardFront number={number} expiry={expiry} name={name} brand={brand} active={focused} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cardLayer,
              {
                width: 348,
                height: cardBaseHeight,
                left: (cardWidth - 348) / 2,
                top: (cardHeight - cardBaseHeight) / 2,
                transform: [{ perspective: 1100 }, { scale: cardScale }, { rotateY: backRotate }],
              },
            ]}
          >
            <CardBack cvc={cvc} brand={brand} active={focused === 'cvc'} />
          </Animated.View>
        </Animated.View>

        <Text style={styles.helper}>Swipe the card to view the security code.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Card number</Text>
          <View style={[styles.inputWrap, focused === 'number' && styles.inputFocus, submitted && !numberValid && styles.inputError]}>
            <TextInput
              ref={numberRef} value={formatNumber(number)}
              onChangeText={v => setNumber(digitsOnly(v))}
              onFocus={() => focusField('number')} onSubmitEditing={() => next('number')}
              keyboardType="number-pad" returnKeyType="next"
              placeholder="1234 5678 9012 3456" placeholderTextColor="#9AA595"
              maxLength={23} style={styles.input}
            />
            <Text style={styles.brandMini}>{brand}</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Expiry date</Text>
              <View style={[styles.inputWrap, focused === 'expiry' && styles.inputFocus, submitted && !expiryValid && styles.inputError]}>
                <TextInput
                  ref={expiryRef} value={formatExpiry(expiry)}
                  onChangeText={v => setExpiry(digitsOnly(v))}
                  onFocus={() => focusField('expiry')} onSubmitEditing={() => next('expiry')}
                  keyboardType="number-pad" returnKeyType="next"
                  placeholder="MM/YY" placeholderTextColor="#9AA595"
                  maxLength={5} style={styles.input}
                />
              </View>
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>CVV</Text>
              <View style={[styles.inputWrap, focused === 'cvc' && styles.inputFocus, submitted && !cvcValid && styles.inputError]}>
                <TextInput
                  ref={cvcRef} value={cvc}
                  onChangeText={v => setCvc(digitsOnly(v).slice(0, 4))}
                  onFocus={() => focusField('cvc')}
                  keyboardType="number-pad" returnKeyType="done"
                  placeholder={brand === 'AMEX' ? '1234' : '123'}
                  placeholderTextColor="#9AA595" maxLength={4} secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <Text style={styles.label}>Cardholder name</Text>
          <View style={[styles.inputWrap, focused === 'name' && styles.inputFocus, submitted && !nameValid && styles.inputError]}>
            <TextInput
              ref={nameRef} value={name}
              onChangeText={v => setName(v.toUpperCase())}
              onFocus={() => focusField('name')} onSubmitEditing={() => next('name')}
              autoCapitalize="characters" autoCorrect={false} returnKeyType="next"
              placeholder="YOUR NAME" placeholderTextColor="#9AA595" maxLength={26}
              style={styles.input}
            />
          </View>

          {invalid && <Text style={styles.errorText}>Please complete all fields correctly.</Text>}

          <Pressable
            onPress={submit}
            style={({ pressed }) => [styles.saveButton, pressed && styles.savePressed]}
          >
            <Text style={styles.saveText}>Save Card</Text>
            <MaterialIcons name="arrow-forward" size={20} color={C.white} />
          </Pressable>

          <Text style={styles.secureNote}>
            Your card details are protected and used only to set up this payment method.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: {
    minHeight: 100, paddingHorizontal: 22, paddingBottom: 4,
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: C.bg,
  },
  headerButton: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: C.sageTint,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 12, paddingBottom: 1, color: C.ink, fontSize: 19, lineHeight: 23,
    fontFamily: 'Manrope_800ExtraBold',
  },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 42 },
  subtitle: {
    color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center',
    fontFamily: 'Manrope_500Medium', marginBottom: 20,
  },
  cardScene: {
    alignSelf: 'center', marginBottom: 13, overflow: 'visible',
  },
  cardLayer: {
    position: 'absolute', overflow: 'visible', backfaceVisibility: 'hidden',
  },
  face: {
    flex: 1, borderRadius: 22, overflow: 'hidden', padding: 23,
    shadowColor: '#12190F', shadowOpacity: 0.22, shadowRadius: 18,
    shadowOffset: { width: 0, height: 11 }, elevation: 8, borderWidth: 0,
  },
  front: { backgroundColor: C.olive },
  back: { backgroundColor: C.oliveDk },
  orbOne: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    right: -75, top: -85, backgroundColor: '#31442B', opacity: 0.72,
  },
  orbTwo: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    left: -55, bottom: -50, backgroundColor: '#263621', opacity: 0.9,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wantiss: { color: C.white, fontSize: 18, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.5 },
  chip: { width: 48, height: 36, borderRadius: 7, backgroundColor: '#D8C98D', marginTop: 18, overflow: 'hidden' },
  chipV1: { position: 'absolute', left: 16, top: 0, bottom: 0, width: 1, backgroundColor: '#9E935F' },
  chipV2: { position: 'absolute', left: 29, top: 0, bottom: 0, width: 1, backgroundColor: '#9E935F' },
  chipH: { position: 'absolute', left: 0, right: 0, top: 17, height: 1, backgroundColor: '#9E935F' },
  numberArea: { marginTop: 20 },
  dots: { flexDirection: 'row', gap: 9, marginBottom: 7 },
  dotGroup: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#61745A', opacity: 0.8 },
  dotFilled: { backgroundColor: C.white, opacity: 1 },
  numberText: { color: C.white, fontSize: 17, letterSpacing: 2.2, fontFamily: 'Manrope_600SemiBold' },
  activeText: { textShadowColor: '#FFFFFF', textShadowRadius: 7 },
  bottom: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  caption: { color: '#A9B7A2', fontSize: 8, letterSpacing: 1.1, fontFamily: 'Manrope_600SemiBold', marginBottom: 4 },
  nameText: { color: C.white, fontSize: 11, letterSpacing: 1.1, fontFamily: 'Manrope_600SemiBold', maxWidth: 190 },
  expiryText: { color: C.white, fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  network: { position: 'absolute', right: 23, bottom: 18, color: C.white, fontSize: 11, fontFamily: 'Manrope_800ExtraBold' },
  backBrand: { color: C.white, fontSize: 16, fontFamily: 'Manrope_800ExtraBold', marginBottom: 15 },
  stripe: { height: 47, backgroundColor: '#080C07', marginHorizontal: -23 },
  signatureRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 10 },
  signature: { flex: 1, height: 35, backgroundColor: '#E8EAE5', justifyContent: 'flex-end', padding: 5 },
  signatureLabel: { fontSize: 6, color: '#687265', letterSpacing: 0.7, fontFamily: 'Manrope_600SemiBold' },
  cvcBox: { width: 50, height: 35, borderRadius: 4, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  cvcActive: { borderWidth: 0, borderColor: 'transparent' },
  cvcText: { color: C.ink, fontSize: 13, fontFamily: 'Manrope_700Bold' },
  backLegal: { color: '#9AA595', fontSize: 8, lineHeight: 12, marginTop: 19, maxWidth: 270, fontFamily: 'Manrope_500Medium' },
  helper: { textAlign: 'center', color: '#84917F', fontSize: 11, fontFamily: 'Manrope_500Medium', marginBottom: 22 },
  form: { width: '100%', maxWidth: 430, alignSelf: 'center' },
  label: { color: C.ink, fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginBottom: 7, marginTop: 3 },
  inputWrap: {
    minHeight: 52, borderWidth: 0, borderColor: 'transparent', borderRadius: 14,
    backgroundColor: C.white, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 15, marginBottom: 14,
  },
  inputFocus: { borderWidth: 0, borderColor: 'transparent', shadowColor: C.sage, shadowOpacity: 0.2, shadowRadius: 7, elevation: 2 },
  inputError: { borderColor: C.danger, backgroundColor: '#FBE2E3' },
  input: {
    flex: 1, color: C.ink, fontSize: 16, fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.3, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  brandMini: { color: C.muted, fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.4 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  errorText: { color: C.danger, fontSize: 13, fontFamily: 'Manrope_600SemiBold', marginTop: -3, marginBottom: 13 },
  saveButton: {
    minHeight: 54, borderRadius: 17, backgroundColor: C.olive,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, marginTop: 3,
  },
  savePressed: { transform: [{ scale: 0.985 }] },
  saveText: { color: C.white, fontSize: 15, fontFamily: 'Manrope_700Bold' },
  secureNote: {
    color: '#84917F', fontSize: 10.5, lineHeight: 15, textAlign: 'center',
    fontFamily: 'Manrope_500Medium', marginTop: 12, paddingHorizontal: 22,
  },
});
