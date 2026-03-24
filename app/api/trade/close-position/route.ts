import { NextRequest, NextResponse } from "next/server";

const ALPACA_URLS = {
  paper: "https://paper-api.alpaca.markets",
  live: "https://api.alpaca.markets",
};

/** DELETE a position by symbol — closes the entire position on Alpaca */
export async function POST(req: NextRequest) {
  const { mode, apiKey, apiSecret, symbol } = await req.json();

  if (!apiKey || !apiSecret || !symbol) {
    return NextResponse.json({ error: "Missing credentials or symbol" }, { status: 400 });
  }

  const baseUrl = ALPACA_URLS[mode as "paper" | "live"] ?? ALPACA_URLS.paper;

  try {
    const res = await fetch(`${baseUrl}/v2/positions/${encodeURIComponent(symbol)}`, {
      method: "DELETE",
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": apiSecret,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? "Failed to close position", code: data.code },
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
