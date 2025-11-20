FROM node:20-bullseye-slim

# ВАЖНО: ставим git и openssh (некоторые пакеты тянут deps из GitHub)
# Также устанавливаем локали для корректного отображения UTF-8
RUN apt-get update && apt-get install -y --no-install-recommends \
  git \
  openssh-client \
  ca-certificates \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  xdg-utils \
  tini \
  locales \
  && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
  && locale-gen en_US.UTF-8 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Сначала зависимости (лучше кэшируется)
COPY package.json ./
# Если есть lock-файл, добавьте:
# COPY package-lock.json ./
# RUN npm ci --omit=dev

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Устанавливаем UTF-8 кодировку для корректного отображения кириллицы
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8
ENV LANGUAGE=en_US:en

RUN npm i --omit=dev

# Затем код
COPY index.js ./

ENV NODE_ENV=production

EXPOSE 6800

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["npm","start"]
