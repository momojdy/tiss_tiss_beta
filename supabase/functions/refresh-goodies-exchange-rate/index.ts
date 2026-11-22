import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {runUsdHtgRefresh} from './refreshProcessor.ts';

Deno.serve((request:Request)=>{
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return Response.json({error:'Exchange rates are temporarily unavailable.'},{status:503});
 const service=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
 return runUsdHtgRefresh(request,service);
});
