import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: corsHeaders});
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: {...corsHeaders, "Content-Type": "application/json"},
  });
  if (req.method !== "POST") return json({error: "Method not allowed"}, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !publishableKey || !url || !anonKey || !serviceKey) {
    return json({error: "Payment service is not configured"}, 503);
  }

  let authClient: ReturnType<typeof createClient> | null = null;
  let service: ReturnType<typeof createClient> | null = null;
  let stripe: Stripe;
  let userId = "";
  let orderId = "";
  let intent: Stripe.PaymentIntent | null = null;

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({error: "Sign in required"}, 401);
    authClient = createClient(url, anonKey, {global: {headers: {Authorization: authorization}}});
    service = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});
    const {data: {user}, error: authError} = await authClient.auth.getUser();
    if (authError || !user) return json({error: "Sign in required"}, 401);
    userId = user.id;

    const body = await req.json();
    stripe = new Stripe(stripeKey, {apiVersion: "2026-08-26.dahlia"});
    const action = String(body.action || "start");

    if (action === "capture" || action === "cancel") {
      orderId = String(body.order_id || "");
      if (!orderId) return json({error: "Order is required"}, 400);
      const {data: order, error: orderError} = await service.from("goodies_orders")
        .select("id,customer_id,total,payment_method,payment_status,payment_provider_ref,status")
        .eq("id", orderId).eq("customer_id", userId).maybeSingle();
      if (orderError) throw orderError;
      if (!order || order.payment_method !== "card" || !order.payment_provider_ref) {
        return json({error: "Card order not found"}, 404);
      }
      intent = await stripe.paymentIntents.retrieve(order.payment_provider_ref);
      if (intent.metadata?.goodies_order_id !== order.id || intent.metadata?.wantiss_user_id !== userId ||
          intent.currency !== "usd" || intent.amount !== Math.round(Number(order.total) * 100)) {
        return json({error: "Payment authorization does not match this order"}, 409);
      }

      if (action === "cancel") {
        const captured = intent.status === "succeeded";
        if (intent.status === "requires_capture" || intent.status === "requires_action" || intent.status === "requires_confirmation") {
          await stripe.paymentIntents.cancel(intent.id, {}, {idempotencyKey: "goodies-cancel-" + order.id});
        } else if (captured) {
          await stripe.refunds.create({payment_intent: intent.id, reason: "requested_by_customer"},
            {idempotencyKey: "goodies-cancel-refund-" + order.id});
        } else if (intent.status !== "canceled") {
          return json({error: "The card payment is still processing. Please retry in a moment."}, 409);
        }
        const {error: cancelError} = await authClient.rpc("set_goodies_order_status", {p_order_id: order.id, p_status: "cancelled"});
        if (cancelError) throw cancelError;
        const {error: statusError} = await service.from("goodies_orders").update({
          payment_status: captured ? "refund_pending" : "failed", updated_at: new Date().toISOString(),
        }).eq("id", order.id).eq("customer_id", userId);
        if (statusError) throw statusError;
        return json({success: true, cancelled: true});
      }

      if (intent.status === "requires_capture") {
        intent = await stripe.paymentIntents.capture(intent.id, {}, {idempotencyKey: "goodies-capture-" + order.id});
      }
      if (intent.status !== "succeeded") {
        return json({error: "Your bank has not completed card verification. Try again or use another card."}, 409);
      }
      const {error: updateError} = await service.from("goodies_orders").update({
        payment_method: "card", payment_status: "paid", payment_provider_ref: intent.id, updated_at: new Date().toISOString(),
      }).eq("id", order.id).eq("customer_id", userId);
      if (updateError) {
        await stripe.refunds.create({payment_intent: intent.id, reason: "requested_by_customer"},
          {idempotencyKey: "goodies-finalize-refund-" + order.id}).catch(() => undefined);
        throw updateError;
      }
      return json({success: true, payment_status: "paid", payment_intent_id: intent.id});
    }

    const methodId = String(body.payment_method_id || "");
    const order = body.order || {};
    if (!methodId) return json({error: "Choose a saved card"}, 400);
    const {data: savedMethod, error: methodError} = await service.from("user_payment_methods")
      .select("id,user_id,stripe_customer_id,stripe_payment_method_id")
      .eq("id", methodId).eq("user_id", userId).maybeSingle();
    if (methodError) throw methodError;
    if (!savedMethod) return json({error: "That saved card is no longer available. Refresh your payment methods."}, 400);
    const {data: customer, error: customerError} = await service.from("stripe_customers")
      .select("stripe_customer_id").eq("user_id", userId).maybeSingle();
    if (customerError) throw customerError;
    if (!customer?.stripe_customer_id || customer.stripe_customer_id !== savedMethod.stripe_customer_id) {
      return json({error: "The saved card is not connected to your Wantiss payment profile"}, 400);
    }

    // Validate the full order and reserve stock before asking Stripe to authorize or capture funds.
    const {data: created, error: orderError} = await authClient.rpc("place_goodies_order", {
      ...order, p_promo_code: order.p_promo_code || null,
    });
    const row = Array.isArray(created) ? created[0] : created;
    if (orderError || !row?.id) throw orderError || new Error("The order could not be validated.");
    orderId = row.id;

    const {data: savedOrder, error: savedOrderError} = await service.from("goodies_orders")
      .select("id,total,customer_id").eq("id", orderId).eq("customer_id", userId).single();
    if (savedOrderError) throw savedOrderError;
    const amount = Math.round(Number(savedOrder.total) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10000000) {
      throw new Error("The validated order total is outside the supported card payment range.");
    }

    const idempotencyKey = String(body.idempotency_key || ("goodies-" + orderId)).slice(0, 200);
    intent = await stripe.paymentIntents.create({
      amount, currency: "usd", customer: customer.stripe_customer_id,
      payment_method: savedMethod.stripe_payment_method_id,
      confirm: true, off_session: false, capture_method: "manual",
      metadata: {wantiss_user_id: userId, wantiss_purpose: "goodies_order", goodies_order_id: orderId},
    }, {idempotencyKey});

    const {error: pendingUpdateError} = await service.from("goodies_orders").update({
      payment_method: "card", payment_status: intent.status === "requires_action" ? "requires_action" : "pending",
      payment_provider_ref: intent.id, updated_at: new Date().toISOString(),
    }).eq("id", orderId).eq("customer_id", userId);
    if (pendingUpdateError) throw pendingUpdateError;

    if (intent.status === "requires_action") {
      return json({
        success: true, requires_action: true, id: row.id, order_code: row.order_code, status: row.status,
        client_secret: intent.client_secret, publishable_key: publishableKey,
        stripe_payment_method_id: savedMethod.stripe_payment_method_id,
      });
    }

    if (intent.status === "requires_capture") {
      intent = await stripe.paymentIntents.capture(intent.id, {}, {idempotencyKey: "goodies-capture-" + orderId});
    }
    if (intent.status !== "succeeded") {
      throw new Error("Your card could not be authorized. Try another saved card.");
    }
    const {error: updateError} = await service.from("goodies_orders").update({
      payment_method: "card", payment_status: "paid", payment_provider_ref: intent.id, updated_at: new Date().toISOString(),
    }).eq("id", orderId).eq("customer_id", userId);
    if (updateError) throw updateError;
    return json({success: true, id: row.id, order_code: row.order_code, status: row.status, payment_status: "paid"});
  } catch (error) {
    console.error("place-goodies-card-order:", error);
    if (orderId && authClient && service) {
      try {
        if (intent?.status === "requires_capture" || intent?.status === "requires_action" || intent?.status === "requires_confirmation") {
          await stripe!.paymentIntents.cancel(intent.id, {}, {idempotencyKey: "goodies-failed-" + orderId}).catch(() => undefined);
        } else if (intent?.status === "succeeded") {
          await stripe!.refunds.create({payment_intent: intent.id, reason: "requested_by_customer"},
            {idempotencyKey: "goodies-failed-refund-" + orderId}).catch(() => undefined);
        }
        await authClient.rpc("set_goodies_order_status", {p_order_id: orderId, p_status: "cancelled"}).catch(() => undefined);
        await service.from("goodies_orders").update({payment_method: "card", payment_status: "failed", updated_at: new Date().toISOString()})
          .eq("id", orderId).eq("customer_id", userId);
      } catch (cleanupError) {
        console.error("Goodies card cleanup needs reconciliation:", cleanupError);
      }
    }
    return json({error: error instanceof Error ? error.message : "Card payment failed. Try another method."}, 400);
  }
});
