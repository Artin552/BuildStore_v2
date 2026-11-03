// Таблица маршрутов: какой адрес какую страницу показывает (docs/REACT_MIGRATION.md, раздел 3).
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      {/* Все страницы вложены в Layout, поэтому у них общие шапка и футер */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />

        <Route path="/catalog" element={<PlaceholderPage title="Каталог" />} />
        <Route path="/product/:id" element={<PlaceholderPage title="Товар" />} />
        <Route path="/cart" element={<PlaceholderPage title="Корзина" />} />
        <Route path="/orders" element={<PlaceholderPage title="Мои заказы" />} />

        <Route path="/login" element={<PlaceholderPage title="Вход" />} />
        <Route path="/register" element={<PlaceholderPage title="Регистрация" />} />
        <Route path="/forgot" element={<PlaceholderPage title="Восстановление пароля" />} />
        <Route path="/reset" element={<PlaceholderPage title="Новый пароль" />} />
        <Route path="/account" element={<PlaceholderPage title="Личный кабинет" />} />
        <Route path="/my-listings" element={<PlaceholderPage title="Мои объявления" />} />
        <Route path="/listings/new" element={<PlaceholderPage title="Новое объявление" />} />
        <Route path="/listings/:id/edit" element={<PlaceholderPage title="Редактирование объявления" />} />

        <Route path="/contacts" element={<PlaceholderPage title="Контакты" />} />
        <Route path="/privacy" element={<PlaceholderPage title="Политика конфиденциальности" />} />
        <Route path="/admin/*" element={<PlaceholderPage title="Админ-панель" />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
