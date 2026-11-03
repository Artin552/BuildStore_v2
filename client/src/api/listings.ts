// Запросы объявлений (GET). Создание и редактирование появятся на шаге 3.
import { apiFetch, apiFetchList } from './client';
import { CATEGORIES } from './types';
import type { Category, Listing } from './types';

export interface ListingFilters {
  q?: string;
  category?: string;
  inStock?: boolean;
  discount?: boolean;
  minRating?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export function fetchListings(filters: ListingFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.inStock) params.set('in_stock', 'true');
  if (filters.discount) params.set('discount', 'true');
  if (filters.minRating) params.set('minRating', String(filters.minRating));
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return apiFetchList<Listing>(`/listings?${params}`, { signal });
}

export function fetchListing(id: string, signal?: AbortSignal): Promise<Listing> {
  return apiFetch<Listing>(`/listings/${encodeURIComponent(id)}`, { signal });
}

export interface CategorySummary {
  name: Category;
  count: number;
  image: string;
}

// Для плиток категорий нужно только число товаров и одна картинка: просим по одному
// товару, а точное количество берём из заголовка X-Total-Count.
export async function fetchCategorySummaries(signal?: AbortSignal): Promise<CategorySummary[]> {
  return Promise.all(
    CATEGORIES.map(async (name) => {
      const { items, total } = await fetchListings({ category: name, limit: 1 }, signal);
      return { name, count: total, image: items[0]?.imagePath ?? '' };
    }),
  );
}
