'use client';
import { useState } from 'react';
import { Paginated, qs, useApi } from '@/lib/api';

/** Paginated list hook: resets to page 1 whenever filters change. */
export function useList<T>(path: string, filters: Record<string, string | undefined> = {}) {
  const [state, setState] = useState({ page: 1, key: JSON.stringify(filters) });
  const key = JSON.stringify(filters);
  const page = state.key === key ? state.page : 1;
  const res = useApi<Paginated<T>>(`${path}${qs({ ...filters, page, limit: 20 })}`);
  return { ...res, page, setPage: (p: number) => setState({ page: p, key }) };
}
