-- Serialize Goodies fee-policy edits with CMS draft saves and publishing.
create or replace function public.goodies_admin_update_fee_policy(
  p_service_fee numeric,
  p_first_order_free boolean,
  p_wallet_enabled boolean,
  p_card_enabled boolean,
  p_cash_enabled boolean,
  p_tips numeric[]
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_row public.wantiss_cms_content%rowtype;
  v_fees jsonb;
begin
  perform public.goodies_admin_assert();

  if p_service_fee is null or p_service_fee < 0 or p_service_fee > 1000 then
    raise exception 'Service fee must be between 0 and 1000' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_tips, '{}'::numeric[])) t
    where t < 0 or t > 1000
  ) then
    raise exception 'Invalid tip preset' using errcode = '22023';
  end if;

  -- Use the same lock as CMS save/publish so neither operation can race the other.
  perform pg_advisory_xact_lock(hashtextextended('goodies.content:en', 0));

  select *
    into v_row
    from public.wantiss_cms_content
   where content_key = 'goodies.content'
     and locale = 'en'
     and status = 'published'
   order by version desc
   limit 1
   for update;
  if not found then
    raise exception 'Published Goodies CMS content not found' using errcode = 'P0002';
  end if;

  v_fees := coalesce(v_row.payload -> 'fees', '{}'::jsonb) || jsonb_build_object(
    'svc', p_service_fee,
    'first', coalesce(p_first_order_free, false),
    'tips', array_to_string(coalesce(p_tips, '{}'::numeric[]), ','),
    'pay', jsonb_build_object(
      'Wallet', coalesce(p_wallet_enabled, false),
      'MonCash', false,
      'Card', coalesce(p_card_enabled, false),
      'Cash', coalesce(p_cash_enabled, false)
    )
  );

  update public.wantiss_cms_content
     set payload = jsonb_set(v_row.payload, '{fees}', v_fees, true),
         updated_at = now()
   where id = v_row.id;
end;
$function$;