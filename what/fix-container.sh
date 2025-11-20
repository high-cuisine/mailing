#!/bin/bash
# Скрипт для исправления проблемы с контейнером
# Исправляет проблемы с кодировкой и пересобирает контейнер

set -e  # Остановка при ошибках

echo "Шаг 1: Останавливаем контейнер через docker-compose..."
docker-compose down --remove-orphans 2>/dev/null || true

echo "Шаг 2: Останавливаем контейнер напрямую через Docker (на случай если docker-compose не сработал)..."
docker stop wa-ping-bot-v2 wa-ping-bot 2>/dev/null || echo "Контейнеры не запущены"

echo "Шаг 3: Удаляем контейнер напрямую через Docker..."
docker rm -f wa-ping-bot-v2 wa-ping-bot 2>/dev/null || echo "Контейнеры не существуют"

echo "Шаг 4: Удаляем старые образы..."
docker rmi what_wa-bot:latest 2>/dev/null || echo "Образ не найден"
docker images | grep "what" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

echo "Шаг 5: Очищаем неиспользуемые контейнеры..."
docker container prune -f

echo "Шаг 6: Очищаем неиспользуемые образы..."
docker image prune -f

echo "Шаг 7: Пересобираем образ без кэша (с новыми настройками кодировки)..."
docker-compose build --no-cache --pull

echo "Шаг 8: Запускаем контейнер..."
docker-compose up -d

echo "Шаг 9: Проверяем статус..."
docker-compose ps

echo "Шаг 10: Показываем логи (последние 50 строк)..."
echo "Примечание: Если видите кракозябры, убедитесь что терминал использует UTF-8"
docker-compose logs --tail=50

echo ""
echo "✅ Исправление завершено!"
echo "Если проблема с кодировкой сохраняется, проверьте настройки терминала:"
echo "  export LANG=en_US.UTF-8"
echo "  export LC_ALL=en_US.UTF-8"

