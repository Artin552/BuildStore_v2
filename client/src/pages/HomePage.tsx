// Главная: баннер с поиском, категории с количеством товаров, свежие предложения.
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCategorySummaries, fetchListings } from '../api/listings';
import { CATEGORIES } from '../api/types';
import EmptyState from '../components/EmptyState';
import { BoxIcon, BriefcaseIcon, CheckIcon, SearchIcon, TruckIcon } from '../components/Icons';
import ListingCard from '../components/ListingCard';
import { PLACEHOLDER_IMAGE } from '../components/ListingImage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFetch } from '../hooks/useFetch';
import { plural } from '../utils/format';

const QUICK_SEARCHES = ['Кирпич', 'Цемент', 'Дрель', 'Бетон'];
const FRESH_LISTINGS_COUNT = 8;

export default function HomePage() {
  useDocumentTitle();
  const navigate = useNavigate();

  const categories = useFetch((signal) => fetchCategorySummaries(signal), []);
  const listings = useFetch((signal) => fetchListings({ limit: FRESH_LISTINGS_COUNT }, signal), []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const category = String(form.get('category') ?? '');
    const query = String(form.get('q') ?? '').trim();
    if (category) params.set('category', category);
    if (query) params.set('q', query);
    navigate(`/catalog?${params}`);
  };

  const filledCategories =
    categories.state.status === 'success'
      ? categories.state.data.filter((category) => category.count > 0).sort((a, b) => b.count - a.count)
      : [];

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <h1>Ваш строительный маркетплейс нового поколения</h1>
          <p className="hero-sub">Быстро. Надёжно. Без посредников.</p>

          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-icon icon-inline">
                <BoxIcon />
              </span>
              {/* Настоящее число из базы, а не выдуманное «5000+» */}
              <span className="stat-value">{listings.state.status === 'success' ? listings.state.data.total : '—'}</span>
              <span className="stat-label">
                {listings.state.status === 'success'
                  ? plural(listings.state.data.total, 'товар', 'товара', 'товаров')
                  : 'товаров'}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-icon icon-inline">
                <TruckIcon />
              </span>
              <span className="stat-value">Доставка</span>
              <span className="stat-label">по всей России</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon icon-inline">
                <BriefcaseIcon />
              </span>
              <span className="stat-value">B2B и B2C</span>
              <span className="stat-label">для компаний и частных лиц</span>
            </div>
          </div>

          <form className="hero-search" role="search" onSubmit={handleSearch}>
            <label htmlFor="heroCategory" className="visually-hidden">
              Категория
            </label>
            <select id="heroCategory" name="category" defaultValue="">
              <option value="">Все категории</option>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>

            <label htmlFor="heroSearch" className="visually-hidden">
              Поиск
            </label>
            <input id="heroSearch" name="q" placeholder="Найти стройматериалы, инструменты..." autoComplete="off" />

            <button type="submit" className="btn btn-primary">
              <SearchIcon /> Найти
            </button>
          </form>

          <div className="quick-tags">
            {QUICK_SEARCHES.map((word) => (
              <Link key={word} className="quick-tag" to={`/catalog?q=${encodeURIComponent(word)}`}>
                {word}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <section className="categories-section" aria-label="Категории товаров">
          <h2>Популярные категории</h2>
          <div className="categories-grid">
            {categories.state.status === 'loading' && <EmptyState title="Загружаем категории…" />}
            {categories.state.status === 'error' && (
              <EmptyState title="Не удалось загрузить категории" description={categories.state.message}>
                <button type="button" className="btn btn-secondary" onClick={categories.reload}>
                  Повторить
                </button>
              </EmptyState>
            )}
            {categories.state.status === 'success' && filledCategories.length === 0 && (
              <EmptyState title="Категории пока не заполнены" />
            )}
            {filledCategories.map((category, index) => (
              <Link
                key={category.name}
                to={`/catalog?category=${encodeURIComponent(category.name)}`}
                className={index === 0 ? 'category-tile category-tile-large' : 'category-tile'}
                style={{
                  // Заглушка лежит слоем ниже: если файла картинки нет, браузер покажет её
                  backgroundImage: `linear-gradient(to bottom, transparent, rgba(0,0,0,0.7)), url("${category.image || PLACEHOLDER_IMAGE}"), url("${PLACEHOLDER_IMAGE}")`,
                }}
              >
                <div className="category-tile-content">
                  <div className="category-tile-title">{category.name}</div>
                  <div className="category-tile-count">
                    {category.count} {plural(category.count, 'товар', 'товара', 'товаров')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="how-it-works" aria-label="Как это работает">
          <h2>Как это работает</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">
                <SearchIcon />
              </div>
              <h3 className="step-title">Выбираете товар</h3>
              <p className="step-description">
                Находите нужный материал или инструмент среди предложений частных продавцов и проверенных организаций
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <TruckIcon size={32} />
              </div>
              <h3 className="step-title">Оформляете заказ</h3>
              <p className="step-description">Добавляете товары в корзину и оформляете заказ в пару кликов</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <CheckIcon size={32} />
              </div>
              <h3 className="step-title">Получаете и проверяете</h3>
              <p className="step-description">Сверяете товар с описанием и документами продавца</p>
            </div>
          </div>
        </section>

        <section className="listings-section" aria-label="Свежие предложения">
          <h2>Свежие предложения</h2>
          <div className="listings-grid">
            {listings.state.status === 'loading' && <EmptyState title="Загружаем предложения…" />}
            {listings.state.status === 'error' && (
              <EmptyState title="Не удалось загрузить объявления" description={listings.state.message}>
                <button type="button" className="btn btn-secondary" onClick={listings.reload}>
                  Повторить
                </button>
              </EmptyState>
            )}
            {listings.state.status === 'success' && listings.state.data.items.length === 0 && (
              <EmptyState title="Товары пока не добавлены" description="Станьте первым продавцом на BuildStore" />
            )}
            {listings.state.status === 'success' &&
              listings.state.data.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        </section>

        <section className="cta-section">
          <h2>Продаёте стройматериалы или инструмент?</h2>
          <p className="text-muted cta-text">Разместите объявление на BuildStore и найдите новых клиентов.</p>
          <Link to="/listings/new" className="btn btn-primary btn-lg">
            Разместить объявление
          </Link>
        </section>
      </div>
    </>
  );
}
