begin;
do $do$
declare def text; p integer; q integer; needle text := 'if v_entry->''a''->''en''->>''v''';
begin
 def := pg_get_functiondef('private.goodies_guard_content_publication()'::regprocedure);
 p := strpos(def, needle);
 if p = 0 then raise exception 'FAQ placeholder guard location not found'; end if;
 q := strpos(substring(def from p), 'end if;');
 if q = 0 then raise exception 'FAQ placeholder guard terminator not found'; end if;
 def := substring(def from 1 for p-1) || substring(def from p+q+length('end if;')-1);
 execute def;
end $do$;
commit;