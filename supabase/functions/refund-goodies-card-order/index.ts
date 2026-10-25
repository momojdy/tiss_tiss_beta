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
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!url || !anonKey || !serviceKey || !stripeKey) return json({ error: "Refund service is not configured" }, 503);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Sign in required" }, 401);
    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Sign in required" }, 401);

    const body = await req.json();
    const orderId = String(body.order_id || "");
    if (!orderId) return json({ error: "Order ID is required" }, 400);
    const { data: order, error: orderError } = await service.from("goodies_orders")
      .select("id,customer_id,business_id,order_code,status,payment_method,payment_status,payment_provider_ref,total")
      .eq("id", orderId).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return json({ error: "Order not found" }, 404);

    let isVendor = false;
    if (order.business_id) {
      const { data: membership, error: membershipError } = await service.from("business_members")
        .select("user_id").eq("business_id", order.business_id).eq("user_id", user.id).maybeSingle();
      if (membershipError) throw membershipError;
      isVendor = !!membership;
    }
    if (order.customer_id !== user.id && !isVendor) return json({ error: "Not allowed" }, 403);
    if (!["declined", "expired", "cancelled"].includes(String(order.status))) {
      return json({ error: "Refund is only available for cancelled, declined, or expired orders" }, 409);
    }
    if (order.payment_method !== "card") return json({ refunded: false, reason: "This order was not paid by card" });
    if (order.payment_status === "refunded") return json({ refunded: true, already_refunded: true });
    if (!["paid", "refund_pending"].includes(String(order.payment_status)) || !order.payment_provider_ref) {
      return json({ refunded: false, reason: "No captured card payment is available to refund" });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-08-26.dahlia" });
    const existingRefunds = await stripe.refunds.list({ payment_intent: order.payment_provider_ref, limit: 10 });
    let refund = existingRefunds.data.find((item) => ["succeeded", "pending", "requires_action"].includes(String(item.status)));
    if (!refund) {
      const hadFailedRefund = existingRefunds.data.some((item) => ["failed", "canceled"].includes(String(item.status)));
      refund = await stripe.refunds.create({
        payment_intent: order.payment_provider_ref,
        reason: "requested_by_customer",
        metadata: { wantiss_order_id: order.id, wantiss_order_code: order.order_code },
      }, { idempotencyKey: "goodies-card-refund-" + order.id + (hadFailedRefund ? "-retry-" + Date.now() : "") });
    }

    if (refund.status === "failed" || refund.status === "canceled") {
      await service.from("goodies_orders").update({ payment_status: "refund_pending" }).eq("id", order.id);
      return json({ error: "The payment provider has not completed the refund. Please retry or contact support.", refund_status: refund.status }, 502);
    }

    const finalStatus = refund.status === "succeeded" ? "refunded" : "refund_pending";
    const { data: updated, error: updateError } = await service.from("goodies_orders").update({
      payment_status: finalStatus,
      payment_refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", order.id).eq("payment_status", order.payment_status).select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      const { data: latest } = await service.from("goodies_orders").select("payment_status").eq("id", order.id).maybeSingle();
      return json({ refunded: latest?.payment_status === "refunded", status: latest?.payment_status || "refund_pending", already_processing: true });
    }
    if (order.payment_status !== finalStatus) {
      const { error: notificationError } = await service.from("notifications").insert({
        user_id: order.customer_id,
        vendor_id: null,
        title: "Goodies card refund " + (finalStatus === "refunded" ? "issued" : "processing"),
        body: finalStatus === "refunded"
          ? "Your card refund for order " + order.order_code + " has been processed by your payment provider. It may take a few business days to appear."
          : "A card refund for order " + order.order_code + " has been submitted to your payment provider. It may take a few business days to appear on your statement.",
        notification_type: "goodies_order",
        feature_name: "Goodies",
        destination: "goodies/orders",
        metadata: { order_id: order.id, order_code: order.order_code, status: finalStatus },
      });
      if (notificationError) console.error("Goodies refund notification failed:", notificationError);
    }
    return json({ refunded: finalStatus === "refunded", status: finalStatus, refund_id: refund.id });
  } catch (error) {
    console.error("refund-goodies-card-order:", error);
    return json({ error: error instanceof Error ? error.message : "Could not process the card refund" }, 500);
  }
});
