// Общая логика страниц со списком: фильтры и номер страницы хранятся в адресе (?status=pending&page=2).
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useListParams() {
  const [params, setParams] = useSearchParams();

  // В адресе может быть что угодно, поэтому берём только целое число больше нуля
  const rawPage = Number(params.get('page'));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  // Меняет фильтры. Новый фильтр возвращает на первую страницу.
  const update = (changes: Record<string, string>, replace = false) => {
    const next = new URLSearchParams(params);
    if (!('page' in changes)) next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace });
  };

  const setPage = (nextPage: number, replace = false) => {
    update({ page: nextPage > 1 ? String(nextPage) : '' }, replace);
    window.scrollTo(0, 0);
  };

  return { params, page, update, setPage };
}

// В адресе страница 50, а их всего 3 (записи удалили или ссылка устарела): идём на последнюю
export function useClampPage(page: number, totalPages: number, setPage: (page: number, replace: boolean) => void) {
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);
}
