"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Settings, Key, Eye, EyeOff, Save, CheckCircle, AlertTriangle,
  Twitter, Bot, ShieldAlert, DollarSign, Activity, RotateCcw,
} from "lucide-react";

export default function SettingsPage() {
  const store = useStore();
  const [saved, setSaved] = useState(false);
  const [liveSaved, setLiveSaved] = useState(false);
  const [xSaved, setXSaved] = useState(false);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [confirmLive, setConfirmLive] = useState(false);

  const [form, setForm] = useState({
    polygonApiKey: store.polygonApiKey,
    alpacaKey: store.alpacaKey,
    alpacaSecret: store.alpacaSecret,
    anthropicKey: store.anthropicKey,
  });

  const [liveForm, setLiveForm] = useState({
    alpacaLiveKey: store.alpacaLiveKey,
    alpacaLiveSecret: store.alpacaLiveSecret,
  });

  const [xKey, setXKey] = useState(store.xApiKey);

  const handleSave = () => {
    store.setApiKeys(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLiveSave = () => {
    store.setApiKeys(liveForm);
    setLiveSaved(true);
    setTimeout(() => setLiveSaved(false), 2000);
  };

  const handleXSave = () => {
    store.setXApiKey(xKey);
    setXSaved(true);
    setTimeout(() => setXSaved(false), 2000);
  };

  const toggleShow = (k: string) => setShow((prev) => ({ ...prev, [k]: !prev[k] }));

  const handleModeSwitch = (mode: "paper" | "live") => {
    if (mode === "live") {
      if (!store.alpacaLiveKey || !store.alpacaLiveSecret) {
        alert("Enter and save your Live Alpaca keys below before switching to live mode.");
        return;
      }
      setConfirmLive(true);
    } else {
      store.setAlpacaMode("paper");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-info" />
          <h1 className="text-base font-bold text-text">Settings</h1>
        </div>

        {/* ── Trading Mode ─────────────────────────────────────────────── */}
        <div className={cn(
          "border rounded p-5 space-y-4",
          store.alpacaMode === "live" ? "bg-bear/5 border-bear/50" : "bg-surface border-border"
        )}>
          <div className="flex items-center gap-2">
            <DollarSign size={14} className={store.alpacaMode === "live" ? "text-bear" : "text-text-dim"} />
            <span className={cn("text-xs font-bold tracking-wider", store.alpacaMode === "live" ? "text-bear" : "text-text-dim")}>
              TRADING MODE
            </span>
            {store.alpacaMode === "live" && (
              <span className="px-2 py-0.5 bg-bear/20 text-bear text-[10px] font-bold rounded border border-bear/40 ml-auto">
                ⚠ LIVE — REAL MONEY
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <ModeCard
              active={store.alpacaMode === "paper"}
              onClick={() => handleModeSwitch("paper")}
              color="info"
              title="Paper Trading"
              description="Simulated $25,000 account. Safe to experiment. No real money."
            />
            <ModeCard
              active={store.alpacaMode === "live"}
              onClick={() => handleModeSwitch("live")}
              color="bear"
              title="⚠ Live Trading"
              description="Real orders via Alpaca. Real money. Requires live API keys below."
            />
          </div>

          {store.alpacaMode === "live" && (
            <div className="bg-bear/10 border border-bear/30 rounded p-3 text-[11px] text-bear space-y-1">
              <p className="font-bold flex items-center gap-1"><ShieldAlert size={11} /> You are in LIVE mode. All orders execute with real money.</p>
              <p>Every trade submission shows a confirmation dialog. Double-check every order before confirming. Auto-trade is blocked in live mode.</p>
            </div>
          )}

          {/* Live mode confirmation dialog */}
          {confirmLive && (
            <div className="border border-bear/50 rounded p-4 bg-bear/10 space-y-3">
              <p className="text-bear font-bold text-xs flex items-center gap-2">
                <ShieldAlert size={14} /> Switch to LIVE trading?
              </p>
              <ul className="text-[11px] text-text-dim space-y-1 list-disc list-inside">
                <li>All orders placed through this app will execute with real money</li>
                <li>Alpaca is a licensed broker — your funds are SIPC-protected up to $500k</li>
                <li>Auto-trade engine is disabled in live mode for safety</li>
                <li>You can switch back to paper mode at any time</li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => { store.setAlpacaMode("live"); setConfirmLive(false); }}
                  className="px-4 py-2 bg-bear/20 text-bear border border-bear/40 rounded text-xs font-bold hover:bg-bear/30"
                >
                  I understand — switch to live
                </button>
                <button
                  onClick={() => setConfirmLive(false)}
                  className="px-4 py-2 text-text-dim border border-border rounded text-xs hover:text-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Market Data + AI API Keys ─────────────────────────────────── */}
        <div className="bg-surface border border-border rounded p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Key size={13} className="text-text-dim" />
            <span className="text-xs font-bold text-text-dim tracking-wider">API KEYS — MARKET DATA & AI</span>
          </div>

          <div className="bg-warn/10 border border-warn/30 rounded p-3 text-[11px] text-warn flex items-start gap-2">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            Keys are stored locally in your browser only. Never share them.
          </div>

          {[
            { key: "polygonApiKey", label: "Polygon.io API Key", hint: "Free tier: 15-min delayed. Starter: real-time", link: "https://polygon.io" },
            { key: "anthropicKey", label: "Anthropic API Key", hint: "Powers Claude AI signal analysis", link: "https://console.anthropic.com" },
            { key: "alpacaKey", label: "Alpaca Paper API Key", hint: "Paper trading key (from paper.alpaca.markets)", link: "https://alpaca.markets" },
            { key: "alpacaSecret", label: "Alpaca Paper Secret", hint: "Paper trading secret" },
          ].map(({ key, label, hint, link }) => (
            <div key={key}>
              <label className="text-[10px] text-text-dim mb-1.5 block tracking-wider">
                {label.toUpperCase()}
                {link && <a href={link} target="_blank" rel="noopener noreferrer" className="ml-2 text-info hover:underline normal-case">get key ↗</a>}
              </label>
              <div className="relative">
                <input
                  type={show[key] ? "text" : "password"}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Enter ${label}...`}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-xs text-text font-mono focus:border-info outline-none pr-10"
                />
                <button type="button" onClick={() => toggleShow(key)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text">
                  {show[key] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {hint && <p className="text-[10px] text-text-dim mt-1">{hint}</p>}
            </div>
          ))}

          <button onClick={handleSave} className={cn("flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all", saved ? "bg-bull/20 text-bull border border-bull/30" : "bg-info/10 text-info border border-info/30 hover:bg-info/20")}>
            {saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saved ? "Saved!" : "Save Keys"}
          </button>
        </div>

        {/* ── Alpaca Live Keys ─────────────────────────────────────────── */}
        <div className="bg-surface border border-bear/20 rounded p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={13} className="text-bear" />
            <span className="text-xs font-bold text-bear tracking-wider">ALPACA LIVE KEYS — REAL MONEY</span>
          </div>

          <div className="bg-bear/10 border border-bear/30 rounded p-3 text-[11px] text-bear space-y-1">
            <p className="font-bold">How to get live Alpaca keys:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-text-dim">
              <li>Sign up at <a href="https://alpaca.markets" target="_blank" rel="noopener noreferrer" className="text-info hover:underline">alpaca.markets ↗</a> and complete identity verification</li>
              <li>Fund your account via Alpaca's bank connection (ACH or wire)</li>
              <li>In your Alpaca dashboard → API Keys → Generate live keys</li>
              <li>Paste below — these are different from your paper keys</li>
            </ol>
          </div>

          {[
            { key: "alpacaLiveKey", label: "Alpaca Live API Key", hint: "From live.alpaca.markets (NOT paper)" },
            { key: "alpacaLiveSecret", label: "Alpaca Live Secret Key", hint: "Keep this secret — treat like a password" },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <label className="text-[10px] text-text-dim mb-1.5 block tracking-wider">{label.toUpperCase()}</label>
              <div className="relative">
                <input
                  type={show[key] ? "text" : "password"}
                  value={liveForm[key as keyof typeof liveForm]}
                  onChange={(e) => setLiveForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Enter ${label}...`}
                  className="w-full bg-bg border border-bear/30 rounded px-3 py-2 text-xs text-text font-mono focus:border-bear outline-none pr-10"
                />
                <button type="button" onClick={() => toggleShow(key)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text">
                  {show[key] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {hint && <p className="text-[10px] text-text-dim mt-1">{hint}</p>}
            </div>
          ))}

          <button onClick={handleLiveSave} className={cn("flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all", liveSaved ? "bg-bull/20 text-bull border border-bull/30" : "bg-bear/10 text-bear border border-bear/30 hover:bg-bear/20")}>
            {liveSaved ? <CheckCircle size={13} /> : <Save size={13} />}
            {liveSaved ? "Saved!" : "Save Live Keys"}
          </button>
        </div>

        {/* ── Auto-Trade + Cost Disclaimer ─────────────────────────────── */}
        <div className="bg-surface border border-border rounded p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bot size={13} className="text-accent" />
            <span className="text-xs font-bold text-text-dim tracking-wider">AUTO-TRADE ENGINE</span>
          </div>

          <div className="bg-warn/10 border border-warn/30 rounded p-4 text-[11px] text-warn space-y-2">
            <p className="font-bold flex items-center gap-1"><AlertTriangle size={12} /> Claude API Cost Warning</p>
            <p>Each scan calls Claude Sonnet once per ticker analyzed. At current pricing (~$0.003–$0.015 per call):</p>
            <ul className="list-disc list-inside space-y-0.5 text-text-dim">
              <li><span className="text-text">Manual scan (3 tickers):</span> ~$0.01–0.05 per click</li>
              <li><span className="text-text">Auto-trade ON, 3 tickers, market hours (6.5h):</span> ~$0.50–2.00/day</li>
              <li><span className="text-text">Auto-trade ON, 5 tickers, all day:</span> up to ~$3–5/day</li>
            </ul>
            <p>Auto-trade reuses existing signals (no duplicate calls within 5 min). Set a <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-info hover:underline">spend limit on console.anthropic.com ↗</a> to cap costs.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-text font-bold">Market Hours Only</p>
                <p className="text-[10px] text-text-dim">Only run auto-trade 9:30AM–4:00PM ET (no overnight/weekend API calls)</p>
              </div>
              <button
                onClick={() => store.setAutoTradeSettings({ marketHoursOnly: !store.autoTradeSettings.marketHoursOnly })}
                className={cn("w-8 h-4 rounded-full transition-colors flex-shrink-0", store.autoTradeSettings.marketHoursOnly ? "bg-bull" : "bg-dim")}
              >
                <span className={cn("block w-3 h-3 rounded-full bg-white transition-transform mx-0.5", store.autoTradeSettings.marketHoursOnly ? "translate-x-4" : "translate-x-0")} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {[
              ["Mode", "Paper trading only (auto-trade disabled in live mode)"],
              ["Frequency", "Every 60 seconds while enabled"],
              ["Signal reuse", "No duplicate Claude calls within 5 min"],
              ["Circuit breakers", "Daily loss limit + daily trade count"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border pb-1">
                <span className="text-text-dim">{k}</span>
                <span className="text-text text-right ml-2">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── API Usage & Costs ─────────────────────────────────────────── */}
        <ApiCostPanel />

        {/* ── X Scanner ────────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Twitter size={13} className="text-info" />
            <span className="text-xs font-bold text-text-dim tracking-wider">X (TWITTER) SCANNER</span>
          </div>
          <p className="text-[11px] text-text-dim leading-relaxed">
            Requires a free <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-info hover:underline">Twitter Developer account ↗</a> Bearer token. Without a key, demo data is shown.
          </p>
          <div>
            <label className="text-[10px] text-text-dim mb-1.5 block tracking-wider">X BEARER TOKEN</label>
            <div className="relative">
              <input
                type={show.xKey ? "text" : "password"}
                value={xKey}
                onChange={(e) => setXKey(e.target.value)}
                placeholder="AAAAAAAAAAAAAAAAAAAAAxxxxx..."
                className="w-full bg-bg border border-border rounded px-3 py-2 text-xs text-text font-mono focus:border-info outline-none pr-10"
              />
              <button type="button" onClick={() => toggleShow("xKey")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text">
                {show.xKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <button onClick={handleXSave} className={cn("flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all", xSaved ? "bg-bull/20 text-bull border border-bull/30" : "bg-info/10 text-info border border-info/30 hover:bg-info/20")}>
            {xSaved ? <CheckCircle size={13} /> : <Save size={13} />}
            {xSaved ? "Saved!" : "Save X Key"}
          </button>
        </div>

        {/* ── Watchlist ─────────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded p-5 space-y-3">
          <span className="text-xs font-bold text-text-dim tracking-wider">WATCHLIST</span>
          <div className="flex flex-wrap gap-2">
            {store.watchlist.map((t) => (
              <div key={t} className="flex items-center gap-1.5 px-2 py-1 bg-bg border border-border rounded text-xs">
                <span className="text-text font-bold">{t}</span>
                <button onClick={() => store.removeFromWatchlist(t)} className="text-text-dim hover:text-bear text-[10px]">×</button>
              </div>
            ))}
            <button
              onClick={() => { const t = prompt("Add ticker:")?.toUpperCase(); if (t) store.addToWatchlist(t); }}
              className="px-2 py-1 border border-dashed border-border rounded text-xs text-text-dim hover:text-text hover:border-info transition-colors"
            >
              + Add
            </button>
          </div>
        </div>

        {/* ── Paper Trading Reset (hidden in live mode) ─────────────────── */}
        {store.alpacaMode !== "live" && <div className="bg-surface border border-border rounded p-5 space-y-3">
          <span className="text-xs font-bold text-text-dim tracking-wider">PAPER TRADING</span>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text">Cash Balance</p>
              <p className="text-sm font-bold font-mono text-bull">${store.cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
            <button
              onClick={() => {
                if (confirm("Reset paper trading account to $25,000?")) {
                  useStore.setState({ cashBalance: 25000, positions: [], orders: [], trades: [], autoTradeDailyPnl: 0, autoTradeDailyCount: 0 });
                }
              }}
              className="px-4 py-2 text-xs text-bear border border-bear/30 rounded hover:bg-bear/10 transition-colors"
            >
              Reset to $25,000
            </button>
          </div>
        </div>}

        {/* ── About ─────────────────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded p-5 space-y-2">
          <span className="text-xs font-bold text-text-dim tracking-wider">ABOUT</span>
          <p className="text-[11px] text-text-dim leading-relaxed">
            QuantDash — AI-assisted day trading dashboard. Paper trading is for educational/simulation purposes only. AI signals are not financial advice.
          </p>
          <p className="text-[10px] text-muted">Next.js 14 · TypeScript · Tailwind · lightweight-charts · Zustand · Claude API · Polygon.io · Alpaca · X API v2</p>
        </div>
      </div>
    </div>
  );
}

function ApiCostPanel() {
  const apiUsage = useStore((s) => s.apiUsage);
  const resetApiUsage = useStore((s) => s.resetApiUsage);

  const { anthropic, polygon, x, alpaca } = apiUsage;

  const sessionDuration = (start: number) => {
    const ms = Date.now() - start;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const fmt = (n: number) => n.toLocaleString();
  const fmtCost = (n: number) =>
    n < 0.01 ? `< $0.01` : `$${n.toFixed(4)}`;

  return (
    <div className="bg-surface border border-border rounded p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-info" />
          <span className="text-xs font-bold text-text-dim tracking-wider">API USAGE &amp; COSTS</span>
          <span className="text-[10px] text-text-dim">· session: {sessionDuration(anthropic.sessionStart)}</span>
        </div>
        <button
          onClick={() => { if (confirm("Reset all API usage counters?")) resetApiUsage(); }}
          className="flex items-center gap-1 text-[10px] text-text-dim hover:text-bear transition-colors"
        >
          <RotateCcw size={10} /> Reset
        </button>
      </div>

      {/* Claude / Anthropic */}
      <div className="border border-border rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-accent">Claude (Anthropic)</span>
          <span className={cn(
            "text-sm font-bold font-mono",
            anthropic.estimatedCost > 1 ? "text-bear" : anthropic.estimatedCost > 0.1 ? "text-warn" : "text-bull"
          )}>
            {fmtCost(anthropic.estimatedCost)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="text-center">
            <div className="text-text-dim">Calls</div>
            <div className="font-mono text-text font-bold">{fmt(anthropic.calls)}</div>
          </div>
          <div className="text-center">
            <div className="text-text-dim">Input tokens</div>
            <div className="font-mono text-text font-bold">{fmt(anthropic.inputTokens)}</div>
          </div>
          <div className="text-center">
            <div className="text-text-dim">Output tokens</div>
            <div className="font-mono text-text font-bold">{fmt(anthropic.outputTokens)}</div>
          </div>
        </div>
        <div className="text-[10px] text-text-dim">
          Pricing: $3.00/M input · $15.00/M output (claude-sonnet-4-6)
          <a href="https://www.anthropic.com/pricing" target="_blank" rel="noopener noreferrer" className="ml-2 text-info hover:underline">pricing ↗</a>
        </div>
      </div>

      {/* Polygon */}
      <div className="border border-border rounded p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-text">Polygon.io</span>
          <span className="text-[10px] text-text-dim font-mono">{fmt(polygon.calls)} calls</span>
        </div>
        <p className="text-[10px] text-text-dim">
          Subscription-based pricing — no per-call cost. Free tier: 5 req/min, 15-min delayed.
          <a href="https://polygon.io/dashboard/subscriptions" target="_blank" rel="noopener noreferrer" className="ml-1 text-info hover:underline">manage plan ↗</a>
        </p>
      </div>

      {/* X / Twitter */}
      <div className="border border-border rounded p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-text">X (Twitter) API</span>
          <span className={cn(
            "text-[10px] font-mono",
            x.calls > 9000 ? "text-bear font-bold" : x.calls > 5000 ? "text-warn" : "text-text-dim"
          )}>
            {fmt(x.calls)} / ~10,000 free reads/mo
          </span>
        </div>
        <div className="w-full bg-dim rounded-full h-1">
          <div
            className={cn("h-1 rounded-full transition-all", x.calls > 9000 ? "bg-bear" : x.calls > 5000 ? "bg-warn" : "bg-info")}
            style={{ width: `${Math.min(100, (x.calls / 10000) * 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-text-dim">
          Free tier: 10k reads/month. Basic: $100/mo for 10M reads.
          <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="ml-1 text-info hover:underline">manage ↗</a>
        </p>
      </div>

      {/* Alpaca */}
      <div className="border border-border rounded p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-text">Alpaca</span>
          <span className="text-[10px] text-text-dim font-mono">{fmt(alpaca.calls)} API calls</span>
        </div>
        <p className="text-[10px] text-text-dim">Free — no per-call fees for paper or live brokerage.</p>
      </div>
    </div>
  );
}

function ModeCard({ active, onClick, color, title, description }: {
  active: boolean; onClick: () => void; color: string; title: string; description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 text-left p-3 rounded border transition-all",
        active
          ? `border-${color}/50 bg-${color}/10`
          : "border-border hover:border-border-bright"
      )}
    >
      <div className={cn("text-xs font-bold mb-1", active ? `text-${color}` : "text-text")}>
        {active && "● "}{title}
      </div>
      <div className="text-[10px] text-text-dim leading-relaxed">{description}</div>
    </button>
  );
}
