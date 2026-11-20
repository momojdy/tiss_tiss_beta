begin;
-- Creating a group invitation now uses this label for unsupported cart items.
-- Append to the deployed review list; retain all earlier keys and guard logic.
do $coverage$
declare
  definition text;
  declaration text;
  group_key constant text := 'lbl.page.store.d8aea5db73';
begin
  definition := pg_get_functiondef('private.goodies_guard_content_publication()'::regprocedure);
  declaration := substring(definition from 'v_critical\s+text\[\]\s*:=\s*array\[[^;]*\];');
  if declaration is null then
    raise exception 'Goodies content review contract drift' using errcode='55000';
  end if;
  if position(quote_literal(group_key) in declaration)=0 then
    execute replace(definition,declaration,
      replace(declaration,'];',','||quote_literal(group_key)||'];'));
  end if;
end $coverage$;
commit;
