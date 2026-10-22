import React from 'react';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { addressTag } from '../checkout/AddressOptions';
import { Button } from '../shared/Button';
import { EmptyState } from '../shared/EmptyState';
import { PzText } from '../shared/PzText';
import { Sheet } from '../shared/Sheet';
import { LoadFailureState } from '../shared/StateViews';
import { SettingRow } from './SettingRow';

interface AddressManagerSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export const AddressManagerSheet = ({ visible, onClose, onAdd }: AddressManagerSheetProps) => {
  const data = usePrezoData();
  const { addresses } = data;
  return (
    <Sheet visible={visible} onClose={onClose} title="Addresses">
      <PzText size={13} tone="mu" style={{ marginBottom: 8 }}>
        Your default address comes from your main Wantiss account. Addresses added in Prezo are used
        here.
      </PzText>
      {addresses.status === 'error' ? (
        <LoadFailureState
          title="Addresses unavailable"
          message={addresses.message}
          onRetry={() => data.reload(['addresses'])}
        />
      ) : addresses.data.length ? (
        addresses.data.map((address, index) => (
          <SettingRow
            key={address.id}
            title={`${address.label}${addressTag(address) ? ` · ${addressTag(address)}` : ''}`}
            description={address.line}
            last={index === addresses.data.length - 1}
          />
        ))
      ) : (
        <EmptyState
          title="No addresses available"
          message="Add an address to use at checkout."
        />
      )}
      <Button label="Add address" variant="ghost" block onPress={onAdd} style={{ marginTop: 12 }} />
    </Sheet>
  );
};

