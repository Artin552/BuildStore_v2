// Пускает на вложенные страницы только вошедших. Гостя отправляет на вход и запоминает, откуда он
// пришёл. allow сужает доступ до сотрудников или админов. Это только удобство: настоящую
// проверку прав всё равно делает сервер.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmptyState from './EmptyState';

interface ProtectedRouteProps {
  allow?: 'staff' | 'admin'; // staff — модератор или админ
}

export default function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="container page-main">
        <EmptyState title="Проверяем вход…" />
      </div>
    );
  }
  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (allow) {
    const allowed = allow === 'admin' ? user?.role === 'admin' : user?.role === 'admin' || user?.role === 'moderator';
    if (!allowed) {
      return (
        <div className="container page-main">
          <EmptyState
            title={user ? 'Нет доступа' : 'Не удалось проверить доступ'}
            description={user ? 'Этот раздел доступен только сотрудникам с нужной ролью.' : 'Сервер сейчас не отвечает.'}
          />
        </div>
      );
    }
  }
  return <Outlet />;
}
