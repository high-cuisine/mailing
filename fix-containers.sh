#!/bin/bash
# Скрипт для исправления проблемы с контейнерами в основном docker-compose.yml

echo "Шаг 1: Останавливаем контейнеры напрямую через Docker..."
docker stop sends-api sends-redis 2>/dev/null || echo "Контейнеры не запущены"

echo "Шаг 2: Удаляем контейнеры напрямую через Docker..."
docker rm -f sends-api sends-redis 2>/dev/null || echo "Контейнеры не существуют"

echo "Шаг 3: Останавливаем через docker-compose..."
docker-compose down 2>/dev/null || true

echo "Шаг 4: Удаляем старые образы..."
docker rmi sends-api sends_sends-api 2>/dev/null || echo "Образы не найдены"

echo "Шаг 5: Очищаем неиспользуемые контейнеры..."
docker container prune -f

echo "Шаг 6: Пересобираем образы..."
docker-compose build --no-cache

echo "Шаг 7: Запускаем контейнеры..."
docker-compose up -d

echo "Шаг 8: Проверяем статус..."
docker-compose ps

echo "Шаг 9: Показываем логи (последние 50 строк)..."
docker-compose logs --tail=50

