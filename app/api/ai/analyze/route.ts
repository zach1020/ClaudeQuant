import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ticker, price, vwap, rsi, macd, macdSignal, volume, relVolume,
    prevHigh, prevLow, sma20, ema9, bbUpper, bbLower, news, xSentiment, apiKey } = body;

  const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ signal: getMockSignal(ticker, price) });
  }

  const client = new Anthropic({ apiKey: key });

  const macdCross = macd !== undefined && macdSignal !== undefined
    ? macd > macdSignal ? "bullish crossover" : macd < macdSignal ? "bearish crossover" : "no crossover"
    : "unknown";

  const prompt = `Ticker: ${ticker}
Current Price: $${price}
VWAP: $${vwap ?? "N/A"}${vwap ? ` (Price is ${price > vwap ? "ABOVE" : "BELOW"} VWAP)` : ""}
RSI (14): ${rsi?.toFixed(1) ?? "N/A"}${rsi ? ` (${rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : "neutral"})` : ""}
MACD: ${macd?.toFixed(3) ?? "N/A"} | Signal: ${macdSignal?.toFixed(3) ?? "N/A"} | Status: ${macdCross}
Volume: ${relVolume?.toFixed(1) ?? "N/A"}x average${relVolume && relVolume > 2 ? " (HIGH VOLUME SURGE)" : ""}
SMA20: $${sma20?.toFixed(2) ?? "N/A"} | EMA9: $${ema9?.toFixed(2) ?? "N/A"}
BB Upper: $${bbUpper?.toFixed(2) ?? "N/A"} | BB Lower: $${bbLower?.toFixed(2) ?? "N/A"}
Prior Day High: $${prevHigh?.toFixed(2) ?? "N/A"} | Prior Day Low: $${prevLow?.toFixed(2) ?? "N/A"}
Recent news: ${news ?? "none"}
X/Twitter sentiment: ${xSentiment ?? "not available"}

Analyze this intraday setup for ${ticker}. Return ONLY a JSON object with this exact structure (or null if no trade):
{
  "ticker": "${ticker}",
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": 0.0-1.0,
  "reason": "concise explanation under 100 words",
  "entry": number,
  "stop_loss": number,
  "target": number,
  "risk_reward": number,
  "timeframe": "1m" | "5m" | "15m",
  "expires_in_minutes": number
}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are an expert day trader and market analyst. You monitor real-time stock data and identify high-probability intraday trading setups. You analyze price action, technical indicators, and news sentiment. Always return structured JSON signals. Be conservative — only flag high-confidence setups (confidence > 0.65). Never provide financial advice. This is for educational/simulation purposes only.`,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((c) => c.type === "text")?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ signal: null, usage: response.usage });
    }

    const signal = JSON.parse(jsonMatch[0]);
    signal.id = Math.random().toString(36).substring(2, 11);
    signal.timestamp = Date.now();

    return NextResponse.json({ signal, usage: response.usage });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ signal: getMockSignal(ticker, price) });
  }
}

function getMockSignal(ticker: string, price: number) {
  const signals = ["BUY", "SELL", "HOLD"] as const;
  const signal = signals[Math.floor(Math.random() * signals.length)];
  const stopDist = price * 0.015;
  const targetDist = stopDist * 2.2;
  return {
    id: Math.random().toString(36).substring(2, 11),
    ticker,
    signal,
    confidence: +(0.65 + Math.random() * 0.25).toFixed(2),
    reason: signal === "BUY"
      ? "VWAP reclaim on above-average volume. RSI recovering from oversold. MACD bullish crossover forming."
      : signal === "SELL"
      ? "Rejected at prior day high. RSI overbought. Volume fading on push. Below VWAP."
      : "No clear setup. Indicators mixed. Waiting for confirmation.",
    entry: +price.toFixed(2),
    stop_loss: +(price - stopDist).toFixed(2),
    target: +(price + targetDist).toFixed(2),
    risk_reward: 2.2,
    timeframe: "5m",
    expires_in_minutes: 30,
    timestamp: Date.now(),
  };
}
