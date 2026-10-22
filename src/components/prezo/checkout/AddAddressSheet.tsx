import React, { useEffect, useState } from 'react';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoToast } from '../../../features/prezo/PrezoToastContext';
import type { PrezoAddress } from '../../../types/prezo';
import { Button } from '../shared/Button';
import { PzText } from '../shared/PzText';
import { Sheet } from '../shared/Sheet';
import { FieldError, FieldLabel, TextField } from '../shared/TextField';

interface AddAddressSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (address: PrezoAddress) => void;
}

export const AddAddressSheet = ({ visible, onClose, onSaved }: AddAddressSheetProps) => {
  const data = usePrezoData();
  const toast = usePrezoToast();
  const [label, setLabel] = useState('');
  const [line, setLine] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setLabel('');
      setLine('');
      setError(null);
      setBusy(false);
    }
  }, [visible]);

  const save = async () => {
    if (busy) return;
    const trimmedLabel = label.trim();
    const trimmedLine = line.trim();
    if (!trimmedLabel || !trimmedLine) {
      setError('Enter a label and an address.');
      return;
    }
    if (trimmedLine.length < 8) {
      setError('Enter the full address: street, city and postcode.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const address = await data.addAddress({ label: trimmedLabel, line: trimmedLine });
      onSaved?.(address);
      onClose();
      toast.show('Address saved');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Couldn’t save the address.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Add address">
      <PzText size={14} tone="mu">
        Enter the address you want to use for delivery.
      </PzText>
      <FieldLabel>Label</FieldLabel>
      <TextField
        value={label}
        onChangeText={setLabel}
        placeholder="Home, Work…"
        autoCorrect={false}
        accessibilityLabel="Label"
      />
      <FieldLabel>Address</FieldLabel>
      <TextField
        value={line}
        onChangeText={setLine}
        placeholder="Street, city, postcode"
        textContentType="fullStreetAddress"
        autoComplete="street-address"
        accessibilityLabel="Address"
      />
      <FieldError message={error} />
      <Button
        label={busy ? 'Saving…' : 'Save address'}
        block
        loading={busy}
        onPress={save}
        style={{ marginTop: 14 }}
      />
    </Sheet>
  );
};

