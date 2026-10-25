import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let intent: Stripe.PaymentIntent | null = null;
  let orderId: string | null = null;
  let authClient: ReturnType<typeof createClient> | null = null;
  let service: ReturnType<typeof createClient> | null = null;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !url || !anonKey || !serviceKey) return json({ error: "Payment service is not configured" }, 503);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Sign in required" }, 401);
    authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Sign in required" }, 401);

    const body = await req.json();
    const methodId = String(body.payment_method_id || "");
    const order = body.order || {};
    const amount = Number(order.p_total);
    if (!methodId || !Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      return json({ error: "Choose a saved card and check the order total" }, 400);
    }

    const { data: savedMethod, error: methodError } = await service
      .from("user_payment_methods")
      .select("id,user_id,stripe_customer_id,stripe_payment_method_id")
      .eq("id", methodId).eq("user_id", user.id).maybeSingle();
    if (methodError) throw methodError;
    if (!savedMethod) return json({ error: "That saved card is no longer available. Refresh your payment methods." }, 400);
    const { data: customer, error: customerError } = await service
      .from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (customerError) throw customerError;
    if (!customer?.stripe_customer_id || customer.stripe_customer_id !== savedMethod.stripe_customer_id) {
      return json({ error: "The saved card is not connected to your Wantiss payment profile" }, 400);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
    const idempotencyKey = String(body.idempotency_key || ("goodies-" + user.id + "-" + Date.now())).slice(0, 200);
    intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      customer: customer.stripe_customer_id,
      payment_method: savedMethod.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      capture_method: "manual",
      metadata: { wantiss_user_id: user.id, wantiss_purpose: "goodies_order" },
    }, { idempotencyKey });

    if (intent.status !== "requires_capture" && intent.status !== "succeeded") {
      throw new Error("The card could not authorize this payment. Try another saved card.");
    }

    const { data: created, error: orderError } = await authClient.rpc("place_goodies_order", {
      ...order,
      p_promo_code: order.p_promo_code || null,
    });
    const row = Array.isArray(created) ? created[0] : created;
    if (orderError || !row?.id) {
      if (intent.status === "requires_capture") await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
      else if (intent.status === "succeeded") await stripe.refunds.create({
        payment_intent: intent.id, reason: "requested_by_customer",
      }, { idempotencyKey: "goodies-card-order-create-failed-" + intent.id }).catch(() => undefined);
      throw orderError || new Error("The order could not be placed. Your card authorization was released or refunded.");
    }
    orderId = row.id;

    if (intent.status === "requires_capture") {
      try {
        intent = await stripe.paymentIntents.capture(intent.id);
      } catch (captureError) {
        await authClient.rpc("set_goodies_order_status", { p_order_id: orderId, p_status: "cancelled" }).catch(() => undefined);
        const latest = await stripe.paymentIntents.retrieve(intent.id).catch(() => null);
        if (latest?.status === "succeeded") {
          await stripe.refunds.create({ payment_intent: intent.id, reason: "requested_by_customer" }).catch(() => undefined);
        } else {
          await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
        }
        await service.from("goodies_orders").update({ payment_method: "card", payment_status: "failed", payment_provider_ref: intent.id }).eq("id", orderId);
        throw captureError;
      }
    }

    const { error: updateError } = await service.from("goodies_orders").update({
      payment_method: "card", payment_status: "paid", payment_provider_ref: intent.id, updated_at: new Date().toISOString(),
    }).eq("id", orderId).eq("customer_id", user.id);
    if (updateError) {
      await stripe.refunds.create({ payment_intent: intent.id, reason: "requested_by_customer" }).catch(() => undefined);
      await authClient.rpc("set_goodies_order_status", { p_order_id: orderId, p_status: "cancelled" }).catch(() => undefined);
      throw new Error("We could not finalize the order. If your card shows a charge, it will be refunded.");
    }
    return json({ id: row.id, order_code: row.order_code, status: row.status, payment_status: "paid" });
  } catch (error) {
    console.error("place-goodies-card-order:", error);
    return json({ error: error instanceof Error ? error.message : "Card payment failed. Try another method." }, 400);
  }
});
