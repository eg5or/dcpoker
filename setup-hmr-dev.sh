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
    docker-compose -f docker-compose.dev.yml down
fi

# Запускаем MongoDB и серверную часть с пересборкой
echo "🔨 Пересобираем и запускаем контейнеры..."
docker-compose -f docker-compose.dev.yml up -d --build

# Проверка статуса запущенных контейнеров
echo "🔍 Проверяем статус контейнеров..."
docker ps -a | grep dcpoker

# Создаем файл .env.development.local для клиента с правильными настройками Vite
echo "🔧 Настраиваем клиентскую часть для разработки..."
cat > client/.env.development.local << EOL
# Адрес API для разработки - оставляем пустым, т.к. проксирование настроено в vite.config.ts
VITE_API_URL=
EOL

echo "✅ Настройка завершена! Теперь запустите клиентскую часть локально:"
echo "cd client && npm run dev"
echo ""
echo "📝 Клиент будет доступен на http://localhost:5173"
echo "📝 API сервер доступен на http://localhost:3001"
echo "📝 Для просмотра логов сервера: docker logs -f dcpoker-server" 