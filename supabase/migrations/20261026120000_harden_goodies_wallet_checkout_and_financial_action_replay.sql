-- Reviewed, additive hardening. Does not mutate existing balances or financial records.
-- Serialize repeat wallet checkout attempts for a user while the wallet row is locked.
-- Existing place_goodies_order remains responsible for server-side item/price/total validation.
-- A second order submission is not considered a retry unless the caller supplies a stable idempotency key;
-- do not invent one from the client total. This migration adds uniqueness for wallet ledger effects.

-- One wallet debit per Goodies order, and one wallet refund credit per order.
-- These partial unique indexes make a duplicate ledger write fail atomically instead of double-charging/refunding.
create unique index if not exists wallet_transactions_goodies_order_payment_once
  on public.wallet_transactions(reference_id)
  where activity_type = 'goodies_order_payment'
    and direction = 'debit'
    and reference_id is not null;

create unique index if not exists wallet_transactions_goodies_order_refund_once
  on public.wallet_transactions(reference_id)
  where activity_type = 'goodies_order_refund'
    and direction = 'credit'
    and reference_id is not null;

-- Only one open/awaiting-provider refund request may exist for a source transaction.
-- This is intentionally a partial index so rejected requests can be resubmitted.
create unique index if not exists wantiss_admin_financial_actions_one_open_refund_per_transaction
  on public.wantiss_admin_financial_actions(transaction_id)
  where action_type = 'refund_request'
    and status in ('pending', 'pending_provider')
    and transaction_id is not null;

-- Enforce exact idempotency for financial adjustments already recorded against the same action.
create unique index if not exists wallet_transactions_admin_adjustment_once
  on public.wallet_transactions(reference_id)
  where activity_type = 'admin_adjustment'
    and reference_id is not null;

-- No grants are widened by this migration. Existing RPC authorization remains authoritative.
