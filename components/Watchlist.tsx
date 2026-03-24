"use client";
import { useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { formatPrice, formatPct, formatVolume, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Plus, X } from "lucide-react";
import type { Quote } from "@/lib/types";

export default function Watchlist() {
  const watchlist = useStore((s) => s.watchlist);
  const selectedTicker = useStore((s) => s.selectedTicker);
  const quotes = useStore((s) => s.quotes);
  const updateQuote = useStore((s) => s.updateQuote);
  const setSelectedTicker = useStore((s) => s.setSelectedTicker);
  const removeFromWatchlist = useStore((s) => s.removeFromWatchlist);
  const addToWatchlist = useStore((s) => s.addToWatchlist);
  const polygonApiKey = useStore((s) => s.polygonApiKey);
  const recordApiCall = useStore((s) => s.recordApiCall);

  const fetchQuotes = useCallback(async () => {
    if (!watchlist.length) return;
    try {
      const res = await fetch(
        `/api/market/quotes?tickers=${watchlist.join(",")}&apiKey=${polygonApiKey}`
      );
      const data = await res.json();
      if (polygonApiKey && data.quotes && !data.error) recordApiCall("polygon");
      data.quotes?.forEach((q: Quote) => updateQuote(q));
    } catch {}
  }, [watchlist, polygonApiKey, updateQuote, recordApiCall]);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 5000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  const handleAddTicker = () => {
    const t = prompt("Enter ticker symbol:")?.toUpperCase();
    if (t) addToWatchlist(t);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-bold text-text-dim tracking-wider">WATCHLIST</span>
        <button
          onClick={handleAddTicker}
          className="text-text-dim hover:text-bull transition-colors"
          title="Add ticker"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_60px_60px] px-3 py-1 text-text-dim text-[10px] border-b border-border">
        <span>TICKER</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">CHG%</span>
        <span className="text-right">VOL</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {watchlist.map((ticker) => {
          const q = quotes[ticker];
          const isSelected = ticker === selectedTicker;
          const isUp = (q?.changePct ?? 0) >= 0;

          return (
            <div
              key={ticker}
              onClick={() => setSelectedTicker(ticker)}
              className={cn(
                "group grid grid-cols-[1fr_80px_60px_60px] px-3 py-2 cursor-pointer border-b border-border/50 transition-all",
                isSelected
                  ? "bg-bull/10 border-l-2 border-l-bull"
                  : "hover:bg-border",
                q && (isUp ? "row-bull" : "row-bear")
              )}
            >
              <div className="flex items-center gap-1.5">
                {isUp ? (
                  <TrendingUp size={11} className="text-bull" />
                ) : (q?.changePct ?? 0) < 0 ? (
                  <TrendingDown size={11} className="text-bear" />
                ) : (
                  <Minus size={11} className="text-text-dim" />
                )}
                <span className={cn("font-bold text-xs", isSelected ? "text-bull" : "text-text")}>
                  {ticker}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromWatchlist(ticker); }}
                  className="ml-auto opacity-0 group-hover:opacity-100 text-text-dim hover:text-bear transition-all"
                >
                  <X size={10} />
                </button>
              </div>

              <div className="text-right">
                <span className={cn("text-xs font-mono font-bold", isUp ? "text-bull" : "text-bear")}>
                  {q ? `$${formatPrice(q.price)}` : "—"}
                </span>
              </div>

              <div className="text-right">
                <span className={cn("text-xs font-mono", isUp ? "text-bull" : "text-bear")}>
                  {q ? formatPct(q.changePct) : "—"}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-text-dim">
                  {q ? formatVolume(q.volume) : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      {quotes[selectedTicker] && (
        <QuoteDetails quote={quotes[selectedTicker]} />
      )}
    </div>
  );
}

function QuoteDetails({ quote }: { quote: Quote }) {
  const isUp = quote.changePct >= 0;
  return (
    <div className="border-t border-border p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-text">{quote.ticker}</span>
        <span className={cn("text-sm font-bold font-mono", isUp ? "text-bull glow-bull" : "text-bear glow-bear")}>
          ${formatPrice(quote.price)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <Row label="Open" value={`$${formatPrice(quote.open)}`} />
        <Row label="Prev Close" value={`$${formatPrice(quote.prevClose)}`} />
        <Row label="High" value={`$${formatPrice(quote.high)}`} color="text-bull" />
        <Row label="Low" value={`$${formatPrice(quote.low)}`} color="text-bear" />
        <Row label="VWAP" value={`$${formatPrice(quote.vwap)}`} color="text-info" />
        <Row label="Volume" value={formatVolume(quote.volume)} />
        <Row label="Bid" value={`$${formatPrice(quote.bid)}`} />
        <Row label="Ask" value={`$${formatPrice(quote.ask)}`} />
      </div>
    </div>
  );
}

function Row({ label, value, color = "text-text" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-dim">{label}</span>
      <span className={cn("font-mono", color)}>{value}</span>
    </div>
  );
}
