
export interface PricePoint {
  time: string;
  price: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface MarketInsight {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  analysis: string;
  recommendation: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  message: string;
  status: 'success' | 'failed';
}
