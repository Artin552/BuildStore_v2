// Заявки организаций: данные компании, документы, решение модератора.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ADMIN_PER_PAGE, fetchOrganizations, openDocument, reviewOrganization } from '../../api/admin';
import { errorMessage } from '../../api/client';
import type { Organization, OrganizationStatus } from '../../api/types';
import EmptyState from '../../components/EmptyState';
import Notice from '../../components/Notice';
import Pagination from '../../components/Pagination';
import ReasonDialog from '../../components/ReasonDialog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFetch } from '../../hooks/useFetch';
import { useClampPage, useListParams } from '../../hooks/useListParams';
import { formatDateTime } from '../../utils/format';

const STATUS_LABELS: Record<OrganizationStatus, string> = {
  pending: 'На проверке',
  approved: 'Подтверждена',
  rejected: 'Отклонена',
};

interface OrganizationCardProps {
  organization: Organization;
  onApprove: () => void;
  onReject: () => void;
  onError: (message: string) => void;
  busy: boolean;
}

function OrganizationCard({ organization: org, onApprove, onReject, onError, busy }: OrganizationCardProps) {
  const [openingDoc, setOpeningDoc] = useState('');

  const handleOpen = async (path: string) => {
    setOpeningDoc(path);
    try {
      await openDocument(path);
    } catch (err) {
      onError(`Не удалось открыть документ: ${errorMessage(err)}`);
    } finally {
      setOpeningDoc('');
    }
  };

  return (
    <article className="admin-card">
      <div className="order-header">
        <div>
          <div className="order-number">{org.orgName}</div>
          <div className="order-date">Подана {formatDateTime(org.createdAt)}</div>
        </div>
        <span className={`admin-status admin-status-${org.status}`}>{STATUS_LABELS[org.status]}</span>
      </div>

      <dl className="admin-details">
        <dt>ИНН</dt>
        <dd>{org.inn}</dd>
        <dt>ОГРН</dt>
        <dd>{org.ogrn || '—'}</dd>
        <dt>Адрес</dt>
        <dd>{org.legalAddress}</dd>
        <dt>Контактное лицо</dt>
        <dd>
          {org.contactPerson}
          {org.contactPosition ? `, ${org.contactPosition}` : ''}
        </dd>
        <dt>Телефон</dt>
        <dd>{org.phone}</dd>
        <dt>E-mail компании</dt>
        <dd>{org.email}</dd>
        <dt>Аккаунт</dt>
        <dd>
          {org.ownerName} ({org.ownerEmail})
        </dd>
      </dl>

      {org.rejectReason && <Notice kind="danger">Причина отказа: {org.rejectReason}</Notice>}

      <div className="admin-actions">
        {org.documents.length === 0 && <span className="text-muted">Документов нет</span>}
        {org.documents.map((path, index) => (
          <button
            key={path}
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={openingDoc === path}
            onClick={() => void handleOpen(path)}
          >
            {openingDoc === path ? 'Открываем…' : `Документ ${index + 1}`}
          </button>
        ))}
      </div>

      <div className="admin-actions admin-actions-end">
        {org.status !== 'approved' && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onApprove}>
            Подтвердить
          </button>
        )}
        {org.status !== 'rejected' && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onReject}>
            Отклонить
          </button>
        )}
      </div>
    </article>
  );
}

export default function AdminOrganizations() {
  useDocumentTitle('Заявки организаций');
  const { params, page, update, setPage } = useListParams();
  const status = params.get('status') ?? 'pending'; // без фильтра сразу показываем то, что ждёт решения
  const q = params.get('q')?.trim() ?? '';

  const { state, reload } = useFetch(
    (signal) => fetchOrganizations({ status: status === 'all' ? '' : status, q, page }, signal),
    [status, q, page],
  );
  const totalPages = state.status === 'success' ? Math.ceil(state.data.total / ADMIN_PER_PAGE) : 0;
  useClampPage(page, totalPages, setPage);

  const [rejecting, setRejecting] = useState<Organization | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const handleApprove = async (org: Organization) => {
    if (!window.confirm(`Подтвердить организацию «${org.orgName}»? Она сможет размещать объявления.`)) return;
    setBusyId(org.id);
    setActionError('');
    try {
      await reviewOrganization(org.id, 'approve');
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update({ q: String(new FormData(event.currentTarget).get('q') ?? '').trim() });
  };

  return (
    <>
      <div className="admin-filters">
        <label className="filter-label" htmlFor="orgStatus">
          Статус
        </label>
        <select
          id="orgStatus"
          className="input"
          value={status}
          onChange={(event) => update({ status: event.target.value === 'pending' ? '' : event.target.value })}
        >
          <option value="pending">На проверке</option>
          <option value="approved">Подтверждённые</option>
          <option value="rejected">Отклонённые</option>
          <option value="all">Все</option>
        </select>
        <form key={q} className="search-inline catalog-search" role="search" onSubmit={handleSearch}>
          <label htmlFor="orgSearch" className="visually-hidden">
            Поиск по названию или ИНН
          </label>
          <input id="orgSearch" name="q" defaultValue={q} placeholder="Название или ИНН" autoComplete="off" />
          <button type="submit" className="btn btn-primary btn-sm">
            Найти
          </button>
        </form>
      </div>

      {actionError && <Notice kind="danger">{actionError}</Notice>}

      {state.status === 'loading' && <EmptyState title="Загружаем заявки…" />}
      {state.status === 'error' && (
        <EmptyState title="Не удалось загрузить заявки" description={state.message}>
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Повторить
          </button>
        </EmptyState>
      )}
      {state.status === 'success' && state.data.total === 0 && <EmptyState title="Заявок нет" />}
      {state.status === 'success' && state.data.total > 0 && (
        <>
          {state.data.items.map((org) => (
            <OrganizationCard
              key={org.id}
              organization={org}
              busy={busyId === org.id}
              onApprove={() => void handleApprove(org)}
              onReject={() => setRejecting(org)}
              onError={setActionError}
            />
          ))}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {rejecting && (
        <ReasonDialog
          title={`Отклонить заявку «${rejecting.orgName}»`}
          confirmLabel="Отклонить"
          onClose={() => setRejecting(null)}
          onConfirm={async (reason) => {
            await reviewOrganization(rejecting.id, 'reject', reason);
            reload();
          }}
        />
      )}
    </>
  );
}
