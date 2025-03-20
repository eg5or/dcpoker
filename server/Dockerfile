FROM node:18-alpine

WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем все зависимости, включая devDependencies
RUN npm install

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Очищаем devDependencies и кэш
RUN npm prune --production && npm cache clean --force

EXPOSE 3001

# Используем node напрямую вместо npm start
CMD ["node", "dist/index.js"] 