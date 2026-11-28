const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=({sql,root,order,vendor,courier,offered})=>{
 const decline=order('wallet',11);
 const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261128171138_goodies_reject_null_order_decisions.sql'),'utf8');
 const recovery=fs.readFileSync(path.join(root,'supabase/operations/goodies-rollback-null-order-decisions.sql'),'utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,'');
 const actor=id=>`set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);`;
 const fingerprint=()=>sql("select jsonb_build_object('functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'owner',p.proowner,'acl',p.proacl,'definition',pg_get_functiondef(p.oid)) order by p.proname) from pg_proc p where p.oid in ('public.decline_goodies_order(uuid,text,text)'::regprocedure,'public.goodies_courier_respond_assignment(uuid,boolean)'::regprocedure)),'orders',(select jsonb_agg(to_jsonb(o) order by id) from public.goodies_orders o),'assignments',(select jsonb_agg(to_jsonb(a) order by id) from public.goodies_delivery_assignments a),'wallets',(select jsonb_agg(to_jsonb(w) order by id) from public.wallets w),'ledger',(select jsonb_agg(to_jsonb(w) order by id) from public.wallet_transactions w),'notifications',(select jsonb_agg(to_jsonb(n) order by id) from public.notifications n))");
 const before=fingerprint();
 // Reproduce both old behaviors only inside disposable transactions.
 assert.match(sql(`begin;${recovery}${actor(vendor)}select public.decline_goodies_order('${decline}',null,null);rollback;`),/declined/);
 assert.equal(fingerprint(),before,'Decline reproduction/recovery changed state');
 assert.match(sql(`begin;${recovery}${actor(courier)}select public.goodies_courier_respond_assignment('${offered}',null);reset role;select status from public.goodies_delivery_assignments where order_id='${offered}';rollback;`),/declined/);
 assert.equal(fingerprint(),before,'Courier reproduction/recovery changed state');
 for(const [id,call] of [[vendor,`public.decline_goodies_order('${decline}',null,null)`],[courier,`public.goodies_courier_respond_assignment('${offered}',null)`]]){
  sql(`begin;${actor(id)}do $$begin perform ${call};raise exception 'Null decision unexpectedly accepted';exception when sqlstate '22023' then null;end$$;rollback;`);
  assert.equal(fingerprint(),before,'Invalid decision changed financial, order, assignment or notification state');
 }
 sql(migration);sql(migration);assert.equal(fingerprint(),before,'Migration replay changed function ownership, grants or domain state');
 sql('begin;'+recovery+migration+'rollback;');assert.equal(fingerprint(),before,'Recovery transaction failed to restore protected definitions/state');
 console.log('PASS: old null decisions reproduce locally; both protected RPCs reject them with 22023, preserve state, and migration/recovery replay preserves owners and grants.');
 sql(`delete from private.goodies_order_settlements where order_id='${decline}';delete from public.goodies_orders where id='${decline}';`);
};
