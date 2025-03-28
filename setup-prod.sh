#!/bin/bash

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

echo "✅ Приложение запущено!"
echo "✅ MongoDB данные сохраняются в именованном томе dcpoker_mongodb_data"
echo "✅ Клиент доступен на порту 80"
echo "✅ Сервер API доступен на порту 3001"
echo ""
echo "📝 Логи можно просмотреть командами:"
echo "docker logs dcpoker-client"
echo "docker logs dcpoker-server"
echo "docker logs dcpoker-mongodb" 