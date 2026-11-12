import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('Shared Bill funding is denied by the backend while recovery access is preserved',async()=>{
 const db=new PGlite();
 try{
  await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
  // Traps prove that denied calls cannot enter the money-moving implementation.
  await db.exec(`create function public.help_pay_create_request(text,bigint,text,jsonb) returns uuid language plpgsql security definer as $$begin raise exception 'MONEY_BOUNDARY_ENTERED' using errcode='P4999';end$$;
   create function public.help_pay_contribute_wallet(uuid,bigint,text) returns jsonb language plpgsql security definer as $$begin raise exception 'MONEY_BOUNDARY_ENTERED' using errcode='P4999';end$$;
   create function public.help_pay_status(uuid) returns jsonb language sql as $$select '{"ok":true}'::jsonb$$;
   create function public.help_pay_cancel_request(uuid) returns jsonb language sql as $$select '{"ok":true}'::jsonb$$;
   grant execute on function public.help_pay_create_request(text,bigint,text,jsonb),public.help_pay_contribute_wallet(uuid,bigint,text),public.help_pay_status(uuid),public.help_pay_cancel_request(uuid) to authenticated;`);
  const sql=await Deno.readTextFile(new URL('../../migrations/20261107021612_goodies_vendor_settlement.sql',import.meta.url));
  const gate=sql.match(/do \$shared_bill_release_gate\$[\s\S]*?\$shared_bill_release_gate\$;/)?.[0];
  if(!gate)throw new Error('Backend release gate is missing');
  await db.exec(gate);
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   for(const request of ["select public.help_pay_create_request('share',100,'synthetic-checkout-key','{}')","select public.help_pay_contribute_wallet('40000000-0000-4000-8000-000000000001',10,'synthetic-retry')"]){
    let code='';try{await db.query(request);}catch(error){code=(error as {code:string}).code;}
    if(code!=='42501')throw new Error(`${role} funding was not denied before execution: ${code}`);
   }
   await db.exec('reset role');
  }
  await db.exec('set role authenticated');
  for(const name of ['help_pay_status','help_pay_cancel_request']){
   const row=(await db.query<{value:{ok:boolean}}>(`select public.${name}('40000000-0000-4000-8000-000000000001') as value`)).rows[0];
   if(!row.value.ok)throw new Error('Existing request recovery was disabled');
  }
 }finally{await db.close();}
});
