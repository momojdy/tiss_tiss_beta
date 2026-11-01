import { processRefundQueueItem, type RefundQueueItem } from "./refundProcessor.ts";
import type { RefundRecord } from "./refundLogic.ts";

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(message + ": expected " + String(expected) + ", received " + String(actual));
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function makeItem(): RefundQueueItem {
  return {
    queue_id: "queue-1",
    order_id: "order-123",
    payment_provider_ref: "pi_test_123",
    total: 100,
    lease_token: "lease-1",
  };
}

function makeStripe(refunds: RefundRecord[], createResult?: RefundRecord, createError?: Error) {
  const calls: { createArgs: Array<{ amount: number; key: string }>; listCalls: number } = {
    createArgs: [],
    listCalls: 0,
  };
  const stripe = {
    refunds: {
      async list() {
        calls.listCalls++;
        return { data: refunds, has_more: false };
      },
      async create(params: { amount: number }, options: { idempotencyKey: string }) {
        calls.createArgs.push({ amount: params.amount, key: options.idempotencyKey });
        if (createError) throw createError;
        if (!createResult) throw new Error("Missing mock Stripe refund response");
        return createResult;
      },
    },
  };
  return { stripe, calls };
}

function makeService(finishResult: unknown = true) {
  const calls: Array<Record<string, unknown>> = [];
  const service = {
    async rpc(name: string, args: Record<string, unknown>) {
      assertEquals(name, "finish_goodies_card_refund", "RPC name");
      calls.push(args);
      return { data: finishResult, error: null };
    },
  };
  return { service, calls };
}

Deno.test("mock Stripe full refund is finalized once", async () => {
  const { stripe, calls } = makeStripe([], { id: "re_full", status: "succeeded", amount: 10000 });
  const { service, calls: finishCalls } = makeService();
  const result = await processRefundQueueItem(makeItem(), stripe, service);
  assertEquals(result, "refunded", "processor result");
  assertEquals(calls.createArgs[0]?.amount, 10000, "full refund amount");
  assertEquals(finishCalls[0]?.p_status, "refunded", "finalized status");
});

Deno.test("mock Stripe partial success creates only the remaining amount with a new key", async () => {
  const existing: RefundRecord[] = [{ id: "re_partial", status: "succeeded", amount: 2500 }];
  const { stripe, calls } = makeStripe(existing, { id: "re_rest", status: "succeeded", amount: 7500 });
  const { service, calls: finishCalls } = makeService();
  const result = await processRefundQueueItem(makeItem(), stripe, service);
  assertEquals(result, "refunded", "processor result");
  assertEquals(calls.createArgs[0]?.amount, 7500, "remaining refund amount");
  assertEquals(calls.createArgs[0]?.key, "goodies-card-refund-order-123-attempt-2", "retry generation");
  assertEquals(finishCalls[0]?.p_status, "refunded", "finalized status");
});

Deno.test("existing pending Stripe refund prevents a second refund", async () => {
  const existing: RefundRecord[] = [{ id: "re_pending", status: "pending", amount: 10000 }];
  const { stripe, calls } = makeStripe(existing);
  const { service, calls: finishCalls } = makeService();
  const result = await processRefundQueueItem(makeItem(), stripe, service);
  assertEquals(result, "pending", "processor result");
  assertEquals(calls.createArgs.length, 0, "no duplicate Stripe refund");
  assertEquals(finishCalls[0]?.p_status, "refund_pending", "pending queue state");
});

Deno.test("requires_action Stripe refund prevents a second refund", async () => {
  const existing: RefundRecord[] = [{ id: "re_action", status: "requires_action", amount: 10000 }];
  const { stripe, calls } = makeStripe(existing);
  const { service } = makeService();
  const result = await processRefundQueueItem(makeItem(), stripe, service);
  assertEquals(result, "pending", "processor result");
  assertEquals(calls.createArgs.length, 0, "no duplicate Stripe refund");
});

Deno.test("uncertain Stripe network failure releases lease and retains stable retry key", async () => {
  const first = makeStripe([], undefined, new Error("network timeout"));
  const { service, calls } = makeService();
  const firstResult = await processRefundQueueItem(makeItem(), first.stripe, service);
  const retry = makeStripe([], { id: "re_retry", status: "succeeded", amount: 10000 });
  const retryResult = await processRefundQueueItem(makeItem(), retry.stripe, service);
  assertEquals(firstResult, "failed", "uncertain first attempt");
  assertEquals(retryResult, "refunded", "retry result");
  assertEquals(first.calls.createArgs[0]?.key, retry.calls.createArgs[0]?.key, "stable idempotency key");
  assertEquals(calls[0]?.p_status, "failed", "failed attempt releases queue");
});

Deno.test("stale lease cannot finalize a Stripe refund", async () => {
  const { stripe } = makeStripe([], { id: "re_full", status: "succeeded", amount: 10000 });
  const { service, calls } = makeService(false);
  const result = await processRefundQueueItem(makeItem(), stripe, service);
  assertEquals(result, "failed", "stale lease result");
  assertEquals(calls[0]?.p_status, "refunded", "worker attempted correct completion");
  assertEquals(calls[1]?.p_status, "failed", "worker attempted safe lease release");
});


Deno.test("already fully refunded PaymentIntent is finalized without creating another refund", async () => {
  const existing: RefundRecord[] = [{ id: "re_already_full", status: "succeeded", amount: 10000 }];
  const { stripe, calls } = makeStripe(existing);
  const { service, calls: finishCalls } = makeService();
  const result = await processRefundQueueItem(makeItem(), stripe, service);
  assertEquals(result, "refunded", "processor result");
  assertEquals(calls.createArgs.length, 0, "no additional Stripe refund");
  assertEquals(finishCalls[0]?.p_status, "refunded", "finalized status");
});

Deno.test("invalid order totals are rejected before Stripe is contacted", async () => {
  for (const total of [0, -1, "not-a-number", "Infinity", "90071992547410"]) {
    const item = { ...makeItem(), total };
    const { stripe, calls } = makeStripe([]);
    const { service, calls: finishCalls } = makeService();
    const result = await processRefundQueueItem(item, stripe, service);
    assertEquals(result, "failed", "invalid total result for " + String(total));
    assertEquals(calls.listCalls, 0, "Stripe must not be contacted for " + String(total));
    assertEquals(calls.createArgs.length, 0, "no refund created for " + String(total));
    assertEquals(finishCalls[0]?.p_status, "failed", "queue item safely failed for " + String(total));
  }
});

Deno.test("Stripe refund history pagination is exhausted before calculating the remainder", async () => {
  const pages = [
    { data: [{ id: "re_failed", status: "failed", amount: 500 }], has_more: true },
    { data: [{ id: "re_partial", status: "succeeded", amount: 2500 }], has_more: false },
  ];
  const cursors: Array<string | undefined> = [];
  const createCalls: Array<{ amount: number; key: string }> = [];
  const stripe = {
    refunds: {
      async list(args: { starting_after?: string }) {
        cursors.push(args.starting_after);
        const page = pages.shift();
        if (!page) throw new Error("Unexpected extra Stripe refund page");
        return page;
      },
      async create(params: { amount: number }, options: { idempotencyKey: string }) {
        createCalls.push({ amount: params.amount, key: options.idempotencyKey });
        return { id: "re_remaining", status: "succeeded", amount: params.amount };
      },
    },
  };
  const { service, calls: finishCalls } = makeService();
  const result = await processRefundQueueItem(makeItem(), stripe, service);
  assertEquals(result, "refunded", "processor result");
  assertEquals(cursors.length, 2, "all Stripe pages read");
  assertEquals(cursors[0], undefined, "first page has no cursor");
  assertEquals(cursors[1], "re_failed", "second page starts after last item");
  assertEquals(createCalls[0]?.amount, 7500, "remaining amount includes all pages");
  assertEquals(createCalls[0]?.key, "goodies-card-refund-order-123-attempt-3", "key uses all recorded attempts");
  assertEquals(finishCalls[0]?.p_status, "refunded", "finalized status");
});
