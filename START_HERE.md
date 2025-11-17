# 🚀 BOCalc - Quick Start Guide

## ✅ Система запущена и работает!

**Статус:** 🟢 **ONLINE** - Оба сервиса работают

---

## 📍 Быстрый доступ

### 🌐 Frontend (Next.js)
- **Русский**: http://localhost:3000/ru
- **English**: http://localhost:3000/en
- **Українська**: http://localhost:3000/uk

### ⚙️ Backend API
- **Health**: http://localhost:8787/health
- **API Docs**: http://localhost:8787/api

---

## 🎯 Что делать дальше?

### 1️⃣ Открыть в браузере
Просто откройте: **http://localhost:3000/ru**

### 2️⃣ Протестировать функции
- Главная страница (Landing)
- Калькулятор доставки авто: http://localhost:3000/ru/calculator
- Регистрация: http://localhost:3000/ru/register
- Вход: http://localhost:3000/ru/login

### 3️⃣ Попробовать API
```bash
# Health check
curl http://localhost:8787/health

# Регистрация
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"Test123!"}'

# Вход
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'
```

---

## 📚 Полная документация

Подробные инструкции по тестированию смотрите в файле:
**[LOCAL_TESTING.md](./LOCAL_TESTING.md)**

---

## 🛠️ Управление

### Просмотр логов
```bash
# Frontend
tail -f /tmp/bocalc-frontend.log

# Backend
tail -f /tmp/bocalc-workers.log
```

### Остановить сервисы
```bash
pkill -f 'next dev|wrangler dev'
```

### Перезапустить
```bash
./start-local.sh
```

---

## 🎨 Архитектура MVP

```
┌─────────────────────────────────────────┐
│  Frontend (Next.js 14)                  │
│  • Multi-language (RU, EN, UK)          │
│  • shadcn/ui Components                 │
│  • Tailwind CSS                         │
│  Port: 3000                             │
└────────────────┬────────────────────────┘
                 │
                 ↓ HTTP/REST
┌─────────────────────────────────────────┐
│  Backend (Cloudflare Workers)           │
│  • Hono.js Router                       │
│  • JWT Authentication                   │
│  • D1 Database (SQLite)                 │
│  • KV Storage (Cache)                   │
│  Port: 8787                             │
└─────────────────────────────────────────┘
```

---

## ✨ Реализованные функции

### ✅ MVP Features
- [x] Multi-language интерфейс (RU, EN, UK)
- [x] Landing page с информацией
- [x] Форма калькулятора доставки
- [x] Аутентификация (регистрация, вход)
- [x] JWT токены
- [x] REST API с валидацией
- [x] База данных D1 (SQLite)
- [x] KV кеш
- [x] Rate limiting
- [x] CORS middleware
- [x] Error handling
- [x] Audit logging
- [x] Password hashing (bcrypt)

### 🚧 В разработке
- [ ] Google Sheets интеграция (production)
- [ ] Админ панель
- [ ] Dashboard для пользователей
- [ ] История расчетов
- [ ] Экспорт в PDF
- [ ] Email уведомления
- [ ] Multi-vendor функциональность

---

## 🧪 Проверено и работает

✅ **Frontend**: 
- Landing page загружается
- Переключение языков работает
- Форма калькулятора отображается
- Страницы auth (login/register) работают

✅ **Backend API**:
- Health endpoint отвечает
- Регистрация пользователей работает
- Вход и JWT токены генерируются
- База данных инициализирована
- Rate limiting активен

✅ **Database**:
- D1 SQLite база создана
- Схема применена
- Пользователи сохраняются
- Audit logs работают

---

## 📦 Структура проекта

```
/Users/kirillza/Documents/BOCalc/
├── src/                    # Frontend (Next.js)
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities
│   └── messages/         # i18n translations
│
├── workers/              # Backend (Cloudflare Workers)
│   ├── src/
│   │   ├── handlers/    # API route handlers
│   │   ├── middleware/  # Auth, rate-limit, etc.
│   │   ├── services/    # Business logic
│   │   └── utils/       # Helper functions
│   └── wrangler.toml    # Workers config
│
├── database/            # SQL migrations
├── .env.local          # Frontend env vars
├── workers/.dev.vars   # Backend env vars (local)
└── start-local.sh      # Startup script
```

---

## 🔐 Безопасность (Local Dev)

**⚠️ ВАЖНО:** Текущие настройки только для локальной разработки!

Для production необходимо:
- [ ] Изменить JWT_SECRET
- [ ] Настроить HTTPS
- [ ] Добавить Google OAuth
- [ ] Настроить Google Sheets API
- [ ] Включить WAF на Cloudflare
- [ ] Настроить мониторинг

---

## 🚢 Деплой на Cloudflare

Когда будете готовы к деплою, смотрите:
**[DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## 💡 Полезные команды

```bash
# Установка зависимостей
npm install                           # Frontend
cd workers && npm install            # Backend

# Разработка
npm run dev                          # Frontend only
cd workers && npx wrangler dev       # Backend only
./start-local.sh                     # Оба сервиса

# База данных
cd workers
npx wrangler d1 execute bocalc-db-local --local --command "SELECT * FROM users"

# Логи
tail -f /tmp/bocalc-frontend.log
tail -f /tmp/bocalc-workers.log

# Остановка
pkill -f 'next dev|wrangler dev'
```

---

## 🐛 Проблемы?

### Frontend не загружается
```bash
# Проверьте логи
tail -f /tmp/bocalc-frontend.log

# Проверьте порт
lsof -i :3000

# Переустановите
rm -rf node_modules package-lock.json
npm install
```

### Backend не отвечает
```bash
# Проверьте логи
tail -f /tmp/bocalc-workers.log

# Проверьте порт
lsof -i :8787

# Проверьте .dev.vars
cat workers/.dev.vars
```

### База данных пустая
```bash
cd workers
npx wrangler d1 execute bocalc-db-local --local \
  --file=../database/migrations/0001_initial_schema.sql
```

---

## 📞 Контакты

**Email проекта**: zaaatakyrylo@gmail.com  
**Cloudflare Account**: zaaatakyrylo@gmail.com

---

## 🎉 Готово к работе!

Система полностью функциональна и готова к тестированию.

**Приятной работы!** 🚀

---

*Последнее обновление: November 17, 2025*

