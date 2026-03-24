"use client";
import { useStore } from "@/lib/store";
import { cn, formatPrice, formatDateTime, formatCurrency } from "@/lib/utils";
import { BookOpen, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import type { Trade } from "@/lib/types";

export default function JournalPage() {
  const trades = useStore((s) => s.trades);
  const cashBalance = useStore((s) => s.cashBalance);
  const alpacaMode = useStore((s) => s.alpacaMode);
  const liveAccount = useStore((s) => s.liveAccount);
  const isLive = alpacaMode === "live";

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

  const totalReturn = isLive && liveAccount
    ? liveAccount.dayPnlPct
    : ((cashBalance - 25000) / 25000) * 100;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-info" />
          <h1 className="text-base font-bold text-text">Trade Journal</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total P&L" value={formatCurrency(totalPnl)} color={totalPnl >= 0 ? "text-bull" : "text-bear"} />
          <StatCard label="Total Return" value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`} color={totalReturn >= 0 ? "text-bull" : "text-bear"} />
          <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} color={winRate >= 50 ? "text-bull" : "text-bear"} sub={`${wins.length}W / ${losses.length}L`} />
          <StatCard label="Profit Factor" value={profitFactor.toFixed(2)} color={profitFactor >= 1.5 ? "text-bull" : profitFactor >= 1 ? "text-warn" : "text-bear"} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Trades" value={String(trades.length)} color="text-info" />
          <StatCard label="Avg Win" value={`+$${avgWin.toFixed(2)}`} color="text-bull" />
          <StatCard label="Avg Loss" value={`-$${avgLoss.toFixed(2)}`} color="text-bear" />
        </div>

        {/* Trade History */}
        <div className="bg-surface border border-border rounded">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <BarChart2 size={13} className="text-text-dim" />
            <span className="text-xs font-bold text-text-dim tracking-wider">TRADE HISTORY</span>
          </div>

          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-dim">
              <p className="text-sm">No trades yet</p>
              <p className="text-xs mt-1">Closed positions will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-text-dim">
                    <th className="text-left px-4 py-2">TICKER</th>
                    <th className="text-left px-4 py-2">SIDE</th>
                    <th className="text-right px-4 py-2">QTY</th>
                    <th className="text-right px-4 py-2">ENTRY</th>
                    <th className="text-right px-4 py-2">EXIT</th>
                    <th className="text-right px-4 py-2">P&L</th>
                    <th className="text-right px-4 py-2">%</th>
                    <th className="text-left px-4 py-2">OPENED</th>
                    <th className="text-left px-4 py-2">CLOSED</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => <TradeRow key={trade.id} trade={trade} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const isWin = trade.pnl > 0;
  return (
    <tr className={cn("border-b border-border/50 hover:bg-border transition-colors", isWin ? "row-bull" : "row-bear")}>
      <td className="px-4 py-2.5 font-bold text-text">{trade.ticker}</td>
      <td className="px-4 py-2.5">
        <span className={cn("flex items-center gap-1", trade.side === "LONG" ? "text-bull" : "text-bear")}>
          {trade.side === "LONG" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trade.side}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right text-text font-mono">{trade.quantity}</td>
      <td className="px-4 py-2.5 text-right font-mono text-text">${formatPrice(trade.entryPrice)}</td>
      <td className="px-4 py-2.5 text-right font-mono text-text">${formatPrice(trade.exitPrice)}</td>
      <td className={cn("px-4 py-2.5 text-right font-bold font-mono", isWin ? "text-bull" : "text-bear")}>
        {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
      </td>
      <td className={cn("px-4 py-2.5 text-right font-mono", isWin ? "text-bull" : "text-bear")}>
        {trade.pnlPct >= 0 ? "+" : ""}{trade.pnlPct.toFixed(2)}%
      </td>
      <td className="px-4 py-2.5 text-text-dim font-mono text-[10px]">
        {new Date(trade.entryTime).toLocaleString()}
      </td>
      <td className="px-4 py-2.5 text-text-dim font-mono text-[10px]">
        {new Date(trade.exitTime).toLocaleString()}
      </td>
    </tr>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded p-4">
      <div className="text-[10px] text-text-dim mb-1 tracking-wider">{label.toUpperCase()}</div>
      <div className={cn("text-xl font-bold font-mono", color)}>{value}</div>
      {sub && <div className="text-[10px] text-text-dim mt-1">{sub}</div>}
    </div>
  );
}
