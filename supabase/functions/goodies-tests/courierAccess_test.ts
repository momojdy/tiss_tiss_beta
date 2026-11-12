import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

// Real PostgreSQL engine in memory, synthetic rows only. No network/database credentials.
Deno.test('courier RPC migration enforces assignment, approval, expiry and role boundaries', async () => {
  const db = new PGlite();
  const courier = '10000000-0000-4000-8000-000000000001';
  const customer = '20000000-0000-4000-8000-000000000001';
  const other = '30000000-0000-4000-8000-000000000001';
  const business = '40000000-0000-4000-8000-000000000001';
  const otherBusiness = '40000000-0000-4000-8000-000000000002';
  const check = (condition: boolean, message: string) => {if (!condition) throw new Error(message);};
  async function asUser(id: string | null, role = 'authenticated') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id || '']);
    await db.exec(`set role ${role}`);
  }
  async function denied(code: string) {
    try {await db.query('select * from public.goodies_courier_orders()');}
    catch (error) {check((error as {code: string}).code === code, `Expected SQLSTATE ${code}`); return;}
    throw new Error('Unauthorized courier RPC succeeded');
  }
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      create table public.goodies_courier_roster(courier_id uuid primary key, is_approved boolean);
      create table public.business_members(business_id uuid, user_id uuid);
      create table public.goodies_orders(
        id uuid primary key, customer_id uuid, courier_id uuid, business_id uuid, status text,
        order_code text, address jsonb, contact_phone text, items jsonb, total numeric,
        payment_method text, payment_status text, payment_provider_ref text
      );
      create table public.goodies_delivery_assignments(
        id uuid primary key, order_id uuid, business_id uuid, courier_id uuid,
        status text, expires_at timestamptz, offered_at timestamptz default now()
      );
      alter table public.goodies_orders enable row level security;
      grant select on public.goodies_orders, public.business_members to authenticated;
      create policy customer_vendor_read on public.goodies_orders for select to authenticated using (
        customer_id=auth.uid() or exists(select 1 from public.business_members bm
          where bm.business_id=goodies_orders.business_id and bm.user_id=auth.uid())
      );
    `);
    await db.query('insert into public.goodies_courier_roster values ($1,true),($2,false)', [courier, other]);
    for (let index = 1; index <= 9; index++) {
      const id = `50000000-0000-4000-8000-${String(index).padStart(12,'0')}`;
      await db.query(`insert into public.goodies_orders values
        ($1,$2,$3,$4,$5,$6,'{"t":"synthetic address"}','5550100','[]',15,'wallet','paid','private-provider-reference')`,
        [id, customer, index === 8 ? other : courier, business, index === 6 ? 'completed' : 'courier_assigned', `TEST-${index}`]);
      await db.query(`insert into public.goodies_delivery_assignments(id,order_id,business_id,courier_id,status,expires_at)
        values ($1,$1,$2,$3,$4,now()+$5::interval)`,
        [id, index === 9 ? otherBusiness : business, index === 5 ? other : courier,
          index === 1 ? 'accepted' : index === 2 ? 'picked_up' : index === 4 ? 'declined' : 'offered',
          index === 7 ? '-1 minute' : '1 minute']);
    }
    await asUser(courier);
    check((await db.query('select * from public.goodies_orders')).rows.length === 0,
      'Baseline defect must reproduce: couriers cannot read orders directly');
    await db.exec('reset role');
    const migration = await Deno.readTextFile(new URL('../../migrations/20261106015226_goodies_courier_scoped_order_read.sql', import.meta.url));
    await db.exec(migration);
    await asUser(null, 'anon'); await denied('42501');
    await asUser(null); await denied('28000');
    await asUser(customer); await denied('42501');
    await asUser(other); await denied('42501');
    await asUser(courier);
    const result = await db.query<{order_code: string}>('select * from public.goodies_courier_orders()');
    check(result.rows.length === 3, 'Only accepted, picked-up and unexpired offered assignments are visible');
    check(result.rows.every(row => ['TEST-1','TEST-2','TEST-3'].includes(row.order_code)), 'Cross-courier, mismatched-business, expired and terminal rows are excluded');
    check(!('payment_provider_ref' in result.rows[0]), 'Provider references must never be returned');
    await db.exec('reset role');
    await db.query('update public.goodies_courier_roster set is_approved=false where courier_id=$1', [courier]);
    await asUser(courier); await denied('42501');
    await db.exec('reset role');
    await db.exec('begin');
    await db.exec('drop function public.goodies_courier_orders()');
    await db.exec('rollback');
    check((await db.query<{restored?: boolean; removed?: boolean}>("select to_regprocedure('public.goodies_courier_orders()') is not null as restored")).rows[0].restored === true, 'Transactional rollback restores the RPC');
    await db.exec('drop function public.goodies_courier_orders()');
    check((await db.query<{restored?: boolean; removed?: boolean}>("select to_regprocedure('public.goodies_courier_orders()') is null as removed")).rows[0].removed === true, 'Documented recovery removes the new RPC');
  } finally {await db.close();}
});
