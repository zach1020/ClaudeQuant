export interface Quote {
  ticker: string;
  price: number;
  open: number;
  prevClose: number;
  high: number;
  low: number;
  volume: number;
  vwap: number;
  change: number;
  changePct: number;
  bid: number;
  ask: number;
  lastSize: number;
  marketCap?: number;
  timestamp: number;
}

export interface Candle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  vwap?: number;
  sma9?: number;
  sma20?: number;
  sma50?: number;
  ema9?: number;
  ema20?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  relVolume?: number;
  atr?: number;
}

export type SignalType = "BUY" | "SELL" | "HOLD";

export interface AISignal {
  id: string;
  ticker: string;
  signal: SignalType;
  confidence: number;
  reason: string;
  entry: number;
  stop_loss: number;
  target: number;
  risk_reward: number;
  timeframe: string;
  expires_in_minutes: number;
  timestamp: number;
}

export type OrderType = "MARKET" | "LIMIT" | "STOP_LIMIT";
export type OrderSide = "BUY" | "SELL";
export type PositionSide = "LONG" | "SHORT";

export interface Order {
  id: string;
  ticker: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  status: "PENDING" | "FILLED" | "CANCELLED";
  filledAt?: number;
  filledPrice?: number;
  createdAt: number;
}

export interface Position {
  id: string;
  ticker: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  entryTime: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  trailingStop?: number;       // current trailing stop level (updated as price moves)
  partialTpTaken?: boolean;    // whether 50% partial TP has been executed
}

export interface Trade {
  id: string;
  ticker: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  pnlPct: number;
  aiAnalysis?: string;
}

export type AlertType = "PRICE" | "AI_SIGNAL" | "VOLUME" | "RSI" | "BREAKOUT";

export interface Alert {
  id: string;
  ticker: string;
  type: AlertType;
  message: string;
  price?: number;
  condition?: "ABOVE" | "BELOW";
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
  signal?: AISignal;
}

export interface NewsItem {
  id: string;
  ticker?: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: number;
  sentiment?: "positive" | "negative" | "neutral";
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}

export interface DailyStats {
  date: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

// ── Alpaca Live Account ──────────────────────────────────────────────────────

export interface LiveAccount {
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  equity: number;
  dayPnl: number;
  dayPnlPct: number;
  status: string;
  tradingBlocked: boolean;
  patternDayTrader: boolean;
}

export interface LivePosition {
  symbol: string;
  qty: number;
  side: string;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

// ── X / Social ──────────────────────────────────────────────────────────────

export interface Tweet {
  id: string;
  text: string;
  authorName: string;
  authorHandle: string;
  authorFollowers: number;
  verified: boolean;
  likes: number;
  retweets: number;
  replies: number;
  createdAt: number;
  tickers: string[];
  sentiment: "bullish" | "bearish" | "neutral";
  sentimentScore: number;
  url: string;
}

// ── Auto-Trade ───────────────────────────────────────────────────────────────

export interface AutoTradeSettings {
  confidenceThreshold: number;  // min signal confidence to trade (0–1)
  riskPerTrade: number;         // % of portfolio to risk per trade
  maxPositionSize: number;      // hard cap in $ per trade
  maxDailyTrades: number;       // circuit breaker: max orders/day
  maxDailyLoss: number;         // circuit breaker: stop after losing this much today
  cooldownMinutes: number;      // min minutes between trades on same ticker
  allowShorts: boolean;         // whether to take SELL signals
  requireXConfirmation: boolean; // only trade when X sentiment agrees
  marketHoursOnly: boolean;     // only run 9:30AM–4:00PM ET, no overnight/weekend calls
  allowLiveAutoTrade: boolean;  // allow auto-trade to execute real orders in live mode
  trailingStopPct: number;     // trail stop by this % as position moves in favor (0 = disabled)
  maxPositionMinutes: number;  // force-close after this many minutes (0 = disabled)
  partialTpEnabled: boolean;   // sell 50% at midpoint, move stop to breakeven
}

export type AutoTradeDecision = "EXECUTED" | "SKIPPED" | "BLOCKED";

export interface AutoTradeLog {
  id: string;
  timestamp: number;
  ticker: string;
  decision: AutoTradeDecision;
  reason: string;
  signal?: AISignal;
  orderId?: string;
  sharesQty?: number;
  positionSize?: number;
}

// ── API Usage & Cost Tracking ────────────────────────────────────────────────

export interface AnthropicUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number; // USD
  sessionStart: number;
}

export interface SimpleApiUsage {
  calls: number;
  sessionStart: number;
}

export interface ApiUsageState {
  anthropic: AnthropicUsage;
  polygon: SimpleApiUsage;
  x: SimpleApiUsage;
  alpaca: SimpleApiUsage;
}

