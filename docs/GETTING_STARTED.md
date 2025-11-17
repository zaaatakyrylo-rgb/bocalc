# Getting Started with BOCalc

Пошаговое руководство по настройке и запуску проекта BOCalc.

## 📋 Предварительные требования

Перед началом убедитесь, что у вас установлено:

- **Node.js** версии 18 или выше
- **npm** версии 9 или выше
- **Git**
- **Аккаунт Cloudflare** (zaaatakyrylo@gmail.com)
- **Google Cloud Project** с включенным Sheets API

## 🚀 Быстрый старт

### Шаг 1: Клонирование репозитория

```bash
git clone https://github.com/yourusername/bocalc.git
cd bocalc
```

### Шаг 2: Установка зависимостей

```bash
npm install
```

### Шаг 3: Настройка переменных окружения

Скопируйте файл примера и заполните необходимые переменные:

```bash
cp env.example .env.local
```

Откройте `.env.local` и заполните:

```env
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8787

# Cloudflare (получите из Cloudflare Dashboard)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# JWT Secret (сгенерируйте случайную строку минимум 32 символа)
JWT_SECRET=your_random_secret_key_here_min_32_chars

# Google Sheets (настройте позже, см. GOOGLE_SHEETS_SETUP.md)
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Шаг 4: Локальная разработка

#### 4.1 Запуск Frontend (Next.js)

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3000

#### 4.2 Запуск Backend (Cloudflare Workers - локально)

В отдельном терминале:

```bash
npm run worker:dev
```

API будет доступно по адресу: http://localhost:8787

#### 4.3 Локальная база данных D1

```bash
# Создать локальную базу данных
npm run db:create

# Применить миграции
npm run db:migrate:local

# Открыть консоль D1
npm run db:console
```

## 📝 Первоначальная настройка

### 1. Настройка Cloudflare Workers

#### 1.1 Войти в Cloudflare

```bash
npx wrangler login
```

Это откроет браузер для аутентификации с вашим аккаунтом Cloudflare.

#### 1.2 Получить Account ID

```bash
npx wrangler whoami
```

Скопируйте `Account ID` и обновите `wrangler.toml`:

```toml
account_id = "your_account_id_here"
```

### 2. Создание D1 базы данных

```bash
# Создать production базу данных
npx wrangler d1 create bocalc-db
```

Скопируйте `database_id` из вывода и обновите `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "bocalc-db"
database_id = "your_database_id_here"
```

#### 2.1 Применить миграции

```bash
# Для production
npx wrangler d1 migrations apply bocalc-db --remote

# Для локальной разработки
npx wrangler d1 migrations apply bocalc-db --local
```

### 3. Создание KV Namespace

```bash
# Создать KV namespace
npx wrangler kv:namespace create "CACHE"
```

Скопируйте `id` и обновите `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your_kv_namespace_id"
```

### 4. Настройка секретов

Добавьте секретные переменные окружения:

```bash
# JWT Secret
npx wrangler secret put JWT_SECRET
# Введите ваш секретный ключ (минимум 32 символа)

# Google Service Account Email (если уже настроили)
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
# Введите: your-service-account@project.iam.gserviceaccount.com

# Google Private Key (если уже настроили)
npx wrangler secret put GOOGLE_PRIVATE_KEY
# Вставьте весь приватный ключ из JSON файла

# Google Sheets ID (если уже настроили)
npx wrangler secret put GOOGLE_SHEETS_ID
# Введите ID вашей таблицы

# Admin Email
npx wrangler secret put ADMIN_EMAIL
# Введите: zaaatakyrylo@gmail.com
```

### 5. Настройка Google Sheets (Опционально, но рекомендуется)

Полное руководство: [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)

Краткая версия:

1. Создайте новый Google Cloud Project
2. Включите Google Sheets API
3. Создайте Service Account
4. Скачайте JSON ключ
5. Создайте Google Таблицу
6. Дайте доступ Service Account к таблице
7. Скопируйте ID таблицы из URL
8. Настройте секреты (см. Шаг 4)

## 🧪 Тестирование

### Проверка подключения к базе данных

```bash
# Локальная БД
npx wrangler d1 execute bocalc-db --local --command="SELECT * FROM users LIMIT 1"

# Production БД
npx wrangler d1 execute bocalc-db --remote --command="SELECT * FROM users LIMIT 1"
```

### Проверка API

После запуска `npm run worker:dev`:

```bash
# Проверка health endpoint
curl http://localhost:8787/health

# Попытка входа (с дефолтным admin)
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"zaaatakyrylo@gmail.com","password":"Admin123!"}'
```

## 📦 Структура проекта

```
BOCalc/
├── src/                      # Frontend (Next.js)
│   ├── app/                  # App Router
│   ├── components/           # React компоненты
│   ├── lib/                  # Утилиты
│   ├── hooks/                # Custom hooks
│   ├── types/                # TypeScript types
│   └── messages/             # i18n переводы
├── workers/                  # Backend (Cloudflare Workers)
│   ├── src/                  # Worker код
│   └── migrations/           # D1 миграции
├── database/                 # Database схемы
├── docs/                     # Документация
├── public/                   # Статические файлы
└── scripts/                  # Утилиты
```

## 🔑 Дефолтные учетные данные

После применения миграций создается дефолтный администратор:

```
Email: zaaatakyrylo@gmail.com
Password: Admin123!
```

⚠️ **ВАЖНО:** Смените пароль сразу после первого входа!

## 🛠️ Основные команды

### Development

```bash
# Запуск frontend
npm run dev

# Запуск backend (Workers)
npm run worker:dev

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

### Database

```bash
# Создать БД
npm run db:create

# Применить миграции (локально)
npm run db:migrate:local

# Применить миграции (production)
npm run db:migrate

# Открыть консоль
npm run db:console
```

### Deployment

```bash
# Deploy Workers
npm run worker:deploy

# Deploy Pages (через Cloudflare Dashboard или Wrangler)
npx wrangler pages deploy .next --project-name=bocalc
```

## 📚 Дополнительные ресурсы

- [Детальные требования](./REQUIREMENTS.md)
- [Архитектура проекта](./ARCHITECTURE.md)
- [Руководство по развертыванию](./DEPLOYMENT.md)
- [Настройка Google Sheets](./GOOGLE_SHEETS_SETUP.md)

## 🔍 Troubleshooting

### Проблема: "Module not found"

```bash
# Удалите node_modules и переустановите
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Database not found"

```bash
# Убедитесь что применили миграции
npm run db:migrate:local  # для локальной разработки
npm run db:migrate        # для production
```

### Проблема: "Workers не запускаются"

```bash
# Проверьте что wrangler установлен глобально
npm install -g wrangler

# Проверьте логин
npx wrangler whoami

# Перелогиньтесь если нужно
npx wrangler logout
npx wrangler login
```

### Проблема: "TypeScript errors"

```bash
# Проверьте типы
npm run type-check

# Перезапустите TypeScript server в VSCode
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

## 💡 Советы для разработки

### 1. VSCode Extensions (рекомендуется)

- **ESLint** - для linting
- **Prettier** - для форматирования
- **Tailwind CSS IntelliSense** - автодополнение для Tailwind
- **TypeScript Vue Plugin** - для лучшей TypeScript поддержки

### 2. Разработка с Hot Reload

Next.js автоматически перезагружает страницы при изменениях. Для Workers используйте `--watch` флаг (уже включен в `npm run worker:dev`).

### 3. Debugging

#### Frontend (Next.js):
- Используйте Chrome DevTools
- React DevTools extension
- Console.log в компонентах

#### Backend (Workers):
- Используйте `console.log` в Workers
- Логи доступны через `npx wrangler tail`
- В production логи в Cloudflare Dashboard

### 4. Database Inspection

```bash
# Просмотр таблиц
npx wrangler d1 execute bocalc-db --local \
  --command="SELECT name FROM sqlite_master WHERE type='table'"

# Просмотр пользователей
npx wrangler d1 execute bocalc-db --local \
  --command="SELECT * FROM users"

# Просмотр вендоров
npx wrangler d1 execute bocalc-db --local \
  --command="SELECT * FROM vendors"
```

## 🎉 Готово!

Теперь вы можете начать разработку:

1. ✅ Откройте http://localhost:3000
2. ✅ Войдите с дефолтными учетными данными
3. ✅ Начните использовать калькулятор
4. ✅ Изучите админ-панель

## 🚀 Следующие шаги

1. **Настройте Google Sheets** для автоматической синхронизации данных
2. **Создайте своих вендоров** через админ-панель
3. **Добавьте пользователей** с разными ролями
4. **Настройте тарифы** для ваших вендоров
5. **Деплойте на Cloudflare** для production использования

Для помощи или вопросов: zaaatakyrylo@gmail.com

---

**Версия:** 1.0  
**Последнее обновление:** 2025-11-17  
**Автор:** Kirill Za


