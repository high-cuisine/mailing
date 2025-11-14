# Docker Setup для Sends

## Структура

- **Основной docker-compose.yml** - запускает sends-api и redis
- **telegram-bot/docker-compose.yml** - запускает Telegram бот отдельно
- **what/docker-compose.yml** - запускает WhatsApp бот отдельно

## Сервисы

### Основной compose (docker-compose.yml)
- **sends-api** (порт 3000) - NestJS API приложение
- **redis** (порт 6379) - Redis для хранения данных

### Отдельные compose
- **telegram-userbot** (порт 6801) - Telegram бот
- **wa-bot** (порт 6800) - WhatsApp бот

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Redis
REDIS_PASSWORD=your_redis_password

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Telegram
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_PHONE_NUMBER=your_phone_number
```

## Запуск

### 1. Запуск основного API и Redis

```bash
# Из корня проекта
docker-compose up -d

# Посмотреть логи
docker-compose logs -f sends-api

# Остановить
docker-compose down
```

### 2. Запуск Telegram бота

```bash
# Из директории telegram-bot
cd telegram-bot
docker-compose up -d

# Посмотреть логи
docker-compose logs -f

# Остановить
docker-compose down
```

### 3. Запуск WhatsApp бота

```bash
# Из директории what
cd what
docker-compose up -d

# Посмотреть логи
docker-compose logs -f

# Остановить
docker-compose down
```

## Сеть и подключения

- **sends-api** и **redis** находятся в сети `sends-network`
- **Telegram** и **WhatsApp** боты запускаются отдельно и обращаются к API через `host.docker.internal:3000`
- API обращается к ботам через `localhost:6801` (Telegram) и `localhost:6800` (WhatsApp)

## Volumes

- `redis-data` - данные Redis
- `./telegram-bot/data` - сессии Telegram
- `./what/auth` - авторизация WhatsApp
- `./what/store` - хранилище WhatsApp

