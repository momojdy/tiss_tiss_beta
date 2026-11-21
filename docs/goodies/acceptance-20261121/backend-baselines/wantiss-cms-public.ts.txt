import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });

function assetUrl(projectUrl: string, assetKey: string) {
  const url = new URL("/functions/v1/wantiss-cms-public", projectUrl);
  url.searchParams.set("asset_file", assetKey);
  return url.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "GET") return reply(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(503, { error: "CMS delivery is not configured" });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const params = new URL(req.url).searchParams;
  const fileKey = params.get("asset_file");
  if (fileKey) {
    const { data: asset, error } = await admin.from("wantiss_cms_assets")
      .select("storage_path,content_type").eq("asset_key", fileKey).eq("status", "published").maybeSingle();
    if (error) return reply(500, { error: "Published asset could not be loaded" });
    if (!asset) return reply(404, { error: "Published asset not found" });
    const { data: file, error: downloadError } = await admin.storage.from("wantiss-cms-assets").download(asset.storage_path);
    if (downloadError || !file) return reply(404, { error: "Published asset file is unavailable" });
    return new Response(file, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": asset.content_type || "application/octet-stream",
        "Cache-Control": "public, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const assetKey = params.get("asset_key");
  if (assetKey) {
    const { data: asset, error } = await admin.from("wantiss_cms_assets")
      .select("asset_key,content_type,alt_text").eq("asset_key", assetKey).eq("status", "published").maybeSingle();
    if (error) return reply(500, { error: "Published asset could not be loaded" });
    if (!asset) return reply(404, { error: "Published asset not found" });
    return reply(200, { ...asset, url: assetUrl(url, asset.asset_key) });
  }

  const locale = params.get("locale") || "en";
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(locale)) return reply(400, { error: "Invalid locale" });
  const [{ data: content, error: contentError }, { data: assets, error: assetError }] = await Promise.all([
    admin.rpc("wantiss_cms_published_content", { p_locale: locale }),
    admin.from("wantiss_cms_assets").select("asset_key,content_type,alt_text")
      .eq("status", "published").order("created_at", { ascending: false }).limit(100),
  ]);
  if (contentError || assetError) return reply(500, { error: "Published content could not be loaded" });
  const publishedAssets = (assets || []).map(asset => ({
    ...asset,
    url: assetUrl(url, asset.asset_key),
  }));
  return reply(200, { locale, content: content || [], assets: publishedAssets, generated_at: new Date().toISOString() });
});
