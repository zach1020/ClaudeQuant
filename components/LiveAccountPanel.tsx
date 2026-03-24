"use client";
import { useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import type { LivePosition } from "@/lib/types";

export function useLiveAccountSync() {
  const alpacaLiveKey = useStore((s) => s.alpacaLiveKey);
  const alpacaLiveSecret = useStore((s) => s.alpacaLiveSecret);
  const alpacaMode = useStore((s) => s.alpacaMode);
  const setLiveAccount = useStore((s) => s.setLiveAccount);
  const recordApiCall = useStore((s) => s.recordApiCall);

  const fetchAccount = useCallback(async () => {
    if (!alpacaLiveKey || !alpacaLiveSecret) return;
    const mode = alpacaMode;
    const key = mode === "live" ? alpacaLiveKey : useStore.getState().alpacaKey;
    const secret = mode === "live" ? alpacaLiveSecret : useStore.getState().alpacaSecret;
    try {
      const res = await fetch(
        `/api/trade/account?mode=${mode}&apiKey=${encodeURIComponent(key)}&apiSecret=${encodeURIComponent(secret)}`
      );
      const data = await res.json();
      if (data.account) { setLiveAccount(data.account); recordApiCall("alpaca"); }
    } catch {}
  }, [alpacaLiveKey, alpacaLiveSecret, alpacaMode, setLiveAccount, recordApiCall]);

  useEffect(() => {
    fetchAccount();
    const interval = setInterval(fetchAccount, 15000);
    return () => clearInterval(interval);
  }, [fetchAccount]);
}

export default function LiveAccountPanel() {
  const liveAccount = useStore((s) => s.liveAccount);
  const alpacaMode = useStore((s) => s.alpacaMode);

  if (!liveAccount) return null;

  const pnlUp = liveAccount.dayPnl >= 0;

  return (
    <div className={cn(
      "rounded border p-4 space-y-3",
      alpacaMode === "live"
        ? "bg-bear/5 border-bear/40"
        : "bg-surface border-border"
    )}>
      {alpacaMode === "live" && (
        <div className="flex items-center gap-2 text-bear text-[11px] font-bold">
          <ShieldAlert size={13} />
          LIVE ACCOUNT — REAL MONEY
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <div className="text-text-dim mb-0.5">Cash</div>
          <div className="text-info font-bold font-mono text-sm">
            ${liveAccount.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-text-dim mb-0.5">Buying Power</div>
          <div className="text-text font-bold font-mono text-sm">
            ${liveAccount.buyingPower.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-text-dim mb-0.5">Portfolio Value</div>
          <div className="text-text font-mono">
            ${liveAccount.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-text-dim mb-0.5">Day P&L</div>
          <div className={cn("font-bold font-mono", pnlUp ? "text-bull" : "text-bear")}>
            {pnlUp ? "+" : ""}${liveAccount.dayPnl.toFixed(2)}
            <span className="text-[10px] ml-1">({pnlUp ? "+" : ""}{liveAccount.dayPnlPct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {liveAccount.tradingBlocked && (
        <div className="text-[10px] text-bear flex items-center gap-1">
          <ShieldAlert size={10} /> Trading is currently blocked on this account.
        </div>
      )}
      {liveAccount.patternDayTrader && (
        <div className="text-[10px] text-warn flex items-center gap-1">
          ⚠ Pattern Day Trader flag active. 4+ day trades in 5 days on accounts under $25k will be restricted.
        </div>
      )}
    </div>
  );
}
