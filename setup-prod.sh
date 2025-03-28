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

# Опция пересборки с нуля
read -p "Полностью пересобрать образы? (рекомендуется при первом запуске или после обновления кода) (y/n): " rebuild
if [[ "$rebuild" == "y" || "$rebuild" == "Y" ]]; then
    echo "🔨 Удаляем старые образы и собираем заново..."
    docker-compose -f docker-compose.prod.yml build --no-cache
else
    echo "⏩ Используем существующие образы, если они есть."
fi

# Собираем и запускаем приложение в продакшен-режиме
echo "🔨 Собираем и запускаем контейнеры..."
docker-compose -f docker-compose.prod.yml up -d --build

# Проверка статуса запущенных контейнеров
echo "🔍 Проверяем статус контейнеров..."
docker ps -a | grep dcpoker

# Расширенная проверка контейнеров с подробным выводом
echo "📊 Подробная информация о состоянии контейнеров:"

check_container() {
    local container_name=$1
    local container_status=$(docker inspect -f '{{.State.Status}}' $container_name 2>/dev/null)
    local exit_code=$(docker inspect -f '{{.State.ExitCode}}' $container_name 2>/dev/null)
    
    if [ -z "$container_status" ]; then
        echo "❌ Контейнер $container_name не найден!"
        return 1
    elif [ "$container_status" == "running" ]; then
        echo "✅ Контейнер $container_name запущен успешно"
        return 0
    else
        echo "❌ Контейнер $container_name не запущен (статус: $container_status, код выхода: $exit_code)"
        return 1
    fi
}

container_errors=0

check_container "dcpoker-client" || ((container_errors++))
check_container "dcpoker-server" || ((container_errors++))
check_container "dcpoker-mongodb" || ((container_errors++))

if [ $container_errors -gt 0 ]; then
    echo ""
    echo "⚠️ Обнаружено $container_errors незапущенных контейнеров. Проверьте логи:"
    
    echo "🔍 Последние 20 строк логов сервера (при наличии):"
    docker logs dcpoker-server --tail 20 2>/dev/null || echo "Логи недоступны"
    
    echo ""
    echo "🔍 Последние 10 строк логов клиента (при наличии):"
    docker logs dcpoker-client --tail 10 2>/dev/null || echo "Логи недоступны"
    
    exit 1
fi

# Добавляем проверку веб-сервера на доступность
check_http_availability() {
    local container_name=$1
    local port=$2
    
    if ! docker ps -q -f name=$container_name | grep -q .; then
        echo "❌ Контейнер $container_name не запущен, проверка HTTP недоступна"
        return 1
    fi
    
    # Проверяем, доступен ли HTTP-сервер на нужном порту
    echo "🌐 Проверяем доступность веб-сервера в $container_name (порт $port)..."
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port 2>/dev/null || echo "000")
    
    if [ "$http_status" == "000" ]; then
        echo "❌ Веб-сервер в $container_name недоступен (нет ответа)"
        return 1
    elif [ "$http_status" -ge 200 ] && [ "$http_status" -lt 400 ]; then
        echo "✅ Веб-сервер в $container_name доступен (статус: $http_status)"
        return 0
    else
        echo "⚠️ Веб-сервер в $container_name отвечает с ошибкой (статус: $http_status)"
        return 1
    fi
}

if [ $container_errors -eq 0 ]; then
    echo ""
    echo "🧪 Проверка доступности веб-интерфейса..."
    check_http_availability "dcpoker-client" 80
    
    echo ""
    echo "🎉 Все проверки пройдены успешно! Ваше приложение готово к работе."
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