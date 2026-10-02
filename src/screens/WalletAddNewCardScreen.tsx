import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const C = {
  olive: '#1A2517',
  oliveDk: '#12190F',
  sage: '#ACC8A2',
  sageTint: '#DCE8D2',
  ink: '#1A2517',
  muted: '#5C6B57',
  line: '#E4EAE1',
  bg: '#F5F8F3',
  white: '#FFFFFF',
  danger: '#E5484D',
  ok: '#3F6B37',
};

type Props = { onBack?: () => void };

type Field = 'number' | 'expiry' | 'name' | 'cvc';

const onlyDigits = (value: string) => value.replace(/\D/g, '');
const luhn = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length < 12) return false;
  let sum = 0;
  let parity = digits.length % 2;
  for (let i = 0; i < digits.length; i += 1) {
    let n = Number(digits[i]);
    if (i % 2 === parity) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
};

const brandFor = (digits: string) => {
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD';
  if (/^3[47]/.test(digits)) return 'AMEX';
  return 'CARD';
};

const formatNumber = (value: string) => {
  const digits = onlyDigits(value).slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (value: string) => {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const formatCvc = (value: string) => onlyDigits(value).slice(0, 4);

function DotNumber({ digits, amex }: { digits: string; amex: boolean }) {
  const lengths = amex ? [4, 6, 5] : [4, 4, 4, 4];
  let cursor = 0;
  return (
    <View style={styles.dotNumber}>
      {lengths.map((length, index) => {
        const group = digits.slice(cursor, cursor + length);
        cursor += length;
        return (
          <View key={index} style={styles.dotGroup}>
            {Array.from({ length }).map((_, i) => (
              <View key={i} style={[styles.dot, i < group.length && styles.dotFilled]} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function CardFront({
  number,
  expiry,
  name,
  brand,
  active,
}: {
  number: string;
  expiry: string;
  name: string;
  brand: string;
  active: Field | null;
}) {
  const digits = onlyDigits(number);
  return (
    <View style={[styles.cardFace, styles.cardFront]}>
      <View style={styles.cardOrbOne} />
      <View style={styles.cardOrbTwo} />
      <View style={styles.cardTop}>
        <Text style={styles.cardBrand}>wantiss</Text>
        <View style={styles.contactless}><MaterialIcons name="contactless" size={23} color={C.white} /></View>
      </View>
      <View style={styles.chip}>
        <View style={styles.chipLineA} /><View style={styles.chipLineB} /><View style={styles.chipLineC} />
      </View>
      <View style={styles.cardNumberArea}>
        <DotNumber digits={digits} amex={brand === 'AMEX'} />
        <Text style={[styles.cardValue, active === 'number' && styles.cardActive]}>
          {number ? number.replace(/\d/g, '•') : '•••• •••• •••• ••••'}
        </Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.cardNameBlock}>
          <Text style={styles.cardCaption}>CARDHOLDER</Text>
          <Text style={styles.cardName}>{name || 'YOUR NAME'}</Text>
        </View>
        <View>
          <Text style={styles.cardCaption}>EXPIRES</Text>
          <Text style={[styles.cardExpiry, active === 'expiry' && styles.cardActive]}>{expiry || '••/••'}</Text>
        </View>
      </View>
      <Text style={styles.cardNetwork}>{brand}</Text>
    </View>
  );
}

function CardBack({ cvc, brand, active }: { cvc: string; brand: string; active: boolean }) {
  return (
    <View style={[styles.cardFace, styles.cardBack]}>
      <Text style={styles.backTopLabel}>wantiss</Text>
      <View style={styles.stripe} />
      <View style={styles.signatureRow}>
        <View style={styles.signature}><Text style={styles.signatureText}>AUTHORIZED SIGNATURE</Text></View>
        <View style={[styles.cvcBox, active && styles.cvcBoxActive]}><Text style={styles.cvcText}>{cvc || '•••'}</Text></View>
      </View>
      <Text style={styles.backLegal}>This card is issued for use with Wantiss. If found, please return to the cardholder.</Text>
      <Text style={styles.backNetwork}>{brand}</Text>
    </View>
  );
}

export default function WalletAddNewCardScreen({ onBack }: Props) {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [name, setName] = useState('');
  const [cvc, setCvc] = useState('');
  const [focused, setFocused] = useState<Field | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const numberRef = useRef<TextInput>(null);
  const expiryRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const cvcRef = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const digits = onlyDigits(number);
  const brand = useMemo(() => brandFor(digits), [digits]);
  const expiryValid = useMemo(() => {
    const d = onlyDigits(expiry);
    if (d.length !== 4) return false;
    const month = Number(d.slice(0, 2));
    const year = 2000 + Number(d.slice(2));
    if (month < 1 || month > 12) return false;
    const now = new Date();
    return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
  }, [expiry]);
  const numberComplete = digits.length >= 12 && digits.length <= 19 && luhn(digits);
  const cvcComplete = cvc.length === (brand === 'AMEX' ? 4 : 3);
  const nameComplete = name.trim().length >= 2;
  const valid = numberComplete && expiryValid && cvcComplete && nameComplete;

  const setField = (field: Field) => {
    setFocused(field);
    const target = field === 'number' ? 0 : field === 'expiry' ? 0 : field === 'name' ? 0 : 180;
    Animated.timing(flip, {
      toValue: target,
      duration: reduceMotion ? 0 : 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const focusNext = (field: Field) => {
    if (field === 'number') expiryRef.current?.focus();
    else if (field === 'expiry') nameRef.current?.focus();
    else if (field === 'name') cvcRef.current?.focus();
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
    onPanResponderMove: (_, g) => {
      if (reduceMotion) return;
      const start = flip.__getValue();
      const next = Math.max(0, Math.min(180, start + g.dx * 0.65));
      flip.setValue(next);
    },
    onPanResponderRelease: (_, g) => {
      const current = flip.__getValue();
      const target = current > 90 || g.dx < -35 ? 180 : 0;
      Animated.spring(flip, { toValue: target, useNativeDriver: true, damping: 18, stiffness: 180, mass: 0.7 }).start(() => {
        if (target === 180) cvcRef.current?.focus();
        else cvcRef.current?.blur();
      });
      setFocused(target === 180 ? 'cvc' : null);
    },
  }), [reduceMotion, flip]);

  const frontRotate = flip.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  const invalid = submitted && !valid;

  const submit = () => {
    setSubmitted(true);
    if (valid) return;
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Add New Card</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Add a debit or credit card for faster payments.</Text>

        <Animated.View style={[styles.cardScene, { transform: [{ translateX: shake }] }]} {...panResponder.panHandlers}>
          <Animated.View style={[styles.cardLayer, { transform: [{ perspective: 1100 }, { rotateY: frontRotate }] }]}>
            <CardFront number={number} expiry={expiry} name={name} brand={brand} active={focused} />
          </Animated.View>
          <Animated.View style={[styles.cardLayer, { transform: [{ perspective: 1100 }, { rotateY: backRotate }] }]}>
            <CardBack cvc={cvc} brand={brand} active={focused === 'cvc'} />
          </Animated.View>
        </Animated.View>

        <Text style={styles.helper}>Swipe the card to view the security code.</Text>

        <View style={styles.form}>
          <FieldLabel title="Card number" error={submitted && !numberComplete} />
          <View style={[styles.inputWrap, focused === 'number' && styles.inputFocus, submitted && !numberComplete && styles.inputError]}>
            <TextInput
              ref={numberRef}
              value={formatNumber(number)}
              onChangeText={v => setNumber(onlyDigits(v))}
              onFocus={() => setField('number')}
              onSubmitEditing={() => focusNext('number')}
              keyboardType="number-pad"
              returnKeyType="next"
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#9AA595"
              maxLength={23}
              style={styles.input}
            />
            <Text style={styles.brandMini}>{brand}</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <FieldLabel title="Expiry date" error={submitted && !expiryValid} />
              <View style={[styles.inputWrap, focused === 'expiry' && styles.inputFocus, submitted && !expiryValid && styles.inputError]}>
                <TextInput
                  ref={expiryRef}
                  value={formatExpiry(expiry)}
                  onChangeText={v => setExpiry(onlyDigits(v))}
                  onFocus={() => setField('expiry')}
                  onSubmitEditing={() => focusNext('expiry')}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  placeholder="MM/YY"
                  placeholderTextColor="#9AA595"
                  maxLength={5}
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.half}>
              <FieldLabel title="CVV" error={submitted && !cvcComplete} />
              <View style={[styles.inputWrap, focused === 'cvc' && styles.inputFocus, submitted && !cvcComplete && styles.inputError]}>
                <TextInput
                  ref={cvcRef}
                  value={cvc}
                  onChangeText={v => setCvc(formatCvc(v))}
                  onFocus={() => setField('cvc')}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  placeholder={brand === 'AMEX' ? '1234' : '123'}
                  placeholderTextColor="#9AA595"
                  maxLength={4}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <FieldLabel title="Cardholder name" error={submitted && !nameComplete} />
          <View style={[styles.inputWrap, focused === 'name' && styles.inputFocus, submitted && !nameComplete && styles.inputError]}>
            <TextInput
              ref={nameRef}
              value={name}
              onChangeText={v => setName(v.toUpperCase())}
              onFocus={() => setField('name')}
              onSubmitEditing={() => focusNext('name')}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
              placeholder="YOUR NAME"
              placeholderTextColor="#9AA595"
              maxLength={26}
              style={styles.input}
            />
          </View>

          {invalid && <Text style={styles.errorText}>Please complete all fields correctly.</Text>}

          <Pressable
            onPress={submit}
            style={({ pressed }) => [styles.saveButton, !valid && styles.saveButtonDisabled, pressed && styles.savePressed]}
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

function FieldLabel({ title, error }: { title: string; error?: boolean }) {
  return <Text style={[styles.label, error && styles.labelError]}>{title}</Text>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  header: {
    height: 100, paddingHorizontal: 10, paddingBottom: 4, flexDirection: 'row',
    alignItems: 'flex-end', backgroundColor: C.bg,
  },
  headerButton: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: C.sageTint,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 12, paddingBottom: 1, color: C.ink, fontSize: 19, lineHeight: 23,
    fontFamily: 'Manrope_800ExtraBold',
  },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 42 },
  subtitle: {
    color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center',
    fontFamily: 'Inter_400Regular', marginBottom: 20,
  },
  cardScene: {
    width: '100%', maxWidth: 348, aspectRatio: 1.586, alignSelf: 'center',
    marginBottom: 13,
  },
  cardLayer: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },
  cardFace: {
    flex: 1, borderRadius: 22, overflow: 'hidden', padding: 23,
    shadowColor: '#12190F', shadowOpacity: 0.22, shadowRadius: 18,
    shadowOffset: { width: 0, height: 11 }, elevation: 8,
  },
  cardFront: { backgroundColor: C.olive },
  cardBack: { backgroundColor: C.oliveDk },
  cardOrbOne: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    right: -75, top: -85, backgroundColor: '#31442B', opacity: 0.72,
  },
  cardOrbTwo: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    left: -55, bottom: -50, backgroundColor: '#263621', opacity: 0.9,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: C.white, fontSize: 18, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.5 },
  contactless: { opacity: 0.85 },
  chip: {
    width: 48, height: 36, borderRadius: 7, backgroundColor: '#D8C98D',
    marginTop: 18, padding: 5, overflow: 'hidden',
  },
  chipLineA: { position: 'absolute', left: 16, top: 0, bottom: 0, width: 1, backgroundColor: '#9E935F' },
  chipLineB: { position: 'absolute', left: 29, top: 0, bottom: 0, width: 1, backgroundColor: '#9E935F' },
  chipLineC: { position: 'absolute', left: 0, right: 0, top: 17, height: 1, backgroundColor: '#9E935F' },
  cardNumberArea: { marginTop: 20 },
  dotNumber: { flexDirection: 'row', gap: 9, marginBottom: 7 },
  dotGroup: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#61745A', opacity: 0.8 },
  dotFilled: { backgroundColor: C.white, opacity: 1 },
  cardValue: { color: C.white, fontSize: 17, letterSpacing: 2.2, fontFamily: 'Inter_600SemiBold' },
  cardActive: { textShadowColor: '#FFFFFF', textShadowRadius: 7 },
  cardBottom: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardCaption: { color: '#A9B7A2', fontSize: 8, letterSpacing: 1.1, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  cardName: { color: C.white, fontSize: 11, letterSpacing: 1.1, fontFamily: 'Inter_600SemiBold', maxWidth: 190 },
  cardExpiry: { color: C.white, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  cardNetwork: { position: 'absolute', right: 23, bottom: 18, color: C.white, fontSize: 11, fontFamily: 'Manrope_800ExtraBold' },
  backTopLabel: { color: C.white, fontSize: 16, fontFamily: 'Manrope_800ExtraBold', marginBottom: 15 },
  stripe: { height: 47, backgroundColor: '#080C07', marginHorizontal: -23 },
  signatureRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 10 },
  signature: { flex: 1, height: 35, backgroundColor: '#E8EAE5', justifyContent: 'flex-end', padding: 5 },
  signatureText: { fontSize: 6, color: '#687265', letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold' },
  cvcBox: { width: 50, height: 35, borderRadius: 4, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  cvcBoxActive: { borderWidth: 2, borderColor: C.sage },
  cvcText: { color: C.ink, fontSize: 13, fontFamily: 'Inter_700Bold' },
  backLegal: { color: '#9AA595', fontSize: 8, lineHeight: 12, marginTop: 19, maxWidth: 270, fontFamily: 'Inter_400Regular' },
  backNetwork: { position: 'absolute', right: 23, bottom: 18, color: C.white, fontSize: 11, fontFamily: 'Manrope_800ExtraBold' },
  helper: { textAlign: 'center', color: '#84917F', fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 22 },
  form: { width: '100%', maxWidth: 430, alignSelf: 'center' },
  label: { color: C.ink, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 7, marginTop: 3 },
  labelError: { color: C.danger },
  inputWrap: {
    minHeight: 52, borderWidth: 1, borderColor: C.line, borderRadius: 14,
    backgroundColor: C.white, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 15, marginBottom: 14,
  },
  inputFocus: { borderColor: C.sage, shadowColor: C.sage, shadowOpacity: 0.2, shadowRadius: 7, elevation: 2 },
  inputError: { borderColor: C.danger },
  input: {
    flex: 1, color: C.ink, fontSize: 16, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  brandMini: { color: C.muted, fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.4 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  errorText: { color: C.danger, fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: -3, marginBottom: 13 },
  saveButton: {
    minHeight: 54, borderRadius: 17, backgroundColor: C.olive, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 3,
  },
  saveButtonDisabled: { opacity: 0.82 },
  savePressed: { transform: [{ scale: 0.985 }] },
  saveText: { color: C.white, fontSize: 15, fontFamily: 'Inter_700Bold' },
  secureNote: {
    color: '#84917F', fontSize: 10.5, lineHeight: 15, textAlign: 'center',
    fontFamily: 'Inter_400Regular', marginTop: 12, paddingHorizontal: 22,
  },
});
