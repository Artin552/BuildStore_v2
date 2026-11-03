/**
 * ГЛАВНЫЙ СКРИПТ ДЛЯ index.html
 * Обновлённая версия с новой структурой главной страницы
 */

(function() {
  'use strict';

  // ============================================================
  // АВТОМАТИЧЕСКИЙ ГОД В ФУТЕРЕ
  // ============================================================
  function initFooterYear() {
    // Все элементы года (в т.ч. в общем футере layout.js на других страницах)
    const els = document.querySelectorAll('#currentYear, [data-year]');
    els.forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  // ============================================================
  // МОБИЛЬНОЕ МЕНЮ
  // ============================================================
  function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.getElementById('navMenu');

    if (!menuBtn || !navMenu) return;

    const ICON_MENU = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>';
    const ICON_CLOSE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    menuBtn.addEventListener('click', (e) => {
      // Без этого клик «всплывал» до document (обработчик ниже), а там иконка,
      // по которой кликнули, уже заменена — код решал, что клик был ВНЕ меню,
      // и сразу закрывал его. Меню на телефоне не открывалось.
      e.stopPropagation();
      navMenu.classList.toggle('active');
      const isExpanded = navMenu.classList.contains('active');
      menuBtn.setAttribute('aria-expanded', isExpanded);
      menuBtn.innerHTML = isExpanded ? ICON_CLOSE : ICON_MENU; // SVG вместо ☰/✕ (ТЗ 2A.3)
    });

    // Закрываем меню при клике вне его
    document.addEventListener('click', (e) => {
      if (!menuBtn.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Закрываем меню при выборе пункта
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.innerHTML = ICON_MENU;
      });
    });
  }

  // ============================================================
  // ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ В ШАПКЕ
  // ============================================================
  function initThemeToggle() {
    // createToggle сам проверяет, не создан ли переключатель раньше
    const container = document.getElementById('themeToggleContainer');
    if (container && window.BuildStoreTheme) {
      window.BuildStoreTheme.createToggle(container);
    }
  }

  // ============================================================
  // БЫСТРЫЕ ТЕГИ ПОИСКА
  // ============================================================
  function initQuickTags() {
    const tags = document.querySelectorAll('.quick-tag');
    tags.forEach(tag => {
      tag.addEventListener('click', () => {
        const searchTerm = tag.dataset.tag;
        if (searchTerm) {
          window.location.href = '/frontend/listings.html?q=' + encodeURIComponent(searchTerm);
        }
      });
    });
  }

  // ============================================================
  // ЗАГРУЗКА КАТЕГОРИЙ
  // ============================================================
  async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    try {
      // apiFetch имеет встроенный таймаут — «вечного спиннера» не будет (ТЗ 2A.0)
      const res = await window.BuildStoreApi.apiFetch('/listings?limit=100');
      const listings = await res.json();
      
      // Группируем по категориям
      const categoryMap = new Map();
      listings.forEach(item => {
        const cat = item.category || 'Без категории';
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { name: cat, count: 0, image: item.imagePath });
        }
        const data = categoryMap.get(cat);
        data.count++;
        if (!data.image && item.imagePath) {
          data.image = item.imagePath;
        }
      });

      // «Популярные» = где больше всего товаров, поэтому сортируем по количеству
      const categories = Array.from(categoryMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      if (categories.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-title">Категории пока не добавлены</div></div>';
        return;
      }

      // Рендерим bento-сетку
      grid.innerHTML = categories.map((cat, idx) => {
        const isLarge = idx === 0;
       // Сервер уже присылает готовый путь вида /uploads/listing_123.jpg —
        // раньше здесь добавлялся второй /uploads/, и картинка не находилась.
        // Внешние картинки (picsum.photos) блокирует защита helmet, поэтому — своя заглушка.
        const imgUrl = cat.image || '/img/placeholder.svg';
        
        return `
          <a href="/frontend/listings.html?category=${encodeURIComponent(cat.name)}" 
             class="category-tile ${isLarge ? 'category-tile-large' : ''}"
             style="background-image: linear-gradient(to bottom, transparent, rgba(0,0,0,0.7)), url('${escapeHtml(imgUrl)}'); background-size: cover;">
            <div class="category-tile-content">
              <div class="category-tile-title">${escapeHtml(cat.name)}</div>
              <div class="category-tile-count">${cat.count} ${plural(cat.count, 'товар', 'товара', 'товаров')}</div>
            </div>
          </a>
        `;
      }).join('');
      
    } catch (err) {
      // Техническая причина — только в консоль (ТЗ 2.5)
      console.error('Ошибка загрузки категорий:', err);
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Не удалось загрузить категории</div>
          <div class="empty-state-description">Попробуйте обновить страницу</div>
        </div>
      `;
    }
  }

  // ============================================================
  // ЗАГРУЗКА ПОПУЛЯРНЫХ ТОВАРОВ
  // ============================================================
  async function loadPopularListings() {
    const container = document.getElementById('listings');
    if (!container) return;

    try {
      const res = await window.BuildStoreApi.apiFetch('/listings?limit=8');
      const listings = await res.json();
      
      if (listings.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>
            <div class="empty-state-title">Товары пока не добавлены</div>
            <div class="empty-state-description">Загляните позже — мы постоянно пополняем ассортимент</div>
          </div>
        `;
        return;
      }

      container.innerHTML = listings.map(item => {
        const imgUrl = item.imagePath || '/img/placeholder.svg';
        const price = window.BuildStoreApi.formatPrice(item.price);
        
        return `
          <article class="card">
            <div class="card-image">
              <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.title)}" loading="lazy">
              ${item.discount ? `<span class="badge badge-warning" style="position:absolute;top:8px;left:8px;">−${item.discount}%</span>` : ''}
            </div>
            <div class="card-content">
              <h3 class="card-title">${escapeHtml(item.title)}</h3>
              <div class="card-price">${price}</div>
              <div class="card-meta">
                <span class="badge badge-category">${escapeHtml(item.category || 'Без категории')}</span>
                ${item.in_stock ? '<span class="badge badge-stock">В наличии</span>' : '<span class="badge badge-out-of-stock">Нет в наличии</span>'}
              </div>
              ${window.BuildStoreApi.sellerBadgesHtml(item)}
              <div class="card-actions">
                <a href="/frontend/product.html?id=${encodeURIComponent(item.id)}" class="btn btn-secondary btn-sm">Подробнее</a>
              </div>
            </div>
          </article>
        `;
      }).join('');

      // Если файла картинки нет на сервере — показываем заглушку.
      // Обработчик вешаем из JS: атрибут onerror="..." в HTML блокирует защита CSP.
      container.querySelectorAll('.card-image img').forEach((img) => {
        img.addEventListener('error', () => { img.src = '/img/placeholder.svg'; }, { once: true });
      });
      
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
          <div class="empty-state-title">Не удалось загрузить объявления</div>
          <div class="empty-state-description">Попробуйте обновить страницу — если ошибка повторяется, сервис временно недоступен</div>
        </div>
      `;
    }
  }

  // ============================================================
  // УТИЛИТЫ
  // ============================================================

  // 1 товар, 2 товара, 5 товаров
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }


  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================================
  function init() {
    initFooterYear();
    initMobileMenu();
    initThemeToggle();
    initQuickTags();
    loadCategories();
    loadPopularListings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
