import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('paid card disputes report pending or manual-review refunds without claiming no charge', async () => {
  const db=new PGlite();
  const check=(value:boolean,message:string)=>{if(!value)throw new Error(message);};
  try {
    await db.exec(`
      create schema auth;
      create function auth.uid() returns uuid language sql as $$select '10000000-0000-4000-8000-000000000001'::uuid$$;
      create table public.goodies_orders(id uuid primary key,customer_id uuid,order_code text,total numeric,
        status text,payment_method text,payment_status text,payment_provider_ref text,delivery_dispute_status text,
        vendor_delivered_at timestamptz,delivered_at timestamptz,cancelled_at timestamptz,updated_at timestamptz);
      create table public.wantiss_admin_audit_log(actor_user_id uuid,action text,resource_type text,resource_id text,reason text,before_state jsonb,after_state jsonb);
      create table public.test_notifications(recipient uuid,body text);
      -- Authorization and notification transport are dependencies, not under test here.
      create function public.goodies_admin_assert() returns void language plpgsql as $$begin return;end$$;
      create function public.goodies_order_notify(uuid,text,text,uuid,text,text,text) returns void language sql as $$insert into public.test_notifications values($1,$3)$$;
    `);
    const original=await Deno.readTextFile(new URL('../../migrations/20261104200000_goodies_admin_delivery_reports.sql',import.meta.url));
    const start=original.indexOf('create or replace function public.goodies_admin_resolve_delivery_dispute(');
    const end=original.indexOf('$function$;',start)+'$function$;'.length;
    await db.exec(original.slice(start,end));
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106021033_goodies_truthful_dispute_refund_notification.sql',import.meta.url)));
    let count=0;
    for (const [payment,provider,expected] of [
      ['paid','pi_synthetic','being processed'],
      ['partially_refunded','pi_synthetic','being processed'],
      ['refund_pending','pi_synthetic','being processed'],
      ['paid',null,'manual review'],
      ['refunded','pi_synthetic','already been refunded'],
    ]) {
      const id=`20000000-0000-4000-8000-${String(++count).padStart(12,'0')}`;
      await db.query(`insert into public.goodies_orders(id,customer_id,order_code,total,status,payment_method,payment_status,payment_provider_ref,delivery_dispute_status)
        values($1,'30000000-0000-4000-8000-000000000001','SYNTHETIC',10,'picked_up','card',$2,$3,'open')`,[id,payment,provider]);
      await db.query("select public.goodies_admin_resolve_delivery_dispute($1,'refund')",[id]);
      const messages=(await db.query<{body:string}>('select body from public.test_notifications')).rows;
      const body=messages[messages.length-1].body;
      check(body.includes(expected!), 'Notification must describe the actual refund state');
      check(!body.includes('not charged'), 'A charged card must never be described as uncharged');
    }
    check((await db.query('select * from public.wantiss_admin_audit_log')).rows.length===5,'Every dispute decision remains audited');
  } finally {await db.close();}
});
