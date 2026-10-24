import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply(503, { error: "Admin operations are not configured" });

  const authorization = req.headers.get("Authorization");
  if (!authorization) return reply(401, { error: "Sign in is required" });

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user || !user.email_confirmed_at) return reply(401, { error: "A verified staff session is required" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from("wantiss_admin_staff")
    .select("user_id,role,status").eq("user_id", user.id).maybeSingle();
  if (actorError) return reply(503, { error: "Staff permissions are unavailable" });
  if (!actor || actor.role !== "super_admin" || actor.status !== "active") {
    return reply(403, { error: "Only an active Super Admin may administer staff." });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid JSON body" }); }
  const action = String(body.action || "");

  if (action === "invite") {
    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.display_name || "").trim().slice(0, 120);
    const reason = String(body.reason || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return reply(400, { error: "A valid email is required" });
    if (displayName.length < 1 || reason.length < 3) return reply(400, { error: "Display name and invitation reason are required" });

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: displayName, wantiss_invite_accepted: false },
      redirectTo: Deno.env.get("WANTISS_ADMIN_INVITE_REDIRECT") || "wantiss-admin://accept-invite",
    });
    if (inviteError || !invited.user) return reply(409, { error: "Invitation could not be sent. Check whether this email already has an Auth account." });

    const { error: staffError } = await admin.from("wantiss_admin_staff").insert({
      user_id: invited.user.id,
      display_name: displayName,
      status: "active",
      role: "staff",
      created_by: user.id,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
      invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (staffError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      return reply(409, { error: "Staff record could not be created. No staff access was granted." });
    }
    const { error: auditError } = await admin.from("wantiss_admin_audit_log").insert({
      actor_user_id: user.id, action: "staff_invited", resource_type: "staff",
      resource_id: invited.user.id, reason,
      after_state: { email, display_name: displayName, status: "active", role: "staff", invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
    });
    if (auditError) {
      await admin.from("wantiss_admin_staff").delete().eq("user_id", invited.user.id);
      await admin.auth.admin.deleteUser(invited.user.id);
      return reply(500, { error: "Invitation audit failed. No staff access was created." });
    }
    return reply(200, { ok: true, user_id: invited.user.id, message: "Invitation email sent" });
  }

  if (action === "status") {
    const userId = String(body.user_id || "");
    const status = String(body.status || "");
    const reason = String(body.reason || "").trim();
    if (!userId || !["active", "suspended", "revoked"].includes(status) || reason.length < 3) {
      return reply(400, { error: "User ID, valid status, and reason are required" });
    }
    const { error } = await userClient.rpc("wantiss_admin_set_staff_status", {
      p_user_id: userId, p_status: status, p_reason: reason,
    });
    if (error) return reply(error.code === "42501" ? 403 : 400, { error: error.message });
    if (status !== "active") {
      const { data: target } = await admin.from("wantiss_admin_staff").select("user_id").eq("user_id", userId).maybeSingle();
      if (target) await admin.auth.admin.signOut(userId, "global");
    }
    return reply(200, { ok: true });
  }

  if (action === "grant") {
    const { data, error } = await userClient.rpc("wantiss_admin_grant_permission", {
      p_staff_user_id: String(body.user_id || ""),
      p_permission_key: String(body.permission_key || ""),
      p_access_level: String(body.access_level || ""),
      p_reason: String(body.reason || ""),
      p_expires_at: body.expires_at ? String(body.expires_at) : null,
    });
    if (error) return reply(error.code === "42501" ? 403 : 400, { error: error.message });
    return reply(200, { ok: true, grant_id: data });
  }

  if (action === "revoke") {
    const { error } = await userClient.rpc("wantiss_admin_revoke_permission", {
      p_grant_id: String(body.grant_id || ""),
      p_reason: String(body.reason || ""),
    });
    if (error) return reply(error.code === "42501" ? 403 : 400, { error: error.message });
    return reply(200, { ok: true });
  }

  return reply(400, { error: "Unsupported action" });
});

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
