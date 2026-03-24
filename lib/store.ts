"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Quote,
  Candle,
  AISignal,
  Position,
  Trade,
  Alert,
  Order,
  NewsItem,
  MarketIndex,
  Tweet,
  AutoTradeSettings,
  AutoTradeLog,
  LiveAccount,
  ApiUsageState,
} from "./types";

// Claude Sonnet 4.6 pricing (USD per million tokens)
const CLAUDE_INPUT_COST_PER_M = 3.0;
const CLAUDE_OUTPUT_COST_PER_M = 15.0;

function freshApiUsage(): ApiUsageState {
  const now = Date.now();
  return {
    anthropic: { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0, sessionStart: now },
    polygon: { calls: 0, sessionStart: now },
    x: { calls: 0, sessionStart: now },
    alpaca: { calls: 0, sessionStart: now },
  };
}
import { generateId } from "./utils";

interface AppState {
  // Settings
  polygonApiKey: string;
  alpacaKey: string;       // paper trading key
  alpacaSecret: string;    // paper trading secret
  alpacaLiveKey: string;   // live trading key
  alpacaLiveSecret: string; // live trading secret
  alpacaMode: "paper" | "live";
  anthropicKey: string;
  watchlist: string[];
  selectedTicker: string;
  chartTimeframe: string;

  // Live Alpaca account (refreshed from API)
  liveAccount: LiveAccount | null;

  // Market data
  quotes: Record<string, Quote>;
  candles: Record<string, Candle[]>;
  indices: MarketIndex[];
  news: NewsItem[];

  // AI
  signals: AISignal[];
  commentary: string;
  isAnalyzing: boolean;

  // Paper trading
  cashBalance: number;
  positions: Position[];
  orders: Order[];
  trades: Trade[];

  // Alerts
  alerts: Alert[];

  // X / Social
  xApiKey: string;
  tweets: Tweet[];

  // Auto-trade
  autoTradeEnabled: boolean;
  autoTradeSettings: AutoTradeSettings;
  autoTradeLogs: AutoTradeLog[];
  autoTradeDailyPnl: number;
  autoTradeDailyCount: number;
  autoTradeLastReset: string; // date string YYYY-MM-DD

  // API usage & cost tracking
  apiUsage: ApiUsageState;

  // Notifications
  apiCreditError: boolean;
  setApiCreditError: (v: boolean) => void;

  // Actions — settings
  setApiKeys: (keys: Partial<{ polygonApiKey: string; alpacaKey: string; alpacaSecret: string; alpacaLiveKey: string; alpacaLiveSecret: string; anthropicKey: string }>) => void;
  setAlpacaMode: (mode: "paper" | "live") => void;
  setLiveAccount: (account: LiveAccount | null) => void;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  setSelectedTicker: (ticker: string) => void;
  setChartTimeframe: (tf: string) => void;

  // Actions — X / social
  setXApiKey: (key: string) => void;
  setTweets: (tweets: Tweet[]) => void;

  // Actions — auto-trade
  setAutoTradeEnabled: (v: boolean) => void;
  setAutoTradeSettings: (settings: Partial<AutoTradeSettings>) => void;
  addAutoTradeLog: (log: Omit<AutoTradeLog, "id" | "timestamp">) => void;
  resetAutoTradeDailyStats: () => void;
  recordAutoTradePnl: (pnl: number) => void;

  // Actions — market data
  updateQuote: (quote: Quote) => void;
  setCandles: (ticker: string, candles: Candle[]) => void;
  setIndices: (indices: MarketIndex[]) => void;
  addNews: (item: NewsItem) => void;

  // Actions — AI
  addSignal: (signal: AISignal) => void;
  setCommentary: (text: string) => void;
  setIsAnalyzing: (v: boolean) => void;

  // Actions — trading
  executeOrder: (order: Omit<Order, "id" | "createdAt" | "status">) => void;
  closePosition: (positionId: string, price: number) => void;
  updatePositionPrices: () => void;

  // Actions — alerts
  addAlert: (alert: Omit<Alert, "id" | "createdAt" | "triggered">) => void;
  triggerAlert: (id: string) => void;
  deleteAlert: (id: string) => void;

  // Actions — API usage
  recordAnthropicUsage: (inputTokens: number, outputTokens: number) => void;
  recordApiCall: (api: "polygon" | "x" | "alpaca") => void;
  resetApiUsage: () => void;
}

const INITIAL_BALANCE = 25000;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Settings
      polygonApiKey: "",
      alpacaKey: "",
      alpacaSecret: "",
      alpacaLiveKey: "",
      alpacaLiveSecret: "",
      alpacaMode: "paper" as const,
      anthropicKey: "",
      liveAccount: null,
      watchlist: ["AAPL", "TSLA", "NVDA", "SPY", "QQQ"],
      selectedTicker: "AAPL",
      chartTimeframe: "5m",

      // Market data
      quotes: {},
      candles: {},
      indices: [],
      news: [],

      // AI
      signals: [],
      commentary: "",
      isAnalyzing: false,

      // Paper trading
      cashBalance: INITIAL_BALANCE,
      positions: [],
      orders: [],
      trades: [],

      // Alerts
      alerts: [],

      // X / Social
      xApiKey: "",
      tweets: [],

      // Auto-trade
      autoTradeEnabled: false,
      autoTradeSettings: {
        confidenceThreshold: 0.75,
        riskPerTrade: 1,
        maxPositionSize: 2500,
        maxDailyTrades: 10,
        maxDailyLoss: 500,
        cooldownMinutes: 5,
        allowShorts: false,
        requireXConfirmation: false,
        marketHoursOnly: true,
        allowLiveAutoTrade: false,
      },
      autoTradeLogs: [],
      autoTradeDailyPnl: 0,
      autoTradeDailyCount: 0,
      autoTradeLastReset: new Date().toISOString().split("T")[0],

      // API usage
      apiUsage: freshApiUsage(),

      // Notifications
      apiCreditError: false,
      setApiCreditError: (v) => set({ apiCreditError: v }),

      setApiKeys: (keys) => set((s) => ({ ...s, ...keys })),

      addToWatchlist: (ticker) =>
        set((s) => ({
          watchlist: s.watchlist.includes(ticker)
            ? s.watchlist
            : [...s.watchlist, ticker.toUpperCase()],
        })),

      removeFromWatchlist: (ticker) =>
        set((s) => ({ watchlist: s.watchlist.filter((t) => t !== ticker) })),

      setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
      setAlpacaMode: (alpacaMode) => set({ alpacaMode }),
      setLiveAccount: (liveAccount) => set({ liveAccount }),
      setChartTimeframe: (tf) => set({ chartTimeframe: tf }),

      setXApiKey: (xApiKey) => set({ xApiKey }),
      setTweets: (tweets) => set({ tweets }),

      setAutoTradeEnabled: (autoTradeEnabled) => set({ autoTradeEnabled }),
      setAutoTradeSettings: (settings) =>
        set((s) => ({ autoTradeSettings: { ...s.autoTradeSettings, ...settings } })),
      addAutoTradeLog: (log) =>
        set((s) => ({
          autoTradeLogs: [
            { ...log, id: generateId(), timestamp: Date.now() },
            ...s.autoTradeLogs,
          ].slice(0, 200),
          autoTradeDailyCount:
            log.decision === "EXECUTED" ? s.autoTradeDailyCount + 1 : s.autoTradeDailyCount,
        })),
      resetAutoTradeDailyStats: () =>
        set({
          autoTradeDailyPnl: 0,
          autoTradeDailyCount: 0,
          autoTradeLastReset: new Date().toISOString().split("T")[0],
        }),
      recordAutoTradePnl: (pnl) =>
        set((s) => ({ autoTradeDailyPnl: s.autoTradeDailyPnl + pnl })),

      updateQuote: (quote) =>
        set((s) => ({ quotes: { ...s.quotes, [quote.ticker]: quote } })),

      setCandles: (ticker, candles) =>
        set((s) => ({ candles: { ...s.candles, [ticker]: candles } })),

      setIndices: (indices) => set({ indices }),

      addNews: (item) =>
        set((s) => ({ news: [item, ...s.news].slice(0, 100) })),

      addSignal: (signal) =>
        set((s) => ({ signals: [signal, ...s.signals].slice(0, 50) })),

      setCommentary: (commentary) => set({ commentary }),
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

      executeOrder: (orderData) => {
        const { cashBalance, positions, quotes } = get();
        const quote = quotes[orderData.ticker];
        const fillPrice = orderData.type === "MARKET"
          ? quote?.price ?? orderData.price ?? 0
          : orderData.price ?? 0;

        if (!fillPrice) return;

        const order: Order = {
          ...orderData,
          id: generateId(),
          createdAt: Date.now(),
          status: "FILLED",
          filledAt: Date.now(),
          filledPrice: fillPrice,
        };

        const cost = fillPrice * orderData.quantity;
        const existingPos = positions.find(
          (p) => p.ticker === orderData.ticker && p.side === (orderData.side === "BUY" ? "LONG" : "SHORT")
        );

        if (orderData.side === "BUY") {
          if (cashBalance < cost) return; // Insufficient funds
          if (existingPos) {
            const newQty = existingPos.quantity + orderData.quantity;
            const newEntry = (existingPos.entryPrice * existingPos.quantity + fillPrice * orderData.quantity) / newQty;
            set((s) => ({
              cashBalance: s.cashBalance - cost,
              orders: [...s.orders, order],
              positions: s.positions.map((p) =>
                p.id === existingPos.id
                  ? { ...p, quantity: newQty, entryPrice: newEntry }
                  : p
              ),
            }));
          } else {
            const newPosition: Position = {
              id: generateId(),
              ticker: orderData.ticker,
              side: "LONG",
              quantity: orderData.quantity,
              entryPrice: fillPrice,
              entryTime: Date.now(),
              currentPrice: fillPrice,
              stopLoss: orderData.stopPrice,
              takeProfit: orderData.takeProfitPrice,
              unrealizedPnl: 0,
              unrealizedPnlPct: 0,
            };
            set((s) => ({
              cashBalance: s.cashBalance - cost,
              orders: [...s.orders, order],
              positions: [...s.positions, newPosition],
            }));
          }
        } else {
          // SELL — close or short
          const longPos = positions.find(
            (p) => p.ticker === orderData.ticker && p.side === "LONG"
          );
          if (longPos) {
            const proceeds = fillPrice * Math.min(orderData.quantity, longPos.quantity);
            const pnl = (fillPrice - longPos.entryPrice) * Math.min(orderData.quantity, longPos.quantity);
            const pnlPct = (fillPrice - longPos.entryPrice) / longPos.entryPrice * 100;
            const trade: Trade = {
              id: generateId(),
              ticker: orderData.ticker,
              side: "LONG",
              quantity: Math.min(orderData.quantity, longPos.quantity),
              entryPrice: longPos.entryPrice,
              exitPrice: fillPrice,
              entryTime: longPos.entryTime,
              exitTime: Date.now(),
              pnl,
              pnlPct,
            };
            set((s) => ({
              cashBalance: s.cashBalance + proceeds,
              orders: [...s.orders, order],
              trades: [trade, ...s.trades],
              positions:
                orderData.quantity >= longPos.quantity
                  ? s.positions.filter((p) => p.id !== longPos.id)
                  : s.positions.map((p) =>
                      p.id === longPos.id
                        ? { ...p, quantity: p.quantity - orderData.quantity }
                        : p
                    ),
            }));
          }
        }
      },

      closePosition: (positionId, price) => {
        const { positions } = get();
        const pos = positions.find((p) => p.id === positionId);
        if (!pos) return;
        get().executeOrder({
          ticker: pos.ticker,
          side: pos.side === "LONG" ? "SELL" : "BUY",
          type: "MARKET",
          quantity: pos.quantity,
          price,
        });
      },

      updatePositionPrices: () => {
        const { positions, quotes } = get();
        set({
          positions: positions.map((p) => {
            const q = quotes[p.ticker];
            if (!q) return p;
            const current = q.price;
            const pnl =
              p.side === "LONG"
                ? (current - p.entryPrice) * p.quantity
                : (p.entryPrice - current) * p.quantity;
            return {
              ...p,
              currentPrice: current,
              unrealizedPnl: pnl,
              unrealizedPnlPct:
                p.side === "LONG"
                  ? ((current - p.entryPrice) / p.entryPrice) * 100
                  : ((p.entryPrice - current) / p.entryPrice) * 100,
            };
          }),
        });
      },

      addAlert: (alertData) =>
        set((s) => ({
          alerts: [
            ...s.alerts,
            {
              ...alertData,
              id: generateId(),
              createdAt: Date.now(),
              triggered: false,
            },
          ],
        })),

      triggerAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true, triggeredAt: Date.now() } : a
          ),
        })),

      deleteAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

      recordAnthropicUsage: (inputTokens, outputTokens) =>
        set((s) => {
          const prev = s.apiUsage.anthropic;
          const addedCost =
            (inputTokens / 1_000_000) * CLAUDE_INPUT_COST_PER_M +
            (outputTokens / 1_000_000) * CLAUDE_OUTPUT_COST_PER_M;
          return {
            apiUsage: {
              ...s.apiUsage,
              anthropic: {
                ...prev,
                calls: prev.calls + 1,
                inputTokens: prev.inputTokens + inputTokens,
                outputTokens: prev.outputTokens + outputTokens,
                estimatedCost: prev.estimatedCost + addedCost,
              },
            },
          };
        }),

      recordApiCall: (api) =>
        set((s) => ({
          apiUsage: {
            ...s.apiUsage,
            [api]: { ...s.apiUsage[api], calls: s.apiUsage[api].calls + 1 },
          },
        })),

      resetApiUsage: () => set({ apiUsage: freshApiUsage() }),
    }),
    {
      name: "trading-app-store",
      partialize: (s) => ({
        polygonApiKey: s.polygonApiKey,
        alpacaKey: s.alpacaKey,
        alpacaSecret: s.alpacaSecret,
        alpacaLiveKey: s.alpacaLiveKey,
        alpacaLiveSecret: s.alpacaLiveSecret,
        alpacaMode: s.alpacaMode,
        anthropicKey: s.anthropicKey,
        xApiKey: s.xApiKey,
        watchlist: s.watchlist,
        selectedTicker: s.selectedTicker,
        cashBalance: s.cashBalance,
        positions: s.positions,
        orders: s.orders,
        trades: s.trades,
        alerts: s.alerts,
        autoTradeEnabled: s.autoTradeEnabled,
        autoTradeSettings: s.autoTradeSettings,
        autoTradeLogs: s.autoTradeLogs,
        autoTradeDailyPnl: s.autoTradeDailyPnl,
        autoTradeDailyCount: s.autoTradeDailyCount,
        autoTradeLastReset: s.autoTradeLastReset,
        apiUsage: s.apiUsage,
      }),
    }
  )
);
