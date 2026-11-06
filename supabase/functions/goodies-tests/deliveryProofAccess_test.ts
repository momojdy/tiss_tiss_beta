import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('private delivery evidence enforces customer, merchant, staff and object ownership', async () => {
  const db = new PGlite();
  const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const customer=id(1), vendor=id(2), stranger=id(3), admin=id(4), business=id(5), order=id(6);
  const proof=`${business}/${order}/synthetic-photo.jpg`;
  const check = (condition: boolean, message: string) => {if (!condition) throw new Error(message);};
  async function user(uid: string, role='authenticated') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
    await db.exec(`set role ${role}`);
  }
  async function denied(sql: string, parameters: unknown[] = []) {
    try {await db.query(sql,parameters);} catch (error) {
      check(['42501','22023','P0001'].includes((error as {code:string}).code), 'Expected authorization or validation error');return;
    }
    throw new Error('Unauthorized proof operation succeeded');
  }
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema private; create schema storage;
      grant usage on schema auth,private,storage to authenticated,anon;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.business_members(business_id uuid,user_id uuid,role text);
      create table public.goodies_orders(id uuid primary key,business_id uuid,customer_id uuid,
        self_delivery boolean,status text,vendor_delivered_at timestamptz,receipt_deadline_at timestamptz,
        delivery_proof_url text,updated_at timestamptz,order_code text);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));
      alter table storage.objects enable row level security;
      grant select,insert on storage.objects to authenticated;
      -- Only the authorization dependency and notification transport are fixtures.
      -- The migration's path validation, policies, and order transition run unchanged.
      create function public.goodies_admin_assert() returns void language plpgsql as $$begin
        if auth.uid() is distinct from '${admin}'::uuid then raise exception 'Denied' using errcode='42501'; end if;
      end$$;
      create function public.goodies_order_notify(uuid,text,text,uuid,text,text,text) returns void language plpgsql as $$begin return; end$$;
    `);
    await db.query("insert into public.business_members values($1,$2,'owner')",[business,vendor]);
    await db.query("insert into public.goodies_orders(id,business_id,customer_id,self_delivery,status,order_code) values($1,$2,$3,true,'picked_up','SYNTHETIC')",[order,business,customer]);
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106020705_goodies_private_delivery_proofs.sql',import.meta.url)));
    check((await db.query<{public:boolean}>("select public from storage.buckets where id='goodies-delivery-proofs'")).rows[0].public === false,'Evidence bucket must be private');
    await user(stranger);
    await denied("insert into storage.objects values('goodies-delivery-proofs',$1)",[proof]);
    await user(customer);
    await denied("insert into storage.objects values('goodies-delivery-proofs',$1)",[proof]);
    await user(vendor);
    await denied("insert into storage.objects values('goodies-delivery-proofs',$1)",[`../${proof}`]);
    await denied('select public.goodies_self_delivery_mark_delivered($1,$2)',[order,proof]);
    await db.query("insert into storage.objects values('goodies-delivery-proofs',$1)",[proof]);
    await user(customer);
    check((await db.query('select * from storage.objects')).rows.length===0,'Unsubmitted proof is private to its merchant');
    await user(vendor);
    await denied('select public.goodies_self_delivery_mark_delivered($1,$2)',[order,`https://attacker.invalid/storage/v1/object/public/listing-photos/${business}/delivery-proofs/${order}-fake.jpg`]);
    await db.query('select public.goodies_self_delivery_mark_delivered($1,$2)',[order,proof]);
    await denied('select public.goodies_self_delivery_mark_delivered($1,$2)',[order,proof]);
    for (const uid of [customer,vendor,admin]) {
      await user(uid);check((await db.query('select * from storage.objects')).rows.length===1,'Authorized party can retrieve published evidence');
    }
    await user(stranger);check((await db.query('select * from storage.objects')).rows.length===0,'Unrelated customers, merchants and couriers cannot read evidence');
    await user('', 'anon'); await denied('select public.goodies_self_delivery_mark_delivered($1,$2)',[order,proof]);
    await db.exec('reset role');
    const saved=(await db.query<{delivery_proof_url:string;receipt_deadline_at:Date}>('select delivery_proof_url,receipt_deadline_at from public.goodies_orders')).rows[0];
    check(saved.delivery_proof_url===proof && !!saved.receipt_deadline_at,'Only the private object reference is persisted with a receipt deadline');
  } finally {await db.close();}
});
