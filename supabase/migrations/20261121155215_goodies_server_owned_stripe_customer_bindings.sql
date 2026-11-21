-- Pair with create-card-setup-intent's server-client update before applying.
-- A client may read its own mapping, but only the trusted server creates it.
revoke insert,update,delete on public.stripe_customers from public,anon,authenticated;
drop policy if exists "Users can insert their own Stripe customer" on public.stripe_customers;
