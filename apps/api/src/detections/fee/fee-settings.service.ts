import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FeeSettingsRepository } from './fee-settings.repository';
import type { FeeRateCardSnapshot } from './settings.types';
import { buildUs2026Snapshot } from './us-2026-snapshot';

@Injectable()
export class FeeSettingsService implements OnModuleInit {
  private readonly logger = new Logger(FeeSettingsService.name);
  private cards: FeeRateCardSnapshot[] = [];

  constructor(private readonly repo: FeeSettingsRepository) {}

  async onModuleInit(): Promise<void> {
    await this.repo.ensureSeeded(buildUs2026Snapshot());
    this.cards = await this.repo.loadAllSnapshots();
    if (this.cards.length === 0) {
      throw new ServiceUnavailableException(
        'No fee rate cards loaded after seed',
      );
    }
    this.logger.log(
      `Loaded ${this.cards.length} fee rate card(s); active=${this.cards.find((c) => c.isActive)?.id ?? 'none'}`,
    );
  }

  /** Resolve rate card for a fee_date (YYYY-MM-DD). */
  getCardForDate(feeDate: string): FeeRateCardSnapshot {
    const matches = this.cards.filter((c) => {
      if (feeDate < c.effectiveFrom) return false;
      if (c.effectiveTo != null && feeDate > c.effectiveTo) return false;
      return true;
    });

    if (matches.length === 0) {
      const active = this.cards.find((c) => c.isActive) ?? this.cards[0]!;
      this.logger.warn(
        `No rate card covers feeDate=${feeDate}; falling back to ${active.id}`,
      );
      return active;
    }

    matches.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return b.effectiveFrom.localeCompare(a.effectiveFrom);
    });
    return matches[0]!;
  }

  /** Test helper: replace in-memory cards without DB. */
  useCardsForTests(cards: FeeRateCardSnapshot[]): void {
    this.cards = cards;
  }
}
