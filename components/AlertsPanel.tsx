"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import { Bell, BellOff, Plus, Trash2, CheckCircle } from "lucide-react";
import type { AlertType } from "@/lib/types";

export default function AlertsPanel() {
  const alerts = useStore((s) => s.alerts);
  const quotes = useStore((s) => s.quotes);
  const addAlert = useStore((s) => s.addAlert);
  const triggerAlert = useStore((s) => s.triggerAlert);
  const deleteAlert = useStore((s) => s.deleteAlert);
  const watchlist = useStore((s) => s.watchlist);

  const [showForm, setShowForm] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCondition, setNewCondition] = useState<"ABOVE" | "BELOW">("ABOVE");
  const [triggered, setTriggered] = useState<string[]>([]);

  // Check price alerts
  useEffect(() => {
    const untriggered = alerts.filter((a) => !a.triggered && a.type === "PRICE" && a.price);
    for (const alert of untriggered) {
      const q = quotes[alert.ticker];
      if (!q) continue;
      const hit =
        (alert.condition === "ABOVE" && q.price >= alert.price!) ||
        (alert.condition === "BELOW" && q.price <= alert.price!);
      if (hit && !triggered.includes(alert.id)) {
        triggerAlert(alert.id);
        setTriggered((prev) => [...prev, alert.id]);
        // Browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`🚨 ${alert.ticker} Alert`, { body: alert.message });
        }
      }
    }
  }, [quotes, alerts, triggerAlert, triggered]);

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker || !newPrice) return;
    addAlert({
      ticker: newTicker.toUpperCase(),
      type: "PRICE",
      message: `${newTicker.toUpperCase()} ${newCondition === "ABOVE" ? "above" : "below"} $${newPrice}`,
      price: parseFloat(newPrice),
      condition: newCondition,
    });
    setNewTicker("");
    setNewPrice("");
    setShowForm(false);
  };

  const requestNotifPermission = () => {
    if ("Notification" in window) Notification.requestPermission();
  };

  const active = alerts.filter((a) => !a.triggered);
  const fired = alerts.filter((a) => a.triggered);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-warn" />
          <span className="text-sm font-bold text-text">Alerts</span>
          {active.length > 0 && (
            <span className="px-2 py-0.5 bg-warn/20 text-warn text-[10px] rounded-full">{active.length} active</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={requestNotifPermission}
            className="text-[10px] text-text-dim hover:text-info transition-colors"
          >
            Enable push
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-3 py-1.5 bg-bull/10 text-bull border border-bull/30 rounded text-xs hover:bg-bull/20 transition-colors"
          >
            <Plus size={12} /> Add Alert
          </button>
        </div>
      </div>

      {/* Add Alert Form */}
      {showForm && (
        <form onSubmit={handleAddAlert} className="bg-surface border border-border rounded p-4 space-y-3 animate-slide-in">
          <div className="text-xs font-bold text-text-dim mb-2">NEW PRICE ALERT</div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-text-dim mb-1 block">TICKER</label>
              <input
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text font-mono uppercase focus:border-info outline-none"
                list="ticker-suggestions"
              />
              <datalist id="ticker-suggestions">
                {watchlist.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] text-text-dim mb-1 block">CONDITION</label>
              <div className="flex">
                {(["ABOVE", "BELOW"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCondition(c)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] border transition-colors",
                      c === "ABOVE" ? "rounded-l" : "rounded-r border-l-0",
                      newCondition === c ? "bg-info/10 text-info border-info/30" : "text-text-dim border-border"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-dim mb-1 block">PRICE</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                step="0.01"
                placeholder="0.00"
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text font-mono focus:border-info outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-1.5 bg-warn/20 text-warn border border-warn/30 rounded text-xs font-bold hover:bg-warn/30 transition-colors">
              Set Alert
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-1.5 text-text-dim border border-border rounded text-xs hover:text-text transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Active Alerts */}
      {active.length > 0 && (
        <div className="bg-surface border border-border rounded">
          <div className="px-4 py-2 border-b border-border">
            <span className="text-[10px] font-bold text-text-dim tracking-wider">WATCHING ({active.length})</span>
          </div>
          {active.map((alert) => {
            const q = quotes[alert.ticker];
            const currentPrice = q?.price;
            const dist = currentPrice && alert.price
              ? ((alert.price - currentPrice) / currentPrice * 100)
              : null;

            return (
              <div key={alert.id} className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-border transition-colors">
                <div className="flex items-center gap-3">
                  <Bell size={12} className="text-warn animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text">{alert.ticker}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px]",
                        alert.condition === "ABOVE" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear"
                      )}>
                        {alert.condition}
                      </span>
                      <span className="text-xs font-mono text-text">${alert.price?.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-text-dim mt-0.5">
                      {currentPrice && (
                        <span>Current: <span className="text-text font-mono">${formatPrice(currentPrice)}</span>
                          {dist !== null && (
                            <span className={cn("ml-2", Math.abs(dist) < 1 ? "text-warn" : "text-text-dim")}>
                              ({dist > 0 ? "+" : ""}{dist.toFixed(2)}% away)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteAlert(alert.id)} className="text-text-dim hover:text-bear transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Triggered Alerts */}
      {fired.length > 0 && (
        <div className="bg-surface border border-border rounded">
          <div className="px-4 py-2 border-b border-border">
            <span className="text-[10px] font-bold text-text-dim tracking-wider">TRIGGERED ({fired.length})</span>
          </div>
          {fired.slice(0, 10).map((alert) => (
            <div key={alert.id} className="flex items-center justify-between px-4 py-3 border-b border-border opacity-60">
              <div className="flex items-center gap-3">
                <CheckCircle size={12} className="text-bull" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text">{alert.ticker}</span>
                    <span className="text-xs text-text-dim">{alert.message}</span>
                  </div>
                  <div className="text-[10px] text-text-dim">
                    Triggered: {alert.triggeredAt ? formatDateTime(alert.triggeredAt) : "—"}
                  </div>
                </div>
              </div>
              <button onClick={() => deleteAlert(alert.id)} className="text-text-dim hover:text-bear transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-text-dim">
          <BellOff size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No alerts set</p>
          <p className="text-xs mt-1">Click "Add Alert" to watch a price level</p>
        </div>
      )}
    </div>
  );
}
