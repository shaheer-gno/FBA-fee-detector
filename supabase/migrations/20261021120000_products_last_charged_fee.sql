-- Store last known Amazon charged FBA fee per product (manual until SP-API).

alter table public.products
  add column if not exists last_charged_fee_usd numeric(12, 4)
    check (last_charged_fee_usd is null or last_charged_fee_usd >= 0);

comment on column public.products.last_charged_fee_usd is
  'Last Amazon charged fulfillment fee entered by user; SP-API can replace later';
