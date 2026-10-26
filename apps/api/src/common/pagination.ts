export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export type PageParams = {
  page: number;
  pageSize: number;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function parsePageParams(
  pageRaw?: string,
  pageSizeRaw?: string,
  defaults: PageParams = {
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  },
): PageParams {
  const page = Math.max(1, Number(pageRaw) || defaults.page);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(pageSizeRaw) || defaults.pageSize),
  );
  return { page, pageSize };
}

export function pageRange(params: PageParams): { from: number; to: number } {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  return { from, to };
}
