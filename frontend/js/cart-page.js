// ============================================================
// ЛОГИКА СТРАНИЦЫ КОРЗИНЫ (cart-page.js)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('cartContainer');

  container.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const itemId = parseInt(button.dataset.itemId);
    if (!itemId) return;

    const action = button.dataset.action;
    if (action === 'remove') {
      removeItem(itemId);
    } else if (action === 'increment') {
      incrementQuantity(itemId);
    } else if (action === 'decrement') {
      decrementQuantity(itemId);
    }
  });

  // Экранирование HTML — названия объявлений вводят пользователи (защита от XSS)
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Функция для отображения корзины
  function renderCart() {
    const items = window.cart.getItems();
    const total = window.cart.getTotal();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Ваша корзина пуста</div>
          <a href="/frontend/listings.html" class="btn btn-primary" style="margin-top:16px;">Перейти в каталог</a>
        </div>
      `;
      return;
    }

    let itemsHtml = '';
    items.forEach(item => {
      // Внешние картинки (picsum.photos) блокирует защита CSP — показываем свою заглушку
      const imgUrl = item.imagePath || '/img/placeholder.svg';
      const itemTotal = parseFloat(item.price || 0) * (item.quantity || 1);
      
      itemsHtml += `
        <img src="${esc(imgUrl)}" alt="${esc(item.title)}" class="cart-item-image">
          <div class="cart-item-info">
            <div class="cart-item-title">${esc(item.title)}</div>
            <div class="cart-item-price">${window.BuildStoreApi.formatPrice(item.price)}</div>
            <div class="cart-item-quantity">
              <button type="button" class="btn btn-secondary btn-sm" data-action="decrement" data-item-id="${item.id}" aria-label="Уменьшить количество">−</button>
              <input type="number" value="${item.quantity || 1}" min="1" max="999" class="quantity-input" data-item-id="${item.id}" aria-label="Количество">
              <button type="button" class="btn btn-secondary btn-sm" data-action="increment" data-item-id="${item.id}" aria-label="Увеличить количество">+</button>
              <span class="text-muted">= ${window.BuildStoreApi.formatPrice(itemTotal)}</span>
            </div>
          </div>
          <button type="button" class="cart-item-remove" data-action="remove" data-item-id="${item.id}">Удалить</button>
        </div>
      `;
    });

    const cartSummary = `
      <div class="cart-summary">
        <div class="cart-summary-row">
          <span>Товаров:</span>
          <span>${items.reduce((n, it) => n + (it.quantity || 1), 0)}</span>
        </div>
        <div class="cart-summary-row">
          <span>Подитог:</span>
          <span>${window.BuildStoreApi.formatPrice(total)}</span>
        </div>
        <div class="cart-summary-total">
          Итого: ${window.BuildStoreApi.formatPrice(total)}
        </div>
        <p class="text-muted" style="font-size:13px;">Итоговую сумму пересчитает сервер по актуальным ценам.</p>
        <button type="button" class="btn btn-primary" style="width: 100%; margin-top: 16px;" id="checkoutBtn">
          Оформить заказ
        </button>
        <a href="/frontend/listings.html" class="btn btn-secondary" style="width: 100%; margin-top: 8px;">
          Продолжить покупки
        </a>
      </div>
    `;

       container.innerHTML = `<div style="max-width: 1000px;">${itemsHtml}</div>${cartSummary}`;

    // Нет файла картинки на сервере — заглушка (обработчик из JS, т.к. onerror="" блокирует CSP)
    container.querySelectorAll('.cart-item-image').forEach((img) => {
      img.addEventListener('error', () => { img.src = '/img/placeholder.svg'; }, { once: true });
    });

    // Обработчик для кнопки оформления заказа
    document.getElementById('checkoutBtn').addEventListener('click', checkoutOrder);

    // Обработчики изменения количества через input
    document.querySelectorAll('.quantity-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const itemId = parseInt(e.target.dataset.itemId);
        const quantity = parseInt(e.target.value) || 1;
        if (quantity > 0) {
          window.cart.updateQuantity(itemId, quantity);
          renderCart();
        } else {
          e.target.value = 1;
        }
      });
    });
  }

  // Функция оформления заказа
  async function checkoutOrder() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    
    if (!token) {
      alert('Пожалуйста, авторизуйтесь перед оформлением заказа');
      window.location.href = '/frontend/auth.html';
      return;
    }

    const items = window.cart.getItems();
    const total = window.cart.getTotal().toFixed(2);

    const checkoutBtn = document.getElementById('checkoutBtn');
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<span class="loading-spinner"></span> Обработка...';

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: items,
          total: total
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при создании заказа');
      }

      const order = await response.json();
      
      // Очищаем корзину
      window.cart.clear();

      // Показываем успешное сообщение
      container.innerHTML = `
            <div class="empty-state" role="status">
          <div class="empty-state-title">Заказ #${order.id} оформлен</div>
          <div class="empty-state-description">Сумма: ${window.BuildStoreApi.formatPrice(order.total)}. Статус заказа видно на странице «Мои заказы».</div>
          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px; flex-wrap: wrap;">
            <a href="/frontend/orders.html" class="btn btn-primary">Мои заказы</a>
            <a href="/frontend/listings.html" class="btn btn-secondary">Продолжить покупки</a>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Ошибка: ' + error.message);
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Оформить заказ';
    }
  }

  // Функция удаления товара
  window.removeItem = function(itemId) {
    if (confirm('Удалить товар из корзины?')) {
      window.cart.removeItem(itemId);
      renderCart();
    }
  };

  // Функция увеличения количества
  window.incrementQuantity = function(itemId) {
    const item = window.cart.getItems().find(i => i.id == itemId);
    if (item) {
      window.cart.updateQuantity(itemId, (item.quantity || 1) + 1);
      renderCart();
    }
  };

  // Функция уменьшения количества
  window.decrementQuantity = function(itemId) {
    const item = window.cart.getItems().find(i => i.id == itemId);
    if (item && (item.quantity || 1) > 1) {
      window.cart.updateQuantity(itemId, (item.quantity || 1) - 1);
      renderCart();
    }
  };

  // Обработчик поиска
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const q = searchInput.value.trim();
      if (q) {
        window.location.href = '/frontend/listings.html?q=' + encodeURIComponent(q);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          window.location.href = '/frontend/listings.html?q=' + encodeURIComponent(q);
        }
      }
    });
  }

  // Первоначальный рендер
  renderCart();
});
