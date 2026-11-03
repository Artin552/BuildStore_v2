// Каталог. Всё его состояние хранится в адресе: /catalog?category=СИЗ&q=каска&page=2.
// Поэтому ссылку можно отправить другому человеку, а кнопка «Назад» в браузере работает.
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchCategorySummaries, fetchListings } from '../api/listings';
import EmptyState from '../components/EmptyState';
import { SearchIcon } from '../components/Icons';
import ListingCard from '../components/ListingCard';
import ListingImage from '../components/ListingImage';
import Pagination from '../components/Pagination';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFetch } from '../hooks/useFetch';
import { plural } from '../utils/format';

const ITEMS_PER_PAGE = 12;
const RATING_OPTIONS = [3, 4];

// Ключи фильтров в адресе. Сюда может попасть что угодно, поэтому значения проверяем.
function readFilters(params: URLSearchParams) {
  const page = Number(params.get('page'));
  const minRating = Number(params.get('minRating'));
  const maxPrice = Number(params.get('maxPrice'));
  return {
    q: params.get('q')?.trim() ?? '',
    category: params.get('category') ?? '',
    inStock: params.get('in_stock') === 'true',
    discount: params.get('discount') === 'true',
    minRating: RATING_OPTIONS.includes(minRating) ? minRating : 0,
    maxPrice: maxPrice > 0 ? maxPrice : 0,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function CategoryGrid() {
  const { state, reload } = useFetch((signal) => fetchCategorySummaries(signal), []);

  if (state.status === 'loading') return <EmptyState title="Загружаем каталог…" />;
  if (state.status === 'error') {
    return (
      <EmptyState title="Не удалось загрузить каталог" description={state.message}>
        <button type="button" className="btn btn-secondary" onClick={reload}>
          Повторить
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="category-grid">
      {state.data.map((category) => (
        <Link key={category.name} className="category-card" to={`/catalog?category=${encodeURIComponent(category.name)}`}>
          <span className="category-card-image">
            <ListingImage src={category.image} alt="" />
          </span>
          <span className="category-card-title">{category.name}</span>
          <span className="category-card-count">
            {category.count} {plural(category.count, 'товар', 'товара', 'товаров')}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const { q, category, inStock, discount, minRating, maxPrice, page } = filters;
  const hasFilters = inStock || discount || minRating > 0 || maxPrice > 0;
  const showProducts = Boolean(q || category || hasFilters);

  // Поле «Цена до» обновляет адрес не на каждую цифру, а по кнопке. Новый key очищает его при сбросе.
  const [priceFieldKey, setPriceFieldKey] = useState(0);

  const title = q ? `Результаты поиска: «${q}»${category ? ` — ${category}` : ''}` : category || (hasFilters ? 'Все товары' : 'Каталог');
  useDocumentTitle(title);

  const { state, reload } = useFetch(
    (signal) =>
      showProducts
        ? fetchListings({ q, category, inStock, discount, minRating, maxPrice, page, limit: ITEMS_PER_PAGE }, signal)
        : Promise.resolve({ items: [], total: 0 }),
    [showProducts, q, category, inStock, discount, minRating, maxPrice, page],
  );

  const totalPages = state.status === 'success' ? Math.ceil(state.data.total / ITEMS_PER_PAGE) : 0;

  // Меняет параметры адреса. Любой новый фильтр возвращает на первую страницу.
  const updateParams = (changes: Record<string, string>, options?: { replace?: boolean }) => {
    const next = new URLSearchParams(params);
    if (!('page' in changes)) next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, options);
  };

  // В адресе страница 50, а их всего 3 (товары удалили или ссылка устарела): идём на последнюю
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) updateParams({ page: String(totalPages) }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams({ q: String(new FormData(event.currentTarget).get('q') ?? '').trim() });
  };

  const handleApplyPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get('maxPrice'));
    updateParams({ maxPrice: value > 0 ? String(value) : '' });
  };

  const handleResetFilters = () => {
    setPriceFieldKey((key) => key + 1);
    updateParams({ in_stock: '', discount: '', minRating: '', maxPrice: '' });
  };

  const handlePageChange = (nextPage: number) => {
    updateParams({ page: String(nextPage) });
    window.scrollTo(0, 0);
  };

  return (
    <div className="container page-main">
      {showProducts && (
        <Link to="/catalog" className="btn btn-secondary btn-sm catalog-back">
          Все категории
        </Link>
      )}
      <h1 className="page-title">{title}</h1>

      {/* key: когда запрос в адресе меняется (например, кнопкой «Назад»), поле показывает новое значение */}
      <form key={q} className="search-inline catalog-search" role="search" onSubmit={handleSearch}>
        <label htmlFor="catalogSearch" className="visually-hidden">
          Поиск по каталогу
        </label>
        <input id="catalogSearch" name="q" defaultValue={q} placeholder="Найти товар..." autoComplete="off" />
        <button type="submit" className="btn btn-primary btn-sm">
          <SearchIcon /> Найти
        </button>
      </form>

      {!showProducts && <CategoryGrid />}

      {showProducts && (
        <div className="catalog-layout">
          <form className="filters-panel" aria-label="Фильтры" onSubmit={handleApplyPrice}>
            <h2 className="filters-title">Фильтры</h2>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(event) => updateParams({ in_stock: event.target.checked ? 'true' : '' })}
              />
              <span>В наличии</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={discount}
                onChange={(event) => updateParams({ discount: event.target.checked ? 'true' : '' })}
              />
              <span>Только со скидкой</span>
            </label>

            <label className="filter-label" htmlFor="filterRating">
              Минимальный рейтинг
            </label>
            <select
              id="filterRating"
              className="input"
              value={minRating}
              onChange={(event) => updateParams({ minRating: event.target.value === '0' ? '' : event.target.value })}
            >
              <option value={0}>Любой</option>
              {RATING_OPTIONS.map((rating) => (
                <option key={rating} value={rating}>
                  от {rating} звёзд
                </option>
              ))}
            </select>

            <label className="filter-label" htmlFor="filterMaxPrice">
              Цена до, ₽
            </label>
            <input
              key={`${maxPrice}-${priceFieldKey}`}
              id="filterMaxPrice"
              name="maxPrice"
              type="number"
              min="0"
              className="input"
              placeholder="Например, 5000"
              defaultValue={maxPrice || ''}
            />

            <div className="filters-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                Сбросить
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Применить
              </button>
            </div>
          </form>

          <div>
            {state.status === 'loading' && <EmptyState title="Загружаем товары…" />}
            {state.status === 'error' && (
              <EmptyState title="Не удалось загрузить товары" description={state.message}>
                <button type="button" className="btn btn-secondary" onClick={reload}>
                  Повторить
                </button>
              </EmptyState>
            )}
            {state.status === 'success' && state.data.total === 0 && (
              <EmptyState title="Ничего не найдено" description="Попробуйте изменить фильтры или запрос" />
            )}
            {state.status === 'success' && state.data.total > 0 && (
              <>
                <p className="text-muted catalog-count">
                  Найдено: {state.data.total} {plural(state.data.total, 'товар', 'товара', 'товаров')}
                </p>
                <div className="listings-grid">
                  {state.data.items.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
