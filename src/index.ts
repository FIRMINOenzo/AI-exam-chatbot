import wppconnect from '@wppconnect-team/wppconnect';

import dotenv from 'dotenv';
import { splitMessages, sendMessagesWithDelay } from './util';
import { mainGoogle } from './service/google';

dotenv.config();
type AIOption = 'GPT' | 'GEMINI';

const messageBufferPerChatId = new Map();
const messageTimeouts = new Map();
const AI_SELECTED: AIOption = (process.env.AI_SELECTED as AIOption) || 'GEMINI';
const MAX_RETRIES = 3;

if (AI_SELECTED === 'GEMINI' && !process.env.GEMINI_KEY) {
  throw Error(
    'Você precisa colocar uma key do Gemini no .env! Crie uma gratuitamente em https://aistudio.google.com/app/apikey?hl=pt-br'
  );
}

if (
  AI_SELECTED === 'GPT' &&
  (!process.env.OPENAI_KEY || !process.env.OPENAI_ASSISTANT)
) {
  throw Error(
    'Para utilizar o GPT você precisa colocar no .env a sua key da openai e o id do seu assistante.'
  );
}

wppconnect
  .create({
    session: 'sessionName',
    catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
      console.log(asciiQR);
    },
    statusFind: (statusSession, session) => {
      console.log('Status Session: ', statusSession);
      console.log('Session name: ', session);
    },
    headless: 'new' as any,
  })
  .then((client) => {
    start(client);
  })
  .catch((erro) => {
    console.log(erro);
  });

async function start(client: wppconnect.Whatsapp): Promise<void> {
  client.onMessage(async (message) => {
    await handleMessage(client, message);
  });
}

async function handleMessage(
  client: wppconnect.Whatsapp,
  message: any
): Promise<void> {
  if (
    message.type === 'chat' &&
    !message.isGroupMsg &&
    message.chatId !== 'status@broadcast'
  ) {
    const chatId = message.chatId;
    console.log('Mensagem recebida:', message.body);

    if (!messageBufferPerChatId.has(chatId)) {
      messageBufferPerChatId.set(chatId, [message.body]);
    } else {
      messageBufferPerChatId.set(chatId, [
        ...messageBufferPerChatId.get(chatId),
        message.body,
      ]);
    }

    if (messageTimeouts.has(chatId)) {
      clearTimeout(messageTimeouts.get(chatId));
    }
    console.log('Aguardando novas mensagens...');
    messageTimeouts.set(
      chatId,
      setTimeout(async () => {
        await processMessages(client, message, chatId);
      }, 7000)
    );
  }
}

async function processMessages(
  client: wppconnect.Whatsapp,
  message: any,
  chatId: string
): Promise<void> {
  const currentMessage = !messageBufferPerChatId.has(chatId)
    ? message.body
    : [...messageBufferPerChatId.get(chatId)].join(' \n ');
  let answer = '';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      answer = await mainGoogle({
        currentMessage: currentMessage ?? '',
        chatId: String(chatId) || '',
      });
      break;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
    }
  }
  const messages = splitMessages(answer);
  console.log('Enviando mensagens...');
  await sendMessagesWithDelay({
    client,
    messages,
    targetNumber: message.from,
  });
  messageBufferPerChatId.delete(chatId);
  messageTimeouts.delete(chatId);
}
