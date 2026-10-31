-- Snapshot the Goodies platform commission for every new order.
-- The commission is 10% of product subtotal after discounts only.
-- Delivery fees, customer service fees and tips are excluded.
-- Historical orders retain a 0% commission; this does not retroactively debit vendors.

alter table public.goodies_orders
  add column if not exists commissionable_subtotal numeric(12,2) not null default 0,
  add column if not exists platform_commission_rate numeric(5,4) not null default 0.10,
  add column if not exists platform_commission_amount numeric(12,2) not null default 0,
  add column if not exists vendor_net_amount numeric(12,2) not null default 0;

-- Preserve historic vendor earnings: calculate the old product net but do not
-- apply the new fee to orders created before this migration.
update public.goodies_orders
set commissionable_subtotal = round(greatest(coalesce(subtotal, 0) - coalesce(discount, 0), 0), 2),
    platform_commission_rate = 0,
    platform_commission_amount = 0,
    vendor_net_amount = round(greatest(coalesce(subtotal, 0) - coalesce(discount, 0), 0), 2)
where commissionable_subtotal = 0
  and platform_commission_amount = 0
  and vendor_net_amount = 0;

create or replace function public.goodies_set_order_commission_snapshot()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if tg_op = 'INSERT' then
    new.platform_commission_rate := 0.10;
    new.commissionable_subtotal := round(
      greatest(coalesce(new.subtotal, 0) - coalesce(new.discount, 0), 0),
      2
    );
    new.platform_commission_amount := round(
      new.commissionable_subtotal * new.platform_commission_rate,
      2
    );
    new.vendor_net_amount := round(
      new.commissionable_subtotal - new.platform_commission_amount,
      2
    );
  else
    -- Order amounts and commission snapshots are immutable after checkout.
    -- Status, fulfilment, courier and payment-state updates remain unaffected.
    if new.subtotal is distinct from old.subtotal
       or new.discount is distinct from old.discount
       or new.delivery_fee is distinct from old.delivery_fee
       or new.service_fee is distinct from old.service_fee
       or new.tip is distinct from old.tip
       or new.total is distinct from old.total
       or new.commissionable_subtotal is distinct from old.commissionable_subtotal
       or new.platform_commission_rate is distinct from old.platform_commission_rate
       or new.platform_commission_amount is distinct from old.platform_commission_amount
       or new.vendor_net_amount is distinct from old.vendor_net_amount then
      raise exception 'Goodies order financial amounts and commission are immutable after checkout'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists goodies_orders_commission_snapshot_guard on public.goodies_orders;
create trigger goodies_orders_commission_snapshot_guard
before insert or update on public.goodies_orders
for each row execute function public.goodies_set_order_commission_snapshot();

revoke all on function public.goodies_set_order_commission_snapshot() from public, anon, authenticated;
