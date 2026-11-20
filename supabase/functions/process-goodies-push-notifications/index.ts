import {createClient} from 'npm:@supabase/supabase-js@2';
import {runPushWorker} from './pushProcessor.ts';

Deno.serve(async(request:Request)=>{
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return Response.json({error:'Notification delivery is temporarily unavailable.'},{status:503});
 const service=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
 return runPushWorker(request,service,fetch,Deno.env.get('EXPO_ACCESS_TOKEN'));
});
