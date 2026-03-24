"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { useStore } from "@/lib/store";
import {
  calcSMA, calcEMA, calcVWAP, calcRSI, calcMACD, calcBollingerBands,
} from "@/lib/indicators";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "1d"];

type IndicatorToggle = {
  vwap: boolean; sma9: boolean; sma20: boolean; sma50: boolean;
  ema9: boolean; bb: boolean;
};

type LCTime = number & { readonly _brand: "Time" };

interface LCSeries {
  setData: (data: unknown[]) => void;
}

interface LCChart {
  addCandlestickSeries: (opts: unknown) => LCSeries;
  addLineSeries: (opts: unknown) => LCSeries;
  addHistogramSeries: (opts: unknown) => LCSeries;
  priceScale: (id: string) => { applyOptions: (o: unknown) => void };
  timeScale: () => { fitContent: () => void; applyOptions: (o: unknown) => void };
  applyOptions: (o: unknown) => void;
  remove: () => void;
}

export default function CandlestickChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<LCChart | null>(null);

  const selectedTicker = useStore((s) => s.selectedTicker);
  const chartTimeframe = useStore((s) => s.chartTimeframe);
  const setChartTimeframe = useStore((s) => s.setChartTimeframe);
  const candlesMap = useStore((s) => s.candles);
  const setCandles = useStore((s) => s.setCandles);
  const polygonApiKey = useStore((s) => s.polygonApiKey);
  const recordApiCall = useStore((s) => s.recordApiCall);

  const [indicators, setIndicators] = useState<IndicatorToggle>({
    vwap: true, sma9: true, sma20: true, sma50: false, ema9: false, bb: false,
  });
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(false);

  const candles = candlesMap[selectedTicker] ?? [];

  const fetchCandles = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/market/candles?ticker=${selectedTicker}&timeframe=${chartTimeframe}&apiKey=${polygonApiKey}`
      );
      const data = await res.json();
      if (polygonApiKey && data.candles?.length) recordApiCall("polygon");
      if (data.candles?.length) setCandles(selectedTicker, data.candles);
    } catch {}
  }, [selectedTicker, chartTimeframe, polygonApiKey, setCandles, recordApiCall]);

  useEffect(() => {
    fetchCandles();
    const interval = setInterval(fetchCandles, 30000);
    return () => clearInterval(interval);
  }, [fetchCandles]);

  useEffect(() => {
    if (!containerRef.current || !candles.length) return;

    (async () => {
      const { createChart, ColorType } = await import("lightweight-charts");

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const container = containerRef.current!;
      const height = container.clientHeight || 480;

      const chart = createChart(container, {
        width: container.clientWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "#0a0a0a" },
          textColor: "#666",
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace",
        },
        grid: {
          vertLines: { color: "#1a1a1a" },
          horzLines: { color: "#1a1a1a" },
        },
        crosshair: {
          mode: 0,
          vertLine: { color: "#333", width: 1, style: 3 },
          horzLine: { color: "#333", width: 1, style: 3 },
        },
        rightPriceScale: { borderColor: "#1e1e1e" },
        timeScale: { borderColor: "#1e1e1e", timeVisible: true, secondsVisible: false },
      }) as unknown as LCChart;

      chartRef.current = chart;

      const times = candles.map((c) => c.time as unknown as LCTime);
      const closes = candles.map((c) => c.close);

      // Candlesticks
      const candleSeries = chart.addCandlestickSeries({
        upColor: "#00ff41",
        downColor: "#ff2222",
        borderUpColor: "#00ff41",
        borderDownColor: "#ff2222",
        wickUpColor: "#00ff41",
        wickDownColor: "#ff2222",
      });
      candleSeries.setData(
        candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
      );

      // Volume bars
      const volSeries = chart.addHistogramSeries({
        color: "#26a69a",
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      volSeries.setData(
        candles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? "rgba(0,255,65,0.25)" : "rgba(255,34,34,0.25)",
        }))
      );

      // Helper to add line overlay
      const addLine = (values: number[], color: string, width = 1, scaleId?: string) => {
        const s = chart.addLineSeries({
          color,
          lineWidth: width,
          priceLineVisible: false,
          lastValueVisible: false,
          ...(scaleId ? { priceScaleId: scaleId } : {}),
        });
        s.setData(
          values
            .map((v, i) => (!isNaN(v) ? { time: times[i], value: v } : null))
            .filter(Boolean)
        );
        return s;
      };

      if (indicators.vwap) addLine(calcVWAP(candles), "#00ccff", 2);
      if (indicators.sma9) addLine(calcSMA(closes, 9), "#ffff00");
      if (indicators.sma20) addLine(calcSMA(closes, 20), "#ff8800");
      if (indicators.sma50) addLine(calcSMA(closes, 50), "#aa00ff");
      if (indicators.ema9) addLine(calcEMA(closes, 9), "#00ff88");
      if (indicators.bb) {
        const { upper, middle, lower } = calcBollingerBands(closes);
        addLine(upper, "rgba(0,204,255,0.5)");
        addLine(middle, "rgba(0,204,255,0.3)");
        addLine(lower, "rgba(0,204,255,0.5)");
      }

      // RSI pane
      if (showRSI) {
        const rsiData = calcRSI(closes);
        const rsiSeries = chart.addLineSeries({
          color: "#aa00ff",
          lineWidth: 1,
          priceScaleId: "rsi",
          priceLineVisible: false,
          lastValueVisible: true,
        });
        chart.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.85, bottom: 0.05 } });
        rsiSeries.setData(
          rsiData.map((v, i) => (!isNaN(v) ? { time: times[i], value: v } : null)).filter(Boolean)
        );
      }

      // MACD histogram pane
      if (showMACD) {
        const { hist } = calcMACD(closes);
        const macdSeries = chart.addHistogramSeries({
          priceScaleId: "macd",
          priceLineVisible: false,
        });
        chart.priceScale("macd").applyOptions({ scaleMargins: { top: 0.92, bottom: 0 } });
        macdSeries.setData(
          hist
            .map((v, i) => (!isNaN(v) ? { time: times[i], value: v, color: v >= 0 ? "#00ff41" : "#ff2222" } : null))
            .filter(Boolean)
        );
      }

      (chart as unknown as { timeScale: () => { fitContent: () => void } }).timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (container.clientWidth > 0) {
          chart.applyOptions({ width: container.clientWidth });
        }
      });
      ro.observe(container);
    })();
  }, [candles, indicators, showRSI, showMACD]);

  const toggleIndicator = (key: keyof IndicatorToggle) =>
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));

  const btnCls = (active: boolean, color = "text-info") =>
    `px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
      active
        ? `${color} border-current bg-current/10`
        : "text-text-dim border-dim hover:text-text"
    }`;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-wrap">
        <span className="text-xs font-bold text-text mr-1">{selectedTicker}</span>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button key={tf} onClick={() => setChartTimeframe(tf)} className={btnCls(chartTimeframe === tf, "text-bull")}>
              {tf}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => toggleIndicator("vwap")} className={btnCls(indicators.vwap, "text-info")}>VWAP</button>
        <button onClick={() => toggleIndicator("sma9")} className={btnCls(indicators.sma9, "text-[#ffff00]")}>SMA9</button>
        <button onClick={() => toggleIndicator("sma20")} className={btnCls(indicators.sma20, "text-[#ff8800]")}>SMA20</button>
        <button onClick={() => toggleIndicator("sma50")} className={btnCls(indicators.sma50, "text-accent")}>SMA50</button>
        <button onClick={() => toggleIndicator("ema9")} className={btnCls(indicators.ema9, "text-[#00ff88]")}>EMA9</button>
        <button onClick={() => toggleIndicator("bb")} className={btnCls(indicators.bb, "text-info")}>BB</button>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => setShowRSI((v) => !v)} className={btnCls(showRSI, "text-accent")}>RSI</button>
        <button onClick={() => setShowMACD((v) => !v)} className={btnCls(showMACD, "text-[#ff8800]")}>MACD</button>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
