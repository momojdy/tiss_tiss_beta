create table if not exists public.wantiss_admin_financial_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (action_type in ('wallet_adjustment','refund_request')),
  transaction_id uuid references public.wallet_transactions(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  direction text check (direction in ('credit','debit')),
  amount numeric(14,2) not null check (amount > 0 and amount <= 10000),
  reason text not null check (length(trim(reason)) between 10 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected','pending_provider')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wantiss_admin_financial_actions_status_created_idx
  on public.wantiss_admin_financial_actions(status,created_at desc);
create unique index if not exists wantiss_admin_one_open_refund_per_transaction
  on public.wantiss_admin_financial_actions(transaction_id)
  where action_type='refund_request' and status in ('pending','pending_provider');

alter table public.wantiss_admin_financial_actions enable row level security;
drop policy if exists wantiss_financial_actions_select on public.wantiss_admin_financial_actions;
create policy wantiss_financial_actions_select on public.wantiss_admin_financial_actions
for select to authenticated using (public.wantiss_has_permission('finance.view','view'));
revoke insert,update,delete on public.wantiss_admin_financial_actions from public,anon,authenticated;
grant select on public.wantiss_admin_financial_actions to authenticated;

create or replace function public.wantiss_admin_request_financial_action(
  p_action_type text,p_transaction_id uuid,p_target_user_id uuid,p_amount numeric,p_direction text,p_reason text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid()); v_tx public.wallet_transactions%rowtype; v_id uuid;
begin
  if v_actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_action_type='wallet_adjustment' then
    if not public.wantiss_has_permission('finance.adjust','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
    if p_direction not in ('credit','debit') then raise exception 'Invalid adjustment direction'; end if;
  elsif p_action_type='refund_request' then
    if not public.wantiss_has_permission('finance.refund','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
    if p_transaction_id is null then raise exception 'A source transaction is required'; end if;
    select * into v_tx from public.wallet_transactions where id=p_transaction_id for share;
    if not found or v_tx.user_id<>p_target_user_id or coalesce(v_tx.status,'') not in ('completed','succeeded','paid') then
      raise exception 'A completed transaction belonging to this user is required';
    end if;
    if p_amount>abs(v_tx.amount) then raise exception 'Refund request exceeds the source transaction amount'; end if;
  else raise exception 'Unsupported financial action'; end if;
  if p_target_user_id is null or p_amount is null or p_amount<=0 or p_amount>10000 then raise exception 'Invalid target or amount'; end if;
  if length(trim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'A reason between 10 and 500 characters is required'; end if;
  if p_transaction_id is not null and p_action_type='wallet_adjustment' and not exists(
    select 1 from public.wallet_transactions where id=p_transaction_id and user_id=p_target_user_id
  ) then raise exception 'Source transaction does not belong to the target user'; end if;
  insert into public.wantiss_admin_financial_actions(action_type,transaction_id,target_user_id,direction,amount,reason,requested_by)
  values(p_action_type,p_transaction_id,p_target_user_id,p_direction,p_amount,trim(p_reason),v_actor) returning id into v_id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values(v_actor,'financial_action_requested',p_action_type,v_id::text,trim(p_reason),
    jsonb_build_object('transaction_id',p_transaction_id,'target_user_id',p_target_user_id,'amount',p_amount,'direction',p_direction));
  return v_id;
end;
$$;

create or replace function public.wantiss_admin_review_financial_action(p_action_id uuid,p_decision text,p_reason text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid()); v_action public.wantiss_admin_financial_actions%rowtype; v_wallet public.wallets%rowtype; v_new_balance numeric;
begin
  if v_actor is null or not public.wantiss_has_permission('finance.approve','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_decision not in ('approve','reject') then raise exception 'Invalid decision'; end if;
  if length(trim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'A review reason between 10 and 500 characters is required'; end if;
  select * into v_action from public.wantiss_admin_financial_actions where id=p_action_id for update;
  if not found or v_action.status<>'pending' then raise exception 'Pending financial action not found'; end if;
  if p_decision='reject' then
    update public.wantiss_admin_financial_actions set status='rejected',reviewed_by=v_actor,reviewed_at=now(),metadata=metadata||jsonb_build_object('review_reason',trim(p_reason)) where id=p_action_id;
  elsif v_action.action_type='wallet_adjustment' then
    select * into v_wallet from public.wallets where user_id=v_action.target_user_id for update;
    if not found then raise exception 'Target wallet does not exist'; end if;
    v_new_balance:=v_wallet.balance + case when v_action.direction='credit' then v_action.amount else -v_action.amount end;
    if v_new_balance<0 then raise exception 'Debit exceeds the current wallet balance'; end if;
    update public.wallets set balance=v_new_balance,updated_at=now() where id=v_wallet.id;
    insert into public.wallet_transactions(user_id,amount,status,description,original_amount,original_currency,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
    values(v_action.target_user_id,v_action.amount,'completed','Approved admin wallet adjustment',v_action.amount,'USD',v_action.amount,'USD',
      'Admin adjustment','admin_adjustment',v_action.direction,v_action.id::text,
      jsonb_build_object('financial_action_id',v_action.id,'source_transaction_id',v_action.transaction_id,'reason',v_action.reason,'review_reason',trim(p_reason)));
    update public.wantiss_admin_financial_actions set status='approved',reviewed_by=v_actor,reviewed_at=now(),metadata=metadata||jsonb_build_object('review_reason',trim(p_reason),'balance_after',v_new_balance) where id=p_action_id;
  else
    update public.wantiss_admin_financial_actions set status='pending_provider',reviewed_by=v_actor,reviewed_at=now(),
      metadata=metadata||jsonb_build_object('review_reason',trim(p_reason),'provider_action_required',true)
    where id=p_action_id;
  end if;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
  values(v_actor,'financial_action_reviewed',v_action.action_type,v_action.id::text,trim(p_reason),
    jsonb_build_object('status','pending','amount',v_action.amount,'direction',v_action.direction),
    jsonb_build_object('status',case when p_decision='reject' then 'rejected' when v_action.action_type='refund_request' then 'pending_provider' else 'approved' end));
end;
$$;
revoke all on function public.wantiss_admin_request_financial_action(text,uuid,uuid,numeric,text,text) from public,anon;
revoke all on function public.wantiss_admin_review_financial_action(uuid,text,text) from public,anon;
grant execute on function public.wantiss_admin_request_financial_action(text,uuid,uuid,numeric,text,text) to authenticated;
grant execute on function public.wantiss_admin_review_financial_action(uuid,text,text) to authenticated;
