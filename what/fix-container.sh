#!/bin/bash
# Скрипт для исправления проблемы с контейнером

echo "Останавливаем и удаляем старый контейнер..."
docker-compose down

echo "Удаляем старый образ..."
docker rmi what_wa-bot:latest 2>/dev/null || true
docker rmi wa-ping-bot 2>/dev/null || true

echo "Очищаем неиспользуемые образы..."
docker image prune -f

echo "Пересобираем и запускаем контейнер..."
docker-compose up --build -d

echo "Проверяем логи..."
docker-compose logs -f

