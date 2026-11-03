// Кто сейчас вошёл на сайт. Это только для показа: права всё равно проверяет сервер.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchMe, loginRequest, registerRequest } from '../api/auth';
import { ApiError, UNAUTHORIZED_EVENT, clearToken, getToken, isAbortError, saveToken } from '../api/client';
import type { Me, RegisterRequest } from '../api/types';

// loading     — токен есть, ждём ответ сервера
// authenticated — вошёл, данные в user
// guest       — не вошёл
// unavailable — токен есть, но сервер сейчас не ответил. Выход не делаем: сбой может быть временным
export type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'unavailable';

interface AuthContextValue {
  user: Me | null;
  status: AuthStatus;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? 'loading' : 'guest'));

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('guest');
  }, []);

  const loadUser = useCallback(
    async (signal?: AbortSignal) => {
      if (!getToken()) {
        logout();
        return;
      }
      try {
        const me = await fetchMe(signal);
        setUser(me);
        setStatus('authenticated');
      } catch (err) {
        if (isAbortError(err)) return;
        // 401 — токен не подходит, 404 — такого пользователя больше нет
        if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
          logout();
        } else {
          setUser(null);
          setStatus('unavailable');
        }
      }
    },
    [logout],
  );

  // При открытии сайта узнаём, кто вошёл. При уходе отменяем запрос, если он ещё идёт.
  useEffect(() => {
    const controller = new AbortController();
    void loadUser(controller.signal);
    return () => controller.abort();
  }, [loadUser]);

  // Токен устарел, пока человек был на сайте: любой запрос получил 401
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      const { token } = await loginRequest(email, password);
      saveToken(token, remember);
      setStatus('loading');
      await loadUser();
    },
    [loadUser],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const { token } = await registerRequest(data);
      saveToken(token, false);
      setStatus('loading');
      await loadUser();
    },
    [loadUser],
  );

  // refresh вызывают из кнопок и обработчиков, поэтому прячем необязательный аргумент signal
  const refresh = useCallback(() => loadUser(), [loadUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refresh }),
    [user, status, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth можно вызывать только внутри AuthProvider');
  return context;
}
