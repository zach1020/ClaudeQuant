"use client";
import { useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { cn, formatPrice, formatPct } from "@/lib/utils";
import { Globe, Newspaper, ExternalLink } from "lucide-react";

const INDEX_TICKERS = [
  { symbol: "SPY", name: "S&P 500" },
  { symbol: "QQQ", name: "NASDAQ" },
  { symbol: "DIA", name: "DOW" },
  { symbol: "VIX", name: "VIX" },
];

export default function MarketOverview() {
  const quotes = useStore((s) => s.quotes);
  const indices = useStore((s) => s.indices);
  const news = useStore((s) => s.news);
  const setIndices = useStore((s) => s.setIndices);
  const addNews = useStore((s) => s.addNews);
  const polygonApiKey = useStore((s) => s.polygonApiKey);
  const watchlist = useStore((s) => s.watchlist);
  const recordApiCall = useStore((s) => s.recordApiCall);

  const fetchIndices = useCallback(async () => {
    const tickers = INDEX_TICKERS.map((t) => t.symbol).join(",");
    try {
      const res = await fetch(`/api/market/quotes?tickers=${tickers}&apiKey=${polygonApiKey}`);
      const data = await res.json();
      if (polygonApiKey && data.quotes && !data.error) recordApiCall("polygon");
      setIndices(
        (data.quotes ?? []).map((q: { ticker: string; price: number; change: number; changePct: number }) => {
          const meta = INDEX_TICKERS.find((t) => t.symbol === q.ticker);
          return { symbol: q.ticker, name: meta?.name ?? q.ticker, price: q.price, change: q.change, changePct: q.changePct };
        })
      );
    } catch {}
  }, [polygonApiKey, setIndices, recordApiCall]);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/news?apiKey=${polygonApiKey}`);
      const data = await res.json();
      if (polygonApiKey && data.news && !data.error) recordApiCall("polygon");
      data.news?.forEach((n: Parameters<typeof addNews>[0]) => addNews(n));
    } catch {}
  }, [polygonApiKey, addNews, recordApiCall]);

  useEffect(() => {
    fetchIndices();
    fetchNews();
    const i1 = setInterval(fetchIndices, 10000);
    const i2 = setInterval(fetchNews, 60000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [fetchIndices, fetchNews]);

  return (
    <div className="flex flex-col h-full">
      {/* Indices */}
      <div className="border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Globe size={12} className="text-text-dim" />
          <span className="text-xs font-bold text-text-dim tracking-wider">MARKET OVERVIEW</span>
        </div>
        <div className="grid grid-cols-2 gap-0">
          {(indices.length ? indices : INDEX_TICKERS.map((t) => ({ ...t, price: 0, change: 0, changePct: 0 }))).map((idx) => {
            const isUp = idx.changePct >= 0;
            return (
              <div key={idx.symbol} className={cn("p-2 border-b border-r border-border", isUp ? "row-bull" : "row-bear")}>
                <div className="text-[10px] text-text-dim">{idx.name}</div>
                <div className={cn("text-xs font-bold font-mono", isUp ? "text-bull" : "text-bear")}>
                  {idx.price > 0 ? `$${formatPrice(idx.price)}` : "—"}
                </div>
                <div className={cn("text-[10px]", isUp ? "text-bull" : "text-bear")}>
                  {idx.changePct !== 0 ? formatPct(idx.changePct) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Positions quick view */}
      <PositionsQuick quotes={quotes} watchlist={watchlist} />

      {/* News */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Newspaper size={12} className="text-text-dim" />
          <span className="text-xs font-bold text-text-dim tracking-wider">NEWS</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {news.slice(0, 20).map((item) => (
            <div key={item.id} className="px-3 py-2 border-b border-border hover:bg-border transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-text leading-relaxed line-clamp-2">{item.headline}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-dim">{item.source}</span>
                    {item.ticker && (
                      <span className="text-[10px] text-info font-bold">{item.ticker}</span>
                    )}
                    <span className={cn(
                      "text-[10px]",
                      item.sentiment === "positive" ? "text-bull" : item.sentiment === "negative" ? "text-bear" : "text-muted"
                    )}>
                      {item.sentiment}
                    </span>
                  </div>
                </div>
                {item.url !== "#" && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-text-dim hover:text-info flex-shrink-0">
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PositionsQuick({ quotes, watchlist }: { quotes: Record<string, import("@/lib/types").Quote>; watchlist: string[] }) {
  const positions = useStore((s) => s.positions);
  if (!positions.length) return null;

  return (
    <div className="border-b border-border">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-[10px] font-bold text-text-dim tracking-wider">OPEN POSITIONS</span>
      </div>
      {positions.map((p) => {
        const q = quotes[p.ticker];
        const price = q?.price ?? p.currentPrice;
        const pnl = p.side === "LONG"
          ? (price - p.entryPrice) * p.quantity
          : (p.entryPrice - price) * p.quantity;
        const isUp = pnl >= 0;
        return (
          <div key={p.id} className={cn("flex items-center justify-between px-3 py-1.5 border-b border-border/50", isUp ? "row-bull" : "row-bear")}>
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-bold px-1 rounded", p.side === "LONG" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear")}>
                {p.side === "LONG" ? "L" : "S"}
              </span>
              <span className="text-xs text-text">{p.ticker}</span>
              <span className="text-[10px] text-text-dim">{p.quantity}sh</span>
            </div>
            <div className="text-right">
              <div className={cn("text-xs font-bold font-mono", isUp ? "text-bull" : "text-bear")}>
                {isUp ? "+" : ""}${pnl.toFixed(2)}
              </div>
              <div className="text-[10px] text-text-dim">${formatPrice(price)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
