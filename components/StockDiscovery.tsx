"use client";
import { useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Telescope, TrendingUp, TrendingDown, Minus, Plus, CheckCircle,
  Globe, RefreshCw, AlertTriangle, Zap, ChevronDown, ChevronUp,
} from "lucide-react";

interface Recommendation {
  ticker: string;
  signal: "BUY" | "WATCH" | "AVOID";
  confidence: number;
  setup: string;
  catalyst: string;
  thesis: string;
  risk: string;
  entry_zone: string;
  sources: string[];
}

interface DiscoverResult {
  market_summary: string;
  recommendations: Recommendation[];
  themes: string[];
  webSearchUsed: boolean;
  scannedAt: number;
}

const SCAN_MESSAGES = [
  "Searching for today's top movers...",
  "Scanning for earnings catalysts...",
  "Looking for technical breakouts...",
  "Analyzing sector rotation...",
  "Checking analyst upgrades...",
  "Scanning for unusual volume...",
  "Identifying gap-and-go setups...",
  "Compiling recommendations...",
];

export default function StockDiscovery() {
  const anthropicKey = useStore((s) => s.anthropicKey);
  const polygonApiKey = useStore((s) => s.polygonApiKey);
  const watchlist = useStore((s) => s.watchlist);
  const addToWatchlist = useStore((s) => s.addToWatchlist);
  const recordAnthropicUsage = useStore((s) => s.recordAnthropicUsage);

  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMsgIdx, setScanMsgIdx] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const runScan = useCallback(async () => {
    if (!anthropicKey || loading) return;
    setLoading(true);
    setError(null);

    // Cycle through scan messages while loading
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % SCAN_MESSAGES.length;
      setScanMsgIdx(idx);
    }, 2500);

    try {
      const res = await fetch("/api/ai/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicKey, polygonApiKey }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        if (data.usage) {
          recordAnthropicUsage(data.usage.input_tokens ?? 0, data.usage.output_tokens ?? 0);
        }
        setResult({ ...data, scannedAt: Date.now() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [anthropicKey, polygonApiKey, loading, recordAnthropicUsage]);

  const toggleExpand = (ticker: string) =>
    setExpanded((p) => ({ ...p, [ticker]: !p[ticker] }));

  if (!anthropicKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <Telescope size={28} className="text-text-dim opacity-40" />
        <p className="text-xs text-text-dim">Add your Anthropic API key in Settings to enable stock discovery.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Telescope size={13} className="text-accent" />
          <span className="text-xs font-bold text-text-dim tracking-wider">STOCK DISCOVERY</span>
          {result && (
            <span className="text-[10px] text-text-dim">
              · {new Date(result.scannedAt).toLocaleTimeString()}
              {result.webSearchUsed && (
                <span className="ml-1 text-info flex-inline items-center gap-0.5">
                  <Globe size={9} className="inline" /> live
                </span>
              )}
            </span>
          )}
        </div>
        <button
          onClick={runScan}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold transition-all border",
            loading
              ? "border-accent/30 text-accent/50 cursor-not-allowed"
              : "border-accent/40 text-accent hover:bg-accent/10"
          )}
        >
          {loading ? (
            <><RefreshCw size={10} className="animate-spin" /> Scanning...</>
          ) : (
            <><Telescope size={10} /> {result ? "Re-scan" : "Scan Now"}</>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
              <Telescope size={16} className="text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs text-accent font-bold">Claude is scouting the market</p>
              <p className="text-[10px] text-text-dim animate-pulse">{SCAN_MESSAGES[scanMsgIdx]}</p>
              <p className="text-[10px] text-muted">This may take 15–30 seconds</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="m-3 p-3 bg-bear/10 border border-bear/30 rounded text-[11px] text-bear flex items-start gap-2">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Scan failed</p>
              <p className="text-text-dim mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !result && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <Telescope size={28} className="text-accent opacity-30" />
            <div className="space-y-1">
              <p className="text-xs text-text">Find today&apos;s best setups</p>
              <p className="text-[10px] text-text-dim leading-relaxed">
                Claude searches the web for catalysts, breakouts, and momentum plays — then ranks the best opportunities for today.
              </p>
            </div>
            <button
              onClick={runScan}
              className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded text-xs font-bold hover:bg-accent/20 transition-colors"
            >
              <Telescope size={12} /> Start Scanning
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && result && (
          <div className="p-3 space-y-3">
            {/* No web search notice */}
            {!result.webSearchUsed && (
              <div className="flex items-start gap-2 p-2 bg-warn/10 border border-warn/20 rounded text-[10px] text-warn">
                <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                Web search unavailable — results based on general market knowledge, not live data.
              </div>
            )}

            {/* Market summary */}
            {result.market_summary && (
              <div className="flex items-start gap-2 p-2 bg-info/5 border border-info/20 rounded">
                <Zap size={10} className="text-info flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-text-dim leading-relaxed">{result.market_summary}</p>
              </div>
            )}

            {/* Themes */}
            {result.themes?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.themes.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-surface border border-border rounded text-[10px] text-text-dim">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Recommendation cards */}
            {(result.recommendations ?? []).map((rec) => (
              <RecommendationCard
                key={rec.ticker}
                rec={rec}
                onWatchlist={watchlist.includes(rec.ticker)}
                onAdd={() => addToWatchlist(rec.ticker)}
                expanded={!!expanded[rec.ticker]}
                onToggle={() => toggleExpand(rec.ticker)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  onWatchlist,
  onAdd,
  expanded,
  onToggle,
}: {
  rec: Recommendation;
  onWatchlist: boolean;
  onAdd: () => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isBuy = rec.signal === "BUY";
  const isAvoid = rec.signal === "AVOID";
  const confidence = Math.round(rec.confidence * 100);

  const signalColor = isBuy ? "bull" : isAvoid ? "bear" : "info";
  const confColor = confidence >= 80 ? "text-bull" : confidence >= 65 ? "text-warn" : "text-muted";
  const Icon = isBuy ? TrendingUp : isAvoid ? TrendingDown : Minus;

  return (
    <div className={cn(
      "border rounded overflow-hidden animate-slide-in",
      isBuy ? "border-bull/30 bg-bull/3" : isAvoid ? "border-bear/30 bg-bear/3" : "border-info/20 bg-info/3"
    )}>
      {/* Card header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/3 transition-colors text-left"
      >
        <Icon size={12} className={`text-${signalColor} flex-shrink-0`} />
        <span className="font-bold text-xs text-text">{rec.ticker}</span>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-bold",
          isBuy ? "bg-bull/20 text-bull" : isAvoid ? "bg-bear/20 text-bear" : "bg-info/20 text-info"
        )}>
          {rec.signal}
        </span>
        <span className="text-[10px] text-text-dim truncate flex-1">{rec.setup}</span>
        <span className={cn("text-[10px] font-bold flex-shrink-0", confColor)}>{confidence}%</span>
        {expanded ? <ChevronUp size={10} className="text-text-dim flex-shrink-0" /> : <ChevronDown size={10} className="text-text-dim flex-shrink-0" />}
      </button>

      {/* Catalyst — always visible */}
      <div className="px-3 pb-2 text-[10px] text-text-dim">
        <span className="text-text-dim">⚡ </span>{rec.catalyst}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
          {/* Confidence bar */}
          <div>
            <div className="flex justify-between text-[10px] text-text-dim mb-1">
              <span>Confidence</span>
              <span className={confColor}>{confidence}%</span>
            </div>
            <div className="h-1 bg-dim rounded-full overflow-hidden">
              <div
                className={cn("h-1 rounded-full", confidence >= 80 ? "bg-bull" : confidence >= 65 ? "bg-warn" : "bg-muted")}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          {/* Thesis */}
          <div>
            <p className="text-[10px] text-text-dim font-bold mb-0.5">THESIS</p>
            <p className="text-[11px] text-text leading-relaxed">{rec.thesis}</p>
          </div>

          {/* Entry + Risk */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-text-dim font-bold mb-0.5">ENTRY</p>
              <p className="text-[11px] text-bull font-mono">{rec.entry_zone}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-dim font-bold mb-0.5">RISK</p>
              <p className="text-[11px] text-bear">{rec.risk}</p>
            </div>
          </div>

          {/* Sources */}
          {rec.sources?.length > 0 && (
            <div>
              <p className="text-[10px] text-text-dim font-bold mb-1">SOURCES</p>
              <div className="space-y-0.5">
                {rec.sources.slice(0, 3).map((s, i) => (
                  <p key={i} className="text-[10px] text-text-dim leading-snug">· {s}</p>
                ))}
              </div>
            </div>
          )}

          {/* Add to watchlist */}
          <button
            onClick={onAdd}
            disabled={onWatchlist}
            className={cn(
              "flex items-center gap-1.5 w-full justify-center py-1.5 rounded text-[10px] font-bold border transition-colors",
              onWatchlist
                ? "border-bull/20 text-bull/60 cursor-default"
                : "border-info/30 text-info hover:bg-info/10"
            )}
          >
            {onWatchlist ? (
              <><CheckCircle size={10} /> On Watchlist</>
            ) : (
              <><Plus size={10} /> Add {rec.ticker} to Watchlist</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
