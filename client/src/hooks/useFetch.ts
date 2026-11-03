// Хук — функция, которая добавляет компоненту поведение. Этот загружает данные с сервера:
// отслеживает «загрузка / готово / ошибка» и отменяет запрос, если страница уже не нужна.
import { useCallback, useEffect, useState } from 'react';
import type { DependencyList } from 'react';
import { ApiError, errorMessage, isAbortError } from '../api/client';

export type FetchState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string; code: number | null };

// deps — от чего зависят данные: изменились (например, номер страницы), и запрос повторится.
export function useFetch<T>(load: (signal: AbortSignal) => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<FetchState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setState({
          status: 'error',
          message: errorMessage(err),
          code: err instanceof ApiError ? err.status : null,
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, reload };
}
