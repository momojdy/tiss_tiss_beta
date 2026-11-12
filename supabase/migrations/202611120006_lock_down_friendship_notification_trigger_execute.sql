-- This function is a trigger-only notification helper and must never be exposed over PostgREST.
revoke all on function public.wantiss_friendship_notification() from public,anon,authenticated;
do $check$begin
 if has_function_privilege('anon','public.wantiss_friendship_notification()','execute')
    or has_function_privilege('authenticated','public.wantiss_friendship_notification()','execute') then
   raise exception 'Friendship trigger must not be API callable';
 end if;
end $check$;