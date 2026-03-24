import { NextRequest, NextResponse } from "next/server";

// Polygon.io snapshot endpoint
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickers = searchParams.get("tickers")?.split(",") ?? [];
  const apiKey = searchParams.get("apiKey") ?? process.env.POLYGON_API_KEY ?? "";

  if (!apiKey) {
    return NextResponse.json({ error: "No API key" }, { status: 400 });
  }

  try {
    const tickerStr = tickers.map((t) => `tickers[]=${t}`).join("&");
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?${tickerStr}&apiKey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 5 } });
    const data = await res.json();

    if (!res.ok || !data.tickers) {
      // Return mock data when API fails or for demo
      return NextResponse.json({ quotes: tickers.map((t) => mockQuote(t)) });
    }

    const quotes = data.tickers.map((t: PolygonTicker) => ({
      ticker: t.ticker,
      price: t.day?.c ?? t.lastTrade?.p ?? 0,
      open: t.day?.o ?? 0,
      prevClose: t.prevDay?.c ?? 0,
      high: t.day?.h ?? 0,
      low: t.day?.l ?? 0,
      volume: t.day?.v ?? 0,
      vwap: t.day?.vw ?? 0,
      change: t.todaysChange ?? 0,
      changePct: t.todaysChangePerc ?? 0,
      bid: t.lastQuote?.P ?? 0,
      ask: t.lastQuote?.p ?? 0,
      lastSize: t.lastTrade?.s ?? 0,
      timestamp: t.updated ?? Date.now(),
    }));

    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ quotes: tickers.map((t) => mockQuote(t)) });
  }
}

interface PolygonTicker {
  ticker: string;
  day?: { c: number; o: number; h: number; l: number; v: number; vw: number };
  prevDay?: { c: number };
  lastTrade?: { p: number; s: number };
  lastQuote?: { P: number; p: number };
  todaysChange?: number;
  todaysChangePerc?: number;
  updated?: number;
}

function mockQuote(ticker: string) {
  const BASE: Record<string, number> = {
    AAPL: 185, TSLA: 175, NVDA: 875, SPY: 520, QQQ: 445,
    MSFT: 415, META: 580, AMZN: 195, GOOGL: 175, AMD: 165,
  };
  const base = BASE[ticker] ?? 100;
  const noise = (Math.random() - 0.5) * base * 0.02;
  const price = +(base + noise).toFixed(2);
  const prevClose = +(base * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2);
  const change = +(price - prevClose).toFixed(2);
  return {
    ticker,
    price,
    open: +(prevClose * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2),
    prevClose,
    high: +(price * 1.01).toFixed(2),
    low: +(price * 0.99).toFixed(2),
    volume: Math.floor(Math.random() * 20_000_000) + 1_000_000,
    vwap: +(price * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2),
    change,
    changePct: +((change / prevClose) * 100).toFixed(2),
    bid: +(price - 0.01).toFixed(2),
    ask: +(price + 0.01).toFixed(2),
    lastSize: Math.floor(Math.random() * 500) + 1,
    timestamp: Date.now(),
  };
}
