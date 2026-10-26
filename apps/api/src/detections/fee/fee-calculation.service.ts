import { Injectable } from '@nestjs/common';
import { analyzeOvercharge } from './analyze';
import { FeeSettingsService } from './fee-settings.service';
import type { FeeRateCardSnapshot } from './settings.types';
import type { AnalyzeInput, AnalyzeResult } from './types';

@Injectable()
export class FeeCalculationService {
  constructor(private readonly settings: FeeSettingsService) {}

  /**
   * @param card Optional pre-loaded rate card (e.g. once per daily batch).
   *             When omitted, resolves via FeeSettingsService for input.feeDate.
   */
  analyze(input: AnalyzeInput, card?: FeeRateCardSnapshot): AnalyzeResult {
    const resolved = card ?? this.settings.getCardForDate(input.feeDate);
    return analyzeOvercharge(input, resolved);
  }
}
