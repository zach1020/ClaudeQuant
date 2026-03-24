import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface PolygonTicker {
  ticker: string;
  todaysChangePerc?: number;
  day?: { c: number; v: number };
}

export async function POST(req: NextRequest) {
  const { anthropicKey, polygonApiKey } = await req.json();

  if (!anthropicKey) {
    return NextResponse.json({ error: "Anthropic API key required" }, { status: 400 });
  }

  // Fetch top movers from Polygon to seed Claude's search
  let moversContext = "";
  if (polygonApiKey) {
    try {
      const [gRes, lRes] = await Promise.all([
        fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${polygonApiKey}`),
        fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers?apiKey=${polygonApiKey}`),
      ]);
      const [gData, lData] = await Promise.all([gRes.json(), lRes.json()]);

      const fmt = (tickers: PolygonTicker[]) =>
        (tickers ?? []).slice(0, 8).map((t) =>
          `  ${t.ticker}: ${(t.todaysChangePerc ?? 0) > 0 ? "+" : ""}${(t.todaysChangePerc ?? 0).toFixed(1)}% | $${(t.day?.c ?? 0).toFixed(2)} | ${((t.day?.v ?? 0) / 1e6).toFixed(1)}M shares`
        ).join("\n");

      if (gData.tickers?.length || lData.tickers?.length) {
        moversContext = `\nToday's top movers from Polygon.io (use these as starting points):\nGAINERS:\n${fmt(gData.tickers)}\n\nLOSERS:\n${fmt(lData.tickers)}\n`;
      }
    } catch {
      // Continue without movers data
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const prompt = `Today is ${today}. You are an expert day trader scanning for the best intraday trading opportunities.${moversContext}

Use web search to find the best day trading setups available right now. Research:
1. Stocks with strong catalysts today (earnings beats/misses, FDA decisions, analyst upgrades/downgrades, M&A, partnerships)
2. Stocks breaking out of key technical levels on high relative volume
3. Pre-market gap ups/downs with follow-through potential
4. Sector rotations, macro events, or Fed-related moves driving today's market

Return ONLY a valid JSON object (no markdown fences, no explanation before or after) with this exact structure:
{
  "market_summary": "1-2 sentence overview of today's market conditions and key themes",
  "recommendations": [
    {
      "ticker": "XXXX",
      "signal": "BUY",
      "confidence": 0.80,
      "setup": "earnings breakout",
      "catalyst": "beat Q3 EPS by 15%, raised guidance",
      "thesis": "2-3 sentence trading thesis with specific price levels and why this setup is compelling today",
      "risk": "key downside risk or what would invalidate the setup",
      "entry_zone": "specific price level or condition to enter (e.g. 'above $145 on volume')",
      "sources": ["headline or source that confirms the catalyst"]
    }
  ],
  "themes": ["sector or macro theme driving today"]
}

signal must be one of: "BUY" | "WATCH" | "AVOID"
confidence must be a number 0.0–1.0
Aim for 5–8 recommendations. Prioritize setups with clear catalysts and defined risk.`;

  const client = new Anthropic({ apiKey: anthropicKey });

  try {
    // Use Anthropic's built-in web search tool — executed server-side by Anthropic
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      messages: [{ role: "user", content: prompt }],
    });

    // Collect all text blocks (Claude may emit text before/after tool use)
    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "No structured response from Claude", raw: text.slice(0, 500) });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ...result, usage: response.usage, webSearchUsed: true });
  } catch (webSearchErr) {
    console.error("Web search attempt failed, falling back:", webSearchErr);

    // Fallback: Claude without web search (uses Polygon movers data + general knowledge)
    try {
      const fallbackPrompt = `${prompt}\n\n(Web search is unavailable for this request. Base your analysis on the movers data above and your knowledge of market conditions for ${today}. Be transparent that this is based on general knowledge rather than live web data.)`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: fallbackPrompt }],
      });

      const text = response.content.find((c) => c.type === "text")?.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
      }

      return NextResponse.json({
        ...JSON.parse(jsonMatch[0]),
        usage: response.usage,
        webSearchUsed: false,
      });
    } catch (fallbackErr) {
      return NextResponse.json(
        { error: `Discovery failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}` },
        { status: 500 }
      );
    }
  }
}
