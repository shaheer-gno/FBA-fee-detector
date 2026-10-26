-- Allow settlement report as a fee_source (actual charged FBA fee).

alter table public.products
  drop constraint if exists products_fee_source_check;

alter table public.products
  add constraint products_fee_source_check
  check (fee_source in ('manual', 'fee_preview', 'settlement'));

comment on column public.products.fee_source is
  'manual = user entered; fee_preview = Fee Preview estimate; settlement = Settlement V2 charged fee (locked in UI)';
