# Переход BuildStore на React + TypeScript

Рабочий документ проекта. Здесь принятые решения, порядок работ, полный справочник API бэкенда (составлен по коду `backend/routes/*.js`) и известные проблемы.

---

## 1. Решения (уже приняты, не пересматривать без причины)

| Вопрос | Решение | Почему |
|---|---|---|
| Где новый фронтенд | Папка `client/` в корне. Старый `frontend/` не трогаем до конца переноса. | Сайт работает всё время перехода, можно сравнивать старое и новое |
| Инструменты | **Vite + React (актуальная версия) + TypeScript (strict) + React Router** | Стандарт индустрии, быстрая сборка |
| Бэкенд | Остаётся Express 5 + PostgreSQL. API **не меняем** без необходимости. | Бэкенд уже исправлен и проверен |
| Стили | Берём `frontend/css/styles.css` (после этапа 8 руководства) как глобальный CSS в `client/src/styles/`. Классы те же: `btn`, `btn-primary`, `card`, `badge`, `notice`, `empty-state`… | Дизайн и темы уже сделаны. Перенос CSS не меняет внешний вид |
| Темы | Атрибут `data-theme` на `<html>`, ключ `localStorage` — `buildstore-theme` (`system` / `light` / `dark`), как в старом `theme.js` | Тема сохраняется при переходе |
| Токен входа | Пока как раньше: `sessionStorage`/`localStorage` ключ `token`, заголовок `Authorization: Bearer …`. В декабре переходим на `HttpOnly` cookie. | Не ломаем бэкенд сейчас |
| Корзина | `localStorage` ключ `buildstore_cart`, массив `{id, title, price, imagePath, quantity}` | Корзина пользователя не пропадёт |
| Данные с сервера | Свой тонкий слой `client/src/api/` на `fetch`, все ответы типизированы | Меньше зависимостей, проще объяснить на защите |
| Разработка | `npm run dev` в `client/` (порт 5173). Vite проксирует `/api` и `/uploads` на `http://127.0.0.1:4000` | Не нужны настройки CORS |
| Продакшен | `npm run build` → `client/dist`. Express раздаёт `client/dist`, а любой неизвестный GET-путь (не `/api`, не `/uploads`, не `/frontend`) отдаёт `index.html` (SPA fallback). В Express 5 запись `app.get('*')` больше не работает: делать через `app.use((req,res,next)=>…)` с проверкой `req.method === 'GET'` | Один сервер, один порт |
| CSP | Не ослаблять helmet. Никаких встроенных `<script>` и `onclick` — в React их и так нет | Защита от XSS |
| Зависимости | Только `react`, `react-dom`, `react-router-dom` + dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/*`. Остальное — только по необходимости и с объяснением | Меньше зависимостей — меньше уязвимостей |

## 2. Структура `client/`

```
client/
  index.html
  vite.config.ts            # прокси /api и /uploads на :4000
  tsconfig.json
  src/
    main.tsx                # точка входа: <BrowserRouter><App/></BrowserRouter>
    App.tsx                 # маршруты
    styles/styles.css       # перенесённый styles.css
    api/
      client.ts             # apiFetch: токен, ошибки { error }, таймаут, X-Total-Count
      types.ts              # типы Listing, User, Order, Organization…
      listings.ts auth.ts orders.ts admin.ts
    context/
      AuthContext.tsx       # кто вошёл (GET /api/auth/me), login/logout
      CartContext.tsx       # корзина в localStorage
      ThemeContext.tsx
    components/
      Layout.tsx Header.tsx Footer.tsx ThemeSwitch.tsx
      ListingCard.tsx SellerBadges.tsx Pagination.tsx
      ProtectedRoute.tsx    # пускает только вошедших / только staff
      Notice.tsx EmptyState.tsx
    pages/
      HomePage CatalogPage ProductPage CartPage OrdersPage
      LoginPage RegisterPage ForgotPage ResetPage
      DashboardPage MyListingsPage ListingFormPage (добавление и редактирование)
      ContactsPage PrivacyPage NotFoundPage
      admin/ AdminLayout AdminDashboard AdminOrganizations AdminListings AdminUsers AdminAudit
    utils/format.ts         # formatPrice, formatDate, plural
```

## 3. Маршруты клиента

| Путь | Страница | Доступ |
|---|---|---|
| `/` | Главная: hero, поиск, категории с количеством, свежие товары | все |
| `/catalog` | Каталог: `?category=&q=&page=`, фильтры (в наличии, скидка, рейтинг, цена до) | все |
| `/product/:id` | Товар: фото, цена, пометки продавца, блок сертификата или предупреждение, «В корзину» | все |
| `/cart` | Корзина, оформление заказа | все; оформление — после входа |
| `/orders` | Мои заказы, «Подробнее» (модальное окно), «Отменить» для `pending` | вошедшие |
| `/login`, `/register`, `/forgot`, `/reset` | Аккаунт | гости |
| `/account` | Кабинет: профиль, аватар, баннер статуса организации, выход | вошедшие |
| `/my-listings` | Мои объявления: статус модерации, причина снятия, «Редактировать», «Удалить» | вошедшие |
| `/listings/new`, `/listings/:id/edit` | Форма объявления (фото, сертификат) | вошедшие; организация — только со статусом `active` |
| `/contacts`, `/privacy` | Статичные страницы | все |
| `/admin/*` | Админ-панель | `role` = `moderator` или `admin`; раздел «Пользователи» — только `admin` |
| `*` | 404 | все |

## 4. Справочник API

Базовый путь — `/api`. Авторизация: заголовок `Authorization: Bearer <token>`. Ошибка всегда приходит как `{ "error": "текст" }` с кодом 4xx/5xx. Даты — числа, миллисекунды (`Date.now()`). Списки с пагинацией возвращают общее число в заголовке `X-Total-Count`.

### Здоровье
- `GET /api/health` → `{ ok: true, db: "connected" }` или 503.

### Аккаунт `/api/auth` (общий лимит — частота запросов, у forgot и reset он строже)
- `POST /register` — тело `{ name, email, password, type: "person"|"organization", consent, organization? }`.
  - `organization = { orgName, inn (10|12 цифр), ogrn? (13|15), legalAddress, contactPerson, contactPosition?, phone, email, documents: [dataURL PDF/JPG/PNG, 1–10 шт, до 10 МБ] }`, `consent` обязателен для организации.
  - Ответ: `{ success, user: {id,name,email,role,status,type}, token }`. У организации `status = "pending"`.
  - Ошибки: «Пользователь уже существует», «Некорректный email», «Пароль должен содержать минимум 6 символов», ошибки полей организации.
- `POST /login` — `{ email, password }` → `{ success, user, token }`. 401 «Неверный логин или пароль», 403 «Ваш аккаунт заблокирован…». Email без учёта регистра.
- `POST /forgot` — `{ email }` → всегда `{ message }`, чтобы не раскрывать, есть ли такой email. Без настроенной почты код печатается в консоли сервера.
- `POST /reset` — `{ token: "6 цифр", password }` → `{ message }`. Код живёт 15 минут.
- `POST /avatar` (нужен вход) — `{ imageBase64: dataURL }`, до 2 МБ → `{ avatarPath: "/uploads/avatars/…" }`.
- `GET /me` (нужен вход) → `{ id, name, email, role, type, status, reject_reason, created_at, avatar_path, organization?: {id, org_name, inn, status, reject_reason} }`. `avatar_path` — **без** `/uploads/`.
- Роли: `user` | `moderator` | `admin`. Email из `ADMIN_EMAILS` в `.env` автоматически становится `admin`.
- Статусы пользователя: `active` | `pending` | `rejected` | `blocked`.

### Объявления `/api/listings`
- `GET /` — параметры `q`, `category`, `mine=true` (нужен вход), `in_stock=true`, `discount=true`, `minRating`, `minPrice`, `maxPrice`, `page` (с 1), `limit` (до 100, по умолчанию 20). Снятые модератором видит только владелец при `mine=true`.
  - Элемент: `{ id, title, category, price: string, description, imagePath: "/uploads/…"|"", certificatePath: "/uploads/certificates/…"|"", created_at, owner_id, discount, rating, reviewsCount, in_stock: 0|1, is_hot, tags, moderation_status: "published"|"removed", removal_reason, sellerType: "person"|"organization", sellerVerified: boolean, sellerOrgName: string|null }`.
- `GET /:id` → то же для одного. Снятое — 404, если смотрит не владелец.
- `POST /` (нужен вход) — `{ title (≥2), category ∈ CATEGORIES, price ("1500" или "1500.50"), description?, imageBase64? (dataURL картинки ≤5 МБ), certificateBase64? (dataURL PDF/JPG/PNG ≤10 МБ) }` → 201 и объявление.
  - Заблокированный — 403. Организация со статусом не `active` — 403 с понятным текстом. Организация в категориях «Электроинструмент» и «СИЗ» без сертификата — 400.
- `PUT /:id` (только владелец) — любые из `{ title, category, price, description, imageBase64 }`. Сертификат через `PUT` **не меняется** (см. раздел 6).
- `DELETE /:id` (только владелец) → `{ success }`.
- `CATEGORIES = ['Материалы','Инструменты','Электроинструмент','СИЗ','Техника','Крепёж']`.

### Заказы `/api/orders` (всё — нужен вход)
- `POST /` — `{ items: [{ id, quantity 1–999 }] }`. Цена берётся **из базы**, а не от клиента → 201 `{ id, user_id, total: "91.00", status: "pending", created_at }`. Ошибки: товар снят с продажи, у товара нет цены.
- `GET /?page=&limit=` (limit до 50) → массив `{ ...order, items: [{ id, order_id, listing_id, quantity, price_at_purchase, title, category, imagePath }] }` + `X-Total-Count`.
- `GET /:id` → заказ с `items`; у позиций есть ещё `description`.
- `PATCH /:id` — только `{ status: "cancelled" }` и только из `pending`. Иначе 403 или 400.
- Статусы заказа: `pending` (ожидает подтверждения), `cancelled`. Других пока никто не выставляет — см. раздел 6.

### Админка `/api/admin` (staff = `moderator` | `admin`; роль каждый раз проверяется по базе)
- `GET /summary` → `{ pendingorgs, totalorgs, totalusers, totallistings }`. ⚠️ Ключи приходят **маленькими буквами**: PostgreSQL. Нормализовать на клиенте или исправить SQL на `AS "pendingOrgs"`.
- `GET /organizations?status=pending|approved|rejected&q=&page=&limit=` → `[{ id, userId, orgName, inn, ogrn, legalAddress, contactPerson, contactPosition, phone, email, documents: ["/uploads/documents/…"], status, rejectReason, reviewedBy, reviewedAt, createdAt, ownerName, ownerEmail }]` + `X-Total-Count`.
- `GET /organizations/:id` → одна заявка.
- `POST /organizations/:id/review` — `{ decision: "approve"|"reject", reason }` (при `reject` причина обязательна). Синхронно меняет статус пользователя на `active`/`rejected` и пишет в журнал.
- `GET /listings?status=published|removed&page=&limit=` → сырые строки `listings` + `owner_name, owner_email, owner_type`. ⚠️ Ключи `imagepath`, `certificatepath`, `reviewscount` — маленькими буквами и **без** префикса `/uploads/`.
- `POST /listings/:id/moderate` — `{ action: "remove"|"restore", reason }` (при `remove` причина обязательна).
- `GET /users?type=&status=&q=&page=&limit=` → `[{ id, name, email, role, status, type, created_at, listings_count }]` + `X-Total-Count`.
- `POST /users/:id/block` (только admin) — `{ block: boolean }`. Себя заблокировать нельзя.
- `POST /users/:id/role` (только admin) — `{ role: "user"|"moderator"|"admin" }`. Себе роль понизить нельзя.
- `GET /users/:id/listings` → до 100 объявлений пользователя.
- `GET /audit?page=&limit=` → `[{ id, actor_id, actor_email, action, target_type, target_id, details, created_at }]`. Действия: `organization.approved|rejected`, `listing.removed|published`, `user.block|unblock|role`.

### Файлы
- `/uploads/<имя>` — фото объявлений, `/uploads/avatars/…`, `/uploads/certificates/…`, `/uploads/documents/…`.

## 5. Порядок работ

1. **Каркас:** Vite + TS, прокси, перенос `styles.css`, Layout (шапка с бургер-меню, переключатель темы, корзина со счётчиком, футер), контексты Auth/Cart/Theme, `apiFetch`, типы.
2. **Магазин:** главная, каталог с фильтрами и пагинацией через URL, товар, корзина, заказы.
3. **Аккаунт:** вход, регистрация (частное лицо / организация с документами), сброс пароля, кабинет, мои объявления, форма объявления.
4. **Подключение к Express:** раздача `client/dist` + SPA fallback; старые адреса `/frontend/*.html` продолжают работать.
5. **Админ-панель:** сводка, заявки организаций (просмотр документов, одобрить или отклонить с причиной), объявления (снять или вернуть), пользователи (блок, роль), журнал.
6. **Проверка:** `npm run build` без ошибок TypeScript; сценарии в браузере (регистрация → вход → объявление с сертификатом → заказ → отмена → модерация) в светлой и тёмной теме, на ПК и на телефоне.
7. **Уборка:** когда всё перенесено, удалить старый `frontend/` и `index.html` — только по моей команде.

После каждого шага — короткое объяснение для меня: какие файлы созданы, что делает каждый, как проверить.

## 6. Известные проблемы бэкенда (исправить по ходу)

1. **🔴 Документы организаций открыты всем.** `/uploads/documents/*` раздаётся статикой без проверки прав, а это выписки ЕГРЮЛ, доверенности, персональные данные. Нужно: запретить `/uploads/documents` в статике и сделать `GET /api/admin/documents/:file` с `requireStaff`. Клиент скачивает файл через `fetch` с токеном и открывает через `URL.createObjectURL`.
2. **Удаление объявления, которое уже покупали,** падает с 500: `order_items.listing_id` ссылается на `listings`. Нужно мягкое удаление (например, `moderation_status = 'deleted'`) или понятная ошибка.
3. **Продавец не видит заказы на свои товары,** и никто не может перевести заказ дальше `pending`. Для «коммерческого» вида нужен раздел «Заказы на мои товары» и статусы `confirmed`, `shipped`, `delivered`.
4. **`PUT /api/listings/:id` не позволяет заменить сертификат,** а `title` при редактировании не проверяется на длину.
5. Ключи в нижнем регистре в `/api/admin/summary` и `/api/admin/listings` (см. выше).
6. Токен в `localStorage` → в декабре переход на `HttpOnly` cookie.
7. Рейтинг и отзывы (`rating`, `reviewsCount`) есть в базе, но API для отзывов нет. Либо сделать, либо убрать фильтр по рейтингу.

## 7. Что вынести в текст диплома
- Архитектура: SPA (React) ↔ REST API (Express) ↔ PostgreSQL, схема в разделе «Проектирование».
- Безопасность: параметризованные запросы, CSP и экранирование (React экранирует сам), bcrypt, JWT, rate limit, проверка ролей по базе, пересчёт цены сервером, проверка «магических байт» файлов, закрытые документы организаций.
- TypeScript: типы API в `client/src/api/types.ts` — ошибки ловятся до запуска.
