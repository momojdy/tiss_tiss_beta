import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-goodies-worker-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !url || !serviceKey) return json({ error: "Refund worker is not configured" }, 503);

  try {
    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = req.headers.get("x-goodies-worker-token") || "";
    const { data: tokenValid, error: tokenError } = await service.rpc("validate_goodies_refund_worker_token", { p_token: token });
    if (tokenError || tokenValid !== true) return json({ error: "Not authorized" }, 401);

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
    const { data: queue, error: queueError } = await service.rpc("claim_goodies_card_refunds", { p_limit: 25 });
    if (queueError) throw queueError;
    let refunded = 0, pending = 0, failed = 0;
    for (const item of queue || []) {
      try {
        const prior = await stripe.refunds.list({ payment_intent: item.payment_provider_ref, limit: 20 });
        let refund = prior.data.find(r => r.status === "succeeded" || r.status === "pending");
        if (!refund) {
          refund = await stripe.refunds.create(
            { payment_intent: item.payment_provider_ref, reason: "requested_by_customer" },
            { idempotencyKey: "goodies-card-refund-" + item.order_id + "-attempt-" + item.attempts },
          );
        }
        if (refund.status === "succeeded") {
          const { error } = await service.rpc("finish_goodies_card_refund", {
            p_queue_id: item.queue_id, p_status: "refunded", p_refund_id: refund.id, p_error: null,
          });
          if (error) throw error;
          refunded++;
        } else if (refund.status === "pending") {
          const { error } = await service.rpc("finish_goodies_card_refund", {
            p_queue_id: item.queue_id, p_status: "refund_pending", p_refund_id: refund.id, p_error: "Stripe refund is still pending",
          });
          if (error) throw error;
          pending++;
        } else {
          throw new Error("Stripe refund status: " + refund.status);
        }
      } catch (e) {
        failed++;
        await service.rpc("finish_goodies_card_refund", {
          p_queue_id: item.queue_id, p_status: "failed", p_error: e instanceof Error ? e.message : "Refund attempt failed",
        }).catch(() => undefined);
        console.error("Goodies card refund failed for order", item.order_id, e);
      }
    }
    return json({ scanned: queue?.length || 0, refunded, pending, failed });
  } catch (e) {
    console.error("process-goodies-card-refunds:", e);
    return json({ error: e instanceof Error ? e.message : "Refund processing failed" }, 500);
  }
});