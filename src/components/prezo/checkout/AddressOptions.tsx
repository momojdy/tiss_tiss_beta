import React from 'react';
import type { PrezoAddress } from '../../../types/prezo';
import { PayOption } from '../shared/Selectors';

export const addressTag = (address: PrezoAddress): string | null => {
  if (address.source === 'prezo') return 'Used in Prezo';
  if (address.isDefault) return 'Default from Wantiss';
  return null;
};

interface AddressOptionsProps {
  addresses: PrezoAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const AddressOptions = ({ addresses, selectedId, onSelect }: AddressOptionsProps) => (
  <>
    {addresses.map((address) => (
      <PayOption
        key={address.id}
        title={address.label}
        trailing={addressTag(address) ? ` · ${addressTag(address)}` : null}
        detail={address.line}
        selected={selectedId === address.id}
        onPress={() => onSelect(address.id)}
      />
    ))}
  </>
);

