#!/bin/bash

# Останавливаем и удаляем все контейнеры
echo "🛑 Останавливаем и удаляем все контейнеры..."
docker-compose -f docker-compose.dev.yml down

# Удаляем все образы, связанные с проектом
echo "🧹 Удаляем образы..."
docker rmi dcpoker-server:latest || true

# Перестраиваем образы и запускаем контейнеры
echo "🔨 Пересобираем и запускаем контейнеры..."
docker-compose -f docker-compose.dev.yml up -d --build

# Проверка статуса запущенных контейнеров
echo "🔍 Проверяем статус контейнеров..."
docker ps -a | grep dcpoker

echo "📝 Для просмотра логов сервера используйте:"
echo "docker logs -f dcpoker-server"

echo "📝 Теперь запустите клиентскую часть локально:"
echo "cd client && npm run dev" 