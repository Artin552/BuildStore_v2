// Таблица маршрутов: какой адрес какую страницу показывает (docs/REACT_MIGRATION.md, раздел 3).
import { Route, Routes } from 'react-router-dom';
import GuestRoute from './components/GuestRoute';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AccountPage from './pages/AccountPage';
import CartPage from './pages/CartPage';
import CatalogPage from './pages/CatalogPage';
import ForgotPage from './pages/ForgotPage';
import HomePage from './pages/HomePage';
import ListingFormPage from './pages/ListingFormPage';
import LoginPage from './pages/LoginPage';
import MyListingsPage from './pages/MyListingsPage';
import NotFoundPage from './pages/NotFoundPage';
import OrdersPage from './pages/OrdersPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProductPage from './pages/ProductPage';
import RegisterPage from './pages/RegisterPage';
import ResetPage from './pages/ResetPage';
import AdminAudit from './pages/admin/AdminAudit';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminListings from './pages/admin/AdminListings';
import AdminOrganizations from './pages/admin/AdminOrganizations';
import AdminUsers from './pages/admin/AdminUsers';

export default function App() {
  return (
    <Routes>
      {/* Все страницы вложены в Layout, поэтому у них общие шапка и футер */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />

        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Только для вошедших */}
        <Route element={<ProtectedRoute />}>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/my-listings" element={<MyListingsPage />} />
          <Route path="/listings/new" element={<ListingFormPage />} />
          <Route path="/listings/:id/edit" element={<ListingFormPage />} />
        </Route>

        {/* Только для гостей */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPage />} />
          <Route path="/reset" element={<ResetPage />} />
        </Route>

        <Route path="/contacts" element={<PlaceholderPage title="Контакты" />} />
        <Route path="/privacy" element={<PlaceholderPage title="Политика конфиденциальности" />} />

        {/* Только для сотрудников: модератор или админ. Раздел «Пользователи» — только админ */}
        <Route element={<ProtectedRoute allow="staff" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="organizations" element={<AdminOrganizations />} />
            <Route path="listings" element={<AdminListings />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route element={<ProtectedRoute allow="admin" />}>
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
