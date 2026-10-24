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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(503, { error: "Published content is not configured" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid JSON body" }); }
  const locale = String(body.locale || "en");
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(locale)) return reply(400, { error: "Invalid locale" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: content, error: contentError } = await admin.rpc("wantiss_cms_published_content", { p_locale: locale });
  if (contentError) return reply(503, { error: "Published content is temporarily unavailable" });

  const { data: assets, error: assetError } = await admin
    .from("wantiss_cms_assets")
    .select("asset_key,storage_path,content_type,byte_size,alt_text")
    .eq("status", "published");
  if (assetError) return reply(503, { error: "Published assets are temporarily unavailable" });

  const publishedAssets = await Promise.all((assets || []).map(async asset => {
    const { data, error } = await admin.storage.from("wantiss-cms-assets").createSignedUrl(asset.storage_path, 300);
    if (error || !data?.signedUrl) return null;
    return { asset_key: asset.asset_key, url: data.signedUrl, content_type: asset.content_type, byte_size: asset.byte_size, alt_text: asset.alt_text };
  }));

  return new Response(JSON.stringify({ content: content || [], assets: publishedAssets.filter(Boolean) }), {
    status: 200, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
});

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
