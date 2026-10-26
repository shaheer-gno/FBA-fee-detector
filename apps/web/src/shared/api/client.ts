const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api';

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const msg = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? `Request failed (${res.status})`);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function pageQuery(
  page: number,
  pageSize: number,
  extra?: string,
): string {
  const base = `page=${page}&pageSize=${pageSize}`;
  return extra ? `?${base}&${extra}` : `?${base}`;
}
