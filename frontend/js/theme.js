/**
 * МОДУЛЬ УПРАВЛЕНИЯ ТЕМОЙ (theme.js)
 * 
 * Реализует переключатель темы с тремя состояниями:
 * - "system" (как в системе) — учитывает prefers-color-scheme
 * - "light" (светлая)
 * - "dark" (тёмная)
 * 
 * Тема применяется до первой отрисовки страницы (без "мигания").
 * Выбор пользователя сохраняется в localStorage.
 */

(function() {
  'use strict';
  
  const THEME_KEY = 'buildstore-theme';
  const VALID_THEMES = ['system', 'light', 'dark'];
  
  /**
   * Получить текущую тему системы
   * @returns {string} 'light' или 'dark'
   */
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  /**
   * Получить эффективную тему (с учётом системной)
   * @param {string} storedTheme - сохранённая тема
   * @returns {string} 'light' или 'dark'
   */
  function getEffectiveTheme(storedTheme) {
    if (!storedTheme || storedTheme === 'system') {
      return getSystemTheme();
    }
    return storedTheme;
  }
  
  /**
   * Применить тему к документу
   * @param {string} theme - 'light' или 'dark'
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  /**
   * Инициализировать тему при загрузке
   * Вызывается как можно раньше (до рендеринга body)
   */
  function initTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    
    // Проверяем валидность сохранённой темы
    const validStoredTheme = VALID_THEMES.includes(storedTheme) ? storedTheme : 'system';
    
    // Применяем эффективную тему
    const effectiveTheme = getEffectiveTheme(validStoredTheme);
    applyTheme(effectiveTheme);
    
    // Сохраняем валидную тему обратно (на случай если была невалидная)
    if (storedTheme !== validStoredTheme) {
      localStorage.setItem(THEME_KEY, validStoredTheme);
    }
    
    // Слушаем изменения системной темы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const currentStored = localStorage.getItem(THEME_KEY);
      // Только если пользователь выбрал "system", реагируем на изменения
      if (!currentStored || currentStored === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
  
  /**
   * Переключить тему на следующую в цикле
   * system -> light -> dark -> system
   */
  function cycleTheme() {
    const current = localStorage.getItem(THEME_KEY) || 'system';
    let next;
    
    switch (current) {
      case 'system': next = 'light'; break;
      case 'light': next = 'dark'; break;
      case 'dark': next = 'system'; break;
      default: next = 'light';
    }
    
    localStorage.setItem(THEME_KEY, next);
    const effective = getEffectiveTheme(next);
    applyTheme(effective);
    
    return next;
  }
  
  /**
   * Установить конкретную тему
   * @param {string} theme - 'system', 'light' или 'dark'
   */
  function setTheme(theme) {
    if (!VALID_THEMES.includes(theme)) {
      console.warn('Invalid theme:', theme);
      return;
    }
    
    localStorage.setItem(THEME_KEY, theme);
    const effective = getEffectiveTheme(theme);
    applyTheme(effective);
  }
  
  /**
   * Получить текущую сохранённую тему
   * @returns {string} 'system', 'light' или 'dark'
   */
  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || 'system';
  }
  
  /**
   * Создать UI переключателя темы
   * @param {HTMLElement} container - контейнер для переключателя
   */
  function createThemeToggle(container) {
    // Не создаём второй переключатель, если он уже есть (главная + layout.js)
    if (!container || container.querySelector('.theme-switch')) return;

    // Три кнопки-иконки вместо громоздкого <select> «Тема: как в системе»
    const svg = (path) => '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
    const themes = [
      { value: 'system', label: 'Как в системе', icon: svg('<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>') },
      { value: 'light', label: 'Светлая тема', icon: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>') },
      { value: 'dark', label: 'Тёмная тема', icon: svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>') }
    ];

    const group = document.createElement('div');
    group.className = 'theme-switch';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Тема оформления');

    function markActive() {
      const current = getStoredTheme();
      group.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.theme === current));
      });
    }

    themes.forEach((theme) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.theme = theme.value;
      btn.title = theme.label;
      btn.setAttribute('aria-label', theme.label);
      btn.innerHTML = theme.icon;
      btn.addEventListener('click', () => {
        setTheme(theme.value);
        markActive();
      });
      group.appendChild(btn);
    });

    markActive();
    container.appendChild(group);
  }
    
  
  // Экспорт функций в глобальную область
  window.BuildStoreTheme = {
    init: initTheme,
    cycle: cycleTheme,
    set: setTheme,
    get: getStoredTheme,
    getEffective: getEffectiveTheme,
    createToggle: createThemeToggle
  };
  
  // Авто-инициализация (как можно раньше)
  initTheme();
})();
