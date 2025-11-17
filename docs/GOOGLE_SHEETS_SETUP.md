# Google Sheets Setup Guide

Этот документ описывает, как настроить Google Sheets для интеграции с BOCalc.

## 📊 Создание таблицы

1. Создайте новую Google Таблицу
2. Скопируйте ID таблицы из URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
   ```
3. Сохраните ID в переменную окружения `GOOGLE_SHEETS_ID`

## 🔐 Настройка Service Account

### Шаг 1: Создание Service Account

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите **Google Sheets API**:
   - APIs & Services → Enable APIs and Services
   - Найдите "Google Sheets API" → Enable

4. Создайте Service Account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Имя: `bocalc-sheets-sync`
   - Роль: Editor
   - Create Key → JSON → Download

### Шаг 2: Настройка доступа к таблице

1. Откройте скачанный JSON файл
2. Найдите поле `client_email`
3. Откройте вашу Google Таблицу
4. Нажмите "Share"
5. Добавьте email Service Account с правами "Editor"

### Шаг 3: Настройка переменных окружения

```bash
# Service Account Email
GOOGLE_SERVICE_ACCOUNT_EMAIL=bocalc-sheets-sync@your-project.iam.gserviceaccount.com

# Private Key (из JSON файла)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Sheet ID
GOOGLE_SHEETS_ID=your_sheet_id_here
```

## 📋 Структура листов

### 1. Лист "Vendors"

**Заголовки (первая строка):**
```
vendor_id | name | slug | contact_email | active | settings_json | created_at | updated_at
```

**Пример данных:**
```
vendor-001 | AutoImport Pro | autoimport-pro | contact@autoimport.com | TRUE | {"defaultCurrency":"USD","defaultLanguage":"ru"} | 2025-01-01 | 2025-01-15
vendor-002 | CarShip Elite | carship-elite | info@carship.com | TRUE | {"defaultCurrency":"EUR","defaultLanguage":"en"} | 2025-01-02 | 2025-01-16
```

**Формат полей:**
- `vendor_id`: уникальный ID (строка)
- `name`: название вендора
- `slug`: URL-friendly идентификатор (только a-z, 0-9, дефис)
- `contact_email`: email для связи
- `active`: TRUE/FALSE
- `settings_json`: JSON строка с настройками
- `created_at`: дата создания (YYYY-MM-DD)
- `updated_at`: дата обновления (YYYY-MM-DD)

---

### 2. Лист "Auctions"

**Заголовки:**
```
auction_id | name | location_state | buyer_fee_type | buyer_fee_value | gate_fee | updated_by | updated_at
```

**Пример данных:**
```
copart-001 | Copart | CA | tiered | [{"min":0,"max":99.99,"fee":1},{"min":100,"max":499.99,"fee":25}] | 75 | admin | 2025-01-15
iaai-001 | IAAI | TX | percentage | 10 | 50 | admin | 2025-01-15
manheim-001 | Manheim | FL | fixed | 150 | 100 | admin | 2025-01-15
```

**Формат полей:**
- `auction_id`: уникальный ID
- `name`: название аукциона
- `location_state`: штат (код, например CA, TX)
- `buyer_fee_type`: тип комиссии (fixed, percentage, tiered)
- `buyer_fee_value`: значение комиссии (число или JSON для tiered)
- `gate_fee`: сбор за выезд ($)
- `updated_by`: кто обновил
- `updated_at`: дата обновления

**Tiered fee format (JSON):**
```json
[
  {"min": 0, "max": 99.99, "fee": 1},
  {"min": 100, "max": 499.99, "fee": 25},
  {"min": 500, "max": 999.99, "fee": 50},
  {"min": 1000, "max": 1499.99, "fee": 75},
  {"min": 1500, "max": 999999, "fee": 100, "percentageAbove": 2}
]
```

---

### 3. Лист "Ports"

**Заголовки:**
```
port_id | name | country | city | base_ocean_shipping | vendor_id | active | updated_at
```

**Пример данных:**
```
port-odessa | Port of Odessa | Ukraine | Odessa | 1200 |  | TRUE | 2025-01-15
port-riga | Port of Riga | Latvia | Riga | 1000 |  | TRUE | 2025-01-15
port-poti | Port of Poti | Georgia | Poti | 1100 |  | TRUE | 2025-01-15
port-constanta | Port of Constanta | Romania | Constanta | 950 |  | TRUE | 2025-01-15
port-custom | Custom Port | Ukraine | Kyiv | 1500 | vendor-001 | TRUE | 2025-01-15
```

**Формат полей:**
- `port_id`: уникальный ID
- `name`: название порта
- `country`: страна
- `city`: город
- `base_ocean_shipping`: базовая стоимость океанской доставки ($)
- `vendor_id`: ID вендора (пусто = для всех)
- `active`: TRUE/FALSE
- `updated_at`: дата обновления

---

### 4. Лист "USA_Shipping"

**Заголовки:**
```
route_id | state_from | port_to | distance_miles | base_price | price_per_mile | vendor_id | updated_at
```

**Пример данных:**
```
route-ca-la | CA | Port of Los Angeles | 500 | 200 | 1.5 |  | 2025-01-15
route-tx-houston | TX | Port of Houston | 300 | 180 | 1.4 |  | 2025-01-15
route-fl-jacksonville | FL | Port of Jacksonville | 250 | 170 | 1.3 |  | 2025-01-15
route-ny-newark | NY | Port of Newark | 400 | 220 | 1.6 |  | 2025-01-15
```

**Формат полей:**
- `route_id`: уникальный ID маршрута
- `state_from`: штат отправления (код)
- `port_to`: название порта
- `distance_miles`: расстояние в милях
- `base_price`: базовая цена ($)
- `price_per_mile`: цена за милю ($)
- `vendor_id`: ID вендора (пусто = для всех)
- `updated_at`: дата обновления

---

### 5. Лист "Pricing_Rules"

**Заголовки:**
```
rule_id | vendor_id | rule_type | condition_json | value | priority | active | updated_at
```

**Пример данных:**
```
rule-001 |  | nonrunning_surcharge | {"isRunning":false} | 100 | 10 | TRUE | 2025-01-15
rule-002 |  | oversize_surcharge | {"bodyType":"truck"} | 150 | 10 | TRUE | 2025-01-15
rule-003 | vendor-001 | service_fee | {} | 500 | 5 | TRUE | 2025-01-15
rule-004 |  | documentation_fee | {} | 200 | 5 | TRUE | 2025-01-15
```

**Формат полей:**
- `rule_id`: уникальный ID правила
- `vendor_id`: ID вендора (пусто = глобальное)
- `rule_type`: тип правила
- `condition_json`: JSON с условиями
- `value`: значение ($)
- `priority`: приоритет (меньше = выше)
- `active`: TRUE/FALSE
- `updated_at`: дата обновления

**Типы правил:**
- `nonrunning_surcharge` - доплата за неисправный автомобиль
- `oversize_surcharge` - доплата за крупногабаритный
- `service_fee` - сервисный сбор вендора
- `documentation_fee` - сбор за документы
- `damage_surcharge` - доплата за повреждения

---

### 6. Лист "Body_Type_Modifiers"

**Заголовки:**
```
modifier_id | body_type | ocean_shipping_modifier | usa_shipping_modifier | vendor_id | updated_at
```

**Пример данных:**
```
mod-sedan | sedan | 0 | 0 |  | 2025-01-15
mod-suv | suv | 200 | 50 |  | 2025-01-15
mod-truck | truck | 500 | 150 |  | 2025-01-15
mod-van | van | 400 | 100 |  | 2025-01-15
mod-coupe | coupe | -50 | 0 |  | 2025-01-15
mod-wagon | wagon | 100 | 25 |  | 2025-01-15
mod-motorcycle | motorcycle | -200 | -50 |  | 2025-01-15
```

**Формат полей:**
- `modifier_id`: уникальный ID
- `body_type`: тип кузова
- `ocean_shipping_modifier`: модификатор океанской доставки ($)
- `usa_shipping_modifier`: модификатор доставки по США ($)
- `vendor_id`: ID вендора (пусто = для всех)
- `updated_at`: дата обновления

**Типы кузова:**
- `sedan` - седан
- `suv` - внедорожник
- `truck` - пикап
- `van` - фургон
- `coupe` - купе
- `wagon` - универсал
- `motorcycle` - мотоцикл

---

### 7. Лист "Customs_Rates"

**Заголовки:**
```
rate_id | country | duty_rate | vat_rate | base_clearance_fee | broker_fee | updated_at
```

**Пример данных:**
```
customs-ukraine | Ukraine | 10 | 20 | 150 | 200 | 2025-01-15
customs-latvia | Latvia | 10 | 21 | 120 | 180 | 2025-01-15
customs-georgia | Georgia | 0 | 18 | 100 | 150 | 2025-01-15
customs-romania | Romania | 10 | 19 | 130 | 190 | 2025-01-15
```

**Формат полей:**
- `rate_id`: уникальный ID
- `country`: страна
- `duty_rate`: ставка пошлины (%)
- `vat_rate`: ставка НДС (%)
- `base_clearance_fee`: базовый сбор за растаможку ($)
- `broker_fee`: сбор брокера ($)
- `updated_at`: дата обновления

---

## 🔄 Синхронизация

### Автоматическая синхронизация

Система автоматически синхронизируется каждые 5 минут через Cloudflare Cron Trigger.

### Ручная синхронизация

Администраторы могут запустить ручную синхронизацию через админ-панель:
1. Войдите как администратор
2. Перейдите в раздел "Google Sheets Sync"
3. Нажмите кнопку "Sync Now"

### API для синхронизации

```bash
# Запросить синхронизацию (требуется admin токен)
curl -X POST https://your-domain.com/api/sheets/sync \
  -H "Authorization: Bearer YOUR_TOKEN"

# Проверить статус синхронизации
curl https://your-domain.com/api/sheets/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Формулы и валидация

### Формулы для автозаполнения

**Лист "Vendors" - автогенерация slug:**
```
=LOWER(SUBSTITUTE(B2," ","-"))
```

**Лист "Vendors" - автодата обновления:**
```
=NOW()
```

**Лист "USA_Shipping" - расчет base_price:**
```
=D2*F2
```

### Data Validation

**Для колонки "active" (все листы):**
- Тип: List
- Значения: `TRUE, FALSE`

**Для колонки "body_type":**
- Тип: List
- Значения: `sedan, suv, truck, van, coupe, wagon, motorcycle`

**Для колонки "buyer_fee_type":**
- Тип: List
- Значения: `fixed, percentage, tiered`

## 🐛 Troubleshooting

### Ошибка: "Permission denied"
- Убедитесь, что Service Account добавлен в "Share" таблицы
- Проверьте, что Google Sheets API включен

### Ошибка: "Invalid JSON"
- Проверьте формат JSON в колонках `settings_json`, `buyer_fee_value`, `condition_json`
- Используйте [JSONLint](https://jsonlint.com/) для валидации

### Синхронизация не работает
- Проверьте логи в Cloudflare Workers
- Убедитесь, что Cron Trigger настроен
- Проверьте переменные окружения

### Данные не обновляются
- Проверьте кеш (TTL 5 минут)
- Принудительно запустите синхронизацию
- Проверьте таблицу `sheets_cache` в D1

## 📚 Дополнительные ресурсы

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Service Account Guide](https://cloud.google.com/iam/docs/service-accounts)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/platform/cron-triggers/)

## 🔗 Шаблон таблицы

Готовый шаблон Google Sheets с правильной структурой:
https://docs.google.com/spreadsheets/d/TEMPLATE_ID/copy

(Создайте копию и начните использовать)


