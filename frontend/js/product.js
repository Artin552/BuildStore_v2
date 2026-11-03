// ============================================================
// СТРАНИЦА ТОВАРА (product.js) — для product.html
// ============================================================
// Что изменилось по сравнению со старой версией:
// 1. Показываем тип продавца и сертификат (ТЗ 7.1, 7.2): «Частный продавец»,
//    «Организация «…»», ссылка на сертификат или заметное предупреждение.
// 2. Убраны обработчики #searchBtn/#searchInput — таких элементов на странице
//    нет, и скрипт падал с ошибкой «Cannot read properties of null».
// 3. Убран onclick="alert(...)" у кнопки «Связаться» — его блокирует CSP.
// 4. Картинки с picsum.photos блокирует CSP — используем свою заглушку.
(function () {
  'use strict';

  const api = window.BuildStoreApi;
  const esc = api.escapeHtml;
  const root = document.getElementById('productDetail');

  const productId = new URLSearchParams(window.location.search).get('id');

  function showError(text) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">${esc(text)}</div>
        <a href="/frontend/listings.html" class="btn btn-primary" style="margin-top:16px;">Вернуться в каталог</a>
      </div>`;
  }

  // Блок про документы: для организации — сертификат или предупреждение
  function certificateBlock(item) {
    if (item.sellerType !== 'organization') return '';
    if (item.certificatePath) {
      return `
        <div class="notice notice-success">
          <strong>Продавец приложил сертификат / паспорт товара.</strong>
          <a href="${esc(item.certificatePath)}" target="_blank" rel="noopener">Открыть документ</a>
        </div>`;
    }
    return `
      <div class="notice notice-warning" role="note">
        <strong>Внимание: продавец не предоставил сертификат или паспорт на этот товар.</strong>
        Перед покупкой запросите документы у продавца.
      </div>`;
  }

  function render(item) {
    const created = item.created_at ? new Date(Number(item.created_at)) : null;
    const dateStr = created ? created.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    document.title = (item.title || 'Объявление') + ' — BuildStore';

    root.innerHTML = `
      <article class="product-detail">
        <div class="product-media">
          <img class="product-image" src="${esc(item.imagePath || '/img/placeholder.svg')}" alt="${esc(item.title)}">
        </div>

        <div class="product-info">
          <h1 class="product-title">${esc(item.title)}</h1>
          <div class="text-muted">${esc(item.category || 'Без категории')}${dateStr ? ' · размещено ' + dateStr : ''}</div>

          <div class="product-price">${api.formatPrice(item.price)}</div>
          <div class="card-meta">
            ${item.in_stock ? '<span class="badge badge-stock">В наличии</span>' : '<span class="badge badge-out-of-stock">Нет в наличии</span>'}
          </div>

          <!-- Пометка продавца (ТЗ 7.1) и документы (ТЗ 7.2) -->
          ${api.sellerBadgesHtml(item)}
          ${certificateBlock(item)}

          <p class="product-description">${esc(item.description || 'Описание не указано')}</p>

          <div class="product-actions">
            <button type="button" class="btn btn-primary" id="addToCartBtn">Добавить в корзину</button>
            <a href="/frontend/listings.html" class="btn btn-secondary">Назад в каталог</a>
          </div>
          <p class="form-message" id="cartMessage" role="status" hidden></p>
        </div>
      </article>`;

    root.querySelector('.product-image').addEventListener('error', (e) => {
      e.target.src = '/img/placeholder.svg';
    }, { once: true });

    const button = document.getElementById('addToCartBtn');
    const message = document.getElementById('cartMessage');
    button.addEventListener('click', () => {
      window.cart.addItem(item);
      message.innerHTML = 'Товар добавлен. <a href="/frontend/cart.html">Перейти в корзину</a>';
      message.hidden = false;
    });
  }

  async function load() {
    if (!productId) return showError('Товар не найден');
    try {
      const res = await api.apiFetch('/listings/' + encodeURIComponent(productId), { headers: api.authHeaders() });
      render(await res.json());
    } catch (err) {
      showError(err.status === 404 ? 'Товар не найден или снят с публикации' : err.message);
    }
  }

  load();
})();