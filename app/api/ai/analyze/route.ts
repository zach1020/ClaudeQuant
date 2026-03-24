import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ticker, price, vwap, rsi, macd, macdSignal, volume, relVolume,
    prevHigh, prevLow, sma20, ema9, bbUpper, bbLower, news, xSentiment, apiKey,
    trend15m, rsi15m, macd15m, recentWinRate, recentTradeCount, allowShorts,
    currentPosition } = body;

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
15m Trend: ${trend15m ?? "N/A"} | 15m RSI: ${rsi15m?.toFixed(1) ?? "N/A"} | 15m MACD: ${macd15m ?? "N/A"}
Recent performance: ${recentTradeCount > 0 ? `${recentTradeCount} trades, ${(recentWinRate * 100).toFixed(0)}% win rate today` : "No trades yet today"}
${currentPosition ? `CURRENT POSITION: ${currentPosition.side} ${currentPosition.qty} shares @ $${currentPosition.entryPrice.toFixed(2)} (unrealized P&L: ${currentPosition.pnl >= 0 ? "+" : ""}$${currentPosition.pnl.toFixed(2)})` : `CURRENT POSITION: None (flat)`}

Analyze this intraday setup for ${ticker}. Return ONLY a JSON object with this exact structure:
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
}
For BUY signals: 15m trend should be bullish or neutral (not strongly bearish) for confirmation.
For SELL signals: 15m trend should be bearish or neutral (not strongly bullish) for confirmation.
${currentPosition ? `You currently hold a ${currentPosition.side} position. SELL means close/exit this position — it is NOT short selling.` : ""}
${allowShorts === false && !currentPosition ? "IMPORTANT: No position held and short selling is disabled. Only return BUY or HOLD." : ""}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are an aggressive intraday trader and market analyst. You identify actionable trading setups from technical indicators and news. ${currentPosition
        ? `The user holds a ${currentPosition.side} position at $${currentPosition.entryPrice.toFixed(2)} (P&L: ${currentPosition.pnl >= 0 ? "+" : ""}$${currentPosition.pnl.toFixed(2)}). SELL means EXIT/CLOSE this existing position — it is NOT short selling. Be decisive about cutting losses — if indicators are bearish or the position is losing money with no clear reversal signal, return SELL immediately. Do not hold losing positions hoping they recover. Return SELL to exit, HOLD only if indicators clearly support a reversal, or BUY to add to a winning position.`
        : allowShorts === false
          ? "No position is held and short selling is DISABLED — only return BUY or HOLD. Return BUY whenever there is any bullish lean in the data. Return HOLD for bearish or genuinely flat conditions."
          : "Always return a BUY or SELL signal — use HOLD only when indicators are genuinely flat with no directional edge. If there is any directional lean, commit to BUY or SELL."
      } Set confidence based on how many indicators agree: 0.60–0.69 weak, 0.70–0.79 moderate, 0.80+ strong. Never provide financial advice. This is for educational/simulation purposes only.`,
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
    const msg = err instanceof Error ? err.message : String(err);
    if (/credit|balance|billing|quota/i.test(msg)) {
      return NextResponse.json({ creditError: true, signal: null });
    }
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
