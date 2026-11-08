import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-goodies-worker-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !url || !serviceKey) return json({ error: "Card authentication expiry worker is not configured" }, 503);

  try {
    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = req.headers.get("x-goodies-worker-token") || "";
    const { data: tokenValid, error: tokenError } = await service.rpc(
      "validate_goodies_refund_worker_token",
      { p_token: token },
    );
    if (tokenError || tokenValid !== true) return json({ error: "Not authorized" }, 401);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: orders, error: orderError } = await service
      .from("goodies_orders")
      .select("id,customer_id,order_code,total,status,payment_provider_ref,created_at")
      .eq("payment_method", "card")
      .eq("payment_status", "requires_action")
      .not("payment_provider_ref", "is", null)
      .lte("created_at", cutoff)
      .in("status", ["scheduled", "placed", "cancelled", "declined", "expired"])
      .order("created_at", { ascending: true })
      .limit(50);
    if (orderError) throw orderError;

    let expired = 0;
    let reconciled = 0;
    let skipped = 0;
    let failed = 0;

    for (const order of orders || []) {
      try {
        let intent = await stripe.paymentIntents.retrieve(order.payment_provider_ref);
        const amount = Math.round(Number(order.total) * 100);
        if (
          intent.metadata?.wantiss_purpose !== "goodies_order" ||
          intent.metadata?.goodies_order_id !== order.id ||
          intent.metadata?.wantiss_user_id !== order.customer_id ||
          intent.currency !== "usd" ||
          intent.amount !== amount ||
          intent.capture_method !== "manual"
        ) {
          throw new Error("PaymentIntent metadata or amount does not match the Goodies order");
        }

        if (intent.status === "succeeded") {
          const { data, error } = await service.rpc("expire_goodies_card_auth", {
            p_order_id: order.id,
            p_payment_intent_id: intent.id,
            p_stripe_status: "succeeded",
          });
          if (error) throw error;
          reconciled++;
          console.log("Goodies abandoned 3DS reconciled as succeeded", order.id, data);
          continue;
        }

        if (intent.status === "canceled") {
          const { data, error } = await service.rpc("expire_goodies_card_auth", {
            p_order_id: order.id,
            p_payment_intent_id: intent.id,
            p_stripe_status: "canceled",
          });
          if (error) throw error;
          if (data === "expired") expired++;
          else reconciled++;
          continue;
        }

        if (!["requires_action", "requires_capture", "requires_confirmation", "requires_payment_method"].includes(intent.status)) {
          skipped++;
          continue;
        }

        try {
          intent = await stripe.paymentIntents.cancel(
            intent.id,
            { cancellation_reason: "abandoned" },
            { idempotencyKey: "goodies-3ds-expire-" + order.id },
          );
        } catch (cancelError) {
          // A customer may finish authentication while the expiry request is in flight.
          intent = await stripe.paymentIntents.retrieve(intent.id);
          if (intent.status !== "canceled" && intent.status !== "succeeded") throw cancelError;
        }

        if (intent.status === "succeeded") {
          const { error } = await service.rpc("expire_goodies_card_auth", {
            p_order_id: order.id,
            p_payment_intent_id: intent.id,
            p_stripe_status: "succeeded",
          });
          if (error) throw error;
          reconciled++;
        } else if (intent.status === "canceled") {
          const { data, error } = await service.rpc("expire_goodies_card_auth", {
            p_order_id: order.id,
            p_payment_intent_id: intent.id,
            p_stripe_status: "canceled",
          });
          if (error) throw error;
          if (data === "expired") expired++;
          else reconciled++;
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;
        console.error("Goodies abandoned 3DS expiry failed:", order.id, error);
      }
    }

    const summary = { scanned: orders?.length || 0, expired, reconciled, skipped, failed };
    return json(summary, failed > 0 ? 500 : 200);
  } catch (error) {
    console.error("expire-goodies-card-auth:", error);
    return json({ error: error instanceof Error ? error.message : "Card authentication expiry failed" }, 500);
  }
});
