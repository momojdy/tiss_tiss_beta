import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { usePrezoToast } from '../../../features/prezo/PrezoToastContext';
import { canAcceptFallback, getFallbackAdditionalAmount } from '../../../lib/prezo/orderRules';
import type { Order } from '../../../types/prezo';
import { PaymentMethodList } from '../checkout/PaymentMethodList';
import { Button } from '../shared/Button';
import { PzText } from '../shared/PzText';
import { Sheet } from '../shared/Sheet';
import { FieldError } from '../shared/TextField';

interface AdditionalPaymentSheetProps {
  order: Order;
  visible: boolean;
  onClose: () => void;
}

export const AdditionalPaymentSheet = ({ order, visible, onClose }: AdditionalPaymentSheetProps) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const toast = usePrezoToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = getFallbackAdditionalAmount(order);

  useEffect(() => {
    if (visible) {
      setBusy(false);
      setError(null);
    }
  }, [visible]);

  const pay = async () => {
    if (busy) return;
    if (!canAcceptFallback(data.getOrder(order.id), Date.now())) {
      onClose();
      toast.show('This offer can no longer be accepted.');
      return;
    }
    if (!data.selectedPaymentMethodId) {
      setError('Choose a payment method first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await data.acceptFallback(order.id, data.selectedPaymentMethodId);
      onClose();
      navigation.navigate({ name: 'order', id: order.id });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Additional payment failed.';
      setError(
        `${message} The higher price isn’t accepted until this succeeds. Retry, pick another method, or close this and decline.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Authorise additional payment">
      <PzText size={14} tone="mu" style={{ marginVertical: 8 }}>
        {fmt.money(amount)} charged to the method below, once, only when you tap Pay. Failed
        payments are never retried automatically.
      </PzText>
      <PaymentMethodList />
      <View>
        <FieldError message={error} />
        <Button
          label={busy ? 'Processing…' : error ? 'Retry payment' : `Pay ${fmt.money(amount)}`}
          block
          loading={busy}
          onPress={pay}
          style={{ marginTop: 10 }}
        />
      </View>
    </Sheet>
  );
};

