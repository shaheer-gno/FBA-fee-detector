-- Product master (dims/weight once per SKU) + link detections to products for daily checks.

create table public.products (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sku text not null,
  asin text,
  title text,
  length_in numeric(10, 4) not null check (length_in > 0),
  width_in numeric(10, 4) not null check (width_in > 0),
  height_in numeric(10, 4) not null check (height_in > 0),
  unit_weight_oz numeric(12, 4) not null check (unit_weight_oz > 0),
  category text not null check (category in ('general', 'apparel', 'dangerous_goods')),
  selling_price_usd numeric(12, 4) not null check (selling_price_usd >= 0),
  active boolean not null default true,
  constraint products_sku_unique unique (sku)
);

create index products_active_idx on public.products (active);
create index products_created_at_idx on public.products (created_at desc);

comment on table public.products is 'Seller package truth per SKU; input for daily FBA fee checks';

alter table public.detections
  add column if not exists product_id uuid references public.products (id) on delete set null,
  add column if not exists run_date date,
  add column if not exists source text;

update public.detections
set
  run_date = coalesce(run_date, fee_date),
  source = coalesce(source, 'manual')
where run_date is null or source is null;

alter table public.detections
  alter column run_date set not null,
  alter column source set not null,
  alter column source set default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'detections_source_check'
  ) then
    alter table public.detections
      add constraint detections_source_check
      check (source in ('manual', 'product', 'daily_job'));
  end if;
end $$;

create index if not exists detections_product_id_idx on public.detections (product_id);
create index if not exists detections_run_date_idx on public.detections (run_date desc);
create index if not exists detections_source_idx on public.detections (source);

comment on column public.detections.product_id is 'FK to products; null for one-off analyze';
comment on column public.detections.run_date is 'Calendar day of the check (usually equals fee_date)';
comment on column public.detections.source is 'manual | product | daily_job';
