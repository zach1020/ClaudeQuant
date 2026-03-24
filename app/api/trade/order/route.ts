import { NextRequest, NextResponse } from "next/server";

const ALPACA_URLS = {
  paper: "https://paper-api.alpaca.markets",
  live: "https://api.alpaca.markets",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    mode,           // "paper" | "live"
    apiKey,
    apiSecret,
    symbol,
    side,           // "buy" | "sell"
    type,           // "market" | "limit" | "stop_limit"
    qty,
    notional,       // dollar amount — used instead of qty for fractional orders
    limitPrice,
    stopPrice,
  } = body;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Missing Alpaca credentials" }, { status: 400 });
  }

  const baseUrl = ALPACA_URLS[mode as "paper" | "live"] ?? ALPACA_URLS.paper;

  const orderBody: Record<string, unknown> = {
    symbol,
    side: side.toLowerCase(),
    type: type.toLowerCase(),
    time_in_force: "day",
  };

  // Notional-based (fractional) vs qty-based ordering
  if (notional != null) {
    orderBody.notional = String(notional);
  } else {
    orderBody.qty = String(qty);
  }

  if (type === "LIMIT" || type === "STOP_LIMIT") {
    orderBody.limit_price = String(limitPrice);
  }
  if (type === "STOP_LIMIT") {
    orderBody.stop_price = String(stopPrice);
  }

  try {
    const res = await fetch(`${baseUrl}/v2/orders`, {
      method: "POST",
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderBody),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? "Alpaca order rejected", code: data.code },
        { status: res.status }
      );
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    return NextResponse.json(
      { error: `Network error: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 }
    );
  }
}
