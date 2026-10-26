-- Track whether last_charged_fee_usd came from manual entry or Fee Preview import.

alter table public.products
  add column if not exists fee_source text not null default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_fee_source_check'
  ) then
    alter table public.products
      add constraint products_fee_source_check
      check (fee_source in ('manual', 'fee_preview'));
  end if;
end $$;

comment on column public.products.fee_source is
  'manual = user entered; fee_preview = FBA Fee Preview import (fee field locked in UI)';
