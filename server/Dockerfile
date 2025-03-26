FROM node:18-alpine

# Установка зависимостей для сборки
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем все зависимости, включая devDependencies
RUN npm install

# Копируем исходный код
COPY . .

# Создаем .env файл с правильными настройками
RUN echo "PORT=3001" > .env \
    && echo "MONGODB_URI=mongodb://mongodb:27017/dcpoker" >> .env \
    && echo "JWT_SECRET=supersecret_jwt_key_change_in_production" >> .env \
    && echo "JWT_EXPIRES_IN=7d" >> .env

# Собираем приложение
RUN npm run build

# Очищаем devDependencies для уменьшения размера
RUN npm prune --production && npm cache clean --force

# Экспонируем порт
EXPOSE 3001

# Используем node для запуска
CMD ["node", "dist/index.js"] 