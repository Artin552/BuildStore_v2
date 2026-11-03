// Шапка сайта: логотип, меню (на телефоне — бургер), тема, вход, корзина со счётчиком.
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CartIcon, CloseIcon, MenuIcon, PlusIcon } from './Icons';
import ThemeSwitch from './ThemeSwitch';

function AuthLinks() {
  const { status } = useAuth();

  // Пока сервер не ответил, кнопки не показываем, чтобы «Вход» не мелькал у вошедшего
  if (status === 'loading') return null;

  if (status === 'guest') {
    return (
      <>
        <Link to="/login" className="btn btn-secondary btn-sm">
          Вход
        </Link>
        <Link to="/register" className="btn btn-primary btn-sm">
          Регистрация
        </Link>
      </>
    );
  }

  return (
    <Link to="/account" className="btn btn-secondary btn-sm">
      Профиль
    </Link>
  );
}

export default function Header() {
  const { count } = useCart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Перешли на другую страницу — закрываем меню
  useEffect(() => {
    setMenuOpen(false);
  }, [location.key]);

  // Пока меню открыто, его закрывают клик мимо и клавиша Escape
  useEffect(() => {
    if (!menuOpen) return;

    const onClick = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="main-header" ref={headerRef}>
      <div className="header-inner container">
        <div className="logo-wrap">
          <Link className="logo" to="/">
            <span className="brand">BuildStore</span>
          </Link>
        </div>

        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
          aria-controls="navMenu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav id="navMenu" className={menuOpen ? 'main-nav active' : 'main-nav'}>
          <NavLink to="/" end>
            Главная
          </NavLink>
          <NavLink to="/catalog">Категории</NavLink>
          <NavLink to="/contacts">Контакты</NavLink>

          <div className="header-actions">
            <ThemeSwitch />
            <div className="auth-links">
              <AuthLinks />
            </div>
            <Link to="/cart" className="cart cart-link" title="Корзина" aria-label={`Корзина, товаров: ${count}`}>
              <CartIcon /> <span className="cart-badge">{count}</span>
            </Link>
            <Link to="/listings/new" className="btn btn-primary add-listing-link" aria-label="Добавить объявление">
              <PlusIcon /> <span className="add-listing-label">Добавить объявление</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
