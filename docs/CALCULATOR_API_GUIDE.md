# 📘 Calculator API Guide

**Дата:** 18 ноября 2025  
**Версия:** 1.0.0

---

## 🎯 Обзор

Это руководство описывает новую систему управления переменными для калькулятора BOCalc, которая разделяет:
- **Законодательные переменные** (акциз, пошлина, НДС, курсы валют) - управляются только админом
- **Коммерческие переменные** (тарифы вендоров) - управляются вендором или админом

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────┐
│         ЗАКОНОДАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ              │
│         (Единые для всех вендоров)             │
│                                                 │
│  • Акцизный сбор                               │
│  • Импортная пошлина (10%)                     │
│  • НДС/ПДВ (20%)                               │
│  • Курсы валют (EUR/USD, UAH/USD)             │
│  • Таможенное оформление                       │
│                                                 │
│  Управление: ТОЛЬКО ADMIN                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         КОММЕРЧЕСКИЕ ПЕРЕМЕННЫЕ                 │
│         (Индивидуальные для каждого вендора)   │
│                                                 │
│  • Аукционные сборы (vendor_rates)            │
│  • Доставка по США                             │
│  • Океанская доставка (vendor_ports)          │
│  • Страхование                                 │
│  • Модификаторы (vendor_modifiers)            │
│                                                 │
│  Управление: ADMIN или VENDOR (свои данные)    │
└─────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Law Variable Types (Типы законодательных переменных)

```sql
CREATE TABLE law_variable_types (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,      -- 'excise_tax', 'import_duty', 'vat'
  name TEXT NOT NULL,               -- 'Акцизный сбор'
  category TEXT NOT NULL,           -- 'tax', 'duty', 'currency', 'fee'
  unit TEXT NOT NULL,               -- 'percent', 'eur_per_cm3', 'usd_flat', 'rate'
  active INTEGER NOT NULL DEFAULT 1
);
```

### Law Rates (Законодательные ставки)

```sql
CREATE TABLE law_rates (
  id TEXT PRIMARY KEY,
  variable_type_id TEXT NOT NULL,
  rate_name TEXT NOT NULL,
  
  -- Условия применения
  fuel_type TEXT,                  -- 'gasoline', 'diesel', 'electric'
  volume_min INTEGER,              -- см³
  volume_max INTEGER,              -- см³ (NULL = ∞)
  age_min INTEGER,                 -- возраст авто
  age_max INTEGER,                 -- возраст (NULL = ∞)
  
  -- Значение ставки
  rate_value REAL NOT NULL,
  rate_unit TEXT NOT NULL,
  
  -- Метаданные
  legal_reference TEXT,            -- Ссылка на закон
  description TEXT,
  
  -- Версионирование
  effective_from INTEGER NOT NULL,
  effective_to INTEGER,            -- NULL = активна
  
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Exchange Rates (Курсы валют)

```sql
CREATE TABLE exchange_rates (
  id TEXT PRIMARY KEY,
  variable_type_id TEXT NOT NULL,
  rate_name TEXT NOT NULL,
  rate_value REAL NOT NULL,
  rate_date INTEGER NOT NULL,
  source TEXT,                     -- 'NBU', 'ECB', 'manual'
  created_at INTEGER NOT NULL
);
```

---

## 🔌 API Endpoints

### 1. Law Variable Types

#### GET /api/law-variable-types
Получить список типов законодательных переменных

**Query Parameters:**
- `category` (optional): `tax`, `duty`, `currency`, `fee`
- `active` (optional): `true`, `false`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "lvt-excise",
      "code": "excise_tax",
      "name": "Акцизный сбор",
      "category": "tax",
      "description": "Акцизный налог на импорт автомобилей",
      "unit": "eur_per_cm3",
      "active": true,
      "createdAt": "2025-11-18T10:00:00Z",
      "updatedAt": "2025-11-18T10:00:00Z"
    }
  ]
}
```

---

### 2. Law Rates (Admin Only)

#### GET /api/law-rates
Получить список законодательных ставок

**Query Parameters:**
- `variableTypeId` (optional): Фильтр по типу переменной
- `fuelType` (optional): `gasoline`, `diesel`, `electric`
- `activeOnly` (optional): `true` - только активные ставки

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "lr-excise-gas-3000",
      "variableTypeId": "lvt-excise",
      "variableCode": "excise_tax",
      "variableName": "Акцизный сбор",
      "rateName": "Акциз бензин до 3000 см³",
      "fuelType": "gasoline",
      "volumeMin": 0,
      "volumeMax": 3000,
      "rateValue": 0.05,
      "rateUnit": "eur_per_cm3",
      "legalReference": "Податковий кодекс України, ст. 215",
      "description": "Базовая ставка акциза...",
      "effectiveFrom": "2024-01-01T00:00:00Z",
      "effectiveTo": null,
      "createdAt": "2025-11-18T10:00:00Z",
      "updatedAt": "2025-11-18T10:00:00Z"
    }
  ]
}
```

#### POST /api/law-rates (Admin Only)
Создать новую законодательную ставку

**Request Body:**
```json
{
  "variableTypeId": "lvt-excise",
  "rateName": "Акциз бензин до 3000 см³",
  "fuelType": "gasoline",
  "volumeMin": 0,
  "volumeMax": 3000,
  "rateValue": 0.05,
  "rateUnit": "eur_per_cm3",
  "legalReference": "Податковий кодекс України, ст. 215",
  "description": "Базовая ставка акциза для бензиновых автомобилей",
  "effectiveFrom": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* created rate */ }
}
```

#### PATCH /api/law-rates/:id (Admin Only)
Обновить законодательную ставку (создает новую версию)

#### DELETE /api/law-rates/:id (Admin Only)
Деактивировать ставку (устанавливает `effective_to`)

#### GET /api/law-rates/:id/versions (Admin Only)
Получить историю версий ставки

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "version": 2,
      "changeType": "update",
      "changeReason": "Изменение ставки по новому закону",
      "updatedBy": "admin-001",
      "updatedAt": "2025-11-18T12:00:00Z",
      "snapshot": { /* full rate object */ }
    },
    {
      "version": 1,
      "changeType": "create",
      "updatedBy": "admin-001",
      "updatedAt": "2025-11-18T10:00:00Z",
      "snapshot": { /* full rate object */ }
    }
  ]
}
```

---

### 3. Exchange Rates

#### GET /api/exchange-rates
Получить курсы валют

**Query Parameters:**
- `variableTypeId` (optional): Фильтр по типу валюты
- `latest` (optional): `true` - только последние курсы

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "er-eur-usd-123",
      "variableTypeId": "lvt-eur-usd",
      "variableCode": "eur_to_usd",
      "variableName": "Курс EUR/USD",
      "rateName": "EUR to USD",
      "rateValue": 1.08,
      "rateDate": "2025-11-18",
      "source": "ECB",
      "createdAt": "2025-11-18T10:00:00Z"
    }
  ]
}
```

#### POST /api/exchange-rates (Admin Only)
Добавить новый курс валюты

**Request Body:**
```json
{
  "variableTypeId": "lvt-eur-usd",
  "rateName": "EUR to USD",
  "rateValue": 1.08,
  "rateDate": "2025-11-18",
  "source": "ECB"
}
```

---

### 4. Unified Calculator Data API ⭐

#### GET /api/calculator/data?vendorId=xxx&date=YYYY-MM-DD
**Получить ВСЕ данные для калькулятора в одном запросе**

Этот endpoint возвращает:
- Все законодательные переменные (акциз, пошлина, НДС)
- Актуальные курсы валют
- Все коммерческие тарифы вендора
- Порты и модификаторы вендора

**Query Parameters:**
- `vendorId` (required): ID вендора
- `date` (optional): Дата для получения актуальных на эту дату данных (по умолчанию - текущая)

**Response:**
```json
{
  "success": true,
  "version": "2025-11-18T12:00:00.000Z",
  "generatedAt": "2025-11-18T12:05:30.123Z",
  "data": {
    "law": {
      "exciseTax": {
        "rates": [
          {
            "fuelType": "gasoline",
            "volumeMin": 0,
            "volumeMax": 3000,
            "rateValue": 0.05,
            "rateUnit": "eur_per_cm3",
            "description": "Базовая ставка акциза...",
            "legalReference": "Податковий кодекс України, ст. 215"
          },
          {
            "fuelType": "gasoline",
            "volumeMin": 3001,
            "volumeMax": null,
            "rateValue": 0.10,
            "rateUnit": "eur_per_cm3",
            "description": "Повышенная ставка...",
            "legalReference": "Податковий кодекс України, ст. 215"
          },
          {
            "fuelType": "electric",
            "volumeMin": null,
            "volumeMax": null,
            "rateValue": 100,
            "rateUnit": "usd_flat",
            "description": "Фиксированная ставка для электромобилей"
          }
        ],
        "ageMultipliers": [
          { "ageMin": 0, "ageMax": 3, "multiplier": 1.0, "description": "Новые авто" },
          { "ageMin": 4, "ageMax": 5, "multiplier": 1.5, "description": "4-5 лет" },
          { "ageMin": 6, "ageMax": 8, "multiplier": 2.0, "description": "6-8 лет" },
          { "ageMin": 9, "ageMax": null, "multiplier": 2.5, "description": "9+ лет" }
        ]
      },
      "importDuty": {
        "rate": 0.10,
        "unit": "percent",
        "description": "Импортная пошлина 10%",
        "legalReference": "Митний кодекс України"
      },
      "vat": {
        "rate": 0.20,
        "unit": "percent",
        "description": "НДС/ПДВ 20%",
        "legalReference": "Податковий кодекс України"
      },
      "customsClearance": {
        "baseFee": 150,
        "unit": "usd_flat",
        "description": "Базовый сбор за таможенное оформление",
        "legalReference": "Митний кодекс України"
      }
    },
    
    "exchangeRates": {
      "eur_to_usd": {
        "rate": 1.08,
        "date": "2025-11-18",
        "source": "ECB"
      },
      "uah_to_usd": {
        "rate": 0.027,
        "date": "2025-11-18",
        "source": "NBU"
      }
    },
    
    "vendor": {
      "id": "vendor-123",
      "name": "USA Logistics Co",
      "slug": "usa-logistics",
      "settings": {
        "defaultCurrency": "USD",
        "defaultLanguage": "ru"
      }
    },
    
    "rates": {
      "auction_fee": [
        {
          "id": "rate-1",
          "name": "Copart Fee $0-99",
          "baseValue": 25,
          "currency": "USD",
          "metadata": { "range_min": 0, "range_max": 99.99 }
        },
        {
          "id": "rate-2",
          "name": "Copart Fee $100-199",
          "baseValue": 50,
          "currency": "USD",
          "metadata": { "range_min": 100, "range_max": 199.99 }
        }
      ],
      "service_fee": [
        {
          "id": "rate-3",
          "name": "Base Service Fee",
          "baseValue": 500,
          "currency": "USD"
        }
      ]
    },
    
    "ports": [
      {
        "id": "port-1",
        "name": "Odessa Port",
        "country": "Ukraine",
        "city": "Odessa",
        "baseOceanShipping": 1200,
        "inlandShipping": 100,
        "currency": "USD",
        "transitTimeDays": 45,
        "metadata": null
      }
    ],
    
    "modifiers": {
      "body_type": {
        "sedan": {
          "oceanModifier": 0,
          "usaModifier": 0,
          "notes": "Базовый тип"
        },
        "suv": {
          "oceanModifier": 200,
          "usaModifier": 150,
          "notes": "Наценка за размер"
        },
        "truck": {
          "oceanModifier": 500,
          "usaModifier": 300,
          "notes": "Большой кузов"
        }
      },
      "damage_type": {
        "front": {
          "oceanModifier": 0,
          "usaModifier": 100,
          "notes": "Повреждение передней части"
        }
      }
    }
  }
}
```

#### GET /api/calculator/data/preview
Получить предпросмотр структуры данных без указания вендора

**Response:**
```json
{
  "success": true,
  "version": "2025-11-18T12:00:00.000Z",
  "data": {
    "law": {
      "availableRates": 15,
      "categories": ["excise_tax", "import_duty", "vat", "customs_clearance"]
    },
    "exchangeRates": {
      "available": 2,
      "currencies": ["eur_to_usd", "uah_to_usd"]
    },
    "note": "Use /api/calculator/data?vendorId=xxx to get complete data"
  }
}
```

---

## 💡 Примеры Использования

### Пример 1: Загрузка данных для калькулятора

```typescript
// Frontend code
const loadCalculatorData = async (vendorId: string) => {
  const response = await fetch(
    `/api/calculator/data?vendorId=${vendorId}&date=2025-11-18`
  );
  const data = await response.json();
  
  if (data.success) {
    const { law, exchangeRates, rates, ports, modifiers } = data.data;
    
    // Теперь у вас есть все данные для расчета!
    console.log('Excise rates:', law.exciseTax.rates);
    console.log('EUR/USD rate:', exchangeRates.eur_to_usd.rate);
    console.log('Vendor auction fees:', rates.auction_fee);
  }
};
```

### Пример 2: Расчет акциза

```typescript
const calculateExcise = (carData: any, lawData: any, exchangeRates: any) => {
  // Найти подходящую ставку акциза
  const exciseRate = lawData.exciseTax.rates.find(
    (rate: any) =>
      rate.fuelType === carData.fuelType &&
      carData.engineVolume >= rate.volumeMin &&
      (rate.volumeMax === null || carData.engineVolume <= rate.volumeMax)
  );
  
  if (!exciseRate) {
    throw new Error('Excise rate not found');
  }
  
  // Найти возрастной множитель
  const carAge = new Date().getFullYear() - carData.year;
  const ageMultiplier = lawData.exciseTax.ageMultipliers.find(
    (mult: any) =>
      carAge >= mult.ageMin &&
      (mult.ageMax === null || carAge <= mult.ageMax)
  );
  
  // Расчет акциза
  let exciseAmount = 0;
  
  if (exciseRate.rateUnit === 'eur_per_cm3') {
    // Акциз = объем двигателя * ставка * возрастной множитель * курс EUR/USD
    exciseAmount =
      carData.engineVolume *
      exciseRate.rateValue *
      (ageMultiplier?.multiplier || 1) *
      exchangeRates.eur_to_usd.rate;
  } else if (exciseRate.rateUnit === 'usd_flat') {
    // Фиксированная ставка (для электромобилей)
    exciseAmount = exciseRate.rateValue;
  }
  
  return {
    amount: exciseAmount,
    details: {
      baseRate: exciseRate.rateValue,
      ageMultiplier: ageMultiplier?.multiplier || 1,
      eurToUsd: exchangeRates.eur_to_usd.rate,
    },
  };
};
```

### Пример 3: Добавление нового курса валюты (Admin)

```typescript
const addExchangeRate = async () => {
  const response = await fetch('/api/exchange-rates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      variableTypeId: 'lvt-eur-usd',
      rateName: 'EUR to USD',
      rateValue: 1.09,
      rateDate: '2025-11-19',
      source: 'ECB',
    }),
  });
  
  const data = await response.json();
  console.log('Exchange rate added:', data);
};
```

---

## 🔐 Права Доступа

| Endpoint | Admin | Vendor | Viewer |
|----------|-------|--------|--------|
| GET /api/law-variable-types | ✅ | ✅ | ✅ |
| GET /api/law-rates | ✅ | ✅ | ✅ |
| POST /api/law-rates | ✅ | ❌ | ❌ |
| PATCH /api/law-rates/:id | ✅ | ❌ | ❌ |
| DELETE /api/law-rates/:id | ✅ | ❌ | ❌ |
| GET /api/exchange-rates | ✅ | ✅ | ✅ |
| POST /api/exchange-rates | ✅ | ❌ | ❌ |
| GET /api/calculator/data | ✅ | ✅ | ✅ |
| POST /api/vendor-rates | ✅ | ✅* | ❌ |

*Vendor может управлять только своими тарифами

---

## 📝 Changelog

### Version 1.0.0 (2025-11-18)
- ✅ Создана миграция для законодательных переменных
- ✅ Реализован API для управления законодательными переменными
- ✅ Создан unified endpoint `/api/calculator/data`
- ✅ Добавлено UI для управления (admin only)
- ✅ Полное версионирование всех изменений

---

## 🚀 Следующие Шаги

1. ✅ Применить миграцию: `wrangler d1 migrations apply bocalc-db --remote`
2. ✅ Протестировать API endpoints
3. ✅ Обновить калькулятор для использования нового API
4. 📊 Добавить кеширование данных в KV
5. 📧 Настроить уведомления при изменении законодательных ставок

---

**Документация:** v1.0.0  
**Дата:** 2025-11-18  
**Автор:** AI Assistant

