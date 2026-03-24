"use client";
import TradePanel from "@/components/TradePanel";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function TradePage() {
  const updatePositionPrices = useStore((s) => s.updatePositionPrices);

  // Keep positions priced
  useEffect(() => {
    const interval = setInterval(updatePositionPrices, 3000);
    return () => clearInterval(interval);
  }, [updatePositionPrices]);

  return (
    <div className="h-full overflow-y-auto">
      <TradePanel />
    </div>
  );
}
