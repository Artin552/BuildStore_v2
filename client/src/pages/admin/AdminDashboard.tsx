// Сводка: четыре главных числа и ссылки на нужные разделы.
import { Link } from 'react-router-dom';
import { fetchSummary } from '../../api/admin';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFetch } from '../../hooks/useFetch';
import { plural } from '../../utils/format';

export default function AdminDashboard() {
  useDocumentTitle('Админ-панель');
  const { user } = useAuth();
  const { state, reload } = useFetch((signal) => fetchSummary(signal), []);

  if (state.status === 'loading') return <EmptyState title="Загружаем сводку…" />;
  if (state.status === 'error') {
    return (
      <EmptyState title="Не удалось загрузить сводку" description={state.message}>
        <button type="button" className="btn btn-secondary" onClick={reload}>
          Повторить
        </button>
      </EmptyState>
    );
  }

  const { pendingOrgs, totalOrgs, totalListings, totalUsers } = state.data;
  const usersContent = (
    <>
      <span className="admin-stat-value">{totalUsers}</span>
      <span className="text-muted">{plural(totalUsers, 'пользователь', 'пользователя', 'пользователей')}</span>
    </>
  );

  return (
    <div className="admin-stats">
      <Link className="admin-stat admin-stat-accent" to="/admin/organizations">
        <span className="admin-stat-value">{pendingOrgs}</span>
        <span className="text-muted">{plural(pendingOrgs, 'заявка', 'заявки', 'заявок')} на проверке</span>
      </Link>
      <Link className="admin-stat" to="/admin/organizations?status=all">
        <span className="admin-stat-value">{totalOrgs}</span>
        <span className="text-muted">{plural(totalOrgs, 'организация', 'организации', 'организаций')} всего</span>
      </Link>
      <Link className="admin-stat" to="/admin/listings">
        <span className="admin-stat-value">{totalListings}</span>
        <span className="text-muted">{plural(totalListings, 'объявление', 'объявления', 'объявлений')} всего</span>
      </Link>
      {/* Модератору раздел пользователей недоступен, поэтому у него это просто число */}
      {user?.role === 'admin' ? (
        <Link className="admin-stat" to="/admin/users">
          {usersContent}
        </Link>
      ) : (
        <div className="admin-stat">{usersContent}</div>
      )}
    </div>
  );
}
