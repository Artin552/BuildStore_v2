// Пользователи (только admin): поиск, смена роли, блокировка.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ADMIN_PER_PAGE, blockUser, fetchUsers, setUserRole } from '../../api/admin';
import { errorMessage } from '../../api/client';
import type { AdminUser, UserRole, UserStatus } from '../../api/types';
import EmptyState from '../../components/EmptyState';
import Notice from '../../components/Notice';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFetch } from '../../hooks/useFetch';
import { useClampPage, useListParams } from '../../hooks/useListParams';
import { formatDate } from '../../utils/format';

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Пользователь',
  moderator: 'Модератор',
  admin: 'Администратор',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Активен',
  pending: 'На проверке',
  rejected: 'Отклонён',
  blocked: 'Заблокирован',
};

export default function AdminUsers() {
  useDocumentTitle('Пользователи');
  const { user: currentUser } = useAuth();
  const { params, page, update, setPage } = useListParams();
  const type = params.get('type') ?? '';
  const status = params.get('status') ?? '';
  const q = params.get('q')?.trim() ?? '';

  const { state, reload } = useFetch((signal) => fetchUsers({ type, status, q, page }, signal), [type, status, q, page]);
  const totalPages = state.status === 'success' ? Math.ceil(state.data.total / ADMIN_PER_PAGE) : 0;
  useClampPage(page, totalPages, setPage);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  // Общая обёртка для действий: показывает занятость и ошибку, потом обновляет список
  const runAction = async (id: number, action: () => Promise<unknown>) => {
    setBusyId(id);
    setActionError('');
    try {
      await action();
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleBlock = (user: AdminUser) => {
    const block = user.status !== 'blocked';
    const question = block ? `Заблокировать ${user.email}?` : `Разблокировать ${user.email}?`;
    if (window.confirm(question)) void runAction(user.id, () => blockUser(user.id, block));
  };

  const handleRole = (user: AdminUser, role: UserRole) => {
    if (window.confirm(`Назначить ${user.email} роль «${ROLE_LABELS[role]}»?`)) {
      void runAction(user.id, () => setUserRole(user.id, role));
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update({ q: String(new FormData(event.currentTarget).get('q') ?? '').trim() });
  };

  return (
    <>
      <div className="admin-filters">
        <label className="filter-label" htmlFor="userType">
          Тип
        </label>
        <select id="userType" className="input" value={type} onChange={(event) => update({ type: event.target.value })}>
          <option value="">Все</option>
          <option value="person">Частные лица</option>
          <option value="organization">Организации</option>
        </select>
        <label className="filter-label" htmlFor="userStatus">
          Статус
        </label>
        <select id="userStatus" className="input" value={status} onChange={(event) => update({ status: event.target.value })}>
          <option value="">Все</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <form key={q} className="search-inline catalog-search" role="search" onSubmit={handleSearch}>
          <label htmlFor="userSearch" className="visually-hidden">
            Поиск по имени или e-mail
          </label>
          <input id="userSearch" name="q" defaultValue={q} placeholder="Имя или e-mail" autoComplete="off" />
          <button type="submit" className="btn btn-primary btn-sm">
            Найти
          </button>
        </form>
      </div>

      {actionError && <Notice kind="danger">{actionError}</Notice>}

      {state.status === 'loading' && <EmptyState title="Загружаем пользователей…" />}
      {state.status === 'error' && (
        <EmptyState title="Не удалось загрузить пользователей" description={state.message}>
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Повторить
          </button>
        </EmptyState>
      )}
      {state.status === 'success' && state.data.total === 0 && <EmptyState title="Никого не найдено" />}
      {state.status === 'success' && state.data.total > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Тип</th>
                  <th>Статус</th>
                  <th>Объявлений</th>
                  <th>Роль</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name || 'Без имени'}</strong>
                        {isSelf && <span className="text-muted"> (вы)</span>}
                        <div className="text-muted">{user.email}</div>
                        <div className="text-muted">с {formatDate(user.created_at)}</div>
                      </td>
                      <td>{user.type === 'organization' ? 'Организация' : 'Частное лицо'}</td>
                      <td>
                        <span className={`admin-status admin-status-${user.status}`}>{STATUS_LABELS[user.status]}</span>
                      </td>
                      <td>{user.listings_count}</td>
                      <td>
                        {/* Нельзя случайно снять права с самого себя: сервер это тоже запрещает */}
                        <select
                          className="input"
                          aria-label={`Роль: ${user.email}`}
                          value={user.role}
                          disabled={isSelf || busyId === user.id}
                          onChange={(event) => handleRole(user, event.target.value as UserRole)}
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={isSelf || busyId === user.id}
                          onClick={() => handleBlock(user)}
                        >
                          {user.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
