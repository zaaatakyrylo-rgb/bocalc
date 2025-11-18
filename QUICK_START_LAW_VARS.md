# 🚀 Quick Start: Law Variables System

**Дата:** 18 ноября 2025  
**Время:** 5 минут на setup

---

## ✅ Что Было Реализовано

Добавлена система управления законодательными переменными:
- ✅ Секция для хранения законодательных переменных (акциз, пошлина, НДС, курсы валют)
- ✅ API для управления (admin only)
- ✅ Unified API для калькулятора (`/api/calculator/data`)
- ✅ UI для управления (`/law-rates`)

---

## 🎯 Быстрый Старт

### Шаг 1: Применить Миграцию (2 минуты)

```bash
# Перейти в директорию workers
cd workers

# Применить миграцию локально (для тестирования)
npx wrangler d1 migrations apply bocalc-db --local

# Применить миграцию в production
npx wrangler d1 migrations apply bocalc-db --remote
```

**Что создастся:**
- 4 новые таблицы
- 6 типов законодательных переменных
- 14 предустановленных ставок
- 2 курса валют (EUR/USD, UAH/USD)

---

### Шаг 2: Перезапустить Workers (1 минута)

```bash
# Локальная разработка
cd workers
npm run dev

# Production
npm run deploy
```

---

### Шаг 3: Проверить API (1 минута)

```bash
# Проверить типы переменных
curl http://localhost:8787/api/law-variable-types

# Проверить законодательные ставки
curl http://localhost:8787/api/law-rates?activeOnly=true

# Проверить unified API для калькулятора
curl "http://localhost:8787/api/calculator/data?vendorId=default-vendor"
```

**Ожидаемый результат:** JSON с данными

---

### Шаг 4: Открыть UI (1 минута)

```bash
# Запустить frontend (если еще не запущен)
npm run dev
```

Откройте в браузере:
- **Admin login:** http://localhost:3000/login
  - Email: `zaaatakyrylo@gmail.com`
  - Password: `Admin123!`

- **Law Rates Management:** http://localhost:3000/law-rates

**Что увидите:**
- 3 вкладки: Law Rates, Exchange Rates, Variable Types
- Список всех законодательных ставок
- Формы для создания/редактирования

---

## 📊 Что Можно Делать

### Для Админа:

1. **Управление законодательными ставками** (`/law-rates`)
   - Создать новую ставку акциза
   - Обновить существующую ставку
   - Деактивировать устаревшую ставку
   - Просмотреть историю изменений

2. **Управление курсами валют**
   - Добавить новый курс EUR/USD
   - Добавить курс UAH/USD
   - Отслеживать динамику

3. **API для калькулятора**
   - Использовать `/api/calculator/data?vendorId=xxx`
   - Получить все данные в одном запросе

---

## 🔍 Примеры Использования

### Пример 1: Получить все данные для калькулятора

```bash
curl "http://localhost:8787/api/calculator/data?vendorId=default-vendor"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "law": {
      "exciseTax": {
        "rates": [
          {
            "fuelType": "gasoline",
            "volumeMin": 0,
            "volumeMax": 3000,
            "rateValue": 0.05,
            "rateUnit": "eur_per_cm3"
          }
        ],
        "ageMultipliers": [
          { "ageMin": 0, "ageMax": 3, "multiplier": 1.0 }
        ]
      },
      "importDuty": { "rate": 0.10 },
      "vat": { "rate": 0.20 }
    },
    "exchangeRates": {
      "eur_to_usd": { "rate": 1.08 }
    },
    "vendor": { "id": "...", "name": "..." },
    "rates": { "auction_fee": [...] },
    "ports": [...],
    "modifiers": { "body_type": {...} }
  }
}
```

---

### Пример 2: Добавить курс валюты (Admin)

```typescript
const addExchangeRate = async () => {
  const response = await fetch('/api/exchange-rates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      variableTypeId: 'lvt-eur-usd',
      rateName: 'EUR to USD',
      rateValue: 1.09,
      rateDate: '2025-11-19',
      source: 'ECB',
    }),
  });
  
  return await response.json();
};
```

---

### Пример 3: Использование в калькуляторе

```typescript
// Загрузить все данные
const calculatorData = await fetch(
  '/api/calculator/data?vendorId=vendor-123'
).then(r => r.json());

// Расчет акциза
const calculateExcise = (engineVolume, fuelType, carAge) => {
  const { law, exchangeRates } = calculatorData.data;
  
  // Найти подходящую ставку
  const rate = law.exciseTax.rates.find(
    r => r.fuelType === fuelType &&
         engineVolume >= r.volumeMin &&
         engineVolume <= (r.volumeMax || Infinity)
  );
  
  // Найти множитель
  const multiplier = law.exciseTax.ageMultipliers.find(
    m => carAge >= m.ageMin && 
         carAge <= (m.ageMax || Infinity)
  );
  
  // Расчет
  return engineVolume * 
         rate.rateValue * 
         multiplier.multiplier * 
         exchangeRates.eur_to_usd.rate;
};
```

---

## 📝 Структура Файлов

```
BOCalc/
├── database/migrations/
│   └── 0003_law_variables.sql          ← Новая миграция
│
├── workers/src/handlers/
│   ├── law-variables.ts                ← Новый API handler
│   └── calculator-data.ts              ← Unified API
│
├── src/app/[locale]/(dashboard)/
│   └── law-rates/
│       └── page.tsx                    ← Новая страница
│
├── src/components/dashboard/
│   └── law-rates-manager.tsx           ← Новый компонент
│
└── docs/
    ├── CALCULATOR_API_GUIDE.md         ← Полная документация
    ├── IMPLEMENTATION_SUMMARY.md        ← Детальное описание
    └── QUICK_START_LAW_VARS.md         ← Этот файл
```

---

## 🔗 API Endpoints

### Законодательные Переменные
- `GET /api/law-variable-types` - Типы переменных
- `GET /api/law-rates` - Законодательные ставки
- `POST /api/law-rates` - Создать ставку (admin)
- `PATCH /api/law-rates/:id` - Обновить ставку (admin)
- `DELETE /api/law-rates/:id` - Деактивировать (admin)
- `GET /api/law-rates/:id/versions` - История версий (admin)

### Курсы Валют
- `GET /api/exchange-rates` - Список курсов
- `POST /api/exchange-rates` - Добавить курс (admin)

### Unified Calculator Data ⭐
- `GET /api/calculator/data?vendorId=xxx&date=YYYY-MM-DD`
- `GET /api/calculator/data/preview`

---

## 📚 Документация

- **Полная документация API:** `docs/CALCULATOR_API_GUIDE.md`
- **Детальное описание изменений:** `docs/IMPLEMENTATION_SUMMARY.md`
- **Архитектура системы:** `docs/CURRENT_ARCHITECTURE.md`
- **Общие требования:** `REQUIREMENTS.md`

---

## ✅ Чек-лист

- [ ] Миграция применена (`wrangler d1 migrations apply`)
- [ ] Workers перезапущены (`npm run dev` или `npm run deploy`)
- [ ] API endpoints работают (тестирование curl)
- [ ] UI доступен (`/law-rates`)
- [ ] Admin может создавать ставки
- [ ] Unified API возвращает данные

---

## 🆘 Troubleshooting

### Ошибка: "Table already exists"
**Решение:** Миграция уже применена, проверьте таблицы:
```sql
.tables  -- в wrangler d1 console
```

### Ошибка: "Vendor not found"
**Решение:** Убедитесь что вендор существует:
```bash
curl http://localhost:8787/api/vendors
```

### Ошибка: "Admin access required"
**Решение:** Войдите как admin или используйте админский токен

### UI не показывает данные
**Решение:** Проверьте Network tab в браузере, убедитесь что API endpoints работают

---

## 🎉 Готово!

Система законодательных переменных настроена и готова к использованию!

**Следующие шаги:**
1. ✅ Протестировать создание ставок через UI
2. ✅ Обновить калькулятор для использования unified API
3. 📊 Добавить кеширование в KV (опционально)
4. 📧 Настроить email уведомления (опционально)

---

**Вопросы?** См. полную документацию в `docs/CALCULATOR_API_GUIDE.md`

**Версия:** 1.0.0  
**Дата:** 2025-11-18  
**Автор:** AI Assistant

