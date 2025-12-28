
import { TelegramConfig } from "../types";

export const sendTelegramAlert = async (
  config: TelegramConfig,
  currentPrice: number,
  threshold: number
): Promise<boolean> => {
  if (!config.botToken || !config.chatId || !config.enabled) return false;

  const message = `🚨 *GOLD PRICE ALERT* 🚨\n\n` +
    `Current Price: *IDR ${currentPrice.toLocaleString('id-ID')}*\n` +
    `Threshold: *IDR ${threshold.toLocaleString('id-ID')}*\n\n` +
    `Status: The price has exceeded your target threshold! 📈`;

  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Fix: Use config.chatId instead of non-existent property config.chat_id (Line 23)
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error("Telegram Error:", error);
    return false;
  }
};
