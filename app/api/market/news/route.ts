import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") ?? "";
  const apiKey = searchParams.get("apiKey") ?? process.env.POLYGON_API_KEY ?? "";

  if (!apiKey) {
    return NextResponse.json({ news: getMockNews(ticker) });
  }

  try {
    const tickerParam = ticker ? `&ticker=${ticker}` : "";
    const url = `https://api.polygon.io/v2/reference/news?limit=20&order=desc${tickerParam}&apiKey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = await res.json();

    if (!res.ok || !data.results?.length) {
      return NextResponse.json({ news: getMockNews(ticker) });
    }

    const news = data.results.map((r: PolygonNews) => ({
      id: r.id,
      ticker: r.tickers?.[0] ?? ticker,
      headline: r.title,
      source: r.publisher?.name ?? "Unknown",
      url: r.article_url,
      publishedAt: new Date(r.published_utc).getTime(),
      sentiment: r.insights?.[0]?.sentiment ?? "neutral",
    }));

    return NextResponse.json({ news });
  } catch {
    return NextResponse.json({ news: getMockNews(ticker) });
  }
}

interface PolygonNews {
  id: string;
  title: string;
  tickers?: string[];
  publisher?: { name: string };
  article_url: string;
  published_utc: string;
  insights?: { sentiment: string }[];
}

function getMockNews(ticker: string) {
  const headlines = [
    { t: "Fed signals rate hold amid inflation concerns", s: "Reuters" },
    { t: `${ticker || "AAPL"} beats Q4 earnings, raises guidance`, s: "Benzinga" },
    { t: "S&P 500 hits all-time high on tech rally", s: "CNBC" },
    { t: `${ticker || "NVDA"} announces new AI chip partnership`, s: "Bloomberg" },
    { t: "CPI data shows cooling inflation, markets rally", s: "WSJ" },
    { t: "VIX drops to 6-month low as markets stabilize", s: "MarketWatch" },
    { t: `${ticker || "TSLA"} expands supercharger network globally`, s: "Reuters" },
    { t: "Fed minutes: Officials cautious on rate cuts", s: "Bloomberg" },
  ];

  return headlines.map((h, i) => ({
    id: `mock-${i}`,
    ticker: ticker || "",
    headline: h.t,
    source: h.s,
    url: "#",
    publishedAt: Date.now() - i * 15 * 60 * 1000,
    sentiment: (["positive", "negative", "neutral"] as const)[i % 3],
  }));
}
