"use client";
import { useStore } from "@/lib/store";
import { useAutoTradeEngine } from "@/lib/autoTrade";
import { cn, isMarketOpen } from "@/lib/utils";
import {
  Bot, Power, PowerOff, CheckCircle2, XCircle, Clock, ShieldAlert,
  TrendingUp, TrendingDown, Settings2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";
import type { AutoTradeLog } from "@/lib/types";

export default function AutoTradePanel() {
  // Mount the engine — it hooks into the store and auto-fires
  useAutoTradeEngine();

  const autoTradeEnabled = useStore((s) => s.autoTradeEnabled);
  const setAutoTradeEnabled = useStore((s) => s.setAutoTradeEnabled);
  const settings = useStore((s) => s.autoTradeSettings);
  const setAutoTradeSettings = useStore((s) => s.setAutoTradeSettings);
  const logs = useStore((s) => s.autoTradeLogs);
  const dailyPnl = useStore((s) => s.autoTradeDailyPnl);
  const dailyCount = useStore((s) => s.autoTradeDailyCount);

  const [showSettings, setShowSettings] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [liveAckText, setLiveAckText] = useState("");

  const alpacaMode = useStore((s) => s.alpacaMode);
  const isLive = alpacaMode === "live";
  const recentExecuted = logs.filter((l) => l.decision === "EXECUTED").length;
  const recentSkipped = logs.filter((l) => l.decision === "SKIPPED").length;
  const marketOpen = isMarketOpen();
  const blockedByHours = settings.marketHoursOnly && !marketOpen;
  const blockedByLive = isLive && !settings.allowLiveAutoTrade;

  const hitDailyLoss = dailyPnl <= -settings.maxDailyLoss;
  const hitDailyTrades = dailyCount >= settings.maxDailyTrades;

  return (
    <div className="bg-surface border border-border rounded overflow-hidden">
      {/* Header / Toggle */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer transition-colors",
          autoTradeEnabled ? "bg-accent/10" : "hover:bg-border"
        )}
        onClick={() => setAutoTradeEnabled(!autoTradeEnabled)}
      >
        <div className="flex items-center gap-2">
          <Bot size={14} className={autoTradeEnabled ? "text-accent" : "text-text-dim"} />
          <span className="text-xs font-bold text-text">AUTO-TRADE ENGINE</span>
          {autoTradeEnabled && (
            <span className="flex items-center gap-1 text-[10px] text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-bull" />
              ACTIVE
            </span>
          )}
          {(hitDailyLoss || hitDailyTrades) && autoTradeEnabled && (
            <span className="flex items-center gap-1 text-[10px] text-bear">
              <ShieldAlert size={10} /> CIRCUIT BREAKER
            </span>
          )}
          {autoTradeEnabled && blockedByHours && (
            <span className="text-[10px] text-text-dim">market closed — waiting</span>
          )}
          {autoTradeEnabled && blockedByLive && (
            <span className="flex items-center gap-1 text-[10px] text-bear">
              <ShieldAlert size={10} /> disabled in live mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-text-dim text-right">
            <span className="text-bull">{dailyCount}</span>/{settings.maxDailyTrades} trades
            {" · "}
            <span className={dailyPnl >= 0 ? "text-bull" : "text-bear"}>
              {dailyPnl >= 0 ? "+" : ""}${dailyPnl.toFixed(2)}
            </span>
          </div>
          {autoTradeEnabled
            ? <Power size={16} className="text-accent" />
            : <PowerOff size={16} className="text-text-dim" />}
        </div>
      </div>

      {/* Warning banner when disabled but have open positions */}
      {!autoTradeEnabled && recentExecuted > 0 && (
        <div className="px-4 py-2 bg-warn/10 border-b border-warn/20 text-[10px] text-warn flex items-center gap-2">
          <ShieldAlert size={11} />
          Auto-trade paused — {recentExecuted} positions may still be open. Manage them in the Trade tab.
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <StatCell label="Executed Today" value={String(recentExecuted)} color="text-bull" />
        <StatCell label="Skipped" value={String(recentSkipped)} color="text-warn" />
        <StatCell label="Daily P&L" value={`${dailyPnl >= 0 ? "+" : ""}$${dailyPnl.toFixed(2)}`} color={dailyPnl >= 0 ? "text-bull" : "text-bear"} />
      </div>

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-border transition-colors border-b border-border"
      >
        <Settings2 size={11} className="text-text-dim" />
        <span className="text-[11px] text-text-dim">Settings</span>
        {showSettings ? <ChevronUp size={11} className="ml-auto text-text-dim" /> : <ChevronDown size={11} className="ml-auto text-text-dim" />}
      </button>

      {showSettings && (
        <div className="px-4 py-3 border-b border-border grid grid-cols-2 gap-3 text-[11px]">
          <NumInput
            label="Confidence %" hint="Min AI confidence to trade"
            value={settings.confidenceThreshold * 100}
            min={50} max={99}
            onChange={(v) => setAutoTradeSettings({ confidenceThreshold: v / 100 })}
          />
          <NumInput
            label="Risk Per Trade %"
            hint="% of portfolio risked"
            value={settings.riskPerTrade}
            min={0.1} max={5} step={0.1}
            onChange={(v) => setAutoTradeSettings({ riskPerTrade: v })}
          />
          <NumInput
            label="Max Position $"
            hint="Hard cap per trade"
            value={settings.maxPositionSize}
            min={100} max={25000} step={100}
            onChange={(v) => setAutoTradeSettings({ maxPositionSize: v })}
          />
          <NumInput
            label="Daily Loss Limit $"
            hint="Stop after this loss"
            value={settings.maxDailyLoss}
            min={50} max={5000} step={50}
            onChange={(v) => setAutoTradeSettings({ maxDailyLoss: v })}
          />
          <NumInput
            label="Max Daily Trades"
            hint="Orders/day limit"
            value={settings.maxDailyTrades}
            min={1} max={50}
            onChange={(v) => setAutoTradeSettings({ maxDailyTrades: v })}
          />
          <NumInput
            label="Cooldown (min)"
            hint="Between same-ticker trades"
            value={settings.cooldownMinutes}
            min={1} max={60}
            onChange={(v) => setAutoTradeSettings({ cooldownMinutes: v })}
          />
          <ToggleInput
            label="Allow Shorts"
            hint="Take SELL signals"
            value={settings.allowShorts}
            onChange={(v) => setAutoTradeSettings({ allowShorts: v })}
          />
          <ToggleInput
            label="Require X Confirmation"
            hint="Only trade when X sentiment agrees"
            value={settings.requireXConfirmation}
            onChange={(v) => setAutoTradeSettings({ requireXConfirmation: v })}
          />
          <ToggleInput
            label="Market Hours Only"
            hint="Skip outside 9:30–4:00 ET"
            value={settings.marketHoursOnly}
            onChange={(v) => setAutoTradeSettings({ marketHoursOnly: v })}
          />

          {/* Live auto-trade — full-width with warning */}
          <div className="col-span-2 border-t border-bear/20 pt-3 mt-1">
            <div className={cn("rounded border p-3 space-y-2", settings.allowLiveAutoTrade ? "bg-bear/10 border-bear/40" : "border-border")}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-bear">
                    <ShieldAlert size={10} /> LIVE AUTO-TRADE — REAL MONEY
                  </div>
                  <div className="text-[9px] text-text-dim mt-0.5">
                    Engine submits real orders to Alpaca automatically. No confirmation dialogs.
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!settings.allowLiveAutoTrade) {
                      setShowLiveConfirm(true);
                    } else {
                      setAutoTradeSettings({ allowLiveAutoTrade: false });
                    }
                  }}
                  className={cn("w-8 h-4 rounded-full transition-colors flex-shrink-0 ml-3", settings.allowLiveAutoTrade ? "bg-bear" : "bg-dim")}
                >
                  <span className={cn("block w-3 h-3 rounded-full bg-white transition-transform mx-0.5", settings.allowLiveAutoTrade ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>

              {settings.allowLiveAutoTrade && (
                <p className="text-[9px] text-bear">
                  ⚠ Active — Claude will autonomously place real orders. Monitor closely and set tight daily loss limits.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live auto-trade confirmation dialog */}
      {showLiveConfirm && (
        <div className="mx-4 mb-3 border border-bear/50 rounded p-4 bg-bear/10 space-y-3">
          <p className="text-bear font-bold text-xs flex items-center gap-1.5">
            <ShieldAlert size={13} /> Enable live auto-trading?
          </p>
          <ul className="text-[11px] text-text-dim space-y-1 list-disc list-inside">
            <li>Claude will place <span className="text-text font-bold">real orders with real money</span> automatically, without asking you first</li>
            <li>Orders execute at market prices — slippage and losses can exceed estimates</li>
            <li>Set a <span className="text-text font-bold">daily loss limit</span> and <span className="text-text font-bold">max position size</span> above before enabling</li>
            <li>You can disable this at any time — in-flight orders already submitted to Alpaca will not be cancelled automatically</li>
            <li>AI signals are probabilistic, not guaranteed — you can and will lose money</li>
          </ul>
          <div>
            <p className="text-[10px] text-text-dim mb-1">Type <span className="text-bear font-mono">I UNDERSTAND</span> to confirm:</p>
            <input
              value={liveAckText}
              onChange={(e) => setLiveAckText(e.target.value)}
              placeholder="I UNDERSTAND"
              className="w-full bg-bg border border-bear/40 rounded px-2 py-1.5 text-xs font-mono text-bear focus:outline-none focus:border-bear"
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={liveAckText.trim() !== "I UNDERSTAND"}
              onClick={() => {
                setAutoTradeSettings({ allowLiveAutoTrade: true });
                setShowLiveConfirm(false);
                setLiveAckText("");
              }}
              className="px-4 py-1.5 bg-bear/20 text-bear border border-bear/40 rounded text-xs font-bold hover:bg-bear/30 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Enable live auto-trade
            </button>
            <button
              onClick={() => { setShowLiveConfirm(false); setLiveAckText(""); }}
              className="px-4 py-1.5 text-text-dim border border-border rounded text-xs hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Log */}
      <div className="max-h-72 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="px-4 py-6 text-center text-[11px] text-text-dim">
            No auto-trade activity yet. Enable the engine above.
          </div>
        ) : (
          logs.slice(0, 50).map((log) => <LogRow key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

function LogRow({ log }: { log: AutoTradeLog }) {
  const [expanded, setExpanded] = useState(false);

  const Icon =
    log.decision === "EXECUTED"
      ? log.signal?.signal === "BUY" ? TrendingUp : TrendingDown
      : log.decision === "BLOCKED"
      ? ShieldAlert
      : Clock;

  const color =
    log.decision === "EXECUTED"
      ? log.signal?.signal === "BUY" ? "text-bull" : "text-bear"
      : log.decision === "BLOCKED"
      ? "text-bear"
      : "text-text-dim";

  const bg =
    log.decision === "EXECUTED" ? "border-l-2 border-l-bull/60" : "";

  return (
    <div
      className={cn("px-4 py-2 border-b border-border/50 hover:bg-border cursor-pointer transition-colors", bg)}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon size={11} className={color} />
          <span className={cn("text-[10px] font-bold", color)}>{log.decision}</span>
          {log.ticker !== "SYSTEM" && (
            <span className="text-[10px] font-bold text-text">{log.ticker}</span>
          )}
          {log.decision === "EXECUTED" && log.sharesQty && (
            <span className="text-[10px] text-text-dim">
              {log.sharesQty}sh · ${log.positionSize?.toFixed(2)}
            </span>
          )}
        </div>
        <span className="text-[9px] text-text-dim flex-shrink-0">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      </div>
      {expanded && (
        <p className="mt-1.5 text-[10px] text-text-dim leading-relaxed pl-5">{log.reason}</p>
      )}
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-4 py-2 text-center">
      <div className="text-[9px] text-text-dim mb-0.5">{label.toUpperCase()}</div>
      <div className={cn("text-sm font-bold font-mono", color)}>{value}</div>
    </div>
  );
}

function NumInput({
  label, hint, value, min, max, step = 1, onChange,
}: {
  label: string; hint: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-[9px] text-text-dim tracking-wider block mb-0.5">{label.toUpperCase()}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full bg-bg border border-border rounded px-2 py-1 text-[11px] text-text font-mono focus:border-accent outline-none"
      />
      <div className="text-[9px] text-text-dim mt-0.5">{hint}</div>
    </div>
  );
}

function ToggleInput({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[9px] text-text-dim tracking-wider">{label.toUpperCase()}</div>
        <div className="text-[9px] text-text-dim mt-0.5">{hint}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-8 h-4 rounded-full transition-colors mt-0.5 flex-shrink-0",
          value ? "bg-accent" : "bg-dim"
        )}
      >
        <span
          className={cn(
            "block w-3 h-3 rounded-full bg-white transition-transform mx-0.5",
            value ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
