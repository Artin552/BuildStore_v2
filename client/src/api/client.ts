// Единственное место, где сайт обращается к серверу. Здесь собрано то, что нужно
// каждому запросу: токен входа, таймаут, понятный текст ошибки, X-Total-Count.

const API_BASE = '/api';
const DEFAULT_TIMEOUT_MS = 8000;
export const UPLOAD_TIMEOUT_MS = 60000; // файлы отправляются дольше обычных запросов
const TOKEN_KEY = 'token';

// На эти коды сервер отвечает служебным английским текстом, поэтому показываем свой
const STATUS_MESSAGES: Record<number, string> = {
  413: 'Файлы слишком большие для отправки. Уменьшите их размер или количество.',
  429: 'Слишком много попыток. Подождите немного и попробуйте снова.',
};

// Сервер ответил 401 на запрос с токеном: токен устарел. AuthContext слушает это событие.
export const UNAUTHORIZED_EVENT = 'buildstore:unauthorized';

// Ошибка с кодом ответа. status = 0: ответа не было (нет сети или истёк таймаут).
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Запрос отменили мы сами, например пользователь ушёл со страницы. Показывать такое не нужно.
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

// Текст ошибки для показа пользователю из любого перехваченного значения.
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Что-то пошло не так. Попробуйте ещё раз.';
}

// ---------- Токен входа ----------
// sessionStorage живёт до закрытия вкладки, localStorage — пока его не очистят («запомнить меня»).

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try {
    for (const storage of [sessionStorage, localStorage]) {
      storage.removeItem(TOKEN_KEY);
      // Эти ключи записывал старый фронтенд
      storage.removeItem('userEmail');
      storage.removeItem('user');
    }
  } catch {
    // Хранилище недоступно: удалять нечего
  }
}

export function saveToken(token: string, remember: boolean): void {
  clearToken();
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // Хранилище недоступно: пользователь останется гостем
  }
}

// ---------- Запросы ----------

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown; // объект, сам превратится в JSON
  signal?: AbortSignal; // чтобы отменить запрос снаружи
  timeoutMs?: number; // для загрузки файлов нужен таймаут больше обычного
}

async function request<T>(path: string, options: ApiOptions): Promise<{ data: T; total: number | null }> {
  const { method = 'GET', body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abortFromCaller);

  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text();
    let payload: unknown;
    let isJson = true;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      isJson = false;
    }

    if (!res.ok) {
      if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      const serverText = (payload as { error?: unknown } | undefined)?.error;
      const message = STATUS_MESSAGES[res.status] ?? (typeof serverText === 'string' ? serverText : `Ошибка сервера (${res.status})`);
      throw new ApiError(message, res.status);
    }
    if (!isJson) throw new ApiError('Сервер прислал непонятный ответ. Попробуйте ещё раз.', res.status);

    const totalHeader = res.headers.get('X-Total-Count');
    return { data: payload as T, total: totalHeader === null ? null : Number(totalHeader) };
  } catch (err) {
    if (timedOut) throw new ApiError('Сервер не отвечает. Проверьте соединение и попробуйте ещё раз.', 0);
    if (err instanceof TypeError) throw new ApiError('Не удалось соединиться с сервером.', 0);
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

// Обычный запрос: вернёт тело ответа. Пример: apiFetch<Me>('/auth/me')
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { data } = await request<T>(path, options);
  return data;
}

// Запрос списка с пагинацией: вернёт элементы и общее число из заголовка X-Total-Count.
export async function apiFetchList<T>(path: string, options: ApiOptions = {}): Promise<{ items: T[]; total: number }> {
  const { data, total } = await request<T[]>(path, options);
  return { items: data, total: total ?? data.length };
}
