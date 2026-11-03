// Вход. После успешного входа GuestRoute сам перенаправит пользователя.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { errorMessage } from '../api/client';
import Notice from '../components/Notice';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function LoginPage() {
  useDocumentTitle('Вход');
  const { login } = useAuth();
  const location = useLocation();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? ''); // пробелы в пароле значимы, trim здесь нельзя

    if (!email || !password) {
      setError('Заполните e-mail и пароль.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await login(email, password, form.get('remember') === 'on');
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-container">
        <h1 className="auth-title">Вход</h1>
        <form className="auth-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <TextField id="loginEmail" name="email" label="E-mail" type="email" autoComplete="email" required />
          <TextField
            id="loginPassword"
            name="password"
            label="Пароль"
            type="password"
            autoComplete="current-password"
            required
          />
          <label className="checkbox-row">
            <input type="checkbox" name="remember" />
            <span>Запомнить меня на этом устройстве</span>
          </label>

          {error && <Notice kind="danger">{error}</Notice>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Входим…' : 'Войти'}
          </button>
          <p className="text-muted auth-links-row">
            <Link to="/forgot">Забыли пароль?</Link>
            {/* state: после регистрации человек тоже вернётся туда, откуда пришёл */}
            <Link to="/register" state={location.state}>
              Регистрация
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
