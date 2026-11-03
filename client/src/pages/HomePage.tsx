// ВРЕМЕННАЯ главная: показывает, что каркас работает и прокси достаёт до бэкенда.
// На шаге 2 здесь появятся hero, поиск, категории и свежие товары.
import { useEffect, useState } from 'react';
import { apiFetch, errorMessage, isAbortError } from '../api/client';
import type { Health } from '../api/types';

type ServerState = { kind: 'loading' } | { kind: 'ok' } | { kind: 'error'; message: string };

export default function HomePage() {
  const [server, setServer] = useState<ServerState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<Health>('/health', { signal: controller.signal })
      .then(() => setServer({ kind: 'ok' }))
      .catch((err: unknown) => {
        if (!isAbortError(err)) setServer({ kind: 'error', message: errorMessage(err) });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="container page-main">
      <h1 className="page-title">BuildStore на React</h1>
      <p className="text-muted">Каркас готов. Страницы магазина появятся на следующем шаге.</p>

      {server.kind === 'loading' && <div className="notice">Проверяем связь с сервером…</div>}
      {server.kind === 'ok' && <div className="notice notice-success">Сервер и база данных на связи.</div>}
      {server.kind === 'error' && <div className="notice notice-danger">Нет связи с сервером: {server.message}</div>}
    </div>
  );
}
