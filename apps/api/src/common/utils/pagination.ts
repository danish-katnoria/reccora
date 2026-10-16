export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { items, meta: { page, limit, total, totalPages, hasMore: page * limit < total } };
}

export const skipTake = (page: number, limit: number) => ({ skip: (page - 1) * limit, take: limit });
