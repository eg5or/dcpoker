#!/bin/bash

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста, установите Docker перед запуском скрипта."
    exit 1
fi

# Проверка наличия docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Пожалуйста, установите Docker Compose перед запуском скрипта."
    exit 1
fi

# Проверка прав на запуск Docker (не от sudo)
docker info &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ У вас недостаточно прав для запуска Docker. Добавьте вашего пользователя в группу docker или используйте sudo."
    exit 1
fi

# Проверка наличия git и обновлений
if command -v git &> /dev/null; then
    echo "🔄 Проверка обновлений кода из git..."
    
    # Проверка, находимся ли мы в git-репозитории
    if git rev-parse --is-inside-work-tree &> /dev/null; then
        
        # Сохраняем текущую ветку
        CURRENT_BRANCH=$(git branch --show-current)
        echo "📌 Текущая ветка: $CURRENT_BRANCH"
        
        # Проверяем наличие удаленных изменений
        git fetch
        
        # Проверяем, есть ли разница между локальной и удаленной веткой
        if [ $(git rev-list HEAD...origin/$CURRENT_BRANCH --count) -ne 0 ]; then
            echo "🔔 Доступны обновления из удаленного репозитория."
            read -p "Хотите выполнить git pull для получения последних изменений? (y/n): " do_pull
            
            if [[ "$do_pull" == "y" || "$do_pull" == "Y" ]]; then
                echo "📥 Загрузка последних изменений..."
                git pull
                
                if [ $? -ne 0 ]; then
                    echo "❌ Возникла ошибка при получении обновлений. Проверьте ваш git-репозиторий."
                    exit 1
                fi
                
                echo "✅ Обновления успешно загружены."
            else
                echo "⏩ Пропускаем обновление из git."
            fi
        else
            echo "✅ Ваш код находится в актуальном состоянии."
        fi
    else
        echo "⚠️ Каталог не является git-репозиторием. Пропускаем проверку обновлений."
    fi
else
    echo "⚠️ Git не установлен. Пропускаем проверку обновлений."
fi

# Функция для создания резервной копии базы данных
create_mongodb_backup() {
    echo "📦 Создание резервной копии базы данных MongoDB..."
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/dcpoker_mongodb_backup_$(date +%Y%m%d_%H%M%S).tar"
    
    # Проверяем наличие контейнера MongoDB
    if [ $(docker ps -q -f name=dcpoker-mongodb | wc -l) -eq 1 ]; then
        # Создаем резервную копию данных из тома MongoDB
        docker run --rm --volumes-from dcpoker-mongodb -v $(pwd)/backups:/backup \
            ubuntu tar cvf /backup/dcpoker_mongodb_backup_$(date +%Y%m%d_%H%M%S).tar /data/db
        
        if [ $? -eq 0 ]; then
            echo "✅ Резервная копия создана успешно: $BACKUP_FILE"
        else
            echo "⚠️ Не удалось создать резервную копию базы данных. Продолжаем без бэкапа."
        fi
    else
        echo "⚠️ Контейнер MongoDB не запущен, пропускаем создание резервной копии."
    fi
}

# Запрос на создание резервной копии перед обновлением
if [ "$(docker ps -q -f name=dcpoker-mongodb)" ]; then
    read -p "Создать резервную копию базы данных перед обновлением? (y/n): " create_backup
    if [[ "$create_backup" == "y" || "$create_backup" == "Y" ]]; then
        create_mongodb_backup
    else
        echo "⏩ Пропускаем создание резервной копии."
    fi
fi

# Останавливаем и удаляем предыдущие контейнеры, если они есть
echo "🔄 Проверяем наличие существующих контейнеров..."
if [ "$(docker ps -aq -f name=dcpoker)" ]; then
    echo "🛑 Останавливаем существующие контейнеры..."
    docker-compose -f docker-compose.prod.yml down
fi

# Собираем и запускаем приложение в продакшен-режиме
echo "🔨 Собираем и запускаем контейнеры..."
docker-compose -f docker-compose.prod.yml up -d --build

# Проверка статуса запущенных контейнеров
echo "🔍 Проверяем статус контейнеров..."
docker ps -a | grep dcpoker

# Проверка запуска всех контейнеров
if [ $(docker ps -q -f name=dcpoker-mongodb | wc -l) -eq 0 ] || [ $(docker ps -q -f name=dcpoker-server | wc -l) -eq 0 ] || [ $(docker ps -q -f name=dcpoker-client | wc -l) -eq 0 ]; then
    echo "❌ Не все контейнеры запущены. Проверьте логи для выявления проблемы:"
    echo "docker logs dcpoker-client"
    echo "docker logs dcpoker-server"
    echo "docker logs dcpoker-mongodb"
    exit 1
fi

echo "✅ Приложение запущено!"
echo "✅ MongoDB данные сохраняются в именованном томе dcpoker_mongodb_data"
echo "✅ Клиент доступен на порту 80"
echo "✅ Сервер API доступен на порту 3001"
echo ""
echo "📝 Логи можно просмотреть командами:"
echo "docker logs dcpoker-client"
echo "docker logs dcpoker-server"
echo "docker logs dcpoker-mongodb" 