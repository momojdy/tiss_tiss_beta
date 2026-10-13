import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Txt } from '../components/Txt';
import { detectBrand, digits, expiryValid, formatCardNumber, formatExpiry, luhn } from '../lib/card';
import { useApi } from '../store/ApiContext';
import { useDraft } from '../store/DraftContext';

const BRANDS = ['Visa', 'Mastercard', 'Discover', 'JCB', 'UnionPay'];

export const AddCardScreen = () => {
  const nav = useNavigation();
  const api = useApi();
  const { setDraft } = useDraft();
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const brand = detectBrand(number);
  const errs = {
    number: !luhn(number) || !brand ? 'Enter a valid Visa, Mastercard, Discover, JCB or UnionPay number' : '',
    name: name.trim().length < 2 ? 'Enter the name on the card' : '',
    expiry: !expiryValid(expiry) ? 'Enter a valid expiry date' : '',
    cvc: digits(cvc).length < 3 ? 'Enter the security code' : '',
  };
  const valid = !errs.number && !errs.name && !errs.expiry && !errs.cvc;

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      const m = await api.addCard({ number: digits(number), name: name.trim(), expiry, cvc: digits(cvc) });
      setDraft({ methodId: m.id });
      nav.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The card could not be added');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Add a card" footer={<Button title="Save card" onPress={save} loading={busy} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BRANDS.map(b => (
          <Chip key={b} label={b} on={brand === b} />
        ))}
      </View>
      <TextField label="Card number" value={formatCardNumber(number)} onChangeText={setNumber} keyboardType="number-pad" placeholder="0000 0000 0000 0000" textContentType="creditCardNumber" autoComplete="cc-number" maxLength={23} error={touched ? errs.number : undefined} />
      <TextField label="Name on card" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" autoComplete="name" error={touched ? errs.name : undefined} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextField label="Expiry" value={expiry} onChangeText={t => setExpiry(formatExpiry(t))} keyboardType="number-pad" placeholder="MM/YY" maxLength={5} autoComplete="cc-exp" error={touched ? errs.expiry : undefined} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Security code" value={cvc} onChangeText={t => setCvc(digits(t).slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} autoComplete="cc-csc" error={touched ? errs.cvc : undefined} />
        </View>
      </View>
      {error ? <Txt color="#D93A2B">{error}</Txt> : null}
      <Txt v="small" sub>
        Your card details are sent securely to the payment provider. Stayz stores only the card brand and the last four digits.
      </Txt>
    </Screen>
  );
};
