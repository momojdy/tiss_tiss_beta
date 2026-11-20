-- Group order pricing is denominated in USD throughout the Goodies Wallet,
-- checkout, and commission ledger. Restore the estimator's currency metadata.
-- Fail closed if the live function has changed rather than patching unknown SQL.
do $$
declare
  definition text;
  stale text := '''currency'',''PHP''';
  correct text := '''currency'',''USD''';
begin
  select pg_get_functiondef('public.goodies_group_order_checkout_estimate(uuid,text,jsonb)'::regprocedure)
    into definition;
  if definition is null then
    raise exception 'Goodies group estimate function missing';
  end if;
  if position(stale in definition)>0 then
    if position(correct in definition)>0 then
      raise exception 'Goodies group estimate contains conflicting currencies';
    end if;
    execute replace(definition, stale, correct);
  elsif position(correct in definition)=0 then
    raise exception 'Goodies group estimate currency definition changed; review required';
  end if;
end $$;
