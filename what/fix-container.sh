#!/bin/bash
# Скрипт для исправления проблемы с контейнером

echo "Шаг 1: Останавливаем контейнер напрямую через Docker..."
docker stop wa-ping-bot 2>/dev/null || echo "Контейнер не запущен"

echo "Шаг 2: Удаляем контейнер напрямую через Docker..."
docker rm -f wa-ping-bot 2>/dev/null || echo "Контейнер не существует"

echo "Шаг 3: Останавливаем через docker-compose (на случай если есть другие сервисы)..."
docker-compose down 2>/dev/null || true

echo "Шаг 4: Удаляем старый образ..."
docker rmi what_wa-bot:latest 2>/dev/null || echo "Образ не найден"

echo "Шаг 5: Очищаем неиспользуемые контейнеры..."
docker container prune -f

echo "Шаг 6: Пересобираем образ без кэша..."
docker-compose build --no-cache

echo "Шаг 7: Запускаем контейнер..."
docker-compose up -d

echo "Шаг 8: Проверяем статус..."
docker-compose ps

echo "Шаг 9: Показываем логи (последние 50 строк)..."
docker-compose logs --tail=50

