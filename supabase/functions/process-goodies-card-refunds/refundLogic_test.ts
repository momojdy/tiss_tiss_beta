import {
  findBlockingRefund,
  getRefundIdempotencyKey,
  getRemainingRefundAmount,
  getSucceededRefundAmount,
  type RefundRecord,
} from "./refundLogic.ts";

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(message + ": expected " + String(expected) + ", received " + String(actual));
  }
}

function assertThrows(run: () => unknown, message: string): void {
  let threw = false;
  try { run(); } catch { threw = true; }
  if (!threw) throw new Error(message);
}

Deno.test("only succeeded Stripe refunds reduce the remaining balance", () => {
  const refunds: RefundRecord[] = [
    { id: "re_succeeded", status: "succeeded", amount: 2500 },
    { id: "re_pending", status: "pending", amount: 1500 },
    { id: "re_failed", status: "failed", amount: 1000 },
  ];
  assertEquals(getSucceededRefundAmount(refunds), 2500, "succeeded refund sum");
  assertEquals(getRemainingRefundAmount(10000, 2500), 7500, "remaining cents");
});

Deno.test("pending and requires_action refunds block another refund creation", () => {
  const pending: RefundRecord = { id: "re_pending", status: "pending", amount: 5000 };
  const actionRequired: RefundRecord = { id: "re_action", status: "requires_action", amount: 5000 };
  assertEquals(findBlockingRefund([pending])?.id, "re_pending", "pending refund blocks");
  assertEquals(findBlockingRefund([actionRequired])?.id, "re_action", "action-required refund blocks");
});

Deno.test("failed and canceled refunds do not block a genuine retry", () => {
  const terminal: RefundRecord[] = [
    { id: "re_failed", status: "failed", amount: 5000 },
    { id: "re_canceled", status: "canceled", amount: 5000 },
  ];
  assertEquals(findBlockingRefund(terminal), undefined, "terminal refunds do not block");
});

Deno.test("uncertain network retries reuse the stable key when Stripe has no refund record", () => {
  const first = getRefundIdempotencyKey("order-123", 0);
  const retry = getRefundIdempotencyKey("order-123", 0);
  assertEquals(first, "goodies-card-refund-order-123-full-v1", "initial key");
  assertEquals(retry, first, "uncertain retry key");
});

Deno.test("a recorded terminal refund advances the idempotency generation", () => {
  assertEquals(
    getRefundIdempotencyKey("order-123", 1),
    "goodies-card-refund-order-123-attempt-2",
    "first retry generation",
  );
  assertEquals(
    getRefundIdempotencyKey("order-123", 2),
    "goodies-card-refund-order-123-attempt-3",
    "second retry generation",
  );
});

Deno.test("fully refunded totals have no remaining amount", () => {
  assertEquals(getRemainingRefundAmount(10000, 10000), 0, "full refund remaining");
  assertEquals(getRemainingRefundAmount(10000, 12000), 0, "over-reported succeeded refunds clamp to zero");
});

Deno.test("invalid refund totals and keys are rejected", () => {
  assertThrows(() => getRemainingRefundAmount(0, 0), "zero total must be rejected");
  assertThrows(() => getRemainingRefundAmount(1000, -1), "negative refunded amount must be rejected");
  assertThrows(() => getRefundIdempotencyKey("", 0), "blank order ID must be rejected");
  assertThrows(() => getRefundIdempotencyKey("order-123", -1), "negative prior refund count must be rejected");
});
