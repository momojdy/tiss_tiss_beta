import {
  resolveGoodiesDisputeState,
  resolveGoodiesPaymentIntentState,
  resolveGoodiesRefundState,
} from "./goodiesStripeState.ts";

Deno.test("canonical PaymentIntent status wins over an older webhook event type", () => {
  if (resolveGoodiesPaymentIntentState("payment_intent.payment_failed", "succeeded") !== "succeeded") {
    throw new Error("A stale failure event must resolve from the canonical succeeded PaymentIntent");
  }
  if (resolveGoodiesPaymentIntentState("payment_intent.succeeded", "canceled") !== "cancelled") {
    throw new Error("A canonical canceled PaymentIntent must not be marked paid");
  }
});

Deno.test("failed PaymentIntent is only recorded after it requires a new payment method", () => {
  if (resolveGoodiesPaymentIntentState("payment_intent.payment_failed", "requires_payment_method") !== "failed") {
    throw new Error("Expected failed state");
  }
  for (const status of ["processing", "requires_action", "requires_confirmation", "requires_capture"]) {
    if (resolveGoodiesPaymentIntentState("payment_intent.payment_failed", status) !== null) {
      throw new Error("Intermediate PaymentIntent status must be ignored: " + status);
    }
  }
});

Deno.test("cumulative Stripe refund amount maps to pending, partial and full states", () => {
  const cases: Array<[number, number, string]> = [
    [0, 10000, "refund_pending"],
    [2500, 10000, "partially_refunded"],
    [10000, 10000, "refunded"],
  ];
  for (const [refunded, total, expected] of cases) {
    if (resolveGoodiesRefundState(refunded, total) !== expected) {
      throw new Error("Incorrect refund state for " + refunded + "/" + total);
    }
  }
});

Deno.test("refund reconciliation rejects impossible Stripe totals", () => {
  for (const [refunded, total] of [[-1, 10000], [10001, 10000], [0, 0], [1.5, 10000]]) {
    let rejected = false;
    try {
      resolveGoodiesRefundState(refunded, total);
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error("Expected invalid refund values to be rejected");
  }
});

Deno.test("canonical dispute status preserves final outcome", () => {
  if (resolveGoodiesDisputeState("won") !== "dispute_won") throw new Error("Won dispute mapping failed");
  if (resolveGoodiesDisputeState("lost") !== "dispute_lost") throw new Error("Lost dispute mapping failed");
  if (resolveGoodiesDisputeState("under_review") !== "disputed") throw new Error("Open dispute mapping failed");
});
