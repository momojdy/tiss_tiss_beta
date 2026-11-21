import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message
    : typeof (error as any)?.message === "string" ? (error as any).message
    : "Unable to create card setup session";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripePublishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey || !stripePublishableKey) {
      throw new Error("Card setup is not configured yet.");
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-08-26.dahlia" });
    const { data: existingCustomer, error: customerLookupError } = await supabase
      .from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (customerLookupError) throw customerLookupError;
    let stripeCustomerId = existingCustomer?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ metadata: { wantiss_user_id: user.id } });
      stripeCustomerId = customer.id;
      const { error: insertCustomerError } = await supabase
        .from("stripe_customers").insert({ user_id: user.id, stripe_customer_id: stripeCustomerId });
      if (insertCustomerError) {
        const { data: existingAfterRace } = await supabase
          .from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
        if (existingAfterRace?.stripe_customer_id) stripeCustomerId = existingAfterRace.stripe_customer_id;
        else throw insertCustomerError;
      }
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { wantiss_user_id: user.id, wantiss_purpose: "save_card" },
    });
    return json({
      client_secret: setupIntent.client_secret,
      publishable_key: stripePublishableKey,
      setup_intent_id: setupIntent.id,
    });
  } catch (error) {
    console.error("create-card-setup-intent error:", error);
    return json({ error: messageOf(error) }, 500);
  }
});
