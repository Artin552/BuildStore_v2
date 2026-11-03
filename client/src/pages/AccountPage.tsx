// Личный кабинет: профиль, аватар, статус организации, выход.
import { startTransition, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadAvatar } from '../api/auth';
import { errorMessage } from '../api/client';
import type { Me } from '../api/types';
import EmptyState from '../components/EmptyState';
import Notice from '../components/Notice';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MB, checkFile, readAsDataUrl } from '../utils/files';
import { formatDate } from '../utils/format';

const DEFAULT_AVATAR = '/img/default-avatar.svg';
const MAX_AVATAR_BYTES = 2 * MB;

function StatusBanner({ user }: { user: Me }) {
  if (user.status === 'blocked') {
    return <Notice kind="danger">Ваш аккаунт заблокирован. Размещение объявлений недоступно.</Notice>;
  }
  if (user.type !== 'organization') return null;

  if (user.status === 'pending') {
    return (
      <Notice kind="warning">
        <strong>Организация на проверке.</strong> Размещать объявления можно будет после подтверждения документов
        модератором.
      </Notice>
    );
  }
  if (user.status === 'rejected') {
    const reason = user.organization?.reject_reason ?? user.reject_reason;
    return (
      <Notice kind="danger">
        <strong>Заявка организации отклонена.</strong>
        {reason ? ` Причина: ${reason}` : ''}
      </Notice>
    );
  }
  return (
    <Notice kind="success">
      Организация{user.organization ? ` «${user.organization.org_name}»` : ''} подтверждена.
    </Notice>
  );
}

function ProfileCard({ user }: { user: Me }) {
  const { logout, refresh } = useAuth();
  const navigate = useNavigate();

  // Имя файла аватара не меняется, поэтому после загрузки просим браузер не брать старый из кеша
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const avatarUrl = user.avatar_path
    ? `/uploads/${user.avatar_path}${avatarVersion ? `?v=${avatarVersion}` : ''}`
    : DEFAULT_AVATAR;

  const handleAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setAvatarError('');
    setUploading(true);
    try {
      const problem = await checkFile(file, ['jpg', 'png', 'webp'], MAX_AVATAR_BYTES);
      if (problem) throw new Error(problem);
      await uploadAvatar(await readAsDataUrl(file));
      await refresh();
      setAvatarVersion(Date.now());
    } catch (err) {
      setAvatarError(errorMessage(err));
    } finally {
      setUploading(false);
      input.value = ''; // чтобы можно было выбрать тот же файл ещё раз
    }
  };

  return (
    <article className="profile-card">
      <div className="profile-head">
        <div className="profile-avatar">
          <img
            src={avatarUrl}
            alt="Аватар"
            onError={(event) => {
              if (!event.currentTarget.src.endsWith(DEFAULT_AVATAR)) event.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
        </div>
        <h2>{user.name || 'Пользователь'}</h2>
        <p className="text-muted">{user.email}</p>
        <p className="text-muted">
          {user.type === 'organization' ? 'Организация' : 'Частное лицо'}
          {user.created_at ? ` · на сайте с ${formatDate(user.created_at)}` : ''}
        </p>
      </div>

      <label className="btn btn-secondary avatar-upload">
        {uploading ? 'Загружаем…' : 'Загрузить аватар'}
        <input
          type="file"
          className="visually-hidden"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(event) => void handleAvatar(event)}
        />
      </label>
      <p className="text-muted field-hint">JPG, PNG или WEBP, до 2 МБ</p>
      {avatarError && <Notice kind="danger">{avatarError}</Notice>}

      <div className="profile-actions">
        <Link to="/my-listings" className="btn btn-primary">
          Мои объявления
        </Link>
        <Link to="/orders" className="btn btn-primary">
          Мои заказы
        </Link>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            // Оба изменения применяются разом, иначе защита страницы успела бы отправить на вход
            startTransition(() => {
              navigate('/');
              logout();
            });
          }}
        >
          Выйти
        </button>
      </div>
    </article>
  );
}

export default function AccountPage() {
  useDocumentTitle('Личный кабинет');
  const { user, refresh } = useAuth();

  return (
    <div className="container page-main account-page">
      <h1 className="page-title">Личный кабинет</h1>
      {user ? (
        <>
          <StatusBanner user={user} />
          <ProfileCard user={user} />
        </>
      ) : (
        <EmptyState title="Не удалось загрузить профиль" description="Сервер сейчас не отвечает.">
          <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
            Повторить
          </button>
        </EmptyState>
      )}
    </div>
  );
}
