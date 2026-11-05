// Модерация объявлений: снять с публикации с причиной или вернуть обратно.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_PER_PAGE, fetchAdminListings, moderateListing } from '../../api/admin';
import { errorMessage } from '../../api/client';
import type { AdminListing } from '../../api/types';
import EmptyState from '../../components/EmptyState';
import ListingImage from '../../components/ListingImage';
import Notice from '../../components/Notice';
import Pagination from '../../components/Pagination';
import ReasonDialog from '../../components/ReasonDialog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFetch } from '../../hooks/useFetch';
import { useClampPage, useListParams } from '../../hooks/useListParams';
import { formatPrice } from '../../utils/format';

export default function AdminListings() {
  useDocumentTitle('Модерация объявлений');
  const { params, page, update, setPage } = useListParams();
  const status = params.get('status') === 'removed' ? 'removed' : 'published';

  const { state, reload } = useFetch((signal) => fetchAdminListings({ status, page }, signal), [status, page]);
  const totalPages = state.status === 'success' ? Math.ceil(state.data.total / ADMIN_PER_PAGE) : 0;
  useClampPage(page, totalPages, setPage);

  const [removing, setRemoving] = useState<AdminListing | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const handleRestore = async (listing: AdminListing) => {
    setBusyId(listing.id);
    setActionError('');
    try {
      await moderateListing(listing.id, 'restore');
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="admin-filters">
        <label className="filter-label" htmlFor="listingStatus">
          Статус
        </label>
        <select
          id="listingStatus"
          className="input"
          value={status}
          onChange={(event) => update({ status: event.target.value === 'removed' ? 'removed' : '' })}
        >
          <option value="published">Опубликованные</option>
          <option value="removed">Снятые</option>
        </select>
      </div>

      {actionError && <Notice kind="danger">{actionError}</Notice>}

      {state.status === 'loading' && <EmptyState title="Загружаем объявления…" />}
      {state.status === 'error' && (
        <EmptyState title="Не удалось загрузить объявления" description={state.message}>
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Повторить
          </button>
        </EmptyState>
      )}
      {state.status === 'success' && state.data.total === 0 && <EmptyState title="Объявлений нет" />}
      {state.status === 'success' && state.data.total > 0 && (
        <>
          {state.data.items.map((listing) => (
            <article key={listing.id} className="admin-card admin-listing">
              {/* Этот адрес сервера отдаёт сырые строки таблицы: имена файлов без /uploads/ */}
              <ListingImage
                className="admin-listing-image"
                src={listing.imagepath ? `/uploads/${listing.imagepath}` : ''}
                alt=""
              />
              <div className="admin-listing-info">
                <Link className="order-number" to={`/product/${listing.id}`}>
                  {listing.title}
                </Link>
                <div>
                  {formatPrice(listing.price)} · {listing.category}
                </div>
                <div className="text-muted">
                  {listing.owner_name} ({listing.owner_email}),{' '}
                  {listing.owner_type === 'organization' ? 'организация' : 'частное лицо'}
                </div>
                {listing.certificatepath && (
                  <a href={`/uploads/certificates/${listing.certificatepath}`} target="_blank" rel="noopener noreferrer">
                    Сертификат
                  </a>
                )}
                {listing.removal_reason && <Notice kind="danger">Причина снятия: {listing.removal_reason}</Notice>}
              </div>
              <div className="admin-actions">
                {status === 'published' ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRemoving(listing)}>
                    Снять
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busyId === listing.id}
                    onClick={() => void handleRestore(listing)}
                  >
                    Вернуть
                  </button>
                )}
              </div>
            </article>
          ))}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {removing && (
        <ReasonDialog
          title={`Снять объявление «${removing.title}»`}
          confirmLabel="Снять"
          onClose={() => setRemoving(null)}
          onConfirm={async (reason) => {
            await moderateListing(removing.id, 'remove', reason);
            reload();
          }}
        />
      )}
    </>
  );
}
