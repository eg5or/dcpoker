FROM node:18-alpine

WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости и очищаем кэш npm
RUN npm install && npm cache clean --force

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Очищаем devDependencies
RUN npm prune --production

EXPOSE 3001

# Используем node напрямую вместо npm start
CMD ["node", "dist/index.js"] 