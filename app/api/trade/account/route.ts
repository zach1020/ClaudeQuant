import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "paper";
  const apiKey = searchParams.get("apiKey") ?? "";
  const apiSecret = searchParams.get("apiSecret") ?? "";

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const baseUrl =
    mode === "live"
      ? "https://api.alpaca.markets"
      : "https://paper-api.alpaca.markets";

  try {
    const [accountRes, positionsRes] = await Promise.all([
      fetch(`${baseUrl}/v2/account`, {
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": apiSecret,
        },
      }),
      fetch(`${baseUrl}/v2/positions`, {
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": apiSecret,
        },
      }),
    ]);

    if (!accountRes.ok) {
      const err = await accountRes.json();
      return NextResponse.json(
        { error: err.message ?? "Failed to fetch account" },
        { status: accountRes.status }
      );
    }

    const account = await accountRes.json();
    const positions = positionsRes.ok ? await positionsRes.json() : [];

    return NextResponse.json({
      account: {
        cash: parseFloat(account.cash),
        buyingPower: parseFloat(account.buying_power),
        portfolioValue: parseFloat(account.portfolio_value),
        equity: parseFloat(account.equity),
        dayPnl: parseFloat(account.unrealized_intraday_pl ?? "0"),
        dayPnlPct: parseFloat(account.unrealized_intraday_plpc ?? "0") * 100,
        status: account.status,
        tradingBlocked: account.trading_blocked,
        patternDayTrader: account.pattern_day_trader,
      },
      positions: positions.map((p: AlpacaPosition) => ({
        symbol: p.symbol,
        qty: parseFloat(p.qty),
        side: p.side,
        avgEntryPrice: parseFloat(p.avg_entry_price),
        currentPrice: parseFloat(p.current_price),
        marketValue: parseFloat(p.market_value),
        unrealizedPnl: parseFloat(p.unrealized_pl),
        unrealizedPnlPct: parseFloat(p.unrealized_plpc) * 100,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Network error: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 }
    );
  }
}

interface AlpacaPosition {
  symbol: string;
  qty: string;
  side: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}
