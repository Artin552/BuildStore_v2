// Применяет сохранённую тему до первой отрисовки страницы, чтобы не было белой вспышки.
// Отдельный файл, а не <script> внутри HTML: встроенные скрипты запрещает защита CSP.
// После запуска React темой управляет src/context/ThemeContext.tsx.
(function () {
  'use strict';

  var stored = null;
  try {
    stored = localStorage.getItem('buildstore-theme');
  } catch (e) {
    // localStorage может быть недоступен, тогда берём тему системы
  }

  var theme = stored;
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
