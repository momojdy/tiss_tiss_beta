create unique index if not exists account_deletion_one_open_request_idx on public.account_deletion_requests(user_id) where status in ('requested','under_review');
