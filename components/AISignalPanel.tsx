"use client";
import { useEffect, useCallback, useState } from "react";
import { useStore } from "@/lib/store";
import { computeIndicators } from "@/lib/indicators";
import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import { Brain, Zap, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import type { AISignal } from "@/lib/types";

export default function AISignalPanel() {
  const signals = useStore((s) => s.signals);
  const commentary = useStore((s) => s.commentary);
  const isAnalyzing = useStore((s) => s.isAnalyzing);
  const addSignal = useStore((s) => s.addSignal);
  const setCommentary = useStore((s) => s.setCommentary);
  const setIsAnalyzing = useStore((s) => s.setIsAnalyzing);
  const watchlist = useStore((s) => s.watchlist);
  const candlesMap = useStore((s) => s.candles);
  const quotes = useStore((s) => s.quotes);
  const news = useStore((s) => s.news);
  const anthropicKey = useStore((s) => s.anthropicKey);

  const recordAnthropicUsage = useStore((s) => s.recordAnthropicUsage);
  const [lastAnalyzed, setLastAnalyzed] = useState<number>(0);

  const analyzeAll = useCallback(async () => {
    // Never auto-call Claude without a key — mock data would still burn credits if key is set
    if (isAnalyzing) return;
    if (!anthropicKey) return; // require explicit API key
    setIsAnalyzing(true);

    // Only scan the selected ticker + up to 2 more to limit cost
    const selected = useStore.getState().selectedTicker;
    const tickers = [selected, ...watchlist.filter((t) => t !== selected)].slice(0, 3);

    for (const ticker of tickers) {
      const candles = candlesMap[ticker];
      const quote = quotes[ticker];
      if (!candles?.length || !quote) continue;

      const ind = computeIndicators(candles);
      const tickerNews = news
        .filter((n) => !n.ticker || n.ticker === ticker)
        .slice(0, 3)
        .map((n) => n.headline)
        .join("; ");

      try {
        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            price: quote.price,
            vwap: ind.vwap,
            rsi: ind.rsi,
            macd: ind.macd,
            macdSignal: ind.macdSignal,
            volume: quote.volume,
            relVolume: ind.relVolume,
            prevHigh: quote.high,
            prevLow: quote.low,
            sma20: ind.sma20,
            ema9: ind.ema9,
            bbUpper: ind.bbUpper,
            bbLower: ind.bbLower,
            news: tickerNews || null,
            apiKey: anthropicKey,
          }),
        });
        const data = await res.json();
        if (data.usage) {
          recordAnthropicUsage(data.usage.input_tokens ?? 0, data.usage.output_tokens ?? 0);
        }
        if (data.signal && data.signal.confidence >= 0.65) {
          addSignal(data.signal);
          setCommentary(
            `[${new Date().toLocaleTimeString()}] ${ticker}: ${data.signal.signal} signal (${(data.signal.confidence * 100).toFixed(0)}% confidence). ${data.signal.reason}`
          );
        }
      } catch {}
    }

    setIsAnalyzing(false);
    setLastAnalyzed(Date.now());
  }, [watchlist, candlesMap, quotes, news, anthropicKey, isAnalyzing, addSignal, setCommentary, setIsAnalyzing, recordAnthropicUsage]);

  // NO auto-interval — scanning is manual only to avoid burning API credits.
  // Users click "scan now" or enable auto-trade (which has its own controlled cadence).

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain size={13} className="text-accent" />
          <span className="text-xs font-bold text-text-dim tracking-wider">AI SIGNALS</span>
          {isAnalyzing && (
            <span className="flex items-center gap-1 text-[10px] text-warn">
              <RefreshCw size={10} className="animate-spin" /> analyzing...
            </span>
          )}
        </div>
        {anthropicKey ? (
          <button
            onClick={analyzeAll}
            disabled={isAnalyzing}
            className="text-[10px] text-text-dim hover:text-accent transition-colors disabled:opacity-50"
          >
            scan now
          </button>
        ) : (
          <span className="text-[10px] text-warn">add Anthropic key in Settings</span>
        )}
      </div>

      {/* Commentary */}
      {commentary && (
        <div className="px-3 py-2 border-b border-border bg-accent/5">
          <div className="flex items-start gap-2">
            <Zap size={11} className="text-accent mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-text-dim leading-relaxed">{commentary}</p>
          </div>
        </div>
      )}

      {/* Signals list */}
      <div className="flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-text-dim text-xs">
            No signals yet. Scanning every 30s...
          </div>
        ) : (
          signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)
        )}
      </div>

      {lastAnalyzed > 0 && (
        <div className="px-3 py-1 border-t border-border text-[10px] text-text-dim">
          Last scan: {new Date(lastAnalyzed).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

function SignalCard({ signal }: { signal: AISignal }) {
  const executeOrder = useStore((s) => s.executeOrder);

  const isBuy = signal.signal === "BUY";
  const isSell = signal.signal === "SELL";
  const isHold = signal.signal === "HOLD";

  const color = isBuy ? "bull" : isSell ? "bear" : "muted";
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

  const confidence = Math.round(signal.confidence * 100);
  const confColor = confidence >= 80 ? "text-bull" : confidence >= 65 ? "text-warn" : "text-muted";

  const now = Date.now();
  const expiresAt = signal.timestamp + signal.expires_in_minutes * 60 * 1000;
  const expired = now > expiresAt;

  return (
    <div
      className={cn(
        "p-3 border-b border-border animate-slide-in",
        expired ? "opacity-40" : "",
        isBuy ? "border-l-2 border-l-bull" : isSell ? "border-l-2 border-l-bear" : ""
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon size={13} className={`text-${color}`} />
          <span className="font-bold text-xs text-text">{signal.ticker}</span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold",
              isBuy ? "bg-bull/20 text-bull" : isSell ? "bg-bear/20 text-bear" : "bg-dim text-muted"
            )}
          >
            {signal.signal}
          </span>
          {expired && (
            <span className="text-[10px] text-muted flex items-center gap-0.5">
              <AlertTriangle size={9} /> exp
            </span>
          )}
        </div>
        <span className={cn("text-xs font-bold", confColor)}>{confidence}%</span>
      </div>

      <p className="text-[11px] text-text-dim leading-relaxed mb-2">{signal.reason}</p>

      <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
        <div>
          <span className="text-text-dim">Entry</span>
          <div className="text-text font-mono">${formatPrice(signal.entry)}</div>
        </div>
        <div>
          <span className="text-text-dim">Stop</span>
          <div className="text-bear font-mono">${formatPrice(signal.stop_loss)}</div>
        </div>
        <div>
          <span className="text-text-dim">Target</span>
          <div className="text-bull font-mono">${formatPrice(signal.target)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-text-dim">
          <span>R:R <span className="text-info">{signal.risk_reward.toFixed(1)}x</span></span>
          <span>{signal.timeframe}</span>
          <span>{formatDateTime(signal.timestamp)}</span>
        </div>

        {!expired && !isHold && (
          <button
            onClick={() =>
              executeOrder({
                ticker: signal.ticker,
                side: isBuy ? "BUY" : "SELL",
                type: "MARKET",
                quantity: 10,
                price: signal.entry,
                stopPrice: signal.stop_loss,
              })
            }
            className={cn(
              "px-2 py-1 rounded text-[10px] font-bold transition-colors",
              isBuy
                ? "bg-bull/20 text-bull hover:bg-bull/30 border border-bull/30"
                : "bg-bear/20 text-bear hover:bg-bear/30 border border-bear/30"
            )}
          >
            {isBuy ? "BUY 10" : "SELL 10"}
          </button>
        )}
      </div>
    </div>
  );
}
