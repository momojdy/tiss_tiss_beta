-- Give every support request a stable server-generated reference and allow authorized staff to review/update tickets.
alter table public.settings_support_requests
  add column if not exists ticket_code text;

update public.settings_support_requests
set ticket_code = 'SUP-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where ticket_code is null or btrim(ticket_code) = '';

alter table public.settings_support_requests
  alter column ticket_code set default ('SUP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  alter column ticket_code set not null;

create unique index if not exists settings_support_requests_ticket_code_uidx
  on public.settings_support_requests(ticket_code);

drop policy if exists "Authorized staff can view support requests" on public.settings_support_requests;
create policy "Authorized staff can view support requests"
  on public.settings_support_requests for select to authenticated
  using (public.wantiss_has_permission('operations', 'view'));

drop policy if exists "Authorized staff can update support requests" on public.settings_support_requests;
create policy "Authorized staff can update support requests"
  on public.settings_support_requests for update to authenticated
  using (public.wantiss_has_permission('operations', 'edit'))
  with check (public.wantiss_has_permission('operations', 'edit'));

grant update(status) on public.settings_support_requests to authenticated;

comment on column public.settings_support_requests.ticket_code is
  'Stable server-generated reference displayed only after support-ticket insertion succeeds.';
