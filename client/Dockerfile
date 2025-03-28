# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./
RUN npm install

# Копирование кода приложения
COPY . .

# Создаем .env.production с переменными для сборки
RUN echo "VITE_API_URL=http://eg5or.ru/api" > .env.production \
    && echo "VITE_SOCKET_URL=http://eg5or.ru" >> .env.production \
    && cat .env.production

# Сборка приложения с использованием переменных окружения из .env.production
RUN npm run build

# Production stage с Nginx
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Установка прав
RUN chmod -R 755 /usr/share/nginx/html

# Экспонирование порта
EXPOSE 80

# Запуск Nginx
CMD ["nginx", "-g", "daemon off;"] 