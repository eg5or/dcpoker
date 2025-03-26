#!/bin/bash

# Экспортируем переменные окружения из .env файла
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ Переменные окружения загружены из .env файла"
else
  echo "❌ Файл .env не найден, используются значения по умолчанию"
fi

# Останавливаем и удаляем предыдущие контейнеры, если они есть
echo "🔄 Проверяем наличие существующих контейнеров..."
if [ "$(docker ps -aq -f name=dcpoker)" ]; then
    echo "🛑 Останавливаем существующие контейнеры..."
    docker-compose down
fi

# Запускаем сервисы с восстановлением базы данных
echo "🔨 Запускаем контейнеры..."
docker-compose up -d

# Проверка статуса запущенных контейнеров
echo "🔍 Проверяем статус контейнеров..."
docker ps -a | grep dcpoker

echo "✅ Приложение запущено в режиме разработки!"
echo "✅ MongoDB данные сохраняются в именованном томе dcpoker_mongodb_data"
echo "✅ Клиент доступен на порту 80"
echo ""
echo "📝 Логи можно просмотреть командами:"
echo "docker logs dcpoker-client"
echo "docker logs dcpoker-server"
echo "docker logs dcpoker-mongodb" 