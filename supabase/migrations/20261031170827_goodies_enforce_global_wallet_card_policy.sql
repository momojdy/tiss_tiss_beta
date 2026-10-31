create or replace function public.goodies_require_cash_policy()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_store_accepts boolean;
  v_courier_available boolean;
  v_payment_context text;
  v_global_method_enabled boolean;
  v_method_key text;
begin
  v_payment_context := coalesce(current_setting('app.goodies_payment_context', true), '');

  if v_payment_context in ('wallet', 'card')
     and lower(coalesce(new.payment_method, '')) = 'cash' then
    v_method_key := case when v_payment_context = 'wallet' then 'Wallet' else 'Card' end;
    select exists (
      select 1 from public.wantiss_cms_content c
       where c.content_key = 'goodies.content'
         and c.locale = 'en'
         and c.status = 'published'
         and coalesce(c.payload #>> array['fees', 'pay', v_method_key], '0') in ('1', 'true', 'TRUE')
    ) into v_global_method_enabled;
    if not coalesce(v_global_method_enabled, false) then
      raise exception '% payments are disabled for Goodies.', v_method_key using errcode = 'P0001';
    end if;
    new.payment_method := v_payment_context;
    return new;
  end if;

  if v_payment_context = lower(coalesce(new.payment_method, ''))
     and v_payment_context in ('wallet', 'card') then
    return new;
  end if;

  if lower(coalesce(new.payment_method, '')) <> 'cash' then
    return new;
  end if;

  select coalesce(s.accept_cash_on_delivery, false) into v_store_accepts
    from public.goodies_store_schedules s
   where s.store_id = new.store_id and s.business_id = new.business_id and s.is_live;

  select exists (
    select 1 from public.goodies_courier_presence cp
    join public.goodies_courier_roster cr on cr.courier_id = cp.courier_id and cr.is_approved
    where cp.is_available and cp.accepts_cash_on_delivery
      and cp.updated_at > now() - interval '3 minutes'
      and not exists (
        select 1 from public.goodies_delivery_assignments a
        where a.courier_id = cp.courier_id and a.status in ('offered', 'accepted', 'picked_up')
      )
  ) into v_courier_available;

  if not public.goodies_cash_global_enabled()
     or not coalesce(v_store_accepts, false)
     or not coalesce(v_courier_available, false) then
    raise exception 'Cash on delivery is unavailable. The global policy, store, and an available courier must all permit it.'
      using errcode = 'P0001';
  end if;
  return new;
end
$function$;