// ============================================================
// МОДУЛЬ АУТЕНТИФИКАЦИИ (auth.js)
// ============================================================
// Этот скрипт загружается на все страницы и управляет:
// - Отображением кнопок "Вход/Регистрация" для неавторизованных пользователей
// - Отображением "Профиль/Выход" для авторизованных пользователей
// - Обработкой формы входа и показом/скрытием пароля (на странице входа)
// - Сохранением и загрузкой токена и email из localStorage/sessionStorage

(function () {
  // ============================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================================

  function inFrontendFolder() {
    return window.location.pathname.split('/').includes('frontend');
  }

  function dashboardHref() {
    return inFrontendFolder() ? 'dashboard.html' : '/frontend/dashboard.html';
  }

  function authHref() {
    return inFrontendFolder() ? 'auth.html' : '/frontend/auth.html';
  }

  function regHref() {
    return inFrontendFolder() ? 'reg.html' : '/frontend/reg.html';
  }

  // ============================================================
  // ОСНОВНАЯ ФУНКЦИЯ: НАСТРОЙКА ССЫЛОК АУТЕНТИФИКАЦИИ
  // ============================================================
  function setupAuthLinks() {
    const container = document.querySelector('.auth-links');
    if (!container) return;

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const email = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');

    container.innerHTML = '';

  if (token) {
  // ========================
  // ПОЛЬЗОВАТЕЛЬ АВТОРИЗОВАН → ПОКАЗЫВАЕМ ТОЛЬКО КНОПКУ "ПРОФИЛЬ"
  // ========================
  
  const profileBtn = document.createElement('a');
  profileBtn.href = dashboardHref();
  profileBtn.className = 'btn btn-secondary btn-sm'; // тот же стиль, что у «Вход»
  profileBtn.textContent = 'Профиль';

  container.appendChild(profileBtn);

} else {
  // ========================
  // ПОЛЬЗОВАТЕЛЬ НЕ АВТОРИЗОВАН
  // ========================

  const login = document.createElement('a');
  login.href = authHref();
  login.className = 'btn btn-secondary btn-sm';
  login.textContent = 'Вход';

  const reg = document.createElement('a');
  reg.href = regHref();
  reg.className = 'btn btn-primary btn-sm';
  reg.textContent = 'Регистрация';

  container.appendChild(login);
  container.appendChild(reg);
}
  }



  // ============================================================
  // СПЕЦИФИЧЕСКАЯ ЛОГИКА: ТОЛЬКО НА СТРАНИЦЕ ВХОДА
  // ============================================================
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return; // Если формы нет — выходим

    // Ошибка показывается текстом под формой вместо всплывающего alert()
    function showLoginError(message) {
      const box = document.getElementById('loginError');
      if (box) { box.textContent = message; box.hidden = false; }
      else alert(message);
    }

    // Обработка отправки формы
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = form.querySelector('#email')?.value.trim();
      const password = form.querySelector('#password')?.value.trim();

      if (!email || !password) {
        showLoginError('Заполните email и пароль.');
        return;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // Сервер различает «неверный пароль» (401) и «аккаунт заблокирован» (403) —
          // показываем именно его сообщение, а не общее «проверьте данные»
          showLoginError(data.error || 'Ошибка входа. Проверьте email и пароль.');
          return;
        }

        if (data.token) sessionStorage.setItem('token', data.token);
        if (data.user?.email) sessionStorage.setItem('userEmail', data.user.email);

        // Переход на главную страницу
        window.location.href = '/index.html';
      } catch (err) {
        console.error('Ошибка запроса:', err);
        showLoginError('Не удалось соединиться с сервером.');
      }
    }); 

    // Переключатель видимости пароля
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
      togglePassword.addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return;

        // Меняем только подпись для скринридера; иконка — SVG в auth.html (без эмодзи)
        const show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        togglePassword.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
        togglePassword.classList.toggle('is-active', show);
      });
    }
  }

  // ============================================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================================
  function init() {
    setupAuthLinks();   // Всегда: обновление меню авторизации
    initLoginForm();    // Только если есть форма входа
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();



// Бургер-меню здесь больше НЕ обрабатываем: его уже включают layout.js
// (внутренние страницы) и index.js (главная). Второй обработчик на той же
// кнопке переключал класс обратно, и меню не открывалось.