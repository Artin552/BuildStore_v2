// Страницы только для гостей: вход, регистрация, сброс пароля. Вошедшего отправляет туда,
// откуда его прислали на вход (например, обратно в корзину), или в кабинет.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmptyState from './EmptyState';

// state приходит от наших же ссылок, но ведём только на внутренние адреса сайта
function safeTarget(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/account';
}

export default function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="container page-main">
        <EmptyState title="Проверяем вход…" />
      </div>
    );
  }
  if (status !== 'guest') return <Navigate to={safeTarget(location.state)} replace />;
  return <Outlet />;
}
