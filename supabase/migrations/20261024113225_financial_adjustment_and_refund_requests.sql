create table if not exists public.wantiss_admin_financial_adjustments (
 id uuid primary key default gen_random_uuid(),
 transaction_id uuid not null references public.wallet_transactions(id) on delete restrict,
 target_user_id uuid not null references auth.users(id) on delete restrict,
 adjustment_type text not null check (adjustment_type in ('Credit','Debit','Fee','Correction')),
 amount numeric(14,2) not null check (amount > 0 and amount <= 1000000),
 reason text not null check (length(trim(reason)) between 3 and 1000),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 notes text not null default '',
 created_by uuid not null references auth.users(id),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists wantiss_admin_adjustments_status_idx on public.wantiss_admin_financial_adjustments(status,created_at desc);
alter table public.wantiss_admin_financial_adjustments enable row level security;
revoke all on public.wantiss_admin_financial_adjustments from anon,authenticated;
grant select on public.wantiss_admin_financial_adjustments to authenticated;
drop policy if exists wantiss_admin_adjustments_select on public.wantiss_admin_financial_adjustments;
create policy wantiss_admin_adjustments_select on public.wantiss_admin_financial_adjustments for select to authenticated
using (public.wantiss_has_permission('finance','view'));

create table if not exists public.wantiss_admin_refund_requests (
 id uuid primary key default gen_random_uuid(),
 transaction_id uuid not null references public.wallet_transactions(id) on delete restrict,
 target_user_id uuid not null references auth.users(id) on delete restrict,
 amount numeric(14,2) not null check (amount > 0 and amount <= 1000000),
 reason text not null check (length(trim(reason)) between 3 and 1000),
 notes text not null default '',
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_by uuid not null references auth.users(id),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists wantiss_admin_refunds_status_idx on public.wantiss_admin_refund_requests(status,created_at desc);
alter table public.wantiss_admin_refund_requests enable row level security;
revoke all on public.wantiss_admin_refund_requests from anon,authenticated;
grant select on public.wantiss_admin_refund_requests to authenticated;
drop policy if exists wantiss_admin_refunds_select on public.wantiss_admin_refund_requests;
create policy wantiss_admin_refunds_select on public.wantiss_admin_refund_requests for select to authenticated
using (public.wantiss_has_permission('finance','view'));

create or replace function public.wantiss_admin_request_financial_adjustment(
 p_transaction_id uuid,p_adjustment_type text,p_amount numeric,p_reason text,p_notes text default ''
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_tx public.wallet_transactions%rowtype; v_id uuid;
begin
 if v_actor is null or not public.wantiss_has_permission('finance.wallet.adjust','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_adjustment_type not in ('Credit','Debit','Fee','Correction') or p_amount is null or p_amount<=0 or p_amount>1000000 or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Invalid adjustment request'; end if;
 select * into v_tx from public.wallet_transactions where id=p_transaction_id for share;
 if not found then raise exception 'Transaction not found'; end if;
 insert into public.wantiss_admin_financial_adjustments(transaction_id,target_user_id,adjustment_type,amount,reason,notes,created_by)
 values(v_tx.id,v_tx.user_id,p_adjustment_type,round(p_amount,2),trim(p_reason),left(coalesce(p_notes,''),4000),v_actor)
 returning id into v_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values(v_actor,'financial_adjustment_requested','financial_adjustment',v_id::text,trim(p_reason),jsonb_build_object('transaction_id',v_tx.id,'target_user_id',v_tx.user_id,'type',p_adjustment_type,'amount',round(p_amount,2)));
 return v_id;
end $$;

create or replace function public.wantiss_admin_request_refund(
 p_transaction_id uuid,p_amount numeric,p_reason text,p_notes text default ''
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid()); v_tx public.wallet_transactions%rowtype; v_id uuid; v_refunded numeric; v_pending numeric;
begin
 if v_actor is null or not public.wantiss_has_permission('finance.refund','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_amount is null or p_amount<=0 or p_amount>1000000 or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Invalid refund request'; end if;
 select * into v_tx from public.wallet_transactions where id=p_transaction_id for share;
 if not found or v_tx.status <> 'completed' then raise exception 'Only completed transactions can be refunded'; end if;
 select coalesce(sum(amount),0) into v_refunded from public.wantiss_admin_refund_requests where transaction_id=v_tx.id and status='approved';
 select coalesce(sum(amount),0) into v_pending from public.wantiss_admin_refund_requests where transaction_id=v_tx.id and status='pending';
 if p_amount > greatest(v_tx.amount-v_refunded-v_pending,0) then raise exception 'Refund exceeds the remaining refundable amount'; end if;
 insert into public.wantiss_admin_refund_requests(transaction_id,target_user_id,amount,reason,notes,created_by)
 values(v_tx.id,v_tx.user_id,round(p_amount,2),trim(p_reason),left(coalesce(p_notes,''),4000),v_actor)
 returning id into v_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values(v_actor,'refund_requested','refund_request',v_id::text,trim(p_reason),jsonb_build_object('transaction_id',v_tx.id,'target_user_id',v_tx.user_id,'amount',round(p_amount,2)));
 return v_id;
end $$;

revoke all on function public.wantiss_admin_request_financial_adjustment(uuid,text,numeric,text,text) from public,anon;
revoke all on function public.wantiss_admin_request_refund(uuid,numeric,text,text) from public,anon;
grant execute on function public.wantiss_admin_request_financial_adjustment(uuid,text,numeric,text,text) to authenticated;
grant execute on function public.wantiss_admin_request_refund(uuid,numeric,text,text) to authenticated;
