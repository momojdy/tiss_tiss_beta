import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('group checkout compares reviewed items and totals before entering the wallet boundary',async t=>{
 const db=new PGlite();
 const host='40000000-0000-4000-8000-000000000001',other='40000000-0000-4000-8000-000000000002',business='40000000-0000-4000-8000-000000000003';
 const as=async(uid:string)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');};
 const check=async(group:string,address:unknown,code:string)=>{
  let actual='';try{await db.query("select * from public.goodies_group_order_checkout('synthetic-group-consent',$1,'pickup',null,$2::jsonb,'50937000000',0,null)",[group,address===null?null:JSON.stringify(address)]);}catch(error){actual=String((error as {code?:string}).code||'');}
  if(actual!==code)throw new Error(`Expected ${code}; got ${actual||'payment boundary unexpectedly returned'}`);
 };
 try{
  await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106022200_goodies_builder_selection_contract.sql',import.meta.url)));
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261120200500_goodies_group_checkout_estimate_usd.sql',import.meta.url)));
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261120200500_goodies_group_checkout_estimate_usd.sql',import.meta.url)));

  // An explicit synthetic trap verifies ordering without faking a payment success.
  await db.exec(`create or replace function public.place_goodies_order_with_payment_once(p_idempotency_key text,p_payment_method text,p_store_id text,p_order_type text,p_scheduled_for timestamptz,p_address jsonb,p_contact_phone text,p_items jsonb,p_subtotal numeric,p_delivery_fee numeric,p_service_fee numeric,p_discount numeric,p_tip numeric,p_total numeric,p_notes text,p_promo_code text default null)
   returns table(id uuid,order_code text,status text) language plpgsql security definer set search_path=public,pg_temp as $$begin
    if p_address ? '_goodies_expected_total' or p_address ? '_goodies_expected_items' then raise exception 'Review metadata leaked into address' using errcode='P4212';end if;
    raise exception 'SYNTHETIC_PAYMENT_BOUNDARY_NOT_EXECUTED' using errcode='P4211';end$$;`);
  for(const uid of [host,other])await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[uid]);
  await db.query("insert into public.businesses(id,name) values($1,'Synthetic consent store')",[business]);
  await db.query("insert into public.goodies_store_schedules(business_id,store_id,category,is_live) values($1,'synthetic-consent','groceries',true)",[business]);
  const product=(await db.query<{id:string}>("insert into public.goodies_products(business_id,name,price,stock,is_available,review_status) values($1,'Synthetic consent product',10,20,true,'approved') returning id",[business])).rows[0].id;
  const group=(await db.query<{id:string}>("insert into public.goodies_group_orders(invite_code,store_id,host_user_id) values('CONSENT1','synthetic-consent',$1) returning id",[host])).rows[0].id;
  await db.query("insert into public.goodies_group_order_members(group_id,user_id,role) values($1,$2,'host')",[group,host]);
  await db.query("insert into public.goodies_group_order_items(group_id,user_id,line_key,product_id,quantity) values($1,$2,'synthetic-line',$3,1)",[group,host,product]);
  await as(host);
  const preview=(await db.query<{value:{items:unknown[]}}>('select public.goodies_group_order_checkout_preview($1) as value',[group])).rows[0].value;
  const estimate=(await db.query<{value:{currency:string;subtotal:number;estimated_total:number}}>("select public.goodies_group_order_checkout_estimate($1,'pickup',null) as value",[group])).rows[0].value;
  if(estimate.currency!=='USD'||Number(estimate.subtotal)!==10||Number(estimate.estimated_total)<10)throw Error('Group estimate currency or amounts do not match USD Wallet checkout');
  const reviewed={_goodies_expected_total:10,_goodies_expected_items:preview.items};
  await t.step('matching review reaches only the explicit unpaid test boundary',()=>check(group,reviewed,'P4211'));
  await t.step('tampered or stale totals cannot enter payment',()=>check(group,{...reviewed,_goodies_expected_total:1},'P4210'));
  await t.step('incomplete review metadata cannot enter payment',()=>check(group,{_goodies_expected_total:10},'P4210'));
  await db.exec('reset role');await db.query('update public.goodies_group_order_items set quantity=2 where group_id=$1',[group]);await as(host);
  await t.step('a member cart change invalidates the approved snapshot',()=>check(group,reviewed,'P4210'));
  await as(other);await t.step('another customer cannot check out the host wallet',()=>check(group,reviewed,'42501'));
  await as(host);await t.step('existing clients keep the unchanged RPC signature',()=>check(group,null,'P4211'));
 }finally{await db.close();}
});
