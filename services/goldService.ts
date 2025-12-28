
export interface GoldData {
  pricePerGram: number;
  timestamp: number;
  source: string;
}

const TROY_OUNCE_TO_GRAM = 31.1034768;

/**
 * Fetches the current gold price from a public financial API.
 * Uses XAU (Gold Ounce) to IDR conversion.
 */
export const fetchLiveGoldPrice = async (): Promise<GoldData> => {
  try {
    // Using a reliable public currency API mirror that includes XAU (Gold)
    // This is a common open-source financial data source.
    const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json');
    
    if (!response.ok) throw new Error('Failed to fetch from primary source');
    
    const data = await response.json();
    const xauToIdr = data.xau.idr;
    
    // Calculate price per gram: (Price per Ounce / 31.1035)
    const pricePerGram = Math.round(xauToIdr / TROY_OUNCE_TO_GRAM);
    
    return {
      pricePerGram,
      timestamp: Date.now(),
      source: 'Global Market (XAU/IDR)'
    };
  } catch (error) {
    console.error("Gold Price API Error:", error);
    throw error;
  }
};
