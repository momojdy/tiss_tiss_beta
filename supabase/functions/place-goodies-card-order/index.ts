import Stripe from "npm:stripe@18.5.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: corsHeaders});
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {...corsHeaders, "Content-Type": "application/json"}});
  if (req.method !== "POST") return json({error: "Method not allowed"}, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeKey || !publishableKey || !url || !anonKey || !serviceKey) return json({error: "Payment service is not configured"}, 503);

  let authClient: SupabaseClient<any> | null = null;
  let service: SupabaseClient<any> | null = null;
  let stripe: Stripe;
  let userId = "";
  let orderId = "";
  let intent: Stripe.PaymentIntent | null = null;

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({error: "Sign in required"}, 401);
    authClient = createClient<any>(url, anonKey, {global: {headers: {Authorization: authorization}}});
    service = createClient<any>(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});
    const {data: {user}, error: authError} = await authClient.auth.getUser();
    if (authError || !user) return json({error: "Sign in required"}, 401);
    userId = user.id;

    const body = await req.json();
    stripe = new Stripe(stripeKey, {apiVersion: "2026-08-26.dahlia" as any});
    const action = String(body.action || "start");

    if (action === "capture" || action === "cancel") {
      if (action === "capture") {
        const {data: accessRows, error: accessError} = await authClient.rpc("get_my_goodies_access_status");
        if (accessError) return json({error: "Goodies access could not be verified. Please retry."}, 503);
        const access = Array.isArray(accessRows) ? accessRows[0] : accessRows;
        if (access?.status === "suspended" || access?.status === "banned") return json({error: access.status === "banned" ? "Your access to Goodies has been permanently restricted." : "Your access to Goodies is temporarily suspended."}, 403);
      }
      orderId = String(body.order_id || "");
      if (!orderId) return json({error: "Order is required"}, 400);
      const {data: order, error: orderError} = await service.from("goodies_orders")
        .select("id,customer_id,total,payment_method,payment_status,payment_provider_ref,status")
        .eq("id", orderId).eq("customer_id", userId).maybeSingle();
      if (orderError) throw orderError;
      if (!order || order.payment_method !== "card" || !order.payment_provider_ref) return json({error: "Card order not found"}, 404);
      intent = await stripe.paymentIntents.retrieve(order.payment_provider_ref);
      if (intent.metadata?.goodies_order_id !== order.id || intent.metadata?.wantiss_user_id !== userId || intent.currency !== "usd" || intent.amount !== Math.round(Number(order.total) * 100)) return json({error: "Payment authorization does not match this order"}, 409);

      if (action === "capture" && ["cancelled", "declined", "expired"].includes(order.status)) {
        if (["requires_capture", "requires_action", "requires_confirmation"].includes(intent.status)) await stripe.paymentIntents.cancel(intent.id, {}, {idempotencyKey: "goodies-closed-order-" + order.id});
        else if (intent.status === "succeeded") {
          const {error: refundQueueError} = await service.from("goodies_orders").update({payment_status: "refund_pending", updated_at: new Date().toISOString()}).eq("id", order.id).eq("customer_id", userId);
          if (refundQueueError) throw refundQueueError;
        } else if (intent.status !== "canceled") {
          return json({error: "The card payment is still processing. Please retry in a moment."}, 409);
        }
        await service.from("goodies_orders").update({payment_status: intent.status === "succeeded" ? "refund_pending" : "failed", updated_at: new Date().toISOString()}).eq("id", order.id).eq("customer_id", userId);
        return json({error: "This order was already closed and cannot be paid."}, 409);
      }
      if (action === "cancel" && !["scheduled", "placed"].includes(order.status)) return json({error: "This order can no longer be cancelled after the restaurant accepts it."}, 409);
      if (action === "cancel") {
        const captured = intent.status === "succeeded";
        if (["requires_capture", "requires_action", "requires_confirmation"].includes(intent.status)) await stripe.paymentIntents.cancel(intent.id, {}, {idempotencyKey: "goodies-cancel-" + order.id});
        else if (captured) {
          const {error: cancelError} = await authClient.rpc("set_goodies_order_status", {p_order_id: order.id, p_status: "cancelled"});
          if (cancelError) throw cancelError;
          const {error: refundPendingError} = await service.from("goodies_orders").update({payment_status: "refund_pending", updated_at: new Date().toISOString()}).eq("id", order.id).eq("customer_id", userId);
          if (refundPendingError) throw refundPendingError;
          return json({success: true, cancelled: true, payment_status: "refund_pending"});
        }
        else if (intent.status !== "canceled") return json({error: "The card payment is still processing. Please retry in a moment."}, 409);
        const {error: cancelError} = await authClient.rpc("set_goodies_order_status", {p_order_id: order.id, p_status: "cancelled"});
        if (cancelError) throw cancelError;
        const {error: statusError} = await service.from("goodies_orders").update({payment_status: "failed", updated_at: new Date().toISOString()}).eq("id", order.id).eq("customer_id", userId);
        if (statusError) throw statusError;
        return json({success: true, cancelled: true});
      }
      if (intent.status === "requires_capture") intent = await stripe.paymentIntents.capture(intent.id, {}, {idempotencyKey: "goodies-capture-" + order.id});
      if (intent.status !== "succeeded") return json({error: "Your bank has not completed card verification. Try again or use another card."}, 409);
      const {error: updateError} = await service.from("goodies_orders").update({payment_method: "card", payment_status: "paid", payment_provider_ref: intent.id, updated_at: new Date().toISOString()}).eq("id", order.id).eq("customer_id", userId);
      if (updateError) throw updateError;
      return json({success: true, payment_status: "paid", payment_intent_id: intent.id});
    }

    const {data: accessRows, error: accessError} = await authClient.rpc("get_my_goodies_access_status");
    if (accessError) return json({error: "Goodies access could not be verified. Please retry."}, 503);
    const access = Array.isArray(accessRows) ? accessRows[0] : accessRows;
    if (access?.status === "suspended" || access?.status === "banned") return json({error: access.status === "banned" ? "Your access to Goodies has been permanently restricted." : "Your access to Goodies is temporarily suspended."}, 403);

    const methodId = String(body.payment_method_id || "");
    const order = body.order || {};
    if (!methodId) return json({error: "Choose a saved card"}, 400);
    const {data: savedMethod, error: methodError} = await service.from("user_payment_methods").select("id,user_id,stripe_customer_id,stripe_payment_method_id").eq("id", methodId).eq("user_id", userId).maybeSingle();
    if (methodError) throw methodError;
    if (!savedMethod) return json({error: "That saved card is no longer available. Refresh your payment methods."}, 400);
    const {data: customer, error: customerError} = await service.from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
    if (customerError) throw customerError;
    if (!customer?.stripe_customer_id || customer.stripe_customer_id !== savedMethod.stripe_customer_id) return json({error: "The saved card is not connected to your Wantiss payment profile"}, 400);

    const idempotencyKey = String(body.idempotency_key || "").trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 200) return json({error: "A valid checkout key is required. Please retry checkout."}, 400);

    const {data: created, error: orderError} = await authClient.rpc("place_goodies_card_order_once", {p_idempotency_key: idempotencyKey, ...order, p_promo_code: order.p_promo_code || null});
    const row = Array.isArray(created) ? created[0] : created;
    if (orderError || !row?.id) throw orderError || new Error("The order could not be validated.");
    orderId = row.id;

    const {data: savedOrder, error: savedOrderError} = await service.from("goodies_orders")
      .select("id,total,customer_id,status,payment_status,payment_provider_ref")
      .eq("id", orderId).eq("customer_id", userId).single();
    if (savedOrderError) throw savedOrderError;
    if (["cancelled", "declined", "expired"].includes(savedOrder.status) || ["failed", "refunded", "refund_pending", "disputed", "disputed_lost"].includes(savedOrder.payment_status)) return json({error: "This checkout attempt has already ended. Start a new checkout."}, 409);
    if (savedOrder.payment_status === "paid") return json({success: true, id: row.id, order_code: row.order_code, status: row.status, payment_status: "paid"});

    const amount = Math.round(Number(savedOrder.total) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10000000) throw new Error("The validated order total is outside the supported card payment range.");

    if (savedOrder.payment_provider_ref) {
      intent = await stripe.paymentIntents.retrieve(savedOrder.payment_provider_ref);
      if (intent.metadata?.wantiss_purpose !== "goodies_order" || intent.metadata?.goodies_order_id !== orderId || intent.metadata?.wantiss_user_id !== userId || intent.amount !== amount || intent.currency !== "usd") return json({error: "The existing payment authorization does not match this order."}, 409);
      if (intent.status === "requires_action") return json({success: true, requires_action: true, id: row.id, order_code: row.order_code, status: row.status, client_secret: intent.client_secret, publishable_key: publishableKey, stripe_payment_method_id: savedMethod.stripe_payment_method_id});
      if (intent.status === "requires_capture") intent = await stripe.paymentIntents.capture(intent.id, {}, {idempotencyKey: "goodies-capture-" + orderId});
      if (intent.status === "succeeded") {
        const {error: paidError} = await service.from("goodies_orders").update({payment_method: "card", payment_status: "paid", payment_provider_ref: intent.id, updated_at: new Date().toISOString()}).eq("id", orderId).eq("customer_id", userId);
        if (paidError) throw paidError;
        return json({success: true, id: row.id, order_code: row.order_code, status: row.status, payment_status: "paid"});
      }
      return json({error: "The existing card authorization cannot be resumed. Start a new checkout."}, 409);
    }

    const stripeIdempotencyKey = "goodies-card-order-" + orderId;
    const createdIntent = await stripe.paymentIntents.create({amount, currency: "usd", customer: customer.stripe_customer_id, payment_method: savedMethod.stripe_payment_method_id, confirm: true, off_session: false, capture_method: "manual", metadata: {wantiss_user_id: userId, wantiss_purpose: "goodies_order", goodies_order_id: orderId}}, {idempotencyKey: stripeIdempotencyKey});
    if (createdIntent.metadata?.wantiss_purpose !== "goodies_order" || createdIntent.metadata?.goodies_order_id !== orderId || createdIntent.metadata?.wantiss_user_id !== userId || createdIntent.amount !== amount || createdIntent.currency !== "usd") throw new Error("Stripe returned a PaymentIntent that does not match this Goodies order.");
    intent = createdIntent;

    const {error: pendingUpdateError} = await service.from("goodies_orders").update({payment_method: "card", payment_status: intent.status === "requires_action" ? "requires_action" : "pending", payment_provider_ref: intent.id, updated_at: new Date().toISOString()}).eq("id", orderId).eq("customer_id", userId);
    if (pendingUpdateError) throw pendingUpdateError;
    if (intent.status === "requires_action") return json({success: true, requires_action: true, id: row.id, order_code: row.order_code, status: row.status, client_secret: intent.client_secret, publishable_key: publishableKey, stripe_payment_method_id: savedMethod.stripe_payment_method_id});
    if (intent.status === "requires_capture") intent = await stripe.paymentIntents.capture(intent.id, {}, {idempotencyKey: "goodies-capture-" + orderId});
    if (intent.status !== "succeeded") throw new Error("Your card could not be authorized. Try another saved card.");
    const {error: updateError} = await service.from("goodies_orders").update({payment_method: "card", payment_status: "paid", payment_provider_ref: intent.id, updated_at: new Date().toISOString()}).eq("id", orderId).eq("customer_id", userId);
    if (updateError) throw updateError;
    return json({success: true, id: row.id, order_code: row.order_code, status: row.status, payment_status: "paid"});
  } catch (error) {
    console.error("place-goodies-card-order:", error);
    if (orderId && authClient && service) {
      try {
        if (intent?.status === "requires_capture" || intent?.status === "requires_action" || intent?.status === "requires_confirmation") {
          await stripe!.paymentIntents.cancel(intent.id, {}, {idempotencyKey: "goodies-failed-" + orderId}).catch(() => undefined);
          await service.from("goodies_orders").update({payment_method: "card", payment_status: "failed", updated_at: new Date().toISOString()}).eq("id", orderId).eq("customer_id", userId);
        } else if (intent?.status === "succeeded") {
          const {error: statusError} = await authClient.rpc("set_goodies_order_status", {p_order_id: orderId, p_status: "cancelled"});
          if (statusError) console.error("Goodies card cleanup status update failed:", statusError);
          const {error: queueError} = await service.from("goodies_orders").update({payment_method: "card", payment_status: "refund_pending", updated_at: new Date().toISOString()}).eq("id", orderId).eq("customer_id", userId);
          if (queueError) console.error("Goodies card refund queueing failed:", queueError);
        } else {
          try { await authClient.rpc("set_goodies_order_status", {p_order_id: orderId, p_status: "cancelled"}); } catch {}
          await service.from("goodies_orders").update({payment_method: "card", payment_status: "failed", updated_at: new Date().toISOString()}).eq("id", orderId).eq("customer_id", userId);
        }
      } catch (cleanupError) { console.error("Goodies card cleanup needs reconciliation:", cleanupError); }
    }
    return json({error: error instanceof Error ? error.message : "Card payment failed. Try another method."}, 400);
  }
});
