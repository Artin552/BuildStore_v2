// ============================================================
// ОБЩИЙ ДОСТУП К API (api.js)
// ============================================================
// 1. Базовый адрес API задаётся один раз: window.BUILDSTORE_API_BASE
//    (в продакшене можно указать отдельный URL бэкенда, например
//     https://buildstore-api.onrender.com). По умолчанию — относительный
//    путь /api, когда фронтенд и бэкенд задеплоены вместе.
// 2. apiFetch — обёртка над fetch с обязательным таймаутом, чтобы
//    пользователь никогда не оставался перед «вечным спиннером» (ТЗ 2A.0).

(function () {
  'use strict';

  const BASE = (window.BUILDSTORE_API_BASE || '/api').replace(/\/+$/, '');

  /**
   * fetch с таймаутом. Если сервер не ответил за timeoutMs — промис
   * отклоняется с человекочитаемой ошибкой (техническая причина — в консоли).
   */
  async function apiFetch(path, options, timeoutMs) {
    const opts = Object.assign({}, options || {});
    const timeout = timeoutMs || 8000;

    const controller = new AbortController();
    opts.signal = controller.signal;

    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(BASE + path, opts);
    if (!res.ok) {
        // Сервер присылает понятный текст в поле error — передаём его дальше,
        // чтобы пользователь увидел «Пользователь уже существует», а не «HTTP 400»
        let message = 'Ошибка сервера (' + res.status + ')';
        try {
          const data = await res.json();
          if (data && data.error) message = data.error;
        } catch (e) { /* ответ не JSON — оставляем общее сообщение */ }
        const error = new Error(message);
        error.status = res.status; // 401 — нужно войти, 403 — нет прав, 400 — ошибка в данных
        throw error;
      }
      return res;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Сервер не отвечает. Проверьте соединение и попробуйте ещё раз.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // Токен входа: сначала вкладка (sessionStorage), потом «запомнить меня» (localStorage)
  function getToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }

  // Заголовок авторизации для fetch — чтобы не писать это вручную в каждом файле
  function authHeaders(extra) {
    const token = getToken();
    return Object.assign({}, extra || {}, token ? { Authorization: 'Bearer ' + token } : {});
  }

  // Экранирование текста перед вставкой в HTML (защита от XSS) — одна функция на весь сайт
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Пометки продавца под карточкой товара (ТЗ 7.1, 7.2).
  // Сервер уже присылает sellerType, sellerOrgName и certificatePath.
  const ICON_SHIELD = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>';
  const ICON_FILE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></svg>';
  const ICON_ALERT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

  function sellerBadgesHtml(item) {
    if (!item) return '';
    const parts = [];
    if (item.sellerType === 'organization') {
      const name = item.sellerOrgName ? ' «' + escapeHtml(item.sellerOrgName) + '»' : '';
      parts.push('<span class="badge badge-seller-org" title="Организация прошла проверку документов модератором">' + ICON_SHIELD + ' Организация' + name + '</span>');
      if (item.certificatePath) {
        parts.push('<a class="badge badge-cert" href="' + escapeHtml(item.certificatePath) + '" target="_blank" rel="noopener">' + ICON_FILE + ' Есть сертификат</a>');
      } else {
        parts.push('<span class="badge badge-no-cert" title="Продавец не приложил сертификат или паспорт товара">' + ICON_ALERT + ' Нет сертификата</span>');
      }
    } else {
      parts.push('<span class="badge badge-seller-person">Частный продавец</span>');
    }
    return '<div class="seller-badges">' + parts.join('') + '</div>';
  }

  // Цена для показа: «21 900 ₽» вместо «21900 ₽»
  function formatPrice(price) {
    const num = Number(price);
    if (price === '' || price == null || !Number.isFinite(num)) return 'Цена не указана';
    return num.toLocaleString('ru-RU') + ' ₽';
  }

  window.BuildStoreApi = { BASE, apiFetch, getToken, authHeaders, escapeHtml, sellerBadgesHtml, formatPrice };
})();
