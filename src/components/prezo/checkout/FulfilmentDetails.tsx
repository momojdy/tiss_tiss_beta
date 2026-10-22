import React from 'react';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import type { Campaign, FulfilmentMethod } from '../../../types/prezo';
import { Box } from '../shared/Box';
import { Button } from '../shared/Button';
import { EmptyState } from '../shared/EmptyState';
import { PzText } from '../shared/PzText';
import { OptionPill, OptionRow } from '../shared/Selectors';
import { LoadFailureState } from '../shared/StateViews';
import { AddressOptions } from './AddressOptions';

interface FulfilmentDetailsProps {
  campaign: Campaign;
  fulfilment: FulfilmentMethod;
  addressId: string | null;
  onSelectAddress: (id: string) => void;
  slotId: string | null;
  onSelectSlot: (id: string) => void;
  onAddAddress: () => void;
}

export const FulfilmentDetails = ({
  campaign,
  fulfilment,
  addressId,
  onSelectAddress,
  slotId,
  onSelectSlot,
  onAddAddress,
}: FulfilmentDetailsProps) => {
  const data = usePrezoData();

  if (fulfilment === 'delivery') {
    if (data.addresses.status === 'error') {
      return (
        <LoadFailureState
          title="Addresses unavailable"
          message={data.addresses.message}
          onRetry={() => data.reload(['addresses'])}
        />
      );
    }
    if (!data.addresses.data.length) {
      return (
        <EmptyState title="No addresses available" message="Add one to deliver this order.">
          <Button label="Add address" onPress={onAddAddress} />
        </EmptyState>
      );
    }
    return (
      <>
        <AddressOptions
          addresses={data.addresses.data}
          selectedId={addressId}
          onSelect={onSelectAddress}
        />
        <Button label="+ Add another address" variant="text" small onPress={onAddAddress} />
      </>
    );
  }

  if (fulfilment === 'pickup') {
    return (
      <Box>
        <PzText size={13} tone="mu">
          {campaign.pickupInstructions
            ? `Pickup: ${campaign.pickupInstructions}`
            : 'Pickup details haven’t been provided for this campaign.'}
        </PzText>
      </Box>
    );
  }

  if (fulfilment === 'digital') {
    const fallback =
      campaign.mode === 'preorder'
        ? 'Download link arrives by email and in My Prezo once the order is fulfilled.'
        : 'Download link arrives by email and in My Prezo once the campaign succeeds.';
    return (
      <Box>
        <PzText size={13} tone="mu">
          {campaign.digitalDeliveryNote ?? fallback}
        </PzText>
      </Box>
    );
  }

  if (!campaign.serviceSlots.length) {
    return <EmptyState title="No time slots available" message="This campaign has no service times yet." />;
  }
  return (
    <OptionRow>
      {campaign.serviceSlots.map((slot) => (
        <OptionPill
          key={slot.id}
          label={slot.label}
          selected={slotId === slot.id}
          onPress={() => onSelectSlot(slot.id)}
        />
      ))}
    </OptionRow>
  );
};

