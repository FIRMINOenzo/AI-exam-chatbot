import { type Whatsapp } from '@wppconnect-team/wppconnect';

export function splitMessages(text: string): string[] {
  const specialPatterns = new Map<string, string>();
  let counter = 0;

  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const emailPattern = /[^\s]+@[^\s]+\.[^\s]+/gi;
  const listPattern = /\d+\.\s.*?(?=\d+\.|$)/gi;

  const tokenizedText = text
    .replace(urlPattern, (match) => {
      const token = `__TOKEN${counter}__`;
      specialPatterns.set(token, match);
      counter++;
      return token;
    })
    .replace(emailPattern, (match) => {
      const token = `__TOKEN${counter}__`;
      specialPatterns.set(token, match);
      counter++;
      return token;
    })
    .replace(listPattern, (match) => {
      const token = `__TOKEN${counter}__`;
      specialPatterns.set(token, match);
      counter++;
      return token;
    });

  const sentences = tokenizedText
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .map((sentence) => sentence.trim());

  return sentences.map((sentence) => {
    let restored = sentence;
    specialPatterns.forEach((value, token) => {
      restored = restored.replace(token, value);
    });
    return restored;
  });
}
export async function sendMessagesWithDelay({
  messages,
  client,
  targetNumber,
}: {
  messages: string[];
  client: Whatsapp;
  targetNumber: string;
}): Promise<void> {
  for (const [, msg] of messages.entries()) {
    const dynamicDelay = msg.length * 10;
    await new Promise((resolve) => setTimeout(resolve, dynamicDelay));
    client
      .sendText(targetNumber, msg.trimStart())
      .then((result) => {
        console.log('Mensagem enviada:', result.body);
      })
      .catch((erro) => {
        console.error('Erro ao enviar mensagem:', erro);
      });
  }
}
