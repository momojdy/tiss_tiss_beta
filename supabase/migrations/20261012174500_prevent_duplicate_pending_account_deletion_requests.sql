create unique index if not exists account_deletion_requests_one_pending_idx on public.account_deletion_requests(user_id) where status in ('requested','under_review');
