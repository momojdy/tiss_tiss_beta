import React from 'react';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { EmptyState } from '../shared/EmptyState';
import { LoadFailureState } from '../shared/StateViews';
import { PayOption } from '../shared/Selectors';

export const PaymentMethodList = () => {
  const data = usePrezoData();
  const methods = data.paymentMethods;

  if (methods.status === 'error') {
    return (
      <LoadFailureState
        title="Payment methods unavailable"
        message={methods.message}
        onRetry={() => data.reload(['paymentMethods'])}
      />
    );
  }
  if (methods.status === 'ready' && !methods.data.length) {
    return (
      <EmptyState
        title="No payment methods available"
        message="A payment method is needed to continue."
      />
    );
  }
  return (
    <>
      {methods.data.map((method) => (
        <PayOption
          key={method.id}
          title={method.label}
          detail={method.unavailableReason}
          disabled={!!method.unavailableReason}
          selected={data.selectedPaymentMethodId === method.id}
          onPress={() => data.selectPaymentMethod(method.id)}
        />
      ))}
    </>
  );
};

