export type GoodiesRefundState = "refunded" | "partially_refunded" | "refund_pending";

export function resolveGoodiesPaymentIntentState(
  eventType: string,
  canonicalStatus: string,
): "succeeded" | "failed" | "cancelled" | null {
  if (canonicalStatus === "succeeded") return "succeeded";
  if (canonicalStatus === "canceled") return "cancelled";
  if (eventType === "payment_intent.payment_failed" && canonicalStatus === "requires_payment_method") {
    return "failed";
  }
  return null;
}

export function resolveGoodiesRefundState(
  refundedAmountCents: number,
  paymentAmountCents: number,
): GoodiesRefundState {
  if (!Number.isSafeInteger(paymentAmountCents) || paymentAmountCents <= 0) {
    throw new Error("Payment amount must be a positive safe integer number of cents");
  }
  if (!Number.isSafeInteger(refundedAmountCents) || refundedAmountCents < 0 ||
      refundedAmountCents > paymentAmountCents) {
    throw new Error("Refunded amount must be a safe integer within the payment amount");
  }
  if (refundedAmountCents >= paymentAmountCents) return "refunded";
  if (refundedAmountCents > 0) return "partially_refunded";
  return "refund_pending";
}

export function resolveGoodiesDisputeState(
  canonicalStatus: string,
): "dispute_won" | "dispute_lost" | "disputed" {
  if (canonicalStatus === "won") return "dispute_won";
  if (canonicalStatus === "lost") return "dispute_lost";
  return "disputed";
}
