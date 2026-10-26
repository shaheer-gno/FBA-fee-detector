import { useQuery } from '@tanstack/react-query';
import * as historyApi from './api';

export const historyKeys = {
  all: ['history'] as const,
  list: (
    page: number,
    pageSize: number,
    productId?: string,
    verdict?: string,
  ) =>
    [
      ...historyKeys.all,
      'list',
      page,
      pageSize,
      productId ?? null,
      verdict ?? null,
    ] as const,
};

export function useHistoryList(
  page: number,
  pageSize: number,
  productId?: string,
  verdict?: string,
) {
  return useQuery({
    queryKey: historyKeys.list(page, pageSize, productId, verdict),
    queryFn: () =>
      historyApi.listDetections(page, pageSize, productId, verdict),
  });
}
