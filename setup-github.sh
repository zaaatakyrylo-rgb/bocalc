#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   🚀 BOCalc GitHub Setup Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Проверка текущей директории
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Ошибка: Запустите скрипт из корневой директории BOCalc${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Шаг 1: Настройка Git remote${NC}"
echo ""

# Проверка существующих remote
if git remote get-url origin > /dev/null 2>&1; then
    current_url=$(git remote get-url origin)
    echo -e "${YELLOW}⚠️  Remote 'origin' уже существует: ${current_url}${NC}"
    echo -e "Хотите заменить его? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        git remote remove origin
        echo -e "${GREEN}✓ Старый remote удален${NC}"
    else
        echo -e "${BLUE}→ Оставляем существующий remote${NC}"
    fi
fi

# Добавление нового remote
if ! git remote get-url origin > /dev/null 2>&1; then
    echo ""
    echo -e "${BLUE}Выберите опцию:${NC}"
    echo "1) Создать новый репозиторий: bocalc"
    echo "2) Использовать существующий: feed (разархивировать)"
    echo "3) Ввести custom URL"
    echo ""
    read -p "Ваш выбор (1-3): " choice

    case $choice in
        1)
            repo_url="https://github.com/zaaatakyrylo-rgb/bocalc.git"
            echo -e "${BLUE}→ Будет использован: ${repo_url}${NC}"
            ;;
        2)
            repo_url="https://github.com/zaaatakyrylo-rgb/feed.git"
            echo -e "${YELLOW}⚠️  Не забудьте разархивировать репозиторий на GitHub!${NC}"
            ;;
        3)
            read -p "Введите URL репозитория: " repo_url
            ;;
        *)
            echo -e "${RED}❌ Неверный выбор${NC}"
            exit 1
            ;;
    esac

    git remote add origin "$repo_url"
    echo -e "${GREEN}✓ Remote добавлен: ${repo_url}${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Шаг 2: Информация о коммитах${NC}"
echo ""
git log --oneline -5
echo ""

echo -e "${YELLOW}📋 Шаг 3: Проверка статуса${NC}"
echo ""
git status
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   Готово к Push!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}⚠️  ВАЖНО: Перед push убедитесь что репозиторий создан на GitHub!${NC}"
echo ""
echo -e "${BLUE}Для создания репозитория:${NC}"
echo "1. Откройте: https://github.com/new"
echo "2. Repository name: bocalc (или feed для существующего)"
echo "3. Visibility: Public"
echo "4. ❌ НЕ инициализируйте с README"
echo "5. Create repository"
echo ""
echo -e "${BLUE}Для разархивирования feed:${NC}"
echo "1. Откройте: https://github.com/zaaatakyrylo-rgb/feed/settings"
echo "2. Scroll to 'Danger Zone'"
echo "3. Click 'Unarchive this repository'"
echo ""
echo -e "${GREEN}После создания репозитория выполните:${NC}"
echo -e "${YELLOW}git push -u origin main${NC}"
echo ""

# Спрашиваем хотим ли мы запушить сейчас
echo -e "Хотите запушить код СЕЙЧАС? (y/n)"
read -r push_now

if [[ "$push_now" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}→ Пушу код на GitHub...${NC}"
    if git push -u origin main; then
        echo ""
        echo -e "${GREEN}✓✓✓ Успех! Код загружен на GitHub! ✓✓✓${NC}"
        echo ""
        repo_url=$(git remote get-url origin)
        repo_web=${repo_url%.git}
        echo -e "${BLUE}Откройте: ${repo_web}${NC}"
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}   Следующий шаг: Настройка Cloudflare Pages${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "1. Откройте: https://dash.cloudflare.com"
        echo "2. Pages → bocalc → Settings"
        echo "3. Build & deployments → Connect to Git"
        echo "4. Выберите репозиторий: zaaatakyrylo-rgb/bocalc (или feed)"
        echo "5. Framework: Next.js"
        echo "6. Build command: npm run build"
        echo "7. Build output: .next"
        echo "8. Environment variable: NODE_VERSION = 18"
        echo "9. Save and Deploy"
        echo ""
        echo -e "${GREEN}🎉 После настройки ваш сайт будет автоматически деплоиться!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Ошибка при push${NC}"
        echo ""
        echo -e "${YELLOW}Возможные причины:${NC}"
        echo "• Репозиторий не создан на GitHub"
        echo "• Нет прав доступа (нужен Personal Access Token)"
        echo "• Неверный URL репозитория"
        echo ""
        echo -e "${BLUE}Для создания Personal Access Token:${NC}"
        echo "1. https://github.com/settings/tokens"
        echo "2. Generate new token (classic)"
        echo "3. Select scopes: repo (full control)"
        echo "4. При push используйте токен как пароль"
        echo ""
        echo -e "${BLUE}Или настройте SSH:${NC}"
        echo "git remote set-url origin git@github.com:zaaatakyrylo-rgb/bocalc.git"
        echo "git push -u origin main"
    fi
else
    echo ""
    echo -e "${BLUE}→ Push отменен${NC}"
    echo -e "${YELLOW}Выполните вручную когда будете готовы:${NC}"
    echo -e "${GREEN}git push -u origin main${NC}"
fi

echo ""

