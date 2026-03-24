import { NextRequest, NextResponse } from "next/server";

const TF_MAP: Record<string, { multiplier: number; timespan: string }> = {
  "1m": { multiplier: 1, timespan: "minute" },
  "5m": { multiplier: 5, timespan: "minute" },
  "15m": { multiplier: 15, timespan: "minute" },
  "1h": { multiplier: 1, timespan: "hour" },
  "1d": { multiplier: 1, timespan: "day" },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") ?? "AAPL";
  const timeframe = searchParams.get("timeframe") ?? "5m";
  const apiKey = searchParams.get("apiKey") ?? process.env.POLYGON_API_KEY ?? "";

  const tf = TF_MAP[timeframe] ?? TF_MAP["5m"];
  const to = new Date();
  const from = new Date(to.getTime() - (timeframe === "1d" ? 90 : 5) * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  if (!apiKey) {
    return NextResponse.json({ candles: generateMockCandles(ticker, timeframe, 200) });
  }

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${tf.multiplier}/${tf.timespan}/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=500&apiKey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.results?.length) {
      return NextResponse.json({ candles: generateMockCandles(ticker, timeframe, 200) });
    }

    const candles = data.results.map((r: { t: number; o: number; h: number; l: number; c: number; v: number }) => ({
      time: Math.floor(r.t / 1000),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }));

    return NextResponse.json({ candles });
  } catch {
    return NextResponse.json({ candles: generateMockCandles(ticker, timeframe, 200) });
  }
}

function generateMockCandles(ticker: string, timeframe: string, count: number) {
  const BASE: Record<string, number> = {
    AAPL: 185, TSLA: 175, NVDA: 875, SPY: 520, QQQ: 445,
    MSFT: 415, META: 580, AMZN: 195, GOOGL: 175, AMD: 165,
  };
  const base = BASE[ticker] ?? 100;

  const tfSeconds: Record<string, number> = {
    "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1d": 86400,
  };
  const interval = tfSeconds[timeframe] ?? 300;
  const now = Math.floor(Date.now() / 1000);

  const candles = [];
  let price = base;

  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * interval;
    const change = (Math.random() - 0.49) * price * 0.003;
    const open = price;
    const close = +(price + change).toFixed(2);
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.003)).toFixed(2);
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.003)).toFixed(2);
    const volume = Math.floor(Math.random() * 500_000) + 50_000;
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  return candles;
}
