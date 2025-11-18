# 🚀 Настройка GitHub и Cloudflare Pages Deployment

## Шаг 1: Создание GitHub репозитория

### Вариант A: Через веб-интерфейс (рекомендуется)

1. **Откройте:** https://github.com/new
2. **Заполните форму:**
   - Repository name: `bocalc`
   - Description: `BOCalc - Car Shipping Calculator for Ukraine`
   - Visibility: `Public` (для бесплатного Cloudflare Pages)
   - ❌ **НЕ** инициализируйте с README, .gitignore или лицензией
3. **Нажмите:** "Create repository"

### Вариант B: Использовать существующий репозиторий

Если хотите использовать https://github.com/zaaatakyrylo-rgb/feed:
1. Откройте: https://github.com/zaaatakyrylo-rgb/feed/settings
2. Scroll down → "Danger Zone"
3. Нажмите "Unarchive this repository"
4. Или создайте новый репозиторий с другим именем

---

## Шаг 2: Подключение локального проекта к GitHub

После создания репозитория, выполните эти команды:

```bash
cd /Users/kirillza/Documents/BOCalc

# Добавить GitHub remote (замените URL на ваш)
git remote add origin https://github.com/zaaatakyrylo-rgb/bocalc.git

# Или если используете feed:
# git remote add origin https://github.com/zaaatakyrylo-rgb/feed.git

# Проверить remote
git remote -v

# Запушить код
git push -u origin main
```

### Если возникнет ошибка авторизации:

GitHub может потребовать Personal Access Token (PAT) вместо пароля:

1. Откройте: https://github.com/settings/tokens
2. Generate new token (classic)
3. Выберите scopes: `repo` (полный доступ к репозиториям)
4. Скопируйте токен
5. При push используйте токен как пароль

**Или настройте SSH:**
```bash
# Если у вас есть SSH ключ
git remote set-url origin git@github.com:zaaatakyrylo-rgb/bocalc.git
git push -u origin main
```

---

## Шаг 3: Настройка Cloudflare Pages

### 3.1 Подключить GitHub к Cloudflare

1. **Откройте Cloudflare Dashboard:** https://dash.cloudflare.com
2. **Перейдите в Pages:** Workers & Pages → Pages
3. **Найдите проект `bocalc`** в списке
4. **Нажмите на проект** → Settings
5. **Build & deployments** → Builds
6. **Нажмите "Connect to Git"**

### 3.2 Настроить интеграцию с GitHub

1. **GitHub Integration:**
   - Нажмите "Connect GitHub"
   - Авторизуйте Cloudflare в GitHub
   - Выберите репозиторий: `zaaatakyrylo-rgb/bocalc`

2. **Build Configuration:**
   ```
   Framework preset: Next.js
   Build command: npm run build
   Build output directory: .next
   Root directory: /
   ```

3. **Environment Variables:**
   ```
   NODE_VERSION = 18
   NEXT_PUBLIC_API_URL = https://bocalc-api.zaaatakyrylo.workers.dev
   ```

4. **Branch Configuration:**
   - Production branch: `main`
   - Preview branches: Enable (опционально)

5. **Нажмите "Save and Deploy"**

---

## Шаг 4: Автоматический деплой

После настройки:
- ✅ Каждый `git push` в ветку `main` автоматически задеплоит на production
- ✅ Pull requests создадут preview deployments
- ✅ Cloudflare автоматически соберет Next.js приложение
- ✅ SSR и Server Actions будут работать

---

## Быстрая команда для настройки

Скопируйте и выполните:

```bash
cd /Users/kirillza/Documents/BOCalc

# Добавить .gitignore
git add .gitignore GITHUB_SETUP.md
git commit -m "chore: Add .gitignore and GitHub setup guide"

# После создания репозитория на GitHub:
git remote add origin https://github.com/zaaatakyrylo-rgb/bocalc.git
git push -u origin main
```

---

## Альтернатива: Прямой деплой без GitHub

Если не хотите использовать GitHub, можно деплоить напрямую:

```bash
cd /Users/kirillza/Documents/BOCalc

# Соберите проект
npm run build

# Деплой через wrangler (только статика, без SSR)
npx wrangler pages deploy .next/static --project-name=bocalc
```

**Но:** Этот способ не поддерживает SSR и Server Actions!

---

## Проверка после деплоя

1. **Frontend:** https://bocalc.pages.dev
2. **Backend API:** https://bocalc-api.zaaatakyrylo.workers.dev
3. **Админ-панель:** https://bocalc.pages.dev/law-rates (после логина)

---

## Troubleshooting

### Ошибка: "Repository not found"
- Проверьте, что репозиторий создан
- Проверьте правильность URL
- Проверьте права доступа

### Ошибка: "Authentication failed"
- Используйте Personal Access Token вместо пароля
- Или настройте SSH ключ

### Ошибка при билде на Cloudflare
- Проверьте `package.json` - все зависимости должны быть в dependencies
- Проверьте Node version (должна быть 18)
- Проверьте build command

---

## Следующие шаги после деплоя

1. **Создайте admin пользователя:**
```bash
curl -X POST https://bocalc-api.zaaatakyrylo.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bocalc.com",
    "password": "your-secure-password",
    "name": "Admin User",
    "role": "admin"
  }'
```

2. **Залогиньтесь:** https://bocalc.pages.dev/login

3. **Настройте законодательные переменные:** https://bocalc.pages.dev/law-rates

---

**Готово!** 🎉 Ваш проект будет автоматически деплоиться при каждом push.

