export type RefundRecord = {
  id: string;
  status: string | null;
  amount: number;
};

export function getSucceededRefundAmount(refunds: RefundRecord[]): number {
  return refunds
    .filter(refund => refund.status === "succeeded")
    .reduce((sum, refund) => sum + refund.amount, 0);
}

export function findBlockingRefund(refunds: RefundRecord[]): RefundRecord | undefined {
  return refunds.find(refund =>
    refund.status === "pending" || refund.status === "requires_action"
  );
}

export function getRemainingRefundAmount(totalCents: number, succeededCents: number): number {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error("Refund total must be a positive safe integer");
  }
  if (!Number.isSafeInteger(succeededCents) || succeededCents < 0) {
    throw new Error("Succeeded refund amount must be a non-negative safe integer");
  }
  return Math.max(0, totalCents - succeededCents);
}

export function getRefundIdempotencyKey(orderId: string, priorRefundCount: number): string {
  if (!orderId.trim()) throw new Error("Order ID is required for refund idempotency");
  if (!Number.isSafeInteger(priorRefundCount) || priorRefundCount < 0) {
    throw new Error("Prior refund count must be a non-negative safe integer");
  }
  return priorRefundCount === 0
    ? "goodies-card-refund-" + orderId + "-full-v1"
    : "goodies-card-refund-" + orderId + "-attempt-" + (priorRefundCount + 1);
}
