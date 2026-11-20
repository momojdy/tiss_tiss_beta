// Invoked only by the socket-only/native or network-isolated PostgreSQL harness.
const assert=require('node:assert/strict');
module.exports=async({sql,raceAfterLock,uid,business,product})=>{
 sql(`update public.businesses set hours=(select hours from public.goodies_store_schedules where business_id='${business}'),is_live=true,verification='verified' where id='${business}';update public.goodies_store_schedules set is_live=true where business_id='${business}';`);
 const cart=JSON.stringify([{id:product,q:1,p:10,options:{size:null,drink:false,discount_pct:0}}]);
 const checkout=key=>`select * from public.place_goodies_order_with_payment_once('${key}','wallet','race-store','pickup',null,null,'50937000000','${cart}'::jsonb,10,0,1,0,0,11,null,null)`;
 // The captured fixture omits platform table grants. Model an administrative
 // state change with a test-only definer instead of broadening client grants.
 sql("create function private.synthetic_goodies_restrict_business(p_business uuid) returns void language sql security definer set search_path='' as $$update public.businesses set verification='restricted' where id=p_business$$;revoke all on function private.synthetic_goodies_restrict_business(uuid) from public,anon,authenticated;grant execute on function private.synthetic_goodies_restrict_business(uuid) to service_role;");
 const restrict=`select private.synthetic_goodies_restrict_business('${business}')`;
 const server={role:'service_role',user:uid};
 const balance=()=>Number(sql(`select balance from public.wallets where user_id='${uid}'`));
 const stock=()=>Number(sql(`select stock from public.goodies_products where id='${product}'`));
 const orders=()=>Number(sql(`select count(*) from public.goodies_orders where business_id='${business}'`));
 let money=balance(),inventory=stock(),count=orders();
 let result=await raceAfterLock(restrict,checkout('restriction-before-checkout'),'restrict_checkout',[server,uid]);
 assert.equal(result[0].code,0,JSON.stringify(result));assert.notEqual(result[1].code,0,JSON.stringify(result));
 assert.match(result[1].stderr,/not accepting new orders/);assert.equal(balance(),money);assert.equal(stock(),inventory);assert.equal(orders(),count);
 console.log('PASS: a committed restriction blocks a waiting checkout without a debit, order or stock reservation.');
 sql(`update public.businesses set verification='verified' where id='${business}';`);
 result=await raceAfterLock(checkout('checkout-before-restriction'),restrict,'checkout_restrict',[uid,server]);
 assert.equal(result.filter(x=>x.code===0).length,2,JSON.stringify(result));assert.equal(Math.round(balance()*100),Math.round(money*100)-1100);assert.equal(stock(),inventory-1);assert.equal(orders(),count+1);
 assert.match(sql(`select private.goodies_store_accepts_orders('${business}')`),/^(f|false)$/);
 console.log('PASS: an admitted checkout commits once before a waiting restriction, which then closes new admissions.');
 sql(`update public.businesses set verification='verified' where id='${business}';update public.goodies_store_schedules set is_live=false where business_id='${business}';`);
 result=await raceAfterLock(restrict,`select public.goodies_set_store_live('${business}',true)`,'restrict_publish',[server,uid]);
 assert.equal(result[0].code,0,JSON.stringify(result));assert.notEqual(result[1].code,0,JSON.stringify(result));assert.match(result[1].stderr,/not accepting new orders/);
 assert.match(sql(`select is_live from public.goodies_store_schedules where business_id='${business}'`),/^(f|false)$/);
 sql(`update public.businesses set verification='verified' where id='${business}';update public.goodies_store_schedules set is_live=true where business_id='${business}';`);
 console.log('PASS: publication waits for a restriction decision and cannot republish the restricted shop.');
};
