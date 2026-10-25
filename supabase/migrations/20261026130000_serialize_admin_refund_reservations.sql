-- Serialize refund reservations across both legacy and current admin workflows.
-- This migration changes database definitions only; it does not execute refunds,
-- alter wallet balances, or rewrite existing financial records.
--
-- Both request paths lock the same source wallet_transactions row FOR UPDATE
-- before reading reservations. This prevents two concurrent requests through
-- different RPCs from each seeing the same refundable remainder.

create or replace function public.wantiss_admin_request_financial_action(
  p_action_type text,
  p_transaction_id uuid,
  p_target_user_id uuid,
  p_amount numeric,
  p_direction text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_tx public.wallet_transactions%rowtype;
  v_id uuid;
  v_reserved numeric := 0;
begin
  if v_actor is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  if p_action_type = 'wallet_adjustment' then
    if not public.wantiss_has_permission('finance.adjust', 'manage') then
      raise exception 'Not authorized' using errcode = '42501';
    end if;
    if p_direction not in ('credit', 'debit') then
      raise exception 'Invalid adjustment direction';
    end if;
  elsif p_action_type = 'refund_request' then
    if not public.wantiss_has_permission('finance.refund', 'manage') then
      raise exception 'Not authorized' using errcode = '42501';
    end if;
    if p_transaction_id is null then
      raise exception 'A source transaction is required';
    end if;

    -- A row-level exclusive lock serializes refund requests made through
    -- either admin RPC, including concurrent requests from separate staff.
    select *
      into v_tx
      from public.wallet_transactions
     where id = p_transaction_id
     for update;

    if not found
       or v_tx.user_id is distinct from p_target_user_id
       or coalesce(v_tx.status, '') not in ('completed', 'succeeded', 'paid') then
      raise exception 'A completed transaction belonging to this user is required';
    end if;

    if p_amount is null or p_amount <= 0 then
      raise exception 'Invalid refund amount';
    end if;

    select
      coalesce((
        select sum(r.amount)
          from public.wantiss_admin_refund_requests r
         where r.transaction_id = v_tx.id
           and r.status in ('pending', 'approved')
      ), 0)
      +
      coalesce((
        select sum(a.amount)
          from public.wantiss_admin_financial_actions a
         where a.transaction_id = v_tx.id
           and a.action_type = 'refund_request'
           and a.status in ('pending', 'pending_provider', 'approved')
      ), 0)
      into v_reserved;

    if p_amount > greatest(abs(v_tx.amount) - v_reserved, 0) then
      raise exception 'Refund request exceeds the remaining refundable amount';
    end if;
  else
    raise exception 'Unsupported financial action';
  end if;

  if p_target_user_id is null or p_amount is null or p_amount <= 0 or p_amount > 10000 then
    raise exception 'Invalid target or amount';
  end if;
  if length(trim(coalesce(p_reason, ''))) not between 10 and 500 then
    raise exception 'A reason between 10 and 500 characters is required';
  end if;

  if p_transaction_id is not null and p_action_type = 'wallet_adjustment'
     and not exists (
       select 1
         from public.wallet_transactions
        where id = p_transaction_id
          and user_id = p_target_user_id
     ) then
    raise exception 'Source transaction does not belong to the target user';
  end if;

  insert into public.wantiss_admin_financial_actions(
    action_type, transaction_id, target_user_id, direction, amount, reason, requested_by
  )
  values (
    p_action_type, p_transaction_id, p_target_user_id, p_direction, p_amount, trim(p_reason), v_actor
  )
  returning id into v_id;

  insert into public.wantiss_admin_audit_log(
    actor_user_id, action, resource_type, resource_id, reason, after_state
  )
  values (
    v_actor, 'financial_action_requested', p_action_type, v_id::text, trim(p_reason),
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'target_user_id', p_target_user_id,
      'amount', p_amount,
      'direction', p_direction
    )
  );

  return v_id;
end;
$function$;

create or replace function public.wantiss_admin_request_refund(
  p_transaction_id uuid,
  p_amount numeric,
  p_reason text,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_tx public.wallet_transactions%rowtype;
  v_id uuid;
  v_reserved numeric := 0;
begin
  if v_actor is null or not public.wantiss_has_permission('finance.refund', 'manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 1000000
     or length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Invalid refund request';
  end if;

  -- Use the same lock as wantiss_admin_request_financial_action so the
  -- remaining refundable amount cannot be reserved twice across both paths.
  select *
    into v_tx
    from public.wallet_transactions
   where id = p_transaction_id
   for update;

  if not found or v_tx.status <> 'completed' then
    raise exception 'Only completed transactions can be refunded';
  end if;

  select
    coalesce((
      select sum(r.amount)
        from public.wantiss_admin_refund_requests r
       where r.transaction_id = v_tx.id
         and r.status in ('pending', 'approved')
    ), 0)
    +
    coalesce((
      select sum(a.amount)
        from public.wantiss_admin_financial_actions a
       where a.transaction_id = v_tx.id
         and a.action_type = 'refund_request'
         and a.status in ('pending', 'pending_provider', 'approved')
    ), 0)
    into v_reserved;

  if p_amount > greatest(abs(v_tx.amount) - v_reserved, 0) then
    raise exception 'Refund exceeds the remaining refundable amount';
  end if;

  insert into public.wantiss_admin_refund_requests(
    transaction_id, target_user_id, amount, reason, notes, created_by
  )
  values (
    v_tx.id, v_tx.user_id, round(p_amount, 2), trim(p_reason),
    left(coalesce(p_notes, ''), 4000), v_actor
  )
  returning id into v_id;

  insert into public.wantiss_admin_audit_log(
    actor_user_id, action, resource_type, resource_id, reason, after_state
  )
  values (
    v_actor, 'refund_requested', 'refund_request', v_id::text, trim(p_reason),
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'target_user_id', v_tx.user_id,
      'amount', round(p_amount, 2)
    )
  );

  return v_id;
end;
$function$;

-- Preserve the existing execute grants. These functions continue to enforce
-- staff permissions inside the SECURITY DEFINER body.
