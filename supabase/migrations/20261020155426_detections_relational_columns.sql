-- Rebuild detections with typed columns + fee_date (replaces any legacy jsonb shape).

drop table if exists public.detections;

create table public.detections (
  id uuid primary key,
  created_at timestamptz not null default now(),
  fee_date date not null,
  length_in numeric(10, 4) not null check (length_in > 0),
  width_in numeric(10, 4) not null check (width_in > 0),
  height_in numeric(10, 4) not null check (height_in > 0),
  unit_weight_oz numeric(12, 4) not null check (unit_weight_oz > 0),
  category text not null check (category in ('general', 'apparel', 'dangerous_goods')),
  season text not null check (season in ('non_peak', 'peak')),
  selling_price_usd numeric(12, 4) not null check (selling_price_usd >= 0),
  charged_fee_usd numeric(12, 4) not null check (charged_fee_usd >= 0),
  size_tier text not null,
  shipping_weight_lb numeric(12, 4) not null,
  shipping_weight_oz numeric(12, 4) not null,
  dimensional_weight_lb numeric(12, 4) not null,
  price_band text not null check (price_band in ('under_10', 'from_10_to_50', 'over_50')),
  weight_band_label text not null,
  expected_fee_usd numeric(12, 4) not null,
  difference_usd numeric(12, 4) not null,
  verdict text not null check (verdict in ('correct', 'overcharged', 'undercharged')),
  explanation text not null,
  implied_size_tier text,
  implied_weight_band_label text,
  matched_fee_usd numeric(12, 4),
  fee_delta_from_charged numeric(12, 4)
);

create index detections_created_at_idx on public.detections (created_at desc);
create index detections_fee_date_idx on public.detections (fee_date desc);
create index detections_verdict_idx on public.detections (verdict);
create index detections_category_idx on public.detections (category);

comment on table public.detections is 'One row per FBA fee overcharge analysis';
