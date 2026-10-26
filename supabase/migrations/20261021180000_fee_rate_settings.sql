-- Fee rate settings: versioned rate cards + bands (algorithms stay in app code).

create table public.fee_rate_card (
  id uuid primary key,
  marketplace text not null default 'US',
  name text not null,
  effective_from date not null,
  effective_to date,
  source_note text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create table public.fee_season_window (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references public.fee_rate_card (id) on delete cascade,
  season text not null check (season in ('non_peak', 'peak')),
  start_date date not null,
  end_date date not null,
  check (end_date >= start_date)
);

create index fee_season_window_card_idx on public.fee_season_window (rate_card_id);

create table public.fee_size_tier_rule (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references public.fee_rate_card (id) on delete cascade,
  size_tier text not null check (
    size_tier in (
      'small_standard',
      'large_standard',
      'small_bulky',
      'large_bulky',
      'extra_large_0_50',
      'extra_large_50_70',
      'extra_large_70_150',
      'extra_large_150_plus'
    )
  ),
  sort_order int not null,
  max_longest_in numeric(12, 4),
  max_median_in numeric(12, 4),
  max_shortest_in numeric(12, 4),
  max_unit_weight_oz numeric(12, 4),
  min_shipping_weight_lb numeric(12, 4),
  max_shipping_weight_lb numeric(12, 4),
  max_length_plus_girth_in numeric(12, 4),
  shipping_weight_mode text not null check (
    shipping_weight_mode in ('unit_only', 'max_unit_dim')
  ),
  dim_weight_min_two_in boolean not null default false,
  unique (rate_card_id, size_tier)
);

create index fee_size_tier_rule_card_idx on public.fee_size_tier_rule (rate_card_id, sort_order);

create table public.fee_fixed_band (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references public.fee_rate_card (id) on delete cascade,
  category text not null check (category in ('general', 'apparel', 'dangerous_goods')),
  season text not null check (season in ('non_peak', 'peak')),
  size_tier text not null check (
    size_tier in (
      'small_standard',
      'large_standard',
      'small_bulky',
      'large_bulky',
      'extra_large_0_50',
      'extra_large_50_70',
      'extra_large_70_150',
      'extra_large_150_plus'
    )
  ),
  max_oz numeric(12, 4) not null,
  label text not null,
  fee_under_10 numeric(12, 4) not null,
  fee_10_to_50 numeric(12, 4) not null,
  fee_over_50 numeric(12, 4) not null
);

create index fee_fixed_band_lookup_idx on public.fee_fixed_band (
  rate_card_id,
  category,
  season,
  size_tier,
  max_oz
);

create table public.fee_formula_band (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references public.fee_rate_card (id) on delete cascade,
  category text not null check (category in ('general', 'apparel', 'dangerous_goods')),
  season text not null check (season in ('non_peak', 'peak')),
  size_tier text not null check (
    size_tier in (
      'small_standard',
      'large_standard',
      'small_bulky',
      'large_bulky',
      'extra_large_0_50',
      'extra_large_50_70',
      'extra_large_70_150',
      'extra_large_150_plus'
    )
  ),
  label text not null,
  base_under_10 numeric(12, 4) not null,
  base_10_to_50 numeric(12, 4) not null,
  base_over_50 numeric(12, 4) not null,
  after_lb numeric(12, 4) not null,
  increment_lb numeric(12, 4) not null,
  per_increment numeric(12, 4) not null,
  min_shipping_weight_lb numeric(12, 4)
);

create index fee_formula_band_lookup_idx on public.fee_formula_band (
  rate_card_id,
  category,
  season,
  size_tier
);

alter table public.detections
  add column if not exists rate_card_id uuid references public.fee_rate_card (id);

create index if not exists detections_rate_card_id_idx on public.detections (rate_card_id);

comment on table public.fee_rate_card is 'Published FBA fulfillment fee schedule (e.g. US 2026)';
comment on column public.detections.rate_card_id is 'Rate card used for this analysis';
