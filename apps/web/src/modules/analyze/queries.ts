import { useMutation } from '@tanstack/react-query';
import * as analyzeApi from './api';
import type { AnalyzePayload } from './types';

export function useAnalyzeDetection() {
  return useMutation({
    mutationFn: (payload: AnalyzePayload) =>
      analyzeApi.analyzeDetection(payload),
  });
}
