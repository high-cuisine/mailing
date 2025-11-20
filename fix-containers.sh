#!/bin/bash
# Скрипт для исправления проблемы с контейнерами в основном docker-compose.yml
# Исправляет ошибку KeyError: 'ContainerConfig'

set -e  # Остановка при ошибках

echo "Шаг 1: Останавливаем все контейнеры проекта через docker-compose..."
docker-compose down --remove-orphans 2>/dev/null || true

echo "Шаг 2: Останавливаем контейнеры напрямую через Docker (на случай если docker-compose не сработал)..."
docker stop sends-api-v2 sends-redis sends-api sends-redis 2>/dev/null || echo "Контейнеры не запущены"

echo "Шаг 3: Удаляем все контейнеры проекта напрямую через Docker..."
docker rm -f sends-api-v2 sends-redis sends-api sends-redis 2>/dev/null || echo "Контейнеры не существуют"

echo "Шаг 4: Удаляем все контейнеры, связанные с проектом (по имени образа)..."
docker ps -a --filter "ancestor=sends_sends-api" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=sends" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true

echo "Шаг 5: Удаляем старые образы проекта..."
docker rmi sends_sends-api:latest sends-api:latest 2>/dev/null || echo "Образы не найдены"
docker images | grep "sends" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

echo "Шаг 6: Очищаем неиспользуемые контейнеры..."
docker container prune -f

echo "Шаг 7: Очищаем неиспользуемые образы..."
docker image prune -f

echo "Шаг 8: Пересобираем образы без кэша..."
docker-compose build --no-cache --pull

echo "Шаг 9: Запускаем контейнеры..."
docker-compose up -d

echo "Шаг 10: Проверяем статус..."
docker-compose ps

echo "Шаг 11: Показываем логи (последние 50 строк)..."
docker-compose logs --tail=50

echo ""
echo "✅ Исправление завершено!"

