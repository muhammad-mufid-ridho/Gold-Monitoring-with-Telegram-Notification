
import { GoogleGenAI, Type } from "@google/genai";
import { MarketInsight } from "../types";

export const getMarketInsight = async (currentPrice: number): Promise<MarketInsight> => {
  // Fix: Initializing GoogleGenAI strictly with process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analyze current gold price of IDR ${currentPrice.toLocaleString('id-ID')} per gram. 
  Provide a market sentiment (Bullish, Bearish, or Neutral), a short analysis of factors that might influence gold prices today, 
  and a simple recommendation for an investor. Return the response in JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING },
            analysis: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ["sentiment", "analysis", "recommendation"]
        }
      }
    });

    // Fix: Extracting text output using the .text property and trimming as per guidelines
    const jsonStr = response.text?.trim() || '{}';
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      sentiment: 'Neutral',
      analysis: 'Could not fetch AI analysis at this time.',
      recommendation: 'Monitor global economic indicators.'
    };
  }
};
