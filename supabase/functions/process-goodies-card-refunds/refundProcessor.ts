import {
  findBlockingRefund,
  getRefundIdempotencyKey,
  getRemainingRefundAmount,
  getSucceededRefundAmount,
  type RefundRecord,
} from "./refundLogic.ts";

export type RefundQueueItem = {
  queue_id: string;
  order_id: string;
  payment_provider_ref: string;
  total: number | string;
  lease_token: string;
};

type StripeRefundPage = { data: RefundRecord[]; has_more: boolean };
type StripeDispute = { id: string; status: string };
type StripeDisputePage = { data: StripeDispute[]; has_more: boolean };
type StripeRefundClient = {
  disputes: {
    list(args: { payment_intent: string; limit: number; starting_after?: string }): Promise<StripeDisputePage>;
  };
  refunds: {
    list(args: { payment_intent: string; limit: number; starting_after?: string }): Promise<StripeRefundPage>;
    create(
      params: { payment_intent: string; amount: number; reason: "requested_by_customer" },
      options: { idempotencyKey: string },
    ): Promise<RefundRecord>;
  };
};
type RefundServiceClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown | null }>;
};

async function finish(
  service: RefundServiceClient,
  item: RefundQueueItem,
  status: "refunded" | "refund_pending" | "failed",
  refundId: string | null,
  errorMessage: string | null,
): Promise<void> {
  const { data, error } = await service.rpc("finish_goodies_card_refund", {
    p_queue_id: item.queue_id,
    p_lease_token: item.lease_token,
    p_status: status,
    p_refund_id: refundId,
    p_error: errorMessage,
  });
  if (error) throw error;
  if (data !== true) throw new Error("Refund worker lease is no longer current");
}

export async function processRefundQueueItem(
  item: RefundQueueItem,
  stripe: StripeRefundClient,
  service: RefundServiceClient,
): Promise<"refunded" | "pending" | "failed"> {
  try {
    const totalCents = Math.round(Number(item.total) * 100);
    if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
      throw new Error("Refund total must be a positive safe integer number of cents");
    }

    const priorRefunds: RefundRecord[] = [];
    let startingAfter: string | undefined;
    for (;;) {
      const page = await stripe.refunds.list({
        payment_intent: item.payment_provider_ref,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      priorRefunds.push(...page.data);
      if (!page.has_more) break;
      const last = page.data[page.data.length - 1];
      if (!last) throw new Error("Stripe refund history pagination did not advance");
      startingAfter = last.id;
    }

    const succeededAmount = getSucceededRefundAmount(priorRefunds);
    const pendingRefund = findBlockingRefund(priorRefunds);
    if (succeededAmount >= totalCents) {
      const lastSucceeded = [...priorRefunds].reverse().find(refund => refund.status === "succeeded");
      await finish(service, item, "refunded", lastSucceeded?.id || null, null);
      return "refunded";
    }
    if (pendingRefund) {
      await finish(service, item, "refund_pending", pendingRefund.id, "A Stripe refund is still pending or requires action");
      return "pending";
    }

    const remainingCents = getRemainingRefundAmount(totalCents, succeededAmount);

    // Fail closed: check every dispute attached to this PaymentIntent immediately
    // before issuing a new refund. A failed Stripe lookup must never permit a refund.
    const disputes: StripeDispute[] = [];
    let disputeCursor: string | undefined;
    for (;;) {
      const page = await stripe.disputes.list({
        payment_intent: item.payment_provider_ref,
        limit: 100,
        ...(disputeCursor ? { starting_after: disputeCursor } : {}),
      });
      disputes.push(...page.data);
      if (!page.has_more) break;
      const last = page.data[page.data.length - 1];
      if (!last) throw new Error("Stripe dispute history pagination did not advance");
      disputeCursor = last.id;
    }

    const openDispute = disputes.find(dispute =>
      dispute.status === "needs_response" ||
      dispute.status === "under_review" ||
      dispute.status === "warning_needs_response" ||
      dispute.status === "warning_under_review"
    );
    if (openDispute) {
      const { data, error } = await service.rpc("pause_goodies_card_refund_for_dispute", {
        p_queue_id: item.queue_id,
        p_lease_token: item.lease_token,
        p_error: "Refund paused because Stripe dispute " + openDispute.id + " is " + openDispute.status,
      });
      if (error) throw error;
      if (data !== true) throw new Error("Could not safely pause refund for the open Stripe dispute");
      return "pending";
    }

    // No await occurs between the successful dispute check and this Stripe call.
    // Reuse the same key after an uncertain network failure with no Stripe
    // refund record. Advance the key only after Stripe records an attempt.
    const refundIdempotencyKey = getRefundIdempotencyKey(item.order_id, priorRefunds.length);
    const refund = await stripe.refunds.create(
      {
        payment_intent: item.payment_provider_ref,
        amount: remainingCents,
        reason: "requested_by_customer",
      },
      { idempotencyKey: refundIdempotencyKey },
    );

    if (refund.status === "succeeded" && succeededAmount + refund.amount >= totalCents) {
      await finish(service, item, "refunded", refund.id, null);
      return "refunded";
    }
    if (refund.status === "pending" || refund.status === "requires_action" || refund.status === "succeeded") {
      await finish(service, item, "refund_pending", refund.id, "Remaining Stripe refund amount is still pending");
      return "pending";
    }
    throw new Error("Stripe refund status: " + refund.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund attempt failed";
    try {
      await finish(service, item, "failed", null, message);
    } catch (finishError) {
      console.error("Could not release refund queue item", item.queue_id, finishError);
    }
    console.error("Goodies card refund failed for order", item.order_id, error);
    return "failed";
  }
}
