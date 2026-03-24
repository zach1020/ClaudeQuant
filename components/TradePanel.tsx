"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn, formatPrice, formatCurrency } from "@/lib/utils";
import { ShoppingCart, X, TrendingUp, TrendingDown, ShieldAlert, Loader2 } from "lucide-react";
import LiveAccountPanel from "./LiveAccountPanel";
import type { OrderType } from "@/lib/types";

export default function TradePanel() {
  const quotes = useStore((s) => s.quotes);
  const positions = useStore((s) => s.positions);
  const orders = useStore((s) => s.orders);
  const cashBalance = useStore((s) => s.cashBalance);
  const executeOrder = useStore((s) => s.executeOrder);
  const closePosition = useStore((s) => s.closePosition);
  const selectedTicker = useStore((s) => s.selectedTicker);
  const alpacaMode = useStore((s) => s.alpacaMode);
  const alpacaKey = useStore((s) => s.alpacaKey);
  const alpacaSecret = useStore((s) => s.alpacaSecret);
  const alpacaLiveKey = useStore((s) => s.alpacaLiveKey);
  const alpacaLiveSecret = useStore((s) => s.alpacaLiveSecret);
  const liveAccount = useStore((s) => s.liveAccount);
  const recordApiCall = useStore((s) => s.recordApiCall);

  const [ticker, setTicker] = useState(selectedTicker);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveSuccess, setLiveSuccess] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const isLive = alpacaMode === "live";
  const quote = quotes[ticker];
  const currentPrice = quote?.price ?? 0;
  const cost = parseFloat(quantity || "0") * (parseFloat(price || String(currentPrice)));

  const activeKey = isLive ? alpacaLiveKey : alpacaKey;
  const activeSecret = isLive ? alpacaLiveSecret : alpacaSecret;

  const submitToAlpaca = async () => {
    setSubmitting(true);
    setLiveError(null);
    setLiveSuccess(null);
    try {
      const res = await fetch("/api/trade/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: alpacaMode,
          apiKey: activeKey,
          apiSecret: activeSecret,
          symbol: ticker.toUpperCase(),
          side,
          type: orderType,
          qty: parseInt(quantity),
          limitPrice: orderType !== "MARKET" ? parseFloat(price) : undefined,
          stopPrice: stopLoss ? parseFloat(stopLoss) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setLiveError(data.error ?? "Order rejected by Alpaca");
      } else {
        recordApiCall("alpaca");
        const orderId = data.order?.id ?? "unknown";
        setLiveSuccess(`Order submitted: ${side} ${quantity} ${ticker} (ID: ${orderId.slice(0, 8)}...)`);
        // Also record locally for the journal
        executeOrder({
          ticker: ticker.toUpperCase(),
          side,
          type: orderType,
          quantity: parseInt(quantity),
          price: orderType !== "MARKET" ? parseFloat(price) : undefined,
          stopPrice: stopLoss ? parseFloat(stopLoss) : undefined,
        });
      }
    } catch (err) {
      setLiveError(`Network error: ${err instanceof Error ? err.message : "unknown"}`);
    }
    setSubmitting(false);
    setConfirmPending(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLiveError(null);
    setLiveSuccess(null);

    if (isLive) {
      // Require confirmation for real-money orders
      setConfirmPending(true);
    } else {
      executeOrder({
        ticker: ticker.toUpperCase(),
        side,
        type: orderType,
        quantity: parseInt(quantity),
        price: orderType !== "MARKET" ? parseFloat(price) : undefined,
        stopPrice: stopLoss ? parseFloat(stopLoss) : undefined,
      });
    }
  };

  const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const portfolioValue = cashBalance + positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4">
      {/* Mode banner */}
      {isLive ? (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-bear/10 border border-bear/40 rounded text-bear text-xs font-bold">
          <ShieldAlert size={14} />
          LIVE MODE — ORDERS USE REAL MONEY VIA ALPACA
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-info/5 border border-info/20 rounded text-info text-xs">
          <ShoppingCart size={13} />
          Paper trading — simulated $25,000 account. No real money.
        </div>
      )}

      {/* Live account stats (when live) */}
      {isLive && <LiveAccountPanel />}

      {/* Paper account stats (when paper) */}
      {!isLive && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Cash" value={`$${cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} color="text-info" />
          <StatCard label="Portfolio" value={`$${portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} color="text-text" />
          <StatCard label="Unrealized P&L" value={formatCurrency(totalUnrealized)} color={totalUnrealized >= 0 ? "text-bull" : "text-bear"} />
        </div>
      )}

      {/* Order Form */}
      <div className={cn("border rounded p-4", isLive ? "bg-surface border-bear/30" : "bg-surface border-border")}>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={13} className={isLive ? "text-bear" : "text-text-dim"} />
          <span className={cn("text-xs font-bold tracking-wider", isLive ? "text-bear" : "text-text-dim")}>
            NEW ORDER — {isLive ? "⚠ LIVE" : "PAPER"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-text-dim mb-1 block">TICKER</label>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text font-mono uppercase focus:border-info outline-none"
                placeholder="AAPL"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-dim mb-1 block">SIDE</label>
              <div className="flex">
                {(["BUY", "SELL"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold border transition-colors",
                      s === "BUY"
                        ? side === "BUY" ? "bg-bull/20 text-bull border-bull/50" : "text-text-dim border-border hover:text-bull"
                        : side === "SELL" ? "bg-bear/20 text-bear border-bear/50" : "text-text-dim border-border hover:text-bear",
                      s === "BUY" ? "rounded-l" : "rounded-r border-l-0"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-text-dim mb-1 block">ORDER TYPE</label>
            <div className="flex gap-1">
              {(["MARKET", "LIMIT", "STOP_LIMIT"] as const).map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setOrderType(ot)}
                  className={cn(
                    "px-3 py-1 text-[10px] border rounded transition-colors",
                    orderType === ot ? "bg-info/10 text-info border-info/30" : "text-text-dim border-border hover:text-text"
                  )}
                >
                  {ot.replace("_", "-")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-text-dim mb-1 block">QUANTITY</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text font-mono focus:border-info outline-none"
              />
            </div>
            {orderType !== "MARKET" && (
              <div className="flex-1">
                <label className="text-[10px] text-text-dim mb-1 block">LIMIT PRICE</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.01"
                  placeholder={currentPrice ? formatPrice(currentPrice) : "0.00"}
                  className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text font-mono focus:border-info outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-text-dim mb-1 block">STOP LOSS</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                step="0.01"
                placeholder="optional"
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text font-mono focus:border-bear outline-none"
              />
            </div>
          </div>

          {currentPrice > 0 && (
            <div className="flex justify-between text-[11px] py-2 border-t border-border">
              <span className="text-text-dim">
                Market price: <span className="text-text font-mono">${formatPrice(currentPrice)}</span>
              </span>
              <span className="text-text-dim">
                Est. cost: <span className={cn("font-bold", cost <= (isLive ? (liveAccount?.buyingPower ?? 0) : cashBalance) ? "text-info" : "text-bear")}>
                  ${cost.toFixed(2)}
                </span>
              </span>
            </div>
          )}

          {/* Live confirmation overlay */}
          {confirmPending ? (
            <div className="space-y-2 border border-bear/50 rounded p-3 bg-bear/10">
              <p className="text-xs text-bear font-bold flex items-center gap-1">
                <ShieldAlert size={12} /> Confirm LIVE order — this uses real money
              </p>
              <p className="text-[11px] text-text">
                {side} {quantity} {ticker.toUpperCase()} @ {orderType === "MARKET" ? "market price" : `$${price}`}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitToAlpaca}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-bear/20 text-bear border border-bear/40 rounded text-xs font-bold hover:bg-bear/30 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
                  {submitting ? "Submitting..." : "Confirm — place real order"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmPending(false)}
                  className="px-4 py-1.5 text-text-dim border border-border rounded text-xs hover:text-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!ticker || !quantity}
              className={cn(
                "w-full py-2 rounded text-xs font-bold transition-colors disabled:opacity-50",
                isLive
                  ? side === "BUY"
                    ? "bg-bear/10 text-bear hover:bg-bear/20 border border-bear/40"
                    : "bg-bear/10 text-bear hover:bg-bear/20 border border-bear/40"
                  : side === "BUY"
                  ? "bg-bull/20 text-bull hover:bg-bull/30 border border-bull/40"
                  : "bg-bear/20 text-bear hover:bg-bear/30 border border-bear/40"
              )}
            >
              {isLive && "⚠ "}{side === "BUY" ? "▲" : "▼"} {side} {quantity} {ticker} @ {orderType === "MARKET" ? "MARKET" : `$${price || "0"}`}
              {isLive && " — REAL ORDER"}
            </button>
          )}

          {liveError && (
            <div className="text-[11px] text-bear border border-bear/30 rounded p-2 bg-bear/5">
              ✗ {liveError}
            </div>
          )}
          {liveSuccess && (
            <div className="text-[11px] text-bull border border-bull/30 rounded p-2 bg-bull/5">
              ✓ {liveSuccess}
            </div>
          )}
        </form>
      </div>

      {/* Open Positions */}
      {positions.length > 0 && (
        <div className="bg-surface border border-border rounded">
          <div className="px-4 py-2 border-b border-border">
            <span className="text-[10px] font-bold text-text-dim tracking-wider">OPEN POSITIONS ({positions.length})</span>
          </div>
          {positions.map((pos) => {
            const q = quotes[pos.ticker];
            const curPrice = q?.price ?? pos.currentPrice;
            const pnl = pos.side === "LONG"
              ? (curPrice - pos.entryPrice) * pos.quantity
              : (pos.entryPrice - curPrice) * pos.quantity;
            const pnlPct = pos.side === "LONG"
              ? ((curPrice - pos.entryPrice) / pos.entryPrice) * 100
              : ((pos.entryPrice - curPrice) / pos.entryPrice) * 100;
            const up = pnl >= 0;
            return (
              <div key={pos.id} className={cn("flex items-center justify-between px-4 py-3 border-b border-border", up ? "row-bull" : "row-bear")}>
                <div className="flex items-center gap-3">
                  <div className={cn("flex items-center gap-1 text-xs font-bold", pos.side === "LONG" ? "text-bull" : "text-bear")}>
                    {pos.side === "LONG" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {pos.side}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-text">{pos.ticker}</div>
                    <div className="text-[10px] text-text-dim">{pos.quantity} @ ${formatPrice(pos.entryPrice)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={cn("text-xs font-bold font-mono", up ? "text-bull" : "text-bear")}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    </div>
                    <div className={cn("text-[10px]", up ? "text-bull" : "text-bear")}>
                      {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-[10px] text-text-dim text-right">
                    <div>${formatPrice(curPrice)}</div>
                    <div>now</div>
                  </div>
                  <button onClick={() => closePosition(pos.id, curPrice)} className="p-1 text-text-dim hover:text-bear transition-colors" title="Close position">
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div className="bg-surface border border-border rounded">
          <div className="px-4 py-2 border-b border-border">
            <span className="text-[10px] font-bold text-text-dim tracking-wider">RECENT ORDERS</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border text-text-dim">
                  <th className="text-left px-3 py-2">TIME</th>
                  <th className="text-left px-3 py-2">TICKER</th>
                  <th className="text-left px-3 py-2">SIDE</th>
                  <th className="text-right px-3 py-2">QTY</th>
                  <th className="text-right px-3 py-2">PRICE</th>
                  <th className="text-right px-3 py-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-border">
                    <td className="px-3 py-1.5 text-text-dim font-mono">{new Date(order.createdAt).toLocaleTimeString()}</td>
                    <td className="px-3 py-1.5 font-bold text-text">{order.ticker}</td>
                    <td className={cn("px-3 py-1.5 font-bold", order.side === "BUY" ? "text-bull" : "text-bear")}>{order.side}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-text">{order.quantity}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-text">${formatPrice(order.filledPrice ?? order.price ?? 0)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px]", order.status === "FILLED" ? "bg-bull/20 text-bull" : order.status === "CANCELLED" ? "bg-bear/20 text-bear" : "bg-warn/20 text-warn")}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface border border-border rounded p-3">
      <div className="text-[10px] text-text-dim mb-1">{label}</div>
      <div className={cn("text-sm font-bold font-mono", color)}>{value}</div>
    </div>
  );
}
