// Пускает на вложенные страницы только вошедших. Гостя отправляет на вход и запоминает, откуда он
// пришёл. Это только удобство: настоящую проверку прав всё равно делает сервер.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmptyState from './EmptyState';

export default function ProtectedRoute() {
  const { status } = useAuth();
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
  return <Outlet />;
}
