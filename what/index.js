const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

const TARGET_CHAT = '79173245220@c.us';
const STARTUP_MESSAGE = 'Бот запущен и готов к работе.';
/**
 * Сохраняем сессию в ./data, которая примонтирована как volume.
 * Это гарантирует, что после перезапуска контейнера QR повторно сканировать не придётся.
 */
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './data',
    clientId: 'default'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--user-data-dir=/tmp/chrome-user-data-' + Date.now(),
      '--profile-directory=Default',
      '--single-process',
      '--disable-background-networking',
      '--disable-background-sync',
      '--disable-client-side-phishing-detection',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--no-default-browser-check',
      '--safebrowsing-disable-auto-update',
      '--enable-automation',
      '--password-store=basic',
      '--use-mock-keychain'
    ]
  }
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('QR-код сгенерирован. Откройте WhatsApp → Связанные устройства → Сканировать QR.');
});

client.on('ready', async () => {
  console.log('Клиент готов и подключён.');
  try {
    await client.sendMessage(TARGET_CHAT, STARTUP_MESSAGE);
    console.log('Стартовое сообщение отправлено.');
  } catch (err) {
    console.error('Не удалось отправить стартовое сообщение:', err);
  }
});

client.on('authenticated', () => {
  console.log('Аутентификация прошла успешно.');
});

client.on('auth_failure', (m) => {
  console.error('Сбой аутентификации:', m);
});

client.on('disconnected', (reason) => {
  console.error('Отключено:', reason);
  // Чтобы контейнер перезапустился docker-compose’ом
  process.exit(1);
});

// Обработка входящих сообщений и отправка на эндпоинт NestJS
client.on('message', async (msg) => {
  console.log(`Сообщение от ${msg.from}: ${msg.body}`);
  
  // Игнорируем сообщения от себя и служебные сообщения
  if (msg.from === 'status@broadcast' || msg.isGroupMsg) {
    return;
  }

  // Извлекаем номер телефона из формата "79173245220@c.us"
  const phoneNumber = msg.from.replace('@c.us', '');
  
  try {
    // Отправляем сообщение на эндпоинт NestJS
    const apiHost = process.env.API_HOST || 'http://host.docker.internal:3000';
    const response = await fetch(`${apiHost}/mailing/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'whatsapp',
        number: phoneNumber,
        message: msg.body
      })
    });

    if (!response.ok) {
      console.error(`Ошибка при отправке сообщения на эндпоинт: ${response.status} ${response.statusText}`);
    } else {
      console.log(`Сообщение от ${phoneNumber} успешно отправлено на эндпоинт`);
    }
  } catch (error) {
    console.error('Ошибка при отправке сообщения на эндпоинт:', error);
  }
});

process.on('SIGINT', async () => {
  console.log('Завершаем работу...');
  try { await client.destroy(); } catch {}
  process.exit(0);
});

client.initialize().catch((err) => {
  console.error('Ошибка инициализации:', err);
  process.exit(1);
});

function toWhatsAppId(rawPhone) {
  if (!rawPhone) {
    return null;
  }
  const trimmed = String(rawPhone).trim();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  return `${digits}@c.us`;
}

app.post('/send-message', async (req, res) => {
  if(!req.body.message || !req.body.phone) {
    return res.status(400).send('Message and phone are required');
  }
  
  // Проверяем, что клиент готов
  if (!client.info) {
    return res.status(503).send('WhatsApp client is not ready');
  }

  try {
    const waId = toWhatsAppId(req.body.phone);
    if (!waId) {
      return res.status(400).send('Invalid phone number format');
    }

    const isRegistered = await client.isRegisteredUser(waId);
    if (!isRegistered) {
      return res.status(404).send('Phone is not registered in WhatsApp');
    }
    
    await client.sendMessage(waId, req.body.message);
    res.send('Message sent');
  } catch (err) {
    console.error('Не удалось отправить сообщение:', err);
    res.status(500).send('Error sending message');
  }
});

app.listen(6800, () => {
  console.log('Server is running on port 6800');
});



