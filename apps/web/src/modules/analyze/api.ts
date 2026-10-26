import { apiRequest } from '../../shared/api/client';
import type { AnalyzeResponse } from '../../shared/api/types';
import type { AnalyzePayload } from './types';

export function analyzeDetection(
  payload: AnalyzePayload,
): Promise<AnalyzeResponse> {
  return apiRequest<AnalyzeResponse>('/detections/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
