// ============================================================
// КАТАЛОГ (listings.js) — для frontend/listings.html
// ============================================================
// Что изменилось по сравнению со старой версией:
// 1. Работает ссылка ?category=... (плитки категорий на главной и выбор
//    категории в поиске) — раньше она игнорировалась.
// 2. Фильтр «В наличии»: сервер присылает 1/0, а старый код сравнивал с false.
// 3. Карточки оформлены CSS-классами, а не style="background: white" —
//    поэтому корректно выглядят в тёмной теме.
// 4. Пометки «Частный продавец / Организация / Сертификат» (ТЗ 7.1, 7.2).
// 5. Никаких картинок с picsum.photos — их блокирует CSP, используем заглушку.
(function () {
  'use strict';

  const api = window.BuildStoreApi;
  const esc = api.escapeHtml;

  const ITEMS_PER_PAGE = 12;
  let currentPage = 1;
  let currentCategory = null;
  let currentProducts = []; // что сейчас показываем (после фильтров/поиска)
  let allListings = [];

  const $ = (id) => document.getElementById(id);

  // ---------- Загрузка всех объявлений (сервер отдаёт максимум 100 за раз) ----------
  async function fetchAllListings() {
    try {
      const PAGE_SIZE = 100;
      allListings = [];
      for (let page = 1; page <= 50; page++) {
        const res = await api.apiFetch(`/listings?limit=${PAGE_SIZE}&page=${page}`);
        const batch = await res.json();
        allListings = allListings.concat(batch);
        const total = Number(res.headers.get('X-Total-Count')) || allListings.length;
        if (batch.length < PAGE_SIZE || allListings.length >= total) break;
      }
      return allListings;
    } catch (err) {
      console.error('Ошибка при загрузке товаров:', err);
      return null; // null = ошибка, [] = пустой каталог
    }
  }

  function getCategories(listings) {
    const map = new Map();
    listings.forEach((item) => {
      const name = item.category || 'Без категории';
      if (!map.has(name)) map.set(name, { name, count: 0, image: '' });
      const data = map.get(name);
      data.count++;
      if (!data.image && item.imagePath) data.image = item.imagePath;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  function withPlaceholder(root) {
    root.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => { img.src = '/img/placeholder.svg'; }, { once: true });
    });
  }

  // ---------- Плитки категорий ----------
  function displayCategories(categories) {
    const grid = $('categoryGrid');
    if (categories.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-title">Пока нет ни одного объявления</div><a class="btn btn-primary" href="/frontend/add.html" style="margin-top:16px;">Разместить первое</a></div>';
      return;
    }
    grid.innerHTML = categories.map((cat) => `
      <button type="button" class="category-card" data-category="${esc(cat.name)}">
        <span class="category-card-image"><img src="${esc(cat.image || '/img/placeholder.svg')}" alt="" loading="lazy"></span>
        <span class="category-card-title">${esc(cat.name)}</span>
        <span class="category-card-count">${cat.count} ${plural(cat.count, 'товар', 'товара', 'товаров')}</span>
      </button>`).join('');
    withPlaceholder(grid);
  }

  // 1 товар, 2 товара, 5 товаров
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  // ---------- Список товаров ----------
  function productCardHtml(item) {
    return `
      <article class="card">
        <div class="card-image">
          <img src="${esc(item.imagePath || '/img/placeholder.svg')}" alt="${esc(item.title)}" loading="lazy">
          ${item.discount ? `<span class="badge badge-warning card-discount">−${Number(item.discount)}%</span>` : ''}
        </div>
        <div class="card-content">
          <h3 class="card-title">${esc(item.title || 'Без названия')}</h3>
          <p class="card-description">${esc(item.description || '')}</p>
          <div class="card-price">${api.formatPrice(item.price)}</div>
          <div class="card-meta">
            ${Number(item.in_stock) === 1 ? '<span class="badge badge-stock">В наличии</span>' : '<span class="badge badge-out-of-stock">Нет в наличии</span>'}
          </div>
          ${api.sellerBadgesHtml(item)}
          <div class="card-actions">
            <a href="/frontend/product.html?id=${encodeURIComponent(item.id)}" class="btn btn-secondary btn-sm">Подробнее</a>
          </div>
        </div>
      </article>`;
  }

  function applyFilters(list) {
    let filtered = list;
    if ($('fInStock').checked) filtered = filtered.filter((p) => Number(p.in_stock) === 1);
    if ($('fDiscount').checked) filtered = filtered.filter((p) => Number(p.discount) > 0);
    const minRating = Number($('fRating').value);
    if (minRating > 0) filtered = filtered.filter((p) => Number(p.rating || 0) >= minRating);
    const maxPrice = Number($('fMaxPrice').value);
    if (maxPrice > 0) filtered = filtered.filter((p) => Number(p.price) <= maxPrice);
    return filtered;
  }

  function renderProducts() {
    const grid = $('productsGrid');
    const products = applyFilters(currentProducts);

    if (products.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-title">Ничего не найдено</div><div class="empty-state-description">Попробуйте изменить фильтры или запрос</div></div>';
      $('paginationContainer').innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    grid.innerHTML = products.slice(start, start + ITEMS_PER_PAGE).map(productCardHtml).join('');
    withPlaceholder(grid);
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const box = $('paginationContainer');
    if (totalPages <= 1) { box.innerHTML = ''; return; }
    box.innerHTML = `
      <button type="button" class="btn btn-secondary btn-sm" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>Предыдущая</button>
      <span class="pagination-info">Страница ${currentPage} из ${totalPages}</span>
      <button type="button" class="btn btn-secondary btn-sm" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>Следующая</button>`;
  }

  // ---------- Переключение экранов ----------
  function showSection(which, title) {
    $('categoriesSection').hidden = which !== 'categories';
    $('productsSection').hidden = which !== 'products';
    if (title) $('categoryTitle').textContent = title;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showCategory(name) {
    currentCategory = name;
    currentPage = 1;
    currentProducts = allListings.filter((p) => p.category === name);
    $('filtersPanel').hidden = false;
    showSection('products', name);
    renderProducts();
  }

  function showSearchResults(query, category) {
    const q = (query || '').toLowerCase();
    currentCategory = category || null;
    currentPage = 1;
    currentProducts = allListings.filter((item) => {
      if (category && item.category !== category) return false;
      return ['title', 'description', 'category'].some((key) => (item[key] || '').toLowerCase().includes(q));
    });
    $('filtersPanel').hidden = false;
    showSection('products', `Результаты поиска: «${query}»` + (category ? ` — ${category}` : ''));
    renderProducts();
  }

  // ---------- Обработчики ----------
  $('categoryGrid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-category]');
    if (card) showCategory(card.dataset.category);
  });

  $('paginationContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-page]');
    if (!btn) return;
    currentPage += btn.dataset.page === 'next' ? 1 : -1;
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('backBtn').addEventListener('click', () => {
    currentCategory = null;
    // убираем ?q= / ?category= из адреса, чтобы «назад» вёл к списку категорий
    history.replaceState(null, '', window.location.pathname);
    showSection('categories');
  });

  $('applyFiltersBtn').addEventListener('click', () => { currentPage = 1; renderProducts(); });
  $('clearFiltersBtn').addEventListener('click', () => {
    $('fInStock').checked = false;
    $('fDiscount').checked = false;
    $('fRating').value = '0';
    $('fMaxPrice').value = '';
    currentPage = 1;
    renderProducts();
  });
  ['fInStock', 'fDiscount', 'fRating', 'fMaxPrice'].forEach((id) => {
    $(id).addEventListener('change', () => { currentPage = 1; renderProducts(); });
  });

  // ---------- Запуск ----------
  async function init() {
    const params = new URLSearchParams(window.location.search);
    const query = (params.get('q') || '').trim();
    const category = (params.get('category') || '').trim();

    const listings = await fetchAllListings();
    if (listings === null) {
      $('categoryGrid').innerHTML = '<div class="empty-state"><div class="empty-state-title">Не удалось загрузить объявления</div><div class="empty-state-description">Обновите страницу — если ошибка повторяется, сервер временно недоступен</div></div>';
      return;
    }

    displayCategories(getCategories(allListings));

    if (query) showSearchResults(query, category);      // поиск (с категорией или без)
    else if (category) showCategory(category);          // клик по плитке категории на главной
  }

  init();
})();