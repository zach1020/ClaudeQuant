import type { Candle, Indicators } from "./types";

export function calcSMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result[i] = sum / period;
  }
  return result;
}

export function calcEMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

export function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function calcMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macd: number[]; signal: number[]; hist: number[] } {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macd = closes.map((_, i) =>
    isNaN(emaFast[i]) || isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i]
  );
  const validMacd = macd.filter((v) => !isNaN(v));
  const signalLine = calcEMA(validMacd, signal);

  const fullSignal: number[] = new Array(closes.length).fill(NaN);
  let si = 0;
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(macd[i])) {
      fullSignal[i] = signalLine[si++];
    }
  }

  const hist = closes.map((_, i) =>
    isNaN(macd[i]) || isNaN(fullSignal[i]) ? NaN : macd[i] - fullSignal[i]
  );
  return { macd, signal: fullSignal, hist };
}

export function calcBollingerBands(
  closes: number[],
  period = 20,
  stdDevMult = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calcSMA(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + stdDevMult * sd;
    lower[i] = mean - stdDevMult * sd;
  }
  return { upper, middle, lower };
}

export function calcVWAP(candles: Candle[]): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);
  let cumVolume = 0,
    cumTPV = 0;
  for (let i = 0; i < candles.length; i++) {
    const { high, low, close, volume } = candles[i];
    const typicalPrice = (high + low + close) / 3;
    cumVolume += volume;
    cumTPV += typicalPrice * volume;
    result[i] = cumVolume > 0 ? cumTPV / cumVolume : NaN;
  }
  return result;
}

export function calcRelativeVolume(volumes: number[], period = 20): number[] {
  const avgVol = calcSMA(volumes, period);
  return volumes.map((v, i) => (isNaN(avgVol[i]) ? NaN : v / avgVol[i]));
}

export function calcATR(candles: Candle[], period = 14): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < period + 1) return result;
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const pc = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  });
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = atr;
  for (let i = period; i < candles.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    result[i] = atr;
  }
  return result;
}

export function aggregateCandles(candles: Candle[], factor: number): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i + factor <= candles.length; i += factor) {
    const slice = candles.slice(i, i + factor);
    result.push({
      time: slice[0].time,
      open: slice[0].open,
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      close: slice[slice.length - 1].close,
      volume: slice.reduce((s, c) => s + c.volume, 0),
    });
  }
  return result;
}

export function computeIndicators(candles: Candle[]): Indicators {
  if (candles.length < 2) return {};

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const sma9Arr = calcSMA(closes, 9);
  const sma20Arr = calcSMA(closes, 20);
  const sma50Arr = calcSMA(closes, 50);
  const ema9Arr = calcEMA(closes, 9);
  const ema20Arr = calcEMA(closes, 20);
  const rsiArr = calcRSI(closes, 14);
  const { macd, signal, hist } = calcMACD(closes);
  const bb = calcBollingerBands(closes, 20);
  const vwapArr = calcVWAP(candles);
  const relVolArr = calcRelativeVolume(volumes, 20);
  const atrArr = calcATR(candles, 14);

  const last = candles.length - 1;

  return {
    vwap: vwapArr[last],
    sma9: sma9Arr[last],
    sma20: sma20Arr[last],
    sma50: sma50Arr[last],
    ema9: ema9Arr[last],
    ema20: ema20Arr[last],
    rsi: rsiArr[last],
    macd: macd[last],
    macdSignal: signal[last],
    macdHist: hist[last],
    bbUpper: bb.upper[last],
    bbMiddle: bb.middle[last],
    bbLower: bb.lower[last],
    relVolume: relVolArr[last],
    atr: atrArr[last],
  };
}

export function findSwingHighLow(
  candles: Candle[],
  lookback = 5
): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    const maxHigh = Math.max(...slice.map((c) => c.high));
    const minLow = Math.min(...slice.map((c) => c.low));
    if (candles[i].high === maxHigh) highs.push(candles[i].high);
    if (candles[i].low === minLow) lows.push(candles[i].low);
  }
  return { highs: highs.slice(-3), lows: lows.slice(-3) };
}
