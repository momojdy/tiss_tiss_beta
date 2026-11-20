import {sharedBillHarness,sbUsers as u,sbId,sbCheck as check} from './sharedBillHarness.ts';

Deno.test('expired Goodies groups close without touching checked-out or future invitations',async()=>{
 const h=await sharedBillHarness(),{db}=h;
 try{
  await h.root();
  await db.exec(await Deno.readTextFile(new URL('../../migrations/20261120222000_goodies_group_expiry_worker.sql',import.meta.url)));
  const old=sbId(110),fresh=sbId(111),paid=sbId(112);
  for(const [id,code,expires] of [[old,'EXPIRED1','-1 day'],[fresh,'FRESH001','+1 day'],[paid,'PAID0001','-1 day']] as const){
   await db.query(`insert into public.goodies_group_orders(id,invite_code,store_id,host_user_id,status,expires_at)
        values($1,$2,'shared-bill-test',$3,$4,now()+($5)::interval)`,
      [id,code,u.host,id===paid?'checked_out':'open',expires]);
  }
  await db.exec('reset role');
  check((await db.query<{n:number}>('select private.goodies_expire_group_orders() n')).rows[0].n===1,'Exactly one expired open group must be closed');
  const rows=(await db.query<{id:string;status:string}>('select id,status from public.goodies_group_orders where id=any($1::uuid[])',[ [old,fresh,paid] ])).rows;
  const status=new Map(rows.map(row=>[row.id,row.status]));
  check(status.get(old)==='expired','Expired group did not close');
  check(status.get(fresh)==='open','Future group changed');
  check(status.get(paid)==='checked_out','Checked out group changed');
  check((await db.query<{n:number}>('select private.goodies_expire_group_orders() n')).rows[0].n===0,'Expiry worker must be idempotent');
  check((await db.query<{count:number}>('select count(*)::int as count from public.goodies_orders')).rows[0].count===0,'Worker unexpectedly created a payment order');
 }finally{await db.close();}
});
