import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

/** Integration of actual captured tables/functions/triggers/ACLs, synthetic data.
 * This is PostgreSQL integration, not Supabase HTTP, provider or device E2E. */
Deno.test('wallet checkout, authorization, fulfillment and cancellation stay atomic and synchronized',async()=>{
  const db=new PGlite();
  const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const customer=id(1),vendor=id(2),otherCustomer=id(3),otherVendor=id(4),business=id(5),product=id(6),admin=id(7);
  const check=(condition:boolean,message:string)=>{if(!condition)throw new Error(message);};
  async function as(uid:string,role='authenticated'){
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
    await db.query("select set_config('request.jwt.claim.role',$1,false)",[role]);await db.exec(`set role ${role}`);
  }
  async function denied(sql:string,params:unknown[]){let rejected=false;try{await db.query(sql,params);}catch{rejected=true;}check(rejected,'Unauthorized or invalid operation succeeded');}
  const cart=JSON.stringify([{id:product,k:product,p:10,q:1,options:{size:null,drink:false,discount_pct:0}}]);
  const checkout=`select * from public.place_goodies_order_with_payment_once($1,'wallet','synthetic-store','pickup',null,null,'2025550100',$2::jsonb,10,0,1,0,0,11,null,null)`;
  try{
    await db.exec(await Deno.readTextFile(new URL('./fixtures/goodies-core.sql',import.meta.url)));
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106025454_goodies_product_moderation_enforcement.sql',import.meta.url)));
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106030151_goodies_role_notifications.sql',import.meta.url)));
    for(const uid of [customer,vendor,otherCustomer,otherVendor,admin]){
      await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[uid]);
      await db.query('insert into public.profiles(id,full_name) values($1,$2)',[uid,'Synthetic account']);
    }
    await db.query("insert into public.wantiss_admin_staff(user_id,display_name,role,status) values($1,'Synthetic administrator','super_admin','active')",[admin]);
    await db.query("insert into public.businesses(id,name) values($1,'Synthetic merchant')",[business]);
    await db.query("insert into public.business_members(business_id,user_id,role) values($1,$2,'owner')",[business,vendor]);
    await db.query(`insert into public.goodies_store_schedules(business_id,store_id,category,is_live,delivery_modes,delivery_fee,min_order,hours)
      values($1,'synthetic-store','groceries',true,array['pickup','delivery'],2,0,$2::jsonb)`,[business,JSON.stringify(Object.fromEntries(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=>[day,{open:'00:00',close:'00:00',closed:false}])))]);
    await db.query("insert into public.goodies_products(id,business_id,name,price,stock,is_available,review_status,restriction) values($1,$2,'Synthetic product',10,20,true,'approved','none')",[product,business]);
    await as(admin);await db.query("select public.goodies_admin_review_product($1,'approved','Synthetic review')",[product]);await db.exec('reset role');
    await db.query("insert into public.wallets(user_id,balance) values($1,100)",[customer]);
    await db.query(`insert into public.wantiss_cms_content(content_key,locale,version,status,payload,created_by,updated_by)
      values('goodies.content','en',1,'published',$1::jsonb,$2,$2)`,[JSON.stringify({v:5,fees:{svc:1,tips:'0,2,5',pay:{Wallet:true,Card:true,Cash:false}},deals:[]}),vendor]);
    await as(customer);
    await denied(checkout,['synthetic-invalid-price',cart.replace('"p":10','"p":0.01')]);
    const placed=(await db.query<{id:string;status:string}>(checkout,['synthetic-checkout-1',cart])).rows[0];
    check(!!placed?.id && placed.status==='placed','Checkout creates a real order');
    const retry=(await db.query<{id:string}>(checkout,['synthetic-checkout-1',cart])).rows[0];
    check(retry.id===placed.id,'Retry returns the original order');
    await denied(checkout,['synthetic-checkout-1',cart.replace('"q":1','"q":2')]);
    await as(otherCustomer);
    check((await db.query('select id from public.goodies_orders')).rows.length===0,'Another customer cannot read the order');
    await denied('select public.set_goodies_order_status($1,$2)',[placed.id,'cancelled']);
    await as(otherVendor);
    await denied('select public.accept_goodies_order($1)',[placed.id]);
    await as(vendor);
    await db.query('select public.accept_goodies_order($1)',[placed.id]);
    await denied('select public.set_goodies_order_status($1,$2)',[placed.id,'completed']);
    await db.query('select public.set_goodies_order_status($1,$2)',[placed.id,'preparing']);
    await db.query('select public.set_goodies_order_status($1,$2)',[placed.id,'ready']);
    await db.query('select public.set_goodies_order_status($1,$2)',[placed.id,'completed']);
    await as(customer);
    await denied('select public.set_goodies_order_status($1,$2)',[placed.id,'cancelled']);
    const cancelled=(await db.query<{id:string}>(checkout,['synthetic-checkout-2',cart])).rows[0];
    await db.query('select public.set_goodies_order_status($1,$2)',[cancelled.id,'cancelled']);
    await denied('select public.set_goodies_order_status($1,$2)',[cancelled.id,'cancelled']);
    await db.exec('reset role');
    const balance=Number((await db.query<{balance:string}>('select balance from public.wallets where user_id=$1',[customer])).rows[0].balance);
    check(balance===89,'Only the fulfilled order remains charged');
    check(Number((await db.query<{stock:number}>('select stock from public.goodies_products where id=$1',[product])).rows[0].stock)===19,'Cancellation restores stock exactly once');
    check((await db.query("select id from public.wallet_transactions where activity_type='goodies_order_payment'")).rows.length===2,'One debit per distinct checkout');
    check((await db.query("select id from public.wallet_transactions where activity_type='goodies_order_refund'")).rows.length===1,'Exactly one cancellation refund');
    check((await db.query('select id from public.notifications where user_id=$1',[customer])).rows.length>0,'Lifecycle writes real notification records for the customer');
    check((await db.query("select id from public.notifications where user_id=$1 and destination='business_goodies_orders' and metadata->>'business_id'=$2",[vendor,business])).rows.length>0,'Vendor order notices carry the correct business and page');
  }finally{await db.close();}
});
