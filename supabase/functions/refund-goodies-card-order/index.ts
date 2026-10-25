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
  if (!url || !anonKey || !serviceKey) return json({ error: "Refund service is not configured" }, 503);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Sign in required" }, 401);
    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Sign in required" }, 401);

    const body = await req.json();
    const orderId = String(body.order_id || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) return json({ error: "A valid order ID is required" }, 400);

    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: order, error: orderError } = await service.from("goodies_orders")
      .select("id,business_id,customer_id,order_code,status,payment_method,payment_status,payment_provider_ref")
      .eq("id", orderId).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return json({ error: "Order not found" }, 404);
    if (order.payment_method !== "card") return json({ status: order.payment_status || "not_card" });
    if (order.payment_status === "refunded") return json({ status: "refunded" });
    if (!["declined", "expired", "cancelled"].includes(order.status) ||
        !["paid", "refund_pending"].includes(order.payment_status) || !order.payment_provider_ref) {
      return json({ error: "This order is not ready for a card refund" }, 409);
    }

    let authorized = user.id === order.customer_id;
    if (!authorized) {
      const { data: membership, error: membershipError } = await service.from("business_members")
        .select("business_id").eq("business_id", order.business_id).eq("user_id", user.id).maybeSingle();
      if (membershipError) throw membershipError;
      authorized = !!membership;
    }
    if (!authorized) return json({ error: "Not authorized for this order" }, 403);

    const { data: queueRow, error: queueReadError } = await service.from("goodies_card_refund_queue")
      .select("id,status").eq("order_id", order.id).maybeSingle();
    if (queueReadError) throw queueReadError;
    if (!queueRow) {
      const { error: enqueueError } = await service.from("goodies_card_refund_queue")
        .insert({ order_id: order.id, status: "pending", next_attempt_at: new Date().toISOString() });
      if (enqueueError && !String(enqueueError.message || "").toLowerCase().includes("duplicate")) throw enqueueError;
    }

    const { data: workerToken, error: tokenError } = await service.rpc("get_goodies_refund_worker_token");
    if (tokenError || !workerToken) throw tokenError || new Error("Refund worker token is unavailable");
    const workerResponse = await fetch(url.replace(/\/$/, "") + "/functions/v1/process-goodies-card-refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goodies-worker-token": workerToken },
      body: "{}",
    });
    const workerResult = await workerResponse.json().catch(() => ({}));
    if (!workerResponse.ok) throw new Error(workerResult.error || "Refund worker could not process the refund");
    const { data: latest, error: latestError } = await service.from("goodies_orders")
      .select("payment_status").eq("id", order.id).maybeSingle();
    if (latestError) throw latestError;
    return json({ order_id: order.id, status: latest?.payment_status || "refund_pending", worker: workerResult });
  } catch (e) {
    console.error("refund-goodies-card-order:", e);
    return json({ error: e instanceof Error ? e.message : "Refund processing failed" }, 500);
  }
});