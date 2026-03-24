"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import Watchlist from "@/components/Watchlist";
import AISignalPanel from "@/components/AISignalPanel";
import MarketOverview from "@/components/MarketOverview";
import XScanner from "@/components/XScanner";
import AutoTradePanel from "@/components/AutoTradePanel";
import StockDiscovery from "@/components/StockDiscovery";
import { Twitter, Brain, Bot, Telescope, type LucideIcon, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CandlestickChart = dynamic(() => import("@/components/CandlestickChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-text-dim text-xs">
      Loading chart...
    </div>
  ),
});

type RightTab = "market" | "x" | "autotrade";
const TABS: { id: RightTab; label: string; Icon: LucideIcon }[] = [
  { id: "market", label: "Market", Icon: BarChart2 },
  { id: "x", label: "X Feed", Icon: Twitter },
  { id: "autotrade", label: "Auto", Icon: Bot },
];

type BottomTab = "signals" | "discover" | "autotrade";
const BOTTOM_TABS: { id: BottomTab; label: string; Icon: LucideIcon }[] = [
  { id: "signals", label: "AI Signals", Icon: Brain },
  { id: "discover", label: "Discover", Icon: Telescope },
  { id: "autotrade", label: "Auto-Trade", Icon: Bot },
];

export default function Dashboard() {
  const [rightTab, setRightTab] = useState<RightTab>("market");
  const [bottomTab, setBottomTab] = useState<BottomTab>("signals");

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: Watchlist */}
      <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        <Watchlist />
      </aside>

      {/* Center: Chart + bottom panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chart */}
        <div className="flex-1 overflow-hidden border-b border-border">
          <CandlestickChart />
        </div>

        {/* Bottom tabs */}
        <div className="h-72 flex flex-col overflow-hidden">
          <div className="flex border-b border-border flex-shrink-0">
            {BOTTOM_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setBottomTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold border-r border-border transition-colors",
                  bottomTab === id
                    ? "bg-surface text-accent border-b-2 border-b-accent"
                    : "text-text-dim hover:text-text"
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {bottomTab === "signals" && <AISignalPanel />}
            {bottomTab === "discover" && <StockDiscovery />}
            {bottomTab === "autotrade" && (
              <div className="h-full overflow-y-auto p-3">
                <AutoTradePanel />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Tabbed panel */}
      <aside className="w-80 flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border flex-shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setRightTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold border-r border-border last:border-r-0 transition-colors",
                rightTab === id
                  ? "bg-surface text-info border-b-2 border-b-info"
                  : "text-text-dim hover:text-text"
              )}
            >
              <Icon size={12} className={rightTab === id ? "text-info" : ""} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {rightTab === "market" && <MarketOverview />}
          {rightTab === "x" && <XScanner />}
          {rightTab === "autotrade" && (
            <div className="h-full overflow-y-auto p-3">
              <AutoTradePanel />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
