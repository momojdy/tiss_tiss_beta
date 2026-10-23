import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { usePrezoToast } from '../../features/prezo/PrezoToastContext';
import { AddAddressSheet } from '../../components/prezo/checkout/AddAddressSheet';
import { FulfilmentDetails } from '../../components/prezo/checkout/FulfilmentDetails';
import { PaymentMethodList } from '../../components/prezo/checkout/PaymentMethodList';
import { Button } from '../../components/prezo/shared/Button';
import { DetailRow } from '../../components/prezo/shared/DetailRow';
import { Box } from '../../components/prezo/shared/Box';
import { PageTitle, SubHeading } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { Checkbox, FilterPill, OptionPill, OptionRow } from '../../components/prezo/shared/Selectors';
import { FieldError } from '../../components/prezo/shared/TextField';
import {
  canJoinCampaign,
  fulfilmentLabels,
  getDeliveryFee,
  metricNouns,
} from '../../lib/prezo/campaignRules';
import { formatMetricValue } from '../../lib/prezo/campaignText';
import { useLayoutMode } from '../../lib/prezo/useLayoutMode';
import type { FulfilmentMethod } from '../../types/prezo';
import { PrezoCampaignDetailsScreen } from './PrezoCampaignDetailsScreen';

interface PrezoCheckoutScreenProps {
  campaignId: string;
  waitlistEntryId: string | null;
}

export const PrezoCheckoutScreen = ({ campaignId, waitlistEntryId }: PrezoCheckoutScreenProps) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const toast = usePrezoToast();
  const { isWide } = useLayoutMode();
  const campaign = data.getCampaign(campaignId);
  const entry = waitlistEntryId ? data.getWaitlistEntry(waitlistEntryId) : null;

  const [option, setOption] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [fulfilment, setFulfilment] = useState<FulfilmentMethod | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaign) return;
    setOption((current) => current ?? campaign.optionValues[0] ?? null);
    setFulfilment((current) => current ?? campaign.fulfilmentMethods[0] ?? null);
  }, [campaign]);

  useEffect(() => {
    if (addressId) return;
    const addresses = data.addresses.data;
    const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (preferred) setAddressId(preferred.id);
  }, [data.addresses.data, addressId]);

  if (!campaign || !canJoinCampaign(campaign, entry, fmt.now)) {
    return <PrezoCampaignDetailsScreen id={campaignId} />;
  }

  const activeFulfilment = fulfilment ?? campaign.fulfilmentMethods[0] ?? null;
  const fee = activeFulfilment ? getDeliveryFee(campaign, activeFulfilment) : 0;
  const total = campaign.price * quantity + fee;
  const overLimit = quantity > campaign.maxPerOrder;
  const seller = data.getSeller(campaign.sellerId);
  const isGroup = campaign.mode === 'group';

  const pay = async () => {
    if (busy || !activeFulfilment) return;
    if (!canJoinCampaign(campaign, entry, Date.now())) {
      toast.show('This campaign isn’t accepting participation.');
      return;
    }
    if (overLimit) {
      toast.show('Quantity is above the limit.');
      return;
    }
    if (activeFulfilment === 'delivery' && !addressId) {
      toast.show('Add a delivery address first.');
      return;
    }
    if (activeFulfilment === 'service' && !slotId) {
      toast.show('Choose a time slot first.');
      return;
    }
    if (!data.selectedPaymentMethodId) {
      toast.show('Choose a payment method first.');
      return;
    }
    if (!accepted) {
      setTermsError('Accept the terms to continue.');
      return;
    }
    setTermsError(null);
    setPayError(null);
    setBusy(true);
    try {
      const order = await data.placeOrder({
        campaignId: campaign.id,
        quantity,
        option,
        fulfilment: activeFulfilment,
        addressId: activeFulfilment === 'delivery' ? addressId : null,
        serviceSlotId: activeFulfilment === 'service' ? slotId : null,
        paymentMethodId: data.selectedPaymentMethodId,
        waitlistEntryId,
        termsAccepted: true,
      });
      navigation.navigate({ name: 'confirmation', orderId: order.id });
    } catch (error) {
      setPayError(error instanceof Error ? error.message : 'Payment failed. Try again.');
      setBusy(false);
    }
  };

  const options = (
    <View style={isWide ? styles.column : null}>
      {campaign.optionValues.length ? (
        <>
          <SubHeading>Options</SubHeading>
          <OptionRow>
            {campaign.optionValues.map((value) => (
              <OptionPill
                key={value}
                label={value}
                selected={option === value}
                onPress={() => setOption(value)}
              />
            ))}
          </OptionRow>
        </>
      ) : null}
      <View style={styles.stepper}>
        <FilterPill
          label="−"
          accessibilityLabel="Decrease quantity"
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
        />
        <PzText weight={600} accessibilityLabel={`Quantity ${quantity}`}>
          {String(quantity)}
        </PzText>
        <FilterPill
          label="+"
          accessibilityLabel="Increase quantity"
          onPress={() => setQuantity((q) => q + 1)}
        />
        <PzText size={13} tone="mu">
          Limit {campaign.maxPerOrder} per order
        </PzText>
      </View>
      {overLimit ? (
        <FieldError
          message={`You can order up to ${campaign.maxPerOrder}. Lower the quantity to continue.`}
        />
      ) : null}
      <SubHeading marginTop={22}>Fulfilment</SubHeading>
      <OptionRow>
        {campaign.fulfilmentMethods.map((method) => (
          <OptionPill
            key={method}
            label={fulfilmentLabels[method]}
            selected={activeFulfilment === method}
            onPress={() => setFulfilment(method)}
          />
        ))}
      </OptionRow>
      {activeFulfilment ? (
        <FulfilmentDetails
          campaign={campaign}
          fulfilment={activeFulfilment}
          addressId={addressId}
          onSelectAddress={setAddressId}
          slotId={slotId}
          onSelectSlot={setSlotId}
          onAddAddress={() => setAddOpen(true)}
        />
      ) : null}
      <SubHeading marginTop={22}>Payment method</SubHeading>
      <PaymentMethodList />
    </View>
  );

  const summary = (
    <View style={isWide ? styles.column : null}>
      <Box panel>
        <PzText weight={600}>{campaign.title}</PzText>
        <PzText size={13} tone="mu">
          {option ? `${option} · ` : ''}
          {seller?.name ?? ''}
        </PzText>
        <View style={{ marginTop: 10 }}>
          <DetailRow label={`${quantity} × ${fmt.money(campaign.price)}`} value={fmt.money(campaign.price * quantity)} />
          <DetailRow
            label={activeFulfilment === 'delivery' ? 'Delivery fee' : 'Fees'}
            value={fee ? fmt.money(fee) : 'None'}
          />
          <DetailRow label="Pay now" value={fmt.money(total)} total />
        </View>
        <PzText size={13} tone="mu" style={{ marginVertical: 8 }}>
          {campaign.mode === 'group'
            ? `Target: ${formatMetricValue(campaign, campaign.metric.target, fmt)} ${metricNouns[campaign.metric.kind]} by ${fmt.dateTime(campaign.closesAt)}. If missed, you may accept ${fmt.money(campaign.fallbackPrice)} (pay ${fmt.money((campaign.fallbackPrice - campaign.price) * quantity)} more) or decline for a refund.`
            : `Scheduled for ${fmt.dateTime(campaign.fulfilmentAt)}. No group target or fallback price applies.`}
        </PzText>
        <Checkbox checked={accepted} onChange={setAccepted}>
          <PzText size={13}>
            I accept the{' '}
            <PzText
              size={13}
              underline
              onPress={() => navigation.navigate({ name: 'policy', topic: 'terms' })}
            >
              campaign terms
            </PzText>
            {isGroup ? ' and fallback rules.' : '.'}
          </PzText>
        </Checkbox>
        <FieldError message={termsError} />
        {payError ? (
          <View style={{ marginBottom: 10 }}>
            <FieldError message={payError} />
          </View>
        ) : null}
        <Button
          label={busy ? 'Processing…' : payError ? 'Retry payment' : `Pay ${fmt.money(total)}`}
          block
          loading={busy}
          disabled={!activeFulfilment}
          onPress={pay}
        />
      </Box>
    </View>
  );

  return (
    <ScreenScaffold>
      <PageTitle>{isGroup ? 'Join campaign' : 'Place pre-order'}</PageTitle>
      <View style={[styles.layout, isWide ? styles.layoutWide : null]}>
        {options}
        {summary}
      </View>
      <AddAddressSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(address) => setAddressId(address.id)}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  layout: {
    gap: 20,
    marginVertical: 14,
  },
  layoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
  },
  column: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

