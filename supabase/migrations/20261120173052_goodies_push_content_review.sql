begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
-- New lock-screen and opening-error text follows the existing four-language
-- review requirement. Unfinished Creole continues to use reviewed English.
do $coverage$
declare definition text;key text;keys text[]:=array[
 'lbl.notification.push.title','lbl.notification.push.body','lbl.notification.openFailed'
];
begin
 definition:=pg_get_functiondef('private.goodies_guard_content_publication()'::regprocedure);
 if definition !~ 'v_critical\s+text\[\]\s*:=\s*array\[' then raise exception 'Goodies content review contract drift';end if;
 foreach key in array keys loop
  if position(quote_literal(key) in definition)=0 then
   definition:=regexp_replace(definition,'(v_critical\s+text\[\]\s*:=\s*array\[)',E'\\1'||quote_literal(key)||',');
  end if;
 end loop;
 execute definition;
end $coverage$;
commit;
