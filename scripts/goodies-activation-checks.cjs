const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=({sql,root,order})=>{
 const read=name=>fs.readFileSync(path.join(root,'supabase/operations',name),'utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,'');
 const activate=read('goodies-activate-wallet-and-private-proofs.sql'),pause=read('goodies-pause-wallet-and-private-proofs.sql');
 const setup="update private.goodies_settlement_config set enabled=false,starts_at=null;update private.goodies_shared_bill_config set wallet_enabled=false;";
 const verify=condition=>`do $$begin if not (${condition}) then raise exception 'Synthetic activation assertion failed';end if;end$$;`;
 const legacy=order('wallet',11);
 const fingerprints="select jsonb_build_object('orders',(select jsonb_agg(to_jsonb(o) order by id) from public.goodies_orders o),'wallets',(select jsonb_agg(to_jsonb(w) order by id) from public.wallets w),'stock',(select jsonb_agg(jsonb_build_object('id',id,'stock',stock) order by id) from public.goodies_products),'ledgers',(select count(*) from public.wallet_transactions))";
 const before=sql(fingerprints);
 sql(`begin;${setup}${activate}${verify("public.help_pay_wallet_enabled() and public.goodies_private_delivery_proof_uploads_enabled() and (select enabled and starts_at is not null from private.goodies_settlement_config where singleton)")}
 ${verify(`not exists(select 1 from private.goodies_order_settlements where order_id='${legacy}')`)}
 ${verify("exists(select 1 from public.wantiss_admin_audit_log where action='goodies_wallet_and_private_proofs_activated' and after_state#>>'{opening_review,excluded_order_count}'='1' and after_state#>>'{opening_review,historical_credit_created}'='false')")}
 create temporary table synthetic_activation_snapshot as select starts_at,(select count(*) from public.wantiss_admin_audit_log) as audit_count from private.goodies_settlement_config;
 ${activate}${verify('(select c.starts_at=s.starts_at and (select count(*) from public.wantiss_admin_audit_log)=s.audit_count from private.goodies_settlement_config c cross join synthetic_activation_snapshot s)')}
 ${pause}${verify("not public.help_pay_wallet_enabled() and not public.goodies_private_delivery_proof_uploads_enabled() and (select not enabled and starts_at=(select starts_at from synthetic_activation_snapshot) from private.goodies_settlement_config)")}
 ${activate}${verify('(select starts_at=(select starts_at from synthetic_activation_snapshot) from private.goodies_settlement_config)')}
 rollback;`);
 assert.equal(sql(fingerprints),before,'Activation, pause and rollback changed existing financial records');
 console.log('PASS: activation enables all three gates, audits excluded historical orders, replays without duplicate audit, and pause/resume preserves the cutoff and existing money.');
 for(const [label,change] of [
  ['historical completed liabilities',`update public.goodies_orders set status='completed' where id='${legacy}';`],
  ['historical cash liabilities',`update public.goodies_orders set payment_method='cash' where id='${legacy}';`],
  ['enabled external payout channel',"update private.goodies_payout_channels set enabled=true where method='bank';"],
  ['public evidence bucket',"update storage.buckets set public=true where id='goodies-delivery-proofs';"],
  ['disabled Wallet checkout',"update public.wantiss_cms_content set payload=jsonb_set(payload,'{fees,pay,Wallet}','false') where content_key='goodies.content' and locale='en' and status='published';"],
  ['missing published configuration',"update public.wantiss_cms_content set status='archived' where content_key='goodies.content' and locale='en' and status='published';"],
  ['ordinary authenticated caller','set local role authenticated;'],
 ]){
  assert.throws(()=>sql(`begin;${setup}${change}${activate}rollback;`),undefined,label+' must prevent activation');
  assert.equal(sql(fingerprints),before,label+' failure changed money or orders');
  console.log('PASS: activation refuses '+label+' and rolls back without financial changes.');
 }
 sql(`delete from public.goodies_orders where id='${legacy}'`);
};
