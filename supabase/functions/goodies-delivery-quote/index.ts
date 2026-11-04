import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type AddressInput = {
  t?: string; apt?: string; inst?: string; city?: string; department?: string; country?: string;
  latitude?: number; longitude?: number;
};
type Point = { lat: number; lon: number };
type Route = { meters: number; geometry: unknown; origin: Point; destination: Point };
const validPoint = (lat: unknown, lon: unknown): boolean =>
  lat !== null && lat !== undefined && String(lat).trim() !== "" &&
  lon !== null && lon !== undefined && String(lon).trim() !== "" &&
  Number.isFinite(Number(lat)) && Number(lat) >= -90 && Number(lat) <= 90 &&
  Number.isFinite(Number(lon)) && Number(lon) >= -180 && Number(lon) <= 180;

function addressParts(address: AddressInput) {
  const raw = [address.t, address.city, address.department, address.country]
    .filter((part): part is string => typeof part === "string" && !!part.trim());
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const part of raw.flatMap(value => value.split(/[,\n/]+/))) {
    const normalized = part.trim().replace(/\s+/g, " ")
      .replace(/\bPuerto\s+Princessa\b/gi, "Puerto Princesa")
      .replace(/\bPuerto\s+Princesa\s+City\b/gi, "Puerto Princesa");
    const key = normalized.toLocaleLowerCase();
    if (normalized && !seen.has(key)) { seen.add(key); parts.push(normalized); }
  }
  return parts;
}

function countryCode(parts: string[]) {
  const joined = parts.join(" ").toLowerCase();
  if (joined.includes("philippines")) return "ph";
  if (joined.includes("haiti")) return "ht";
  if (joined.includes("dominican republic")) return "do";
  if (joined.includes("united states") || /\busa\b/.test(joined)) return "us";
  if (joined.includes("canada")) return "ca";
  return "";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function geocode(address: AddressInput, key: string, service: any): Promise<Point> {
  const parts = addressParts(address);
  if (!parts.length) throw new Error("Please enter a complete address.");
  const canonical = parts.join(", ");
  const cacheKey = await sha256(canonical.toLocaleLowerCase());
  const { data: cached } = await service.from("goodies_geocode_cache")
    .select("latitude,longitude").eq("address_hash", cacheKey)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (cached && validPoint(cached.latitude, cached.longitude)) {
    return { lat: Number(cached.latitude), lon: Number(cached.longitude) };
  }

  const localityParts = parts.length >= 4 ? parts.slice(-3, -1) : parts.length === 3 ? [parts[1]] : [];
  const streetSwap = parts.length > 3 && /\b(road|rd|street|st|avenue|ave|drive|dr|lane|ln|highway|hwy)\b/i.test(parts[1])
    ? [parts[1], parts[0], ...parts.slice(2)].join(", ")
    : "";
  const candidates = Array.from(new Set([
    canonical,
    parts.slice(1).join(", "),
    streetSwap,
  ].filter(Boolean)));
  const expectedCountry = countryCode(parts);
  for (const candidate of candidates) {
    const url = new URL("https://api.geoapify.com/v1/geocode/search");
    url.searchParams.set("text", candidate);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    if (expectedCountry) url.searchParams.set("filter", `countrycode:${expectedCountry}`);
    url.searchParams.set("apiKey", key);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Address lookup is temporarily unavailable. Please try again.");
    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    const result = results.find((item: any) => {
      const locality = [
        item?.city, item?.state, item?.county, item?.district, item?.suburb,
        item?.village, item?.municipality, item?.formatted,
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      const localityMatches = !localityParts.length || locality.includes(localityParts[0].toLocaleLowerCase());
      return validPoint(item?.lat, item?.lon) &&
        (!expectedCountry || String(item?.country_code || "").toLowerCase() === expectedCountry) &&
        localityMatches;
    });
    if (!result) continue;
    const point = { lat: Number(result.lat), lon: Number(result.lon) };
    await service.from("goodies_geocode_cache").upsert({
      address_hash: cacheKey, latitude: point.lat, longitude: point.lon,
      updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
    }, { onConflict: "address_hash" });
    return point;
  }
  throw new Error("We could not locate this address. Check the street, barangay, city and country, then try again.");
}

async function storeOrigin(store: any, key: string, service: any): Promise<Point> {
  if (validPoint(store.store_latitude, store.store_longitude)) {
    return { lat: Number(store.store_latitude), lon: Number(store.store_longitude) };
  }
  const point = await geocode({
    t: store.address || "",
    city: store.city || "",
    country: store.country || "",
  }, key, service);
  const { error } = await service.from("goodies_store_schedules")
    .update({ store_latitude: point.lat, store_longitude: point.lon, updated_at: new Date().toISOString() })
    .eq("store_id", store.store_id);
  if (error) throw error;
  return point;
}

async function routeKm(
  store: any, destination: Point, addressHash: string, key: string, service: any,
): Promise<Route> {
  const origin = await storeOrigin(store, key, service);
  const { data: cached } = await service.from("goodies_route_cache")
    .select("origin_latitude,origin_longitude,distance_m,route_geometry")
    .eq("store_id", store.store_id).eq("address_hash", addressHash)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (cached && Math.abs(Number(cached.origin_latitude) - origin.lat) < 0.000001 &&
      Math.abs(Number(cached.origin_longitude) - origin.lon) < 0.000001 &&
      Number(cached.distance_m) > 0) {
    return { meters: Number(cached.distance_m), geometry: cached.route_geometry, origin, destination };
  }

  const url = new URL("https://api.geoapify.com/v1/routing");
  url.searchParams.set("waypoints", `${origin.lat},${origin.lon}|${destination.lat},${destination.lon}`);
  url.searchParams.set("mode", "drive");
  url.searchParams.set("apiKey", key);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Road distance is temporarily unavailable. Please try again.");
  const payload = await response.json();
  const feature = payload?.features?.[0];
  const meters = Number(feature?.properties?.distance);
  if (!Number.isFinite(meters) || meters <= 0) throw new Error("No driving route was found for this store and delivery address.");
  const geometry = feature?.geometry || null;
  await service.from("goodies_route_cache").upsert({
    store_id: store.store_id, address_hash: addressHash,
    origin_latitude: origin.lat, origin_longitude: origin.lon,
    distance_m: Math.round(meters), route_geometry: geometry,
    updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  }, { onConflict: "store_id,address_hash" });
  return { meters, geometry, origin, destination };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geoKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!geoKey) return reply({ error: "Delivery routing is not configured yet." }, 503);
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return reply({ error: "Sign in to calculate delivery." }, 401);
    const authClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await authClient.auth.getUser();
    if (authError || !auth.user) return reply({ error: "Your session has expired. Please sign in again." }, 401);

    const body = await req.json();
    const address: AddressInput | null = body.address && typeof body.address === "object" ? body.address : null;
    if (!address || typeof address.t !== "string" || !address.t.trim()) {
      return reply({ error: "A complete delivery address is required." }, 400);
    }
    const distanceOnly = body.distance_only === true;
    const rawIds = Array.isArray(body.store_ids) ? body.store_ids : [body.store_id];
    const storeIds = [...new Set(rawIds.map((value: unknown) => String(value || "").trim()).filter(Boolean))];
    const limit = 8;
    if (!storeIds.length || storeIds.length > limit) {
      return reply({ error: `Choose between one and ${limit} stores.` }, 400);
    }

    const service: any = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: stores, error: storeError } = await service.from("goodies_store_schedules")
      .select("store_id,address,city,country,store_latitude,store_longitude,delivery_fee,delivery_pricing_mode,delivery_base_fee,delivery_per_km_fee,delivery_min_fee,delivery_max_fee,delivery_max_distance_km")
      .in("store_id", storeIds).eq("is_live", true);
    if (storeError) throw storeError;
    if (!stores || stores.length !== storeIds.length) return reply({ error: "One or more stores are no longer accepting orders." }, 404);

    const customerParts = addressParts(address);
    const addressHash = await sha256((validPoint(address.latitude, address.longitude)
      ? `${Number(address.latitude).toFixed(6)},${Number(address.longitude).toFixed(6)}`
      : customerParts.join(", ")).toLocaleLowerCase());
    const destination = validPoint(address.latitude, address.longitude)
      ? {lat: Number(address.latitude), lon: Number(address.longitude)}
      : await geocode(address, geoKey, service);
    const routeResults = await Promise.all(stores.map(async (store: any) => {
      try {
        const route = await routeKm(store, destination, addressHash, geoKey, service);
        const km = route.meters / 1000;
        const max = store.delivery_max_distance_km == null ? null : Number(store.delivery_max_distance_km);
        const outsideDeliveryArea = max != null && km > max;
        let fee = store.delivery_pricing_mode === "distance"
          ? Math.max(Number(store.delivery_min_fee) || 0, Number(store.delivery_base_fee || 0) + km * Number(store.delivery_per_km_fee || 0))
          : Math.max(0, Number(store.delivery_fee) || 0);
        if (store.delivery_pricing_mode === "distance" && store.delivery_max_fee != null) fee = Math.min(fee, Number(store.delivery_max_fee));
        return {
          store_id: store.store_id, distance_m: Math.round(route.meters), distance_km: Number(km.toFixed(2)),
          base_fee: Math.round(fee * 100) / 100, outside_delivery_area: outsideDeliveryArea,
          origin: route.origin, destination: route.destination, geometry: route.geometry, error: null,
        };
      } catch (error) {
        return {
          store_id: store.store_id, distance_m: null, distance_km: null, base_fee: null,
          outside_delivery_area: false, origin: null, destination: null, geometry: null,
          error: error instanceof Error ? error.message : "Road distance is unavailable for this store.",
        };
      }
    }));

    if (distanceOnly) return reply({
      stores: routeResults.map(({ store_id, distance_m, distance_km, outside_delivery_area, error }) =>
        ({ store_id, distance_m, distance_km, outside_delivery_area, error })),
    });
    const routeFailure = routeResults.find(route => route.error);
    if (routeFailure) return reply({ error: routeFailure.error, store_id: routeFailure.store_id }, 422);
    const routes = (routeResults as unknown as Array<{
      store_id: string; distance_m: number; distance_km: number; base_fee: number;
      outside_delivery_area: boolean; origin: Point; destination: Point; geometry: unknown; error: null;
    }>).sort((a, b) => storeIds.indexOf(a.store_id) - storeIds.indexOf(b.store_id));
    const outside = routes.find(route => route.outside_delivery_area);
    if (outside) return reply({
      error: "This address is outside a participating store's delivery area.",
      outside_delivery_area: true, store_id: outside.store_id, distance_km: outside.distance_km,
    }, 422);

    const { data: cms, error: cmsError } = await service.from("wantiss_cms_content")
      .select("payload").eq("content_key", "goodies.content").eq("locale", "en")
      .eq("status", "published").order("version", { ascending: false }).limit(1).maybeSingle();
    if (cmsError) throw cmsError;
    const policy = cms?.payload?.fees || {};
    const surchargeEnabled = policy.additionalStoreSurchargeEnabled === true;
    const flatFee = Math.max(0, Number(policy.additionalStoreFee) || 0);
    const perKm = Math.max(0, Number(policy.extraDistancePerKm) || 0);
    const extraKm = routes.slice(1).reduce((total, route) => total + route.distance_m / 1000, 0);
    const additionalStoreFee = surchargeEnabled ? flatFee * Math.max(0, routes.length - 1) : 0;
    const extraDistanceFee = surchargeEnabled ? Math.round(perKm * extraKm * 100) / 100 : 0;
    const baseTotal = routes.reduce((total, route) => total + route.base_fee, 0);
    const surchargeCents = Math.round((additionalStoreFee + extraDistanceFee) * 100);
    const surchargeBase = Math.floor(surchargeCents / routes.length);
    const surchargeRemainder = surchargeCents - surchargeBase * routes.length;
    const deliveryTotal = Math.round((baseTotal + surchargeCents / 100) * 100) / 100;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const inserts = routes.map((route, index) => ({
      customer_id: auth.user.id, store_id: route.store_id, address_payload: address,
      distance_m: route.distance_m,
      fee: Math.round((route.base_fee + (surchargeBase + (index < surchargeRemainder ? 1 : 0)) / 100) * 100) / 100,
      expires_at: expiresAt, origin_latitude: route.origin.lat, origin_longitude: route.origin.lon,
      destination_latitude: destination.lat, destination_longitude: destination.lon,
      route_geometry: route.geometry,
    }));
    const { data: quotes, error: quoteError } = await service.from("goodies_delivery_quotes")
      .insert(inserts).select("id,store_id,fee,expires_at");
    if (quoteError) throw quoteError;
    return reply({
      quote_id: quotes.length === 1 ? quotes[0].id : undefined,
      fee: quotes.length === 1 ? deliveryTotal : undefined,
      distance_m: routes.length === 1 ? routes[0].distance_m : undefined,
      distance_km: routes.length === 1 ? routes[0].distance_km : undefined,
      quote_ids: quotes.map((quote: any) => quote.id), quotes,
      stores: routes.map(({ store_id, distance_m, distance_km }) => ({ store_id, distance_m, distance_km })),
      base_delivery_fee: Math.round(baseTotal * 100) / 100,
      additional_store_fee: Math.round(additionalStoreFee * 100) / 100,
      extra_distance_fee: Math.round(extraDistanceFee * 100) / 100,
      delivery_fee: deliveryTotal, surcharge_enabled: surchargeEnabled, expires_in_seconds: 300,
    });
  } catch (error) {
    console.error("goodies-delivery-quote:", error);
    return reply({ error: error instanceof Error ? error.message : "Could not calculate delivery." }, 400);
  }
});
