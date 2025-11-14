import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram/tl/index.js';
import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let activeClient = null;

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return answer.trim();
}

async function promptWithDefault(question, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = await prompt(`${question}${suffix}: `);
  return answer || defaultValue || '';
}

async function promptRequired(question, defaultValue) {
  while (true) {
    const value = await promptWithDefault(question, defaultValue);
    if (value && value.trim().length > 0) {
      return value.trim();
    }
    console.log('Значение не может быть пустым. Попробуйте снова.');
  }
}

async function promptInteger(question, defaultValue) {
  while (true) {
    const value = await promptWithDefault(question, defaultValue);
    if (!value || value.trim().length === 0) {
      console.log('Значение не может быть пустым. Попробуйте снова.');
      continue;
    }
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
    console.log('Введите корректное целое число.');
  }
}

async function ensureSession({ apiId, apiHash, phoneNumber, sessionFilePath }) {
  if (fs.existsSync(sessionFilePath)) {
    const storedSession = fs.readFileSync(sessionFilePath, 'utf8').trim();
    if (storedSession.length > 0) {
      return storedSession;
    }
  }

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  activeClient = client;

  try {
    const sentCode = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber,
        apiId,
        apiHash,
        settings: new Api.CodeSettings({
          allowFlashcall: true,
          currentNumber: true,
          allowAppHash: true,
        }),
      }),
    );

    if (!(sentCode instanceof Api.auth.SentCode)) {
      throw new Error('Unexpected response from Telegram when requesting the code.');
    }

    const code = await prompt('Введите код, полученный в Telegram: ');

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash: sentCode.phoneCodeHash,
          phoneCode: code,
        }),
      );
    } catch (error) {
      if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        const password = await prompt('Введите пароль двухфакторной аутентификации: ');
        await client.invoke(
          new Api.auth.CheckPassword({
            password: Buffer.from(password),
          }),
        );
      } else {
        throw error;
      }
    }

    const session = client.session.save();
    fs.writeFileSync(sessionFilePath, session, 'utf8');
    return session;
  } finally {
    await client.disconnect();
  }
}

async function initTelegramClient() {
  const apiId = process.env.TELEGRAM_API_ID 
    ? Number(process.env.TELEGRAM_API_ID)
    : await promptInteger('Введите TELEGRAM_API_ID', process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH
    ? process.env.TELEGRAM_API_HASH
    : await promptRequired('Введите TELEGRAM_API_HASH', process.env.TELEGRAM_API_HASH);
  const phoneNumber = process.env.TELEGRAM_PHONE_NUMBER
    ? process.env.TELEGRAM_PHONE_NUMBER
    : await promptRequired('Введите TELEGRAM_PHONE_NUMBER', process.env.TELEGRAM_PHONE_NUMBER);

  const sessionFilePath = process.env.TELEGRAM_SESSION_FILE
    ? path.resolve(process.env.TELEGRAM_SESSION_FILE)
    : path.resolve(__dirname, '../data/session.txt');

  const sessionString = await ensureSession({
    apiId,
    apiHash,
    phoneNumber,
    sessionFilePath,
  });

  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
    autoReconnect: true,
  });

  await client.connect();
  activeClient = client;

  console.log('Telegram client connected successfully');
  
  // Обработчик входящих сообщений
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.text) {
      return;
    }

    // Получаем информацию о пользователе
    const sender = await message.getSender();
    if (!sender || !sender.phone) {
      return;
    }

    const phoneNumber = sender.phone.replace(/[^0-9]/g, '');
    const messageText = message.text;

    console.log(`Сообщение от ${phoneNumber}: ${messageText}`);

    try {
      // Отправляем сообщение на эндпоинт NestJS
      const apiHost = process.env.API_HOST || 'http://host.docker.internal:3000';
      const response = await fetch(`${apiHost}/mailing/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'telegram',
          number: phoneNumber,
          message: messageText
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
  }, new Api.UpdateNewMessage());
  
  // Запускаем loop в фоне
  loop().catch((error) => {
    console.error('Error in message loop:', error);
  });
}

// Инициализируем Telegram клиент асинхронно, не блокируя сервер
if (process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH && process.env.TELEGRAM_PHONE_NUMBER) {
  initTelegramClient().catch((error) => {
    console.error('Ошибка при инициализации Telegram клиента:', error);
  });
}

//const Map = new Map();

const messages = []

app.get('/status', (req, res) => {
  res.json({
    clientConnected: activeClient !== null,
    queueLength: messages.length
  });
});

app.post('/send-message', async (req, res) => {
  const { message, phone } = req.body;

  if (!message || !phone) {
    return res.status(400).json({ error: 'message and phone are required' });
  }

  try {
    messages.push({
      message,
      phone
    });
    console.log(`Message added to queue: phone=${phone}, message=${message}`);
    res.status(200).json({ success: true, message: 'Message added to queue' });
  } catch (error) {
    console.error('Error adding message to queue:', error);
    res.status(500).json({ error: 'Error adding message to queue' });
  }
});

async function loop(providedClient = activeClient) {
  if (!providedClient) {
    throw new Error('Telegram client is not initialized');
  }

  while (true) {
   
    if(messages.length < 1) {
      await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
      continue;
    }
    const { phone, message } = messages.shift();

    if(!phone || !message) {
      
      await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
      continue;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      console.warn(`Не удалось нормализовать номер телефона: ${phone}`);
      await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
      continue;
    }
    await sendMessageToUser(providedClient, normalizedPhone, message);
    await waitForDelay();
  }

  function waitForDelay() {
    return new Promise((resolve) => setTimeout(resolve, getDelay()));
  }

  function removePhoneFromPool(phoneNumber) {
    const index = testData.indexOf(phoneNumber);
    if (index !== -1) {
      testData.splice(index, 1);
    }
  }
}

function getDelay() {
  return Math.floor(Math.random() * 60 * 15 * 1000) + 1000 * 60;
}

function normalizePhone(rawPhone) {
  if (!rawPhone) {
    return null;
  }
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  return `+${digits}`;
}

async function sendMessageToUser(providedClient, normalizedPhone, message) {
  try {
    const result = await providedClient.invoke(
      new Api.contacts.ImportContacts({
        contacts: [
          new Api.InputPhoneContact({
            clientId: BigInt(Date.now()),
            phone: normalizedPhone,
            firstName: 'Temp',
            lastName: 'User',
          }),
        ],
      }),
    );

    if (!result.users || result.users.length === 0) {
      console.warn(`Пользователь с номером ${normalizedPhone} не найден в Telegram.`);
      return;
    }

    const user = result.users[0];
    if (!user) {
      console.warn(`Не удалось получить данные пользователя для номера ${normalizedPhone}.`);
      return;
    }

    await providedClient.sendMessage(user, { message });
    console.log(`Сообщение отправлено пользователю ${normalizedPhone}: ${message}`);
  } catch (error) {
    console.error(`Ошибка при обработке номера ${normalizedPhone}:`, error);
  }
}

app.listen(6801, () => {
  console.log('Server is running on port 6801');
});