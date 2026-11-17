import Stripe from 'npm:stripe@22.6.2';

Deno.test('expiry worker preserves the deployed Stripe API version with a compatible pinned SDK',async()=>{
 const source=await Deno.readTextFile(new URL('../expire-goodies-card-auth/index.ts',import.meta.url));
 const version=source.match(/apiVersion:\s*"([^"]+)"/)?.[1];
 // Read-only production source capture: expiry worker v1 uses this API version.
 if(version!=='2026-08-26.dahlia')throw Error('Expiry worker would change the deployed Stripe API contract');
 const requests:{method:string;version:string|null}[]=[];
 const stripe=new Stripe('sk_test_synthetic_not_a_real_provider_key',{
  apiVersion:version,
  httpClient:Stripe.createFetchHttpClient(async(_input,init)=>{
   requests.push({method:init?.method||'GET',version:new Headers(init?.headers).get('Stripe-Version')});
   return new Response(JSON.stringify({id:'pi_synthetic_api_compatibility',object:'payment_intent',status:'requires_action'}),{status:200,headers:{'Content-Type':'application/json','Request-Id':'synthetic-request'}});
  }),
 });
 const intent=await stripe.paymentIntents.retrieve('pi_synthetic_api_compatibility');
 if(intent.status!=='requires_action'||requests.length!==1||requests[0].version!==version)throw Error('Stripe SDK did not preserve the requested provider contract');
});
