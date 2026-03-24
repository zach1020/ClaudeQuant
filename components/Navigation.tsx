"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Bell, Settings, TrendingUp, Bot, Twitter, AlertTriangle, X } from "lucide-react";
import { cn, getMarketPhase } from "@/lib/utils";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/trade", label: "Trade", icon: TrendingUp },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

const PHASE_COLOR: Record<string, string> = {
  open: "text-bull",
  pre: "text-warn",
  after: "text-warn",
  closed: "text-muted",
};

const PHASE_LABEL: Record<string, string> = {
  open: "MARKET OPEN",
  pre: "PRE-MARKET",
  after: "AFTER-HOURS",
  closed: "MARKET CLOSED",
};

export default function Navigation() {
  const pathname = usePathname();
  const phase = getMarketPhase();
  const cashBalance = useStore((s) => s.alpacaMode === "live" ? 0 : s.cashBalance);
  const positions = useStore((s) => s.alpacaMode === "live" ? [] : s.positions);
  const autoTradeEnabled = useStore((s) => s.autoTradeEnabled);
  const tweets = useStore((s) => s.tweets);
  const autoTradeDailyCount = useStore((s) => s.autoTradeDailyCount);
  const alpacaMode = useStore((s) => s.alpacaMode);
  const liveAccount = useStore((s) => s.liveAccount);
  const apiCreditError = useStore((s) => s.apiCreditError);
  const setApiCreditError = useStore((s) => s.setApiCreditError);
  const outOfFundsError = useStore((s) => s.outOfFundsError);
  const setOutOfFundsError = useStore((s) => s.setOutOfFundsError);
  const bannerCount = (apiCreditError ? 1 : 0) + (outOfFundsError ? 1 : 0);

  const isLive = alpacaMode === "live";
  const paperPortfolioValue = cashBalance + positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const portfolioValue = isLive ? (liveAccount?.portfolioValue ?? null) : paperPortfolioValue;
  const dayPnl = isLive ? (liveAccount?.dayPnl ?? null) : positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

  return (
    <>
      {apiCreditError && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center gap-3 px-4 py-2 bg-bear text-white text-xs font-medium">
          <AlertTriangle size={13} className="flex-shrink-0" />
          <span>Anthropic API credits exhausted — AI features are paused. Top up at <strong>console.anthropic.com</strong> then dismiss this banner.</span>
          <button onClick={() => setApiCreditError(false)} className="ml-auto flex-shrink-0 hover:opacity-70 transition-opacity">
            <X size={13} />
          </button>
        </div>
      )}
      {outOfFundsError && (
        <div className={cn("fixed left-0 right-0 z-[60] flex items-center gap-3 px-4 py-2 bg-warn text-black text-xs font-medium", apiCreditError ? "top-8" : "top-0")}>
          <AlertTriangle size={13} className="flex-shrink-0" />
          <span>Insufficient funds — auto-trading has been stopped. Add funds or reset your paper balance in Settings.</span>
          <button onClick={() => setOutOfFundsError(false)} className="ml-auto flex-shrink-0 hover:opacity-70 transition-opacity">
            <X size={13} />
          </button>
        </div>
      )}
    <nav className={cn("fixed left-0 right-0 z-50 h-12 bg-surface border-b border-border flex items-center px-4 gap-6", bannerCount === 2 ? "top-16" : bannerCount === 1 ? "top-8" : "top-0")}>
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-2 h-2 rounded-full bg-bull animate-pulse-bull" />
        <span className="text-bull font-bold tracking-widest text-sm glow-bull">QUANT</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors",
              pathname === href
                ? "bg-bull/10 text-bull border border-bull/20"
                : "text-text-dim hover:text-text hover:bg-border"
            )}
          >
            <Icon size={13} />
            {label}
          </Link>
        ))}
      </div>

      <div className="flex-1" />

      {/* Portfolio value */}
      <div className="flex items-center gap-4 text-xs">
        {isLive && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-bear border border-bear/40 bg-bear/10 rounded px-2 py-0.5 tracking-wider">
            ● LIVE
          </div>
        )}
        <div className="text-text-dim">
          {isLive ? "Account" : "Portfolio"}:{" "}
          <span className={cn("font-bold", isLive ? "text-bear" : "text-info")}>
            {portfolioValue === null ? "—" : `$${portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        </div>
        <div className="text-text-dim">
          {isLive ? "Day" : ""} P&L:{" "}
          <span className={cn("font-bold", (dayPnl ?? 0) >= 0 ? "text-bull" : "text-bear")}>
            {dayPnl === null ? "—" : `${(dayPnl ?? 0) >= 0 ? "+" : ""}$${Math.abs(dayPnl ?? 0).toFixed(2)}`}
          </span>
        </div>
        {autoTradeEnabled && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] border rounded px-2 py-0.5",
            useStore.getState().autoTradeSettings?.allowLiveAutoTrade && useStore.getState().alpacaMode === "live"
              ? "text-bear border-bear/40 bg-bear/10"
              : "text-accent border-accent/30 bg-accent/5"
          )}>
            <Bot size={11} />
            <span className="font-bold">AUTO</span>
            {useStore.getState().alpacaMode === "live" && useStore.getState().autoTradeSettings?.allowLiveAutoTrade && (
              <span className="font-bold text-bear">LIVE</span>
            )}
            <span className="text-text-dim">{autoTradeDailyCount} trades</span>
          </div>
        )}
        {tweets.length > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-info border border-info/20 rounded px-2 py-0.5 bg-info/5">
            <Twitter size={10} />
            <span>{tweets.length}</span>
          </div>
        )}
        <div className={cn("text-xs font-bold tracking-wider", PHASE_COLOR[phase])}>
          <span className="animate-blink">▮</span> {PHASE_LABEL[phase]}
        </div>
      </div>
    </nav>
    </>
  );
}
