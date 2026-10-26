import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type {
  FeeCategory,
  Season,
  ShippingWeightMode,
  SizeTier,
} from './constants';
import type {
  FeeRateCardSnapshot,
  FixedBandRow,
  FormulaBandRow,
  SeasonWindow,
  SizeTierRule,
} from './settings.types';

type CardRow = {
  id: string;
  marketplace: string;
  name: string;
  effective_from: string;
  effective_to: string | null;
  source_note: string;
  is_active: boolean;
};

type SeasonRow = {
  season: Season;
  start_date: string;
  end_date: string;
};

type TierRow = {
  size_tier: SizeTier;
  sort_order: number;
  max_longest_in: number | null;
  max_median_in: number | null;
  max_shortest_in: number | null;
  max_unit_weight_oz: number | null;
  min_shipping_weight_lb: number | null;
  max_shipping_weight_lb: number | null;
  max_length_plus_girth_in: number | null;
  shipping_weight_mode: ShippingWeightMode;
  dim_weight_min_two_in: boolean;
};

type FixedRow = {
  category: FeeCategory;
  season: Season;
  size_tier: SizeTier;
  max_oz: number;
  label: string;
  fee_under_10: number;
  fee_10_to_50: number;
  fee_over_50: number;
};

type FormulaRow = {
  category: FeeCategory;
  season: Season;
  size_tier: SizeTier;
  label: string;
  base_under_10: number;
  base_10_to_50: number;
  base_over_50: number;
  after_lb: number;
  increment_lb: number;
  per_increment: number;
  min_shipping_weight_lb: number | null;
};

@Injectable()
export class FeeSettingsRepository {
  private readonly logger = new Logger(FeeSettingsRepository.name);

  constructor(private readonly supabase: SupabaseService) {}

  async countCards(): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('fee_rate_card')
      .select('id', { count: 'exact', head: true });
    if (error) {
      throw new ServiceUnavailableException(
        `Failed to count fee rate cards: ${error.message}`,
      );
    }
    return count ?? 0;
  }

  async ensureSeeded(snapshot: FeeRateCardSnapshot): Promise<void> {
    const n = await this.countCards();
    if (n > 0) return;
    this.logger.log(`Seeding fee rate card ${snapshot.id} (${snapshot.name})`);
    await this.insertSnapshot(snapshot);
  }

  async insertSnapshot(snapshot: FeeRateCardSnapshot): Promise<void> {
    const { error: cardErr } = await this.supabase.client
      .from('fee_rate_card')
      .insert({
        id: snapshot.id,
        marketplace: snapshot.marketplace,
        name: snapshot.name,
        effective_from: snapshot.effectiveFrom,
        effective_to: snapshot.effectiveTo,
        source_note: snapshot.sourceNote,
        is_active: snapshot.isActive,
      });
    if (cardErr) {
      throw new ServiceUnavailableException(
        `Failed to insert fee_rate_card: ${cardErr.message}`,
      );
    }

    const seasonRows = snapshot.seasonWindows.map((w) => ({
      rate_card_id: snapshot.id,
      season: w.season,
      start_date: w.startDate,
      end_date: w.endDate,
    }));
    const { error: seasonErr } = await this.supabase.client
      .from('fee_season_window')
      .insert(seasonRows);
    if (seasonErr) {
      throw new ServiceUnavailableException(
        `Failed to insert fee_season_window: ${seasonErr.message}`,
      );
    }

    const tierRows = snapshot.sizeTierRules.map((r) => ({
      rate_card_id: snapshot.id,
      size_tier: r.sizeTier,
      sort_order: r.sortOrder,
      max_longest_in: r.maxLongestIn,
      max_median_in: r.maxMedianIn,
      max_shortest_in: r.maxShortestIn,
      max_unit_weight_oz: r.maxUnitWeightOz,
      min_shipping_weight_lb: r.minShippingWeightLb,
      max_shipping_weight_lb: r.maxShippingWeightLb,
      max_length_plus_girth_in: r.maxLengthPlusGirthIn,
      shipping_weight_mode: r.shippingWeightMode,
      dim_weight_min_two_in: r.dimWeightMinTwoIn,
    }));
    const { error: tierErr } = await this.supabase.client
      .from('fee_size_tier_rule')
      .insert(tierRows);
    if (tierErr) {
      throw new ServiceUnavailableException(
        `Failed to insert fee_size_tier_rule: ${tierErr.message}`,
      );
    }

    const fixedRows = snapshot.fixedBands.map((b) => ({
      rate_card_id: snapshot.id,
      category: b.category,
      season: b.season,
      size_tier: b.sizeTier,
      max_oz: b.maxOz,
      label: b.label,
      fee_under_10: b.fees.under_10,
      fee_10_to_50: b.fees.from_10_to_50,
      fee_over_50: b.fees.over_50,
    }));
    // Supabase/PostgREST accepts large batches; chunk to stay safe
    for (const chunk of chunkArray(fixedRows, 200)) {
      const { error } = await this.supabase.client
        .from('fee_fixed_band')
        .insert(chunk);
      if (error) {
        throw new ServiceUnavailableException(
          `Failed to insert fee_fixed_band: ${error.message}`,
        );
      }
    }

    const formulaRows = snapshot.formulaBands.map((b) => ({
      rate_card_id: snapshot.id,
      category: b.category,
      season: b.season,
      size_tier: b.sizeTier,
      label: b.label,
      base_under_10: b.base.under_10,
      base_10_to_50: b.base.from_10_to_50,
      base_over_50: b.base.over_50,
      after_lb: b.afterLb,
      increment_lb: b.incrementLb,
      per_increment: b.perIncrement,
      min_shipping_weight_lb: b.minShippingWeightLb,
    }));
    for (const chunk of chunkArray(formulaRows, 200)) {
      const { error } = await this.supabase.client
        .from('fee_formula_band')
        .insert(chunk);
      if (error) {
        throw new ServiceUnavailableException(
          `Failed to insert fee_formula_band: ${error.message}`,
        );
      }
    }
  }

  async loadAllSnapshots(): Promise<FeeRateCardSnapshot[]> {
    const { data: cards, error } = await this.supabase.client
      .from('fee_rate_card')
      .select('*')
      .order('effective_from', { ascending: false });
    if (error) {
      throw new ServiceUnavailableException(
        `Failed to load fee_rate_card: ${error.message}`,
      );
    }
    const out: FeeRateCardSnapshot[] = [];
    for (const card of (cards ?? []) as CardRow[]) {
      out.push(await this.hydrate(card));
    }
    return out;
  }

  private async hydrate(card: CardRow): Promise<FeeRateCardSnapshot> {
    const id = card.id;

    const { data: seasons, error: sErr } = await this.supabase.client
      .from('fee_season_window')
      .select('season, start_date, end_date')
      .eq('rate_card_id', id);
    if (sErr) {
      throw new ServiceUnavailableException(
        `Failed to load fee_season_window: ${sErr.message}`,
      );
    }

    const { data: tiers, error: tErr } = await this.supabase.client
      .from('fee_size_tier_rule')
      .select('*')
      .eq('rate_card_id', id)
      .order('sort_order', { ascending: true });
    if (tErr) {
      throw new ServiceUnavailableException(
        `Failed to load fee_size_tier_rule: ${tErr.message}`,
      );
    }

    const { data: fixed, error: fErr } = await this.supabase.client
      .from('fee_fixed_band')
      .select('*')
      .eq('rate_card_id', id);
    if (fErr) {
      throw new ServiceUnavailableException(
        `Failed to load fee_fixed_band: ${fErr.message}`,
      );
    }

    const { data: formulas, error: formErr } = await this.supabase.client
      .from('fee_formula_band')
      .select('*')
      .eq('rate_card_id', id);
    if (formErr) {
      throw new ServiceUnavailableException(
        `Failed to load fee_formula_band: ${formErr.message}`,
      );
    }

    const seasonWindows: SeasonWindow[] = ((seasons ?? []) as SeasonRow[]).map(
      (w) => ({
        season: w.season,
        startDate: String(w.start_date).slice(0, 10),
        endDate: String(w.end_date).slice(0, 10),
      }),
    );

    const sizeTierRules: SizeTierRule[] = ((tiers ?? []) as TierRow[]).map(
      (r) => ({
        sizeTier: r.size_tier,
        sortOrder: r.sort_order,
        maxLongestIn: numOrNull(r.max_longest_in),
        maxMedianIn: numOrNull(r.max_median_in),
        maxShortestIn: numOrNull(r.max_shortest_in),
        maxUnitWeightOz: numOrNull(r.max_unit_weight_oz),
        minShippingWeightLb: numOrNull(r.min_shipping_weight_lb),
        maxShippingWeightLb: numOrNull(r.max_shipping_weight_lb),
        maxLengthPlusGirthIn: numOrNull(r.max_length_plus_girth_in),
        shippingWeightMode: r.shipping_weight_mode,
        dimWeightMinTwoIn: r.dim_weight_min_two_in,
      }),
    );

    const fixedBands: FixedBandRow[] = ((fixed ?? []) as FixedRow[]).map(
      (b) => ({
        category: b.category,
        season: b.season,
        sizeTier: b.size_tier,
        maxOz: Number(b.max_oz),
        label: b.label,
        fees: {
          under_10: Number(b.fee_under_10),
          from_10_to_50: Number(b.fee_10_to_50),
          over_50: Number(b.fee_over_50),
        },
      }),
    );

    const formulaBands: FormulaBandRow[] = (
      (formulas ?? []) as FormulaRow[]
    ).map((b) => ({
      category: b.category,
      season: b.season,
      sizeTier: b.size_tier,
      label: b.label,
      base: {
        under_10: Number(b.base_under_10),
        from_10_to_50: Number(b.base_10_to_50),
        over_50: Number(b.base_over_50),
      },
      afterLb: Number(b.after_lb),
      incrementLb: Number(b.increment_lb),
      perIncrement: Number(b.per_increment),
      minShippingWeightLb: numOrNull(b.min_shipping_weight_lb),
    }));

    return {
      id: card.id,
      marketplace: card.marketplace,
      name: card.name,
      effectiveFrom: String(card.effective_from).slice(0, 10),
      effectiveTo: card.effective_to
        ? String(card.effective_to).slice(0, 10)
        : null,
      sourceNote: card.source_note,
      isActive: card.is_active,
      seasonWindows,
      sizeTierRules,
      fixedBands,
      formulaBands,
    };
  }
}

function numOrNull(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
