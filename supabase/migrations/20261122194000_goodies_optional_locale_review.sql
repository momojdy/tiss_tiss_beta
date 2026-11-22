begin;
-- Optional locale review is independent from publishing the English CMS source.
-- Do not mark any translation reviewed or change stored translation metadata.
-- The consumer already falls back to reviewed English for unreviewed locales.
create or replace function private.goodies_assert_reviewed_text(p_text jsonb)
returns void language plpgsql set search_path='' as $$
declare v_english jsonb;
begin
 if p_text is null or jsonb_typeof(p_text)<>'object' then return; end if;
 v_english := p_text->'en';
 if v_english is not null and v_english ? 's'
   and nullif(trim(v_english->>'v'),'') is not null
   and v_english->>'s' is distinct from 'reviewed' then
   raise exception 'Review English Goodies source text before publishing' using errcode='22023';
 end if;
end $$;
revoke all on function private.goodies_assert_reviewed_text(jsonb) from public,anon,authenticated;
commit;
