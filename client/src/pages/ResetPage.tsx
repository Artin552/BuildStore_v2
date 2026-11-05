// Новый пароль по коду из письма.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { resetRequest } from '../api/auth';
import { errorMessage } from '../api/client';
import Notice from '../components/Notice';
import TextField from '../components/TextField';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ResetPage() {
  useDocumentTitle('Новый пароль');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get('code') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    if (!/^\d{6}$/.test(code)) return setError('Код состоит из 6 цифр');
    if (password.length < 6) return setError('Пароль должен содержать минимум 6 символов');
    if (password !== confirm) return setError('Пароли не совпадают');

    setSubmitting(true);
    setError('');
    try {
      const result = await resetRequest(code, password);
      setMessage(result.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-container">
        <h1 className="auth-title">Новый пароль</h1>
        {message ? (
          <>
            <Notice kind="success">{message}</Notice>
            <Link to="/login" className="btn btn-primary">
              Войти
            </Link>
          </>
        ) : (
          <form className="auth-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <TextField id="resetCode" name="code" label="Код из письма" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required />
            <TextField id="resetPassword" name="password" label="Новый пароль" type="password" autoComplete="new-password" required />
            <TextField id="resetConfirm" name="confirm" label="Повторите пароль" type="password" autoComplete="new-password" required />
            {error && <Notice kind="danger">{error}</Notice>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Сохраняем…' : 'Сменить пароль'}
            </button>
            <p className="text-muted">
              <Link to="/forgot">Запросить новый код</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
