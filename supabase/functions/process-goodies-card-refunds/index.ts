import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { processRefundQueueItem } from "./refundProcessor.ts";

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

    const stripe = new Stripe(stripeKey);
    const { data: queue, error: queueError } = await service.rpc("claim_goodies_card_refunds", { p_limit: 25 });
    if (queueError) throw queueError;
    let refunded = 0, pending = 0, failed = 0;
    for (const item of queue || []) {
      const result = await processRefundQueueItem(item, stripe, service);
      if (result === "refunded") refunded++;
      else if (result === "pending") pending++;
      else failed++;
    }
    return json({ scanned: queue?.length || 0, refunded, pending, failed });
  } catch (e) {
    console.error("process-goodies-card-refunds:", e);
    return json({ error: e instanceof Error ? e.message : "Refund processing failed" }, 500);
  }
});