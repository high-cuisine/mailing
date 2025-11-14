FROM node:20-alpine AS builder

WORKDIR /app

# Устанавливаем зависимости для сборки нативных модулей
RUN apk add --no-cache python3 make g++

# Копируем файлы зависимостей
COPY package*.json ./
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production образ
FROM node:20-alpine

WORKDIR /app

# Устанавливаем зависимости для сборки нативных модулей
RUN apk add --no-cache python3 make g++

# Копируем package.json и устанавливаем только production зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Копируем собранное приложение
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]

