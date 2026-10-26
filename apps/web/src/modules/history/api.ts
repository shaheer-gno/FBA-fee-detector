import { apiRequest, pageQuery } from '../../shared/api/client';
import type { PageResult } from '../../shared/api/types';
import { LIST_PAGE_SIZE } from '../../shared/constants';
import type { DetectionRecord } from './types';

export function listDetections(
  page = 1,
  pageSize = LIST_PAGE_SIZE,
  productId?: string,
  verdict?: string,
): Promise<PageResult<DetectionRecord>> {
  const parts: string[] = [];
  if (productId) parts.push(`productId=${encodeURIComponent(productId)}`);
  if (verdict) parts.push(`verdict=${encodeURIComponent(verdict)}`);
  const extra = parts.length > 0 ? parts.join('&') : undefined;
  return apiRequest<PageResult<DetectionRecord>>(
    `/detections${pageQuery(page, pageSize, extra)}`,
  );
}
