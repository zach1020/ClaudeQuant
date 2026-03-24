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
    limitPrice,
    stopPrice,
  } = body;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Missing Alpaca credentials" }, { status: 400 });
  }

  const baseUrl = ALPACA_URLS[mode as "paper" | "live"] ?? ALPACA_URLS.paper;

  const orderBody: Record<string, unknown> = {
    symbol,
    qty: String(qty),
    side: side.toLowerCase(),
    type: type.toLowerCase().replace("_", "_"),
    time_in_force: "day",
  };

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
