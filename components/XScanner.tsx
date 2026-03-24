"use client";
import { useEffect, useCallback, useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Twitter, TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink, Heart, Repeat2, MessageCircle } from "lucide-react";
import type { Tweet } from "@/lib/types";

export default function XScanner() {
  const tweets = useStore((s) => s.tweets);
  const setTweets = useStore((s) => s.setTweets);
  const xApiKey = useStore((s) => s.xApiKey);
  const watchlist = useStore((s) => s.watchlist);
  const selectedTicker = useStore((s) => s.selectedTicker);
  const recordApiCall = useStore((s) => s.recordApiCall);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "bullish" | "bearish">("all");
  const [lastFetch, setLastFetch] = useState(0);

  const fetchTweets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/social/x?tickers=${watchlist.join(",")}&token=${xApiKey}`
      );
      const data = await res.json();
      if (xApiKey && data.tweets?.length) recordApiCall("x");
      if (data.tweets?.length) {
        setTweets(data.tweets);
        setLastFetch(Date.now());
      }
    } catch {}
    setLoading(false);
  }, [watchlist, xApiKey, setTweets, recordApiCall]);

  useEffect(() => {
    fetchTweets();
    const interval = setInterval(fetchTweets, 30000);
    return () => clearInterval(interval);
  }, [fetchTweets]);

  // Sentiment aggregates for selected ticker
  const tickerTweets = tweets.filter(
    (t) => t.tickers.includes(selectedTicker) || t.tickers.length === 0
  );
  const bullCount = tickerTweets.filter((t) => t.sentiment === "bullish").length;
  const bearCount = tickerTweets.filter((t) => t.sentiment === "bearish").length;
  const total = tickerTweets.length || 1;
  const bullPct = Math.round((bullCount / total) * 100);
  const bearPct = Math.round((bearCount / total) * 100);

  const filtered = tweets.filter((t) => {
    if (filter === "bullish") return t.sentiment === "bullish";
    if (filter === "bearish") return t.sentiment === "bearish";
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Twitter size={13} className="text-info" />
          <span className="text-xs font-bold text-text-dim tracking-wider">X SCANNER</span>
          {loading && <RefreshCw size={10} className="text-text-dim animate-spin" />}
        </div>
        <button onClick={fetchTweets} disabled={loading} className="text-[10px] text-text-dim hover:text-info transition-colors disabled:opacity-40">
          refresh
        </button>
      </div>

      {/* Sentiment bar */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between text-[10px] mb-1.5">
          <span className="text-bull font-bold">{bullCount} bullish ({bullPct}%)</span>
          <span className="text-text-dim font-bold">{selectedTicker}</span>
          <span className="text-bear font-bold">{bearCount} bearish ({bearPct}%)</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden flex">
          <div
            className="h-full bg-bull transition-all"
            style={{ width: `${bullPct}%` }}
          />
          <div
            className="h-full bg-bear transition-all"
            style={{ width: `${bearPct}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-border">
        {(["all", "bullish", "bearish"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] border transition-colors",
              filter === f
                ? f === "bullish" ? "text-bull border-bull/40 bg-bull/10"
                  : f === "bearish" ? "text-bear border-bear/40 bg-bear/10"
                  : "text-info border-info/40 bg-info/10"
                : "text-text-dim border-dim hover:text-text"
            )}
          >
            {f}
          </button>
        ))}
        {lastFetch > 0 && (
          <span className="ml-auto text-[10px] text-text-dim self-center">
            {Math.round((Date.now() - lastFetch) / 1000)}s ago
          </span>
        )}
      </div>

      {/* Tweets */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-text-dim text-xs">
            No tweets yet...
          </div>
        ) : (
          filtered.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)
        )}
      </div>
    </div>
  );
}

function TweetCard({ tweet }: { tweet: Tweet }) {
  const Icon = tweet.sentiment === "bullish"
    ? TrendingUp
    : tweet.sentiment === "bearish"
    ? TrendingDown
    : Minus;

  const sentimentColor =
    tweet.sentiment === "bullish" ? "text-bull"
    : tweet.sentiment === "bearish" ? "text-bear"
    : "text-muted";

  const borderColor =
    tweet.sentiment === "bullish" ? "border-l-bull"
    : tweet.sentiment === "bearish" ? "border-l-bear"
    : "";

  function formatCount(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h`;
  };

  return (
    <div className={cn("p-3 border-b border-border hover:bg-border/50 transition-colors border-l-2", borderColor, "animate-slide-in")}>
      {/* Author row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-dim flex items-center justify-center text-[9px] text-text-dim font-bold">
            {tweet.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] font-bold text-text">{tweet.authorName}</span>
          {tweet.verified && <span className="text-info text-[9px]">✓</span>}
          <span className="text-[10px] text-text-dim">{tweet.authorHandle}</span>
          {tweet.authorFollowers > 10000 && (
            <span className="text-[9px] text-text-dim">
              {formatCount(tweet.authorFollowers)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Icon size={10} className={sentimentColor} />
          <span className={cn("text-[9px] font-bold", sentimentColor)}>{tweet.sentiment}</span>
          <span className="text-[10px] text-text-dim">{timeAgo(tweet.createdAt)}</span>
        </div>
      </div>

      {/* Tweet text */}
      <p className="text-[11px] text-text leading-relaxed mb-2 line-clamp-3">
        {tweet.text}
      </p>

      {/* Tickers + engagement */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {tweet.tickers.map((t) => (
            <span key={t} className="px-1.5 py-0.5 bg-info/10 text-info text-[9px] rounded font-bold">${t}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-text-dim">
          <span className="flex items-center gap-0.5">
            <Heart size={9} /> {formatCount(tweet.likes)}
          </span>
          <span className="flex items-center gap-0.5">
            <Repeat2 size={9} /> {formatCount(tweet.retweets)}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle size={9} /> {formatCount(tweet.replies)}
          </span>
          {tweet.url !== "#" && (
            <a href={tweet.url} target="_blank" rel="noopener noreferrer" className="hover:text-info transition-colors">
              <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
