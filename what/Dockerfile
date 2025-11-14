FROM node:20-bullseye-slim

# ВАЖНО: ставим git и openssh (некоторые пакеты тянут deps из GitHub)
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
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Сначала зависимости (лучше кэшируется)
COPY package.json ./
# Если есть lock-файл, добавьте:
# COPY package-lock.json ./
# RUN npm ci --omit=dev

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN npm i --omit=dev

# Затем код
COPY index.js ./

ENV NODE_ENV=production

EXPOSE 6800

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["npm","start"]
