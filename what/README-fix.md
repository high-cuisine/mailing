# Инструкция по исправлению ошибки ContainerConfig

## Проблема
Ошибка `KeyError: 'ContainerConfig'` возникает когда docker-compose не может прочитать конфигурацию старого контейнера.

## Решение 1: Использовать скрипт (рекомендуется)

```bash
cd ~/mailing/mailing/what
chmod +x fix-container.sh
./fix-container.sh
```

## Решение 2: Выполнить команды вручную

Выполните команды по порядку:

```bash
cd ~/mailing/mailing/what

# 1. Остановить и удалить контейнер напрямую через Docker
docker stop wa-ping-bot 2>/dev/null || true
docker rm -f wa-ping-bot 2>/dev/null || true

# 2. Удалить через docker-compose (может не сработать из-за ошибки)
docker-compose down 2>/dev/null || true

# 3. Удалить образ
docker rmi what_wa-bot:latest 2>/dev/null || true

# 4. Очистить неиспользуемые контейнеры
docker container prune -f

# 5. Пересобрать образ без кэша
docker-compose build --no-cache

# 6. Запустить контейнер
docker-compose up -d

# 7. Проверить логи
docker-compose logs -f
```

## Решение 3: Если проблема сохраняется

Если проблема все еще сохраняется, попробуйте изменить имя контейнера:

1. Временно измените `container_name` в `docker-compose.yml`:
   ```yaml
   container_name: wa-ping-bot-new
   ```

2. Выполните команды из Решения 2

3. После успешного запуска верните старое имя

## Решение 4: Полная очистка Docker

Если ничего не помогает, выполните полную очистку (ОСТОРОЖНО: удалит все неиспользуемые контейнеры и образы):

```bash
# Остановить все контейнеры
docker stop $(docker ps -aq) 2>/dev/null || true

# Удалить все контейнеры
docker rm $(docker ps -aq) 2>/dev/null || true

# Удалить все неиспользуемые образы
docker image prune -a -f

# Пересобрать
cd ~/mailing/mailing/what
docker-compose build --no-cache
docker-compose up -d
```

