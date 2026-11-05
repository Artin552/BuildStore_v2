// Каркас админки: меню разделов и текущий раздел. Как Layout.tsx, только внутри сайта.
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="container page-main">
      <h1 className="page-title">Админ-панель</h1>
      <nav className="admin-nav" aria-label="Разделы админ-панели">
        <NavLink to="/admin" end>
          Сводка
        </NavLink>
        <NavLink to="/admin/organizations">Заявки организаций</NavLink>
        <NavLink to="/admin/listings">Объявления</NavLink>
        {user?.role === 'admin' && <NavLink to="/admin/users">Пользователи</NavLink>}
        <NavLink to="/admin/audit">Журнал</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
