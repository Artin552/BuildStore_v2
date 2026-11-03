// Типы ответов сервера. Источник: docs/REACT_MIGRATION.md, раздел 4.
// Если написать в коде listing.imagepath вместо listing.imagePath, TypeScript
// сообщит об ошибке ещё до запуска сайта.

// Даты приходят числом: миллисекунды, как Date.now()
export type Timestamp = number;

// ---------- Здоровье сервера ----------
export interface Health {
  ok: boolean;
  db: string;
}

// ---------- Пользователь ----------
export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'pending' | 'rejected' | 'blocked';
export type AccountType = 'person' | 'organization';
export type OrganizationStatus = 'pending' | 'approved' | 'rejected';

// Короткие данные пользователя из ответа POST /auth/login и /auth/register
export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  type: AccountType;
}

export interface AuthResponse {
  success: boolean;
  user: SessionUser;
  token: string;
}

// Ответ GET /auth/me
export interface Me extends SessionUser {
  reject_reason: string | null;
  created_at: Timestamp;
  avatar_path: string | null; // без префикса /uploads/
  organization?: {
    id: number;
    org_name: string;
    inn: string;
    status: OrganizationStatus;
    reject_reason: string | null;
  };
}

// Данные организации в теле POST /auth/register
export interface OrganizationRegistration {
  orgName: string;
  inn: string;
  ogrn?: string;
  legalAddress: string;
  contactPerson: string;
  contactPosition?: string;
  phone: string;
  email: string;
  documents: string[]; // dataURL PDF/JPG/PNG
}

// ---------- Объявления ----------
export const CATEGORIES = ['Материалы', 'Инструменты', 'Электроинструмент', 'СИЗ', 'Техника', 'Крепёж'] as const;
export type Category = (typeof CATEGORIES)[number];

export type ModerationStatus = 'published' | 'removed';

export interface Listing {
  id: number;
  title: string;
  category: Category;
  price: string; // в базе это текст: «1500» или «1500.50»
  description: string | null;
  imagePath: string; // «/uploads/…» или пустая строка
  certificatePath: string; // «/uploads/certificates/…» или пустая строка
  created_at: Timestamp;
  owner_id: number;
  discount: number;
  rating: number;
  reviewsCount: number;
  in_stock: 0 | 1;
  is_hot: 0 | 1;
  tags: string | null;
  moderation_status: ModerationStatus;
  removal_reason: string | null;
  sellerType: AccountType;
  sellerVerified: boolean;
  sellerOrgName: string | null;
}

// ---------- Корзина (хранится в браузере, localStorage) ----------
export interface CartItem {
  id: number;
  title: string;
  price: string;
  imagePath: string;
  quantity: number;
}

// ---------- Заказы ----------
export type OrderStatus = 'pending' | 'cancelled';

export interface OrderItem {
  id: number;
  order_id: number;
  listing_id: number;
  quantity: number;
  price_at_purchase: string;
  title: string | null; // null: объявление уже удалено из базы
  category: Category | null;
  imagePath: string;
  description?: string | null; // есть только в GET /orders/:id
}

export interface Order {
  id: number;
  user_id: number;
  total: string;
  status: OrderStatus;
  created_at: Timestamp;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// ---------- Админка ----------
// Ключи приходят маленькими буквами (см. раздел 6, пункт 5 плана)
export interface AdminSummary {
  pendingorgs: number;
  totalorgs: number;
  totalusers: number;
  totallistings: number;
}

export interface Organization {
  id: number;
  userId: number;
  orgName: string;
  inn: string;
  ogrn: string | null;
  legalAddress: string;
  contactPerson: string;
  contactPosition: string | null;
  phone: string;
  email: string;
  documents: string[];
  status: OrganizationStatus;
  rejectReason: string | null;
  reviewedBy: number | null;
  reviewedAt: Timestamp | null;
  createdAt: Timestamp;
  ownerName: string;
  ownerEmail: string;
}

// Сырая строка таблицы listings: ключи маленькими буквами и пути без /uploads/
export interface AdminListing {
  id: number;
  title: string;
  category: Category;
  price: string;
  description: string | null;
  imagepath: string | null;
  certificatepath: string | null;
  created_at: Timestamp;
  owner_id: number;
  discount: number;
  rating: number;
  reviewscount: number;
  in_stock: 0 | 1;
  is_hot: 0 | 1;
  tags: string | null;
  moderation_status: ModerationStatus;
  removal_reason: string | null;
  owner_name: string;
  owner_email: string;
  owner_type: AccountType;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  type: AccountType;
  created_at: Timestamp;
  listings_count: number;
}

export interface AuditEntry {
  id: number;
  actor_id: number;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: number;
  details: string | null;
  created_at: Timestamp;
}
