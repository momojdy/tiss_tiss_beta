-- Enable verified, atomic Wallet contributions for authenticated Wantiss members only.
revoke all on function public.help_pay_contribute_wallet(uuid,bigint,text) from public,anon;
grant execute on function public.help_pay_contribute_wallet(uuid,bigint,text) to authenticated;
-- Record the authorization contract in the catalog so a deployment without
-- the function grant cannot silently display a working Pay button.
do $verify$begin
 if not has_function_privilege('authenticated','public.help_pay_contribute_wallet(uuid,bigint,text)','EXECUTE')
 or has_function_privilege('anon','public.help_pay_contribute_wallet(uuid,bigint,text)','EXECUTE') then
  raise exception 'Unexpected Help Pay contribution function privileges';
 end if;
end $verify$;