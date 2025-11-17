# 🧪 Руководство по локальному тестированию BOCalc

## ✅ Статус: Запущено и работает!

Оба сервиса успешно запущены и готовы к тестированию.

## 🌐 Доступные URL

### Frontend (Next.js)
- **Русский**: http://localhost:3000/ru
- **English**: http://localhost:3000/en  
- **Українська**: http://localhost:3000/uk

### Backend API (Cloudflare Workers)
- **Health Check**: http://localhost:8787/health
- **API Base**: http://localhost:8787/api

## 🎯 Что можно протестировать

### 1. Главная страница
Откройте http://localhost:3000/ru в браузере:
- ✅ Должна отобразиться красивая landing page с информацией о BOCalc
- ✅ Проверьте переключение языков: EN, RU, UK
- ✅ Проверьте кнопки "Калькулятор доставки авто" и "Войти"

### 2. Страница калькулятора
Перейдите на http://localhost:3000/ru/calculator:
- Форма расчета стоимости доставки автомобиля
- Выбор аукциона, штата, порта назначения
- Типы кузова и дополнительные опции
- Расчет общей стоимости

### 3. Страницы аутентификации

#### Вход (Login)
URL: http://localhost:3000/ru/login
- Форма входа с email и паролем
- Проверка валидации полей

#### Регистрация (Register)
URL: http://localhost:3000/ru/register  
- Форма регистрации нового пользователя
- Поля: имя, email, пароль, подтверждение пароля

### 4. API Endpoints

#### Health Check
```bash
curl http://localhost:8787/health
```
Ответ:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T19:27:37.518Z",
  "environment": "development"
}
```

#### Регистрация пользователя
```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

#### Вход пользователя
```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

## 📊 Архитектура проекта

```
┌─────────────────────────────────────────────────┐
│           Browser (localhost:3000)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │    RU    │  │    EN    │  │    UK    │     │
│  └──────────┘  └──────────┘  └──────────┘     │
└───────────────────┬─────────────────────────────┘
                    │ HTTP Requests
                    ↓
┌─────────────────────────────────────────────────┐
│      Next.js Frontend (App Router)              │
│  • React Components (shadcn/ui)                 │
│  • Multi-language support (next-intl)           │
│  • Tailwind CSS styling                         │
└───────────────────┬─────────────────────────────┘
                    │ API Calls
                    ↓
┌─────────────────────────────────────────────────┐
│   Cloudflare Workers API (localhost:8787)       │
│  ┌──────────────────────────────────────────┐  │
│  │  Hono.js Router                          │  │
│  │  • /api/auth/*     - Authentication      │  │
│  │  • /api/users/*    - User Management     │  │
│  │  • /api/vendors/*  - Vendor Management   │  │
│  │  • /api/calculator - Calculations        │  │
│  │  • /api/sheets/*   - Google Sheets Sync  │  │
│  │  • /api/audit/*    - Audit Logs          │  │
│  └──────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
┌──────────────┐       ┌──────────────┐
│ D1 Database  │       │  KV Storage  │
│  (SQLite)    │       │   (Cache)    │
│              │       │              │
│ • users      │       │ • sessions   │
│ • vendors    │       │ • sheets_*   │
│ • auctions   │       └──────────────┘
│ • ports      │
│ • audit_logs │
└──────────────┘
```

## 🛠️ Управление процессами

### Просмотр логов
```bash
# Frontend логи
tail -f /tmp/bocalc-frontend.log

# Backend логи  
tail -f /tmp/bocalc-workers.log
```

### Остановка сервисов
```bash
# Остановить все процессы BOCalc
pkill -f 'next dev|wrangler dev'
```

### Перезапуск
```bash
# Остановить
pkill -f 'next dev|wrangler dev'

# Подождать
sleep 2

# Запустить снова
./start-local.sh
```

## 🔍 Проверка базы данных

Локальная база данных D1 создается автоматически в:
```
/Users/kirillza/Documents/BOCalc/workers/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/
```

### Выполнить SQL запрос
```bash
cd /Users/kirillza/Documents/BOCalc/workers
npx wrangler d1 execute bocalc-db-local --local --command "SELECT * FROM users LIMIT 5"
```

## 🐛 Отладка

### Frontend не запускается
1. Проверьте логи: `tail -f /tmp/bocalc-frontend.log`
2. Убедитесь что порт 3000 свободен: `lsof -i :3000`
3. Переустановите зависимости: `npm install`

### Backend не запускается  
1. Проверьте логи: `tail -f /tmp/bocalc-workers.log`
2. Убедитесь что порт 8787 свободен: `lsof -i :8787`
3. Проверьте `.dev.vars` файл в `workers/` директории

### База данных пустая
Примените миграцию:
```bash
cd /Users/kirillza/Documents/BOCalc/workers
npx wrangler d1 execute bocalc-db-local --local --file=../database/migrations/0001_initial_schema.sql
```

## 📋 Тестовый сценарий (Quick Test)

1. **Откройте главную страницу**
   ```
   http://localhost:3000/ru
   ```
   Должна загрузиться красивая landing page

2. **Переключите язык**
   - Кликните на переключатель языка
   - Проверьте EN и UK версии

3. **Откройте калькулятор**
   - Нажмите "Калькулятор доставки авто"
   - Заполните форму
   - Получите расчет стоимости

4. **Попробуйте регистрацию**
   - Перейдите на `/register`
   - Создайте тестовый аккаунт
   - Войдите с созданными данными

5. **Проверьте API**
   ```bash
   curl http://localhost:8787/health
   ```

## ✨ Основные функции MVP

✅ **Реализовано:**
- Multi-language интерфейс (RU, EN, UK)
- Landing page с информацией о системе
- Формы аутентификации (Login, Register)
- Калькулятор доставки авто
- REST API с аутентификацией
- База данных D1 (SQLite)
- KV кеширование
- Audit logging
- Rate limiting
- CORS middleware
- Error handling

🚧 **В разработке (для Production):**
- Google Sheets интеграция (сейчас mock data)
- Email уведомления
- Детальная панель администратора
- История расчетов
- Экспорт в PDF
- Multi-vendor функциональность

## 🎨 Технологии

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Cloudflare Workers, Hono.js, D1 Database, KV Storage
- **Auth**: JWT с bcrypt
- **i18n**: next-intl
- **Validation**: zod

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи в `/tmp/bocalc-*.log`
2. Убедитесь что все зависимости установлены
3. Проверьте что `.env.local` и `.dev.vars` файлы созданы
4. Убедитесь что порты 3000 и 8787 свободны

---

**Приятного тестирования! 🚀**

