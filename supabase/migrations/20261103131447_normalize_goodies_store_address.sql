update public.businesses
set address = 'Santa Monica, Alphonso Road 2',
    city = 'Puerto Princesa, Palawan'
where country = 'Philippines'
  and address ilike '%Santa Monica%'
  and city ilike '%Puerto Princessa%';

update public.goodies_store_schedules
set address = 'Santa Monica, Alphonso Road 2',
    city = 'Puerto Princesa, Palawan',
    store_latitude = null,
    store_longitude = null,
    updated_at = now()
where country = 'Philippines'
  and address ilike '%Santa Monica%'
  and city ilike '%Puerto Princessa%';