import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type", "Access-Control-Allow-Methods":"POST,OPTIONS" };
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
async function geocode(address:string,key:string){
 const u=new URL("https://api.geoapify.com/v1/geocode/search");u.searchParams.set("text",address);u.searchParams.set("format","json");u.searchParams.set("limit","1");u.searchParams.set("apiKey",key);
 const r=await fetch(u);if(!r.ok)throw new Error("Address lookup is temporarily unavailable.");
 const item=(await r.json())?.results?.[0];if(!item||!Number.isFinite(Number(item.lat))||!Number.isFinite(Number(item.lon)))throw new Error("We could not locate the shop or delivery address. Please check the address.");
 return {lat:Number(item.lat),lon:Number(item.lon)};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,geoKey=Deno.env.get("GEOAPIFY_API_KEY");
  if(!geoKey)return reply({error:"Delivery routing is not configured yet."},503);
  const authorization=req.headers.get("Authorization")||"";if(!authorization.startsWith("Bearer "))return reply({error:"Sign in to calculate delivery."},401);
  const authClient=createClient(url,anon,{global:{headers:{Authorization:authorization}}});const {data:auth,error:authError}=await authClient.auth.getUser();
  if(authError||!auth.user)return reply({error:"Your session has expired. Please sign in again."},401);
  const body=await req.json(),storeId=String(body.store_id||""),address=body.address&&typeof body.address==="object"?body.address:null;
  if(!storeId||!address||typeof address.t!=="string"||!address.t.trim())return reply({error:"A store and complete delivery address are required."},400);
  const service=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:store,error:storeError}=await service.from("goodies_store_schedules").select("store_id,address,city,country,delivery_pricing_mode,delivery_base_fee,delivery_per_km_fee,delivery_min_fee,delivery_max_fee,delivery_max_distance_km").eq("store_id",storeId).eq("is_live",true).maybeSingle();
  if(storeError)throw storeError;if(!store)return reply({error:"This store is not accepting delivery orders."},404);
  if(store.delivery_pricing_mode!=="distance")return reply({error:"This store uses fixed delivery pricing."},409);
  const shopAddress=[store.address,store.city,store.country].filter(Boolean).join(", ");if(!shopAddress)return reply({error:"The shop needs a complete business address before distance delivery can be enabled."},409);
  const customerAddress=[address.t,address.apt,address.inst].filter(Boolean).join(", ");
  const [origin,destination]=await Promise.all([geocode(shopAddress,geoKey),geocode(customerAddress,geoKey)]);
  const routeUrl=new URL("https://api.geoapify.com/v1/routing");routeUrl.searchParams.set("waypoints",`${origin.lat},${origin.lon}|${destination.lat},${destination.lon}`);routeUrl.searchParams.set("mode","drive");routeUrl.searchParams.set("apiKey",geoKey);
  const routeResponse=await fetch(routeUrl);if(!routeResponse.ok)throw new Error("Road distance is temporarily unavailable. Please try again.");
  const route=await routeResponse.json(),distanceM=Number(route?.features?.[0]?.properties?.distance);
  if(!Number.isFinite(distanceM)||distanceM<=0)throw new Error("No driving route was found for this address.");
  const km=distanceM/1000,maxDistance=store.delivery_max_distance_km==null?null:Number(store.delivery_max_distance_km);
  if(maxDistance!=null&&km>maxDistance)return reply({error:"This address is outside the shop's delivery area.",outside_delivery_area:true,distance_km:Number(km.toFixed(2))},422);
  const raw=Number(store.delivery_base_fee)+km*Number(store.delivery_per_km_fee),floor=Number(store.delivery_min_fee||0),ceiling=store.delivery_max_fee==null?null:Number(store.delivery_max_fee);
  const fee=Math.round(Math.max(floor,ceiling==null?raw:Math.min(raw,ceiling))*100)/100;
  const {data:quote,error:quoteError}=await service.from("goodies_delivery_quotes").insert({customer_id:auth.user.id,store_id:storeId,address_payload:address,distance_m:Math.round(distanceM),fee,expires_at:new Date(Date.now()+300000).toISOString()}).select("id").single();
  if(quoteError)throw quoteError;return reply({quote_id:quote.id,fee,distance_km:Number(km.toFixed(2)),expires_in_seconds:300});
 }catch(error){console.error("goodies-delivery-quote:",error);return reply({error:error instanceof Error?error.message:"Could not calculate delivery."},400);}
});
