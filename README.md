# DC Poker - Scrum Planning Poker

Приложение для проведения Scrum Planning Poker сессий с веселым твистом 💩

## Запуск

### Требования

- Docker
- Docker Compose

### Установка и запуск

1. Клонируйте репозиторий:

```bash
git clone https://github.com/your-username/dcpoker.git
cd dcpoker
```

2. Запустите приложение:

```bash
docker-compose up -d
```

3. Откройте браузер и перейдите по адресу:

```
http://localhost
```

### Остановка

```bash
docker-compose down
```

## Разработка

Для локальной разработки:

1. Запустите сервер:

```bash
cd server
npm install
npm run dev
```

2. Запустите клиент:

```bash
cd client
npm install
npm run dev
```

## Использование

1. Откройте http://localhost:5173 в браузере
2. Введите своё имя
3. Выберите карту с оценкой
4. Нажмите "Показать карты" чтобы увидеть оценки всех участников
5. Нажмите "Сбросить" для новой оценки

## Технологии

- React
- TypeScript
- Socket.IO
- Tailwind CSS
- Vite
