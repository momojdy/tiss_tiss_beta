import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bootstrapSecret = Deno.env.get("WANTISS_SUPER_ADMIN_BOOTSTRAP_SECRET");
  if (!url || !anonKey || !serviceKey || !bootstrapSecret) {
    return reply(503, { error: "Super Admin bootstrap is not configured" });
  }

  const authHeader = req.headers.get("Authorization");
  const suppliedSecret = req.headers.get("x-wantiss-bootstrap-secret");
  if (!authHeader || !suppliedSecret || !constantTimeEqual(suppliedSecret, bootstrapSecret)) {
    return reply(401, { error: "Unauthorized" });
  }

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) return reply(401, { error: "A valid Supabase Auth session is required" });

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: existing, error: readError } = await admin
    .from("wantiss_admin_staff")
    .select("user_id")
    .eq("role", "super_admin")
    .limit(1);
  if (readError) return reply(503, { error: "Admin schema is not ready" });
  if (existing?.length) return reply(409, { error: "Super Admin bootstrap has already been used" });

  const displayName = String(user.user_metadata?.full_name ?? user.email ?? "Super Admin").trim().slice(0, 120);
  const { error: insertError } = await admin.from("wantiss_admin_staff").insert({
    user_id: user.id,
    display_name: displayName || "Super Admin",
    role: "super_admin",
    status: "active",
  });
  if (insertError) return reply(409, { error: "Bootstrap failed; verify that this account is not already registered" });

  return reply(200, { ok: true, message: "First Super Admin created for the authenticated account" });
});

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
