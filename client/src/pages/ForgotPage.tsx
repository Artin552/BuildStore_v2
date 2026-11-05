// «Забыли пароль»: сервер присылает код на почту. Ответ всегда одинаковый,
// чтобы по нему нельзя было узнать, зарегистрирован ли такой e-mail.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotRequest } from '../api/auth';
import { errorMessage } from '../api/client';
import Notice from '../components/Notice';
import TextField from '../components/TextField';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ForgotPage() {
  useDocumentTitle('Восстановление пароля');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Укажите корректный e-mail');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await forgotRequest(email);
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
        <h1 className="auth-title">Восстановление пароля</h1>
        {message ? (
          <>
            <Notice kind="success">{message}</Notice>
            <p className="text-muted">Код действует 15 минут.</p>
            <Link to="/reset" className="btn btn-primary">
              Ввести код
            </Link>
          </>
        ) : (
          <form className="auth-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <TextField id="forgotEmail" name="email" label="E-mail, указанный при регистрации" type="email" autoComplete="email" required />
            {error && <Notice kind="danger">{error}</Notice>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Отправляем…' : 'Отправить код'}
            </button>
            <p className="text-muted">
              <Link to="/login">Вернуться ко входу</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
