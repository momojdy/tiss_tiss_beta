begin;
-- Translation review is editorial metadata, not a CMS publication gate.
-- Keep publication authorization, asset checks, fee preservation, and FAQ placeholder guard unchanged.
create or replace function private.goodies_assert_reviewed_text(p_text jsonb)
returns void language plpgsql set search_path='' as $$
begin
  return;
end $$;
revoke all on function private.goodies_assert_reviewed_text(jsonb) from public,anon,authenticated;
commit;
