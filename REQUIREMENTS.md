# Детальные требования к проекту BOCalc

## 1. Общее описание

**BOCalc** - это веб-приложение для управления калькулятором стоимости доставки автомобилей из США. Система поддерживает работу с несколькими вендорами (поставщиками услуг), каждый из которых имеет свои тарифы и настройки.

### Целевые пользователи:
- Администраторы системы
- Менеджеры вендоров
- Клиенты (просмотр расчетов)

## 2. Функциональные требования

### 2.1 Система аутентификации

#### FR-AUTH-001: Регистрация и вход
- Email + пароль
- Минимум 8 символов, хеширование bcrypt
- JWT токены (access + refresh)
- Access token: 15 минут
- Refresh token: 7 дней

#### FR-AUTH-002: Роли и права доступа

**Admin:**
- Создание/редактирование/удаление пользователей
- Создание/редактирование/удаление вендоров
- Просмотр всех данных и истории
- Управление глобальными настройками
- Синхронизация с Google Sheets
- Экспорт данных

**Vendor:**
- Просмотр и редактирование данных своего вендора
- Управление тарифами своего вендора
- Просмотр истории изменений своего вендора
- Использование калькулятора
- Просмотр статистики своих расчетов

**Viewer:**
- Использование калькулятора (read-only)
- Просмотр публичных тарифов
- Сохранение расчетов (в localStorage)

#### FR-AUTH-003: Восстановление пароля
- Email с ссылкой для сброса
- Срок действия ссылки: 1 час
- Использование Cloudflare Workers для отправки email

### 2.2 Управление вендорами

#### FR-VENDOR-001: CRUD операции
- Создание нового вендора (только Admin)
- Редактирование информации (Admin, Vendor для своих данных)
- Деактивация вендора (только Admin)
- Список всех вендоров (Admin), своего вендора (Vendor)

#### FR-VENDOR-002: Поля вендора
```typescript
interface Vendor {
  id: string;
  name: string;
  slug: string; // уникальный URL-friendly идентификатор
  contactEmail: string;
  contactPhone?: string;
  logo?: string; // URL логотипа
  active: boolean;
  settings: {
    defaultCurrency: 'USD' | 'EUR';
    defaultLanguage: 'ru' | 'uk' | 'en';
    showBranding: boolean;
    customDomain?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 Калькулятор доставки

#### FR-CALC-001: Входные параметры
```typescript
interface CalculatorInput {
  // Основные параметры
  carPrice: number; // USD
  auctionId: string; // Copart, IAAI, Manheim, etc.
  stateOrigin: string; // Штат США
  portDestination: string; // Порт назначения
  
  // Характеристики автомобиля
  bodyType: 'sedan' | 'suv' | 'truck' | 'van' | 'coupe' | 'wagon' | 'motorcycle';
  year: number;
  isRunning: boolean; // рабочее состояние
  
  // Опциональные параметры
  weight?: number; // lbs
  length?: number; // inches
  hasKeys?: boolean;
  hasDamage?: boolean;
  damageType?: 'front' | 'rear' | 'side' | 'all';
  
  // Контекст
  vendorId: string;
  calculateTax?: boolean; // НДС
}
```

#### FR-CALC-002: Компоненты расчета
```typescript
interface CalculationResult {
  breakdown: {
    // 1. Аукционный сбор
    auctionFee: {
      amount: number;
      formula: string;
      description: string;
    };
    
    // 2. Доставка внутри США (до порта)
    usaShipping: {
      amount: number;
      distance: number; // miles
      pricePerMile: number;
      description: string;
    };
    
    // 3. Океанская доставка
    oceanShipping: {
      amount: number;
      containerType: '20ft' | '40ft' | 'roro';
      estimatedDays: number;
      description: string;
    };
    
    // 4. Таможенное оформление
    customsClearance: {
      amount: number;
      dutyRate: number; // процент
      customsFee: number;
      description: string;
    };
    
    // 5. Сборы вендора
    vendorFees: {
      serviceFee: number;
      documentationFee: number;
      additionalFees: Array<{
        name: string;
        amount: number;
      }>;
      description: string;
    };
    
    // 6. НДС (опционально)
    tax?: {
      amount: number;
      rate: number;
      description: string;
    };
  };
  
  total: number;
  currency: string;
  calculatedAt: Date;
  validUntil: Date; // расчет действителен 30 дней
  vendorId: string;
}
```

#### FR-CALC-003: Формулы расчета
Формулы хранятся в Google Sheets и могут быть переопределены для каждого вендора.

**Базовые формулы:**
1. **Аукционный сбор Copart:**
   - $0 - $99.99: $1
   - $100 - $499.99: $25
   - $500 - $999.99: $50
   - $1000 - $1499.99: $75
   - $1500+: $100 + 2% от суммы свыше $1500

2. **Доставка внутри США:**
   - Базовая ставка: $1.50/миля
   - Минимум: $200
   - Наценка за неисправный: +$100
   - Наценка за oversize (truck/van): +$150

3. **Океанская доставка (RORO):**
   - Sedan: $1000
   - SUV: $1200
   - Truck/Van: $1500
   - Motorcycle: $800

4. **Растаможка:**
   - Пошлина: 10% от (carPrice + usaShipping + oceanShipping)
   - Сбор таможни: $150
   - Брокерские услуги: $200

### 2.4 Google Sheets интеграция

#### FR-SHEETS-001: Структура таблицы

**Требуется одна Google Таблица со следующими листами:**

**1. Лист "Vendors":**
```
| vendor_id | name | slug | contact_email | active | settings_json | created_at | updated_at |
```

**2. Лист "Auctions":**
```
| auction_id | name | location_state | buyer_fee_type | buyer_fee_value | gate_fee | updated_by | updated_at |
```

**3. Лист "Ports":**
```
| port_id | name | country | city | base_ocean_shipping | vendor_id | active | updated_at |
```

**4. Лист "USA_Shipping":**
```
| route_id | state_from | port_to | distance_miles | base_price | price_per_mile | vendor_id | updated_at |
```

**5. Лист "Pricing_Rules":**
```
| rule_id | vendor_id | rule_type | condition_json | value | priority | active | updated_at |
```

**6. Лист "Body_Type_Modifiers":**
```
| modifier_id | body_type | ocean_shipping_modifier | usa_shipping_modifier | vendor_id | updated_at |
```

**7. Лист "Customs_Rates":**
```
| rate_id | country | duty_rate | vat_rate | base_clearance_fee | broker_fee | updated_at |
```

#### FR-SHEETS-002: Синхронизация
- **Автоматическая синхронизация:** каждые 5 минут (Cloudflare Cron Trigger)
- **Ручная синхронизация:** кнопка в админ-панели
- **Кеширование:** Cloudflare KV (TTL: 5 минут)
- **Версионирование:** каждая синхронизация создает версию данных
- **Уведомления:** при ошибках синхронизации отправка на admin email

#### FR-SHEETS-003: Двусторонняя синхронизация
- Изменения в веб-интерфейсе → Google Sheets
- Изменения в Google Sheets → веб-интерфейс
- Conflict resolution: последнее изменение побеждает
- История всех изменений сохраняется в D1

### 2.5 История изменений (Audit Log)

#### FR-AUDIT-001: Отслеживаемые действия
```typescript
enum AuditAction {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  
  VENDOR_CREATE = 'vendor_create',
  VENDOR_UPDATE = 'vendor_update',
  VENDOR_DEACTIVATE = 'vendor_deactivate',
  
  PRICING_UPDATE = 'pricing_update',
  RULE_CREATE = 'rule_create',
  RULE_UPDATE = 'rule_update',
  RULE_DELETE = 'rule_delete',
  
  SHEETS_SYNC = 'sheets_sync',
  SHEETS_SYNC_ERROR = 'sheets_sync_error',
  
  CALCULATION_PERFORMED = 'calculation_performed',
}

interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  userRole: 'admin' | 'vendor' | 'viewer';
  vendorId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}
```

#### FR-AUDIT-002: Просмотр истории
- **Admin:** вся история по всем вендорам
- **Vendor:** история только своего вендора
- **Фильтры:** по дате, действию, пользователю, ресурсу
- **Экспорт:** CSV, JSON
- **Retention:** данные хранятся 365 дней

### 2.6 Мультиязычность

#### FR-I18N-001: Поддерживаемые языки
- Русский (ru) - по умолчанию
- Українська (uk)
- English (en)

#### FR-I18N-002: Переводы
- Все UI элементы
- Названия полей калькулятора
- Сообщения об ошибках
- Email уведомления
- Описания в результатах расчета

#### FR-I18N-003: Определение языка
1. Query параметр: `?lang=uk`
2. Сохраненные настройки пользователя
3. Cookie
4. Browser Accept-Language header
5. Дефолт: `ru`

#### FR-I18N-004: Формат данных
- Числа: локализованный формат (запятая/точка)
- Валюта: символы валют
- Даты: локализованный формат

## 3. Нефункциональные требования

### 3.1 Производительность
- **NFR-PERF-001:** Загрузка главной страницы < 2 секунды
- **NFR-PERF-002:** Расчет калькулятора < 500ms
- **NFR-PERF-003:** API responses < 300ms (p95)
- **NFR-PERF-004:** Поддержка 1000 одновременных пользователей

### 3.2 Безопасность
- **NFR-SEC-001:** HTTPS only (принудительно)
- **NFR-SEC-002:** JWT токены с коротким TTL
- **NFR-SEC-003:** Rate limiting: 100 req/min на IP
- **NFR-SEC-004:** Защита от SQL injection
- **NFR-SEC-005:** CORS настройки (whitelist доменов)
- **NFR-SEC-006:** XSS protection
- **NFR-SEC-007:** CSRF tokens для форм
- **NFR-SEC-008:** Шифрование паролей (bcrypt, cost: 12)

### 3.3 Доступность
- **NFR-ACC-001:** Работа на мобильных устройствах (responsive)
- **NFR-ACC-002:** Поддержка браузеров: Chrome, Firefox, Safari (последние 2 версии)
- **NFR-ACC-003:** Доступность для screen readers (WCAG 2.1 Level A)

### 3.4 Надежность
- **NFR-REL-001:** Uptime >= 99.5%
- **NFR-REL-002:** Автоматические бэкапы D1 (ежедневно)
- **NFR-REL-003:** Graceful degradation при недоступности Google Sheets
- **NFR-REL-004:** Error monitoring (Sentry integration)

### 3.5 Масштабируемость
- **NFR-SCALE-001:** Поддержка до 100 вендоров
- **NFR-SCALE-002:** Поддержка до 10,000 пользователей
- **NFR-SCALE-003:** Хранение истории изменений за 1 год
- **NFR-SCALE-004:** Cloudflare auto-scaling

## 4. Технические требования

### 4.1 Frontend
- Next.js 14+ (App Router)
- TypeScript 5+
- React 18+
- Tailwind CSS 3+
- shadcn/ui компоненты
- next-intl для i18n
- Zod для валидации
- React Hook Form для форм
- TanStack Query для API запросов

### 4.2 Backend
- Cloudflare Workers
- Hono.js для routing
- Cloudflare D1 (SQLite)
- Cloudflare KV для кеширования
- Cloudflare Cron Triggers
- Google Sheets API v4

### 4.3 Database Schema (D1)

```sql
-- Пользователи
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'vendor', 'viewer')),
  vendor_id TEXT,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Вендоры
CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  logo_url TEXT,
  active INTEGER DEFAULT 1,
  settings TEXT NOT NULL, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- История изменений
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  vendor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  changes_before TEXT, -- JSON
  changes_after TEXT, -- JSON
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success INTEGER NOT NULL,
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Кеш данных из Google Sheets
CREATE TABLE sheets_cache (
  id TEXT PRIMARY KEY,
  sheet_name TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON
  version INTEGER NOT NULL,
  synced_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Сохраненные расчеты (опционально)
CREATE TABLE calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  vendor_id TEXT NOT NULL,
  input_data TEXT NOT NULL, -- JSON
  result_data TEXT NOT NULL, -- JSON
  created_at INTEGER NOT NULL,
  valid_until INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- Индексы
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_vendor_id ON audit_logs(vendor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_calculations_vendor_id ON calculations(vendor_id);
CREATE INDEX idx_calculations_created_at ON calculations(created_at);
```

### 4.4 Cloudflare Configuration

**wrangler.toml:**
```toml
name = "bocalc"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }
routes = [{ pattern = "bocalc.yourdomain.com", zone_name = "yourdomain.com" }]

[[d1_databases]]
binding = "DB"
database_name = "bocalc_db"
database_id = "your-d1-database-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[triggers]
crons = ["*/5 * * * *"] # Sync Google Sheets every 5 minutes

[build]
command = "npm run build"
```

### 4.5 API Endpoints

**Authentication:**
- POST `/api/auth/register` - регистрация
- POST `/api/auth/login` - вход
- POST `/api/auth/logout` - выход
- POST `/api/auth/refresh` - обновление токена
- POST `/api/auth/forgot-password` - восстановление пароля
- POST `/api/auth/reset-password` - сброс пароля

**Users:**
- GET `/api/users` - список пользователей (admin)
- GET `/api/users/:id` - информация о пользователе
- POST `/api/users` - создание пользователя (admin)
- PATCH `/api/users/:id` - обновление пользователя
- DELETE `/api/users/:id` - удаление пользователя (admin)

**Vendors:**
- GET `/api/vendors` - список вендоров
- GET `/api/vendors/:id` - информация о вендоре
- POST `/api/vendors` - создание вендора (admin)
- PATCH `/api/vendors/:id` - обновление вендора
- DELETE `/api/vendors/:id` - деактивация вендора (admin)

**Calculator:**
- POST `/api/calculate` - выполнить расчет
- GET `/api/calculate/:id` - получить сохраненный расчет
- GET `/api/calculate/history` - история расчетов

**Google Sheets:**
- POST `/api/sheets/sync` - принудительная синхронизация (admin)
- GET `/api/sheets/status` - статус синхронизации
- GET `/api/sheets/versions` - версии данных

**Audit:**
- GET `/api/audit` - история изменений
- GET `/api/audit/:id` - детали записи
- GET `/api/audit/export` - экспорт истории

**Reference Data:**
- GET `/api/reference/auctions` - список аукционов
- GET `/api/reference/ports` - список портов
- GET `/api/reference/states` - список штатов США
- GET `/api/reference/body-types` - типы кузовов

## 5. UI/UX требования

### 5.1 Дизайн
- Современный, чистый интерфейс
- Темная и светлая темы
- Адаптивный дизайн (mobile-first)
- Консистентная цветовая палитра
- Доступные контрасты (WCAG AA)

### 5.2 Основные экраны

#### Публичные страницы:
1. **Landing Page** - информация о сервисе
2. **Calculator** - публичный калькулятор
3. **Login/Register** - аутентификация

#### Приватные страницы (после входа):
1. **Dashboard** - обзор активности
2. **Calculator (Advanced)** - расширенный калькулятор
3. **Pricing Management** - управление тарифами (Vendor, Admin)
4. **Vendors Management** - управление вендорами (Admin)
5. **Users Management** - управление пользователями (Admin)
6. **Audit Log** - история изменений
7. **Settings** - настройки профиля
8. **Google Sheets Sync** - статус синхронизации (Admin)

### 5.3 Компоненты калькулятора

**Шаг 1: Базовая информация**
- Выбор вендора (если не авторизован)
- Стоимость автомобиля
- Аукцион
- Штат отправления

**Шаг 2: Характеристики авто**
- Тип кузова
- Год выпуска
- Состояние (рабочее/нет)
- Доп. параметры

**Шаг 3: Доставка**
- Порт назначения
- Тип доставки
- Дополнительные услуги

**Шаг 4: Результат**
- Детальная разбивка стоимости
- Общая сумма
- Кнопка "Сохранить расчет"
- Кнопка "Экспорт PDF"
- Кнопка "Поделиться"

## 6. Интеграции

### 6.1 Google Sheets API
- OAuth 2.0 аутентификация
- Service Account для автоматической синхронизации
- Scope: `https://www.googleapis.com/auth/spreadsheets`
- Rate limiting: соблюдение квот Google API

### 6.2 Email (Cloudflare Email Workers)
- Восстановление пароля
- Уведомления об ошибках синхронизации
- Приглашения пользователей

## 7. Развертывание

### 7.1 Cloudflare Pages (Frontend)
- Автоматический деплой из Git
- Preview deployments для PR
- Custom domain: bocalc.yourdomain.com
- SSL/TLS: Full (strict)

### 7.2 Cloudflare Workers (Backend)
- Deploy через Wrangler CLI
- Environment variables через secrets
- Логирование в Cloudflare Logs

### 7.3 CI/CD
- GitHub Actions
- Автоматические тесты перед деплоем
- Staging и Production окружения

## 8. Мониторинг и логирование

### 8.1 Метрики
- Request rate
- Error rate
- Response time
- D1 query performance
- KV hit rate

### 8.2 Alerts
- Error rate > 5%
- Response time > 1s
- Google Sheets sync failures
- D1 storage > 90%

### 8.3 Логи
- Все API запросы
- Ошибки
- Синхронизация Google Sheets
- Аутентификация

## 9. Тестирование

### 9.1 Unit тесты
- Все утилиты и helper функции
- Бизнес-логика калькулятора
- Валидация данных

### 9.2 Integration тесты
- API endpoints
- Google Sheets синхронизация
- Аутентификация flow

### 9.3 E2E тесты
- Критические user flows
- Расчет калькулятора
- Управление вендорами

## 10. Документация

### 10.1 Для разработчиков
- API документация (OpenAPI/Swagger)
- Архитектурные решения
- Руководство по развертыванию
- Troubleshooting guide

### 10.2 Для пользователей
- User guide (ru, uk, en)
- FAQ
- Video tutorials
- Changelog

## 11. Приоритизация

### Phase 1 (MVP) - 2 недели:
- ✅ Базовая аутентификация
- ✅ Простой калькулятор
- ✅ Управление вендорами
- ✅ Google Sheets интеграция (read-only)
- ✅ Базовая история изменений
- ✅ 1 язык (русский)

### Phase 2 - 1 неделя:
- ✅ Роли и права доступа
- ✅ Расширенный калькулятор
- ✅ Двусторонняя синхронизация Sheets
- ✅ Мультиязычность (ru, uk, en)
- ✅ Улучшенный UI

### Phase 3 - 1 неделя:
- ✅ Детальная история изменений
- ✅ Экспорт данных
- ✅ Сохранение расчетов
- ✅ Статистика и аналитика
- ✅ Email уведомления

### Phase 4 - ongoing:
- ✅ Оптимизация производительности
- ✅ Дополнительные интеграции
- ✅ Расширенная аналитика
- ✅ Mobile app

## 12. Оценка ресурсов

### Cloudflare Costs (примерно):
- **Pages:** Free tier (500 builds/month)
- **Workers:** $5/month (10M requests)
- **D1:** Free tier (5GB storage)
- **KV:** $0.50/month (1GB storage)
- **Total:** ~$6/month для начала

### Разработка:
- MVP: 2 недели
- Phase 2: 1 неделя
- Phase 3: 1 неделя
- **Total:** ~4 недели для полной функциональности

---

**Версия документа:** 1.0  
**Дата:** 2025-11-17  
**Автор:** Kirill Za


