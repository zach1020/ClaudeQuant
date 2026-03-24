import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickers = (searchParams.get("tickers") ?? "").split(",").filter(Boolean);
  const bearerToken = searchParams.get("token") ?? process.env.X_BEARER_TOKEN ?? "";

  if (!bearerToken || !tickers.length) {
    return NextResponse.json({ tweets: getMockTweets(tickers) });
  }

  // Build query: cashtag mentions for each ticker + trading keywords
  const cashTags = tickers.slice(0, 5).map((t) => `$${t}`).join(" OR ");
  const query = `(${cashTags}) (bullish OR bearish OR buy OR sell OR breakout OR squeeze OR earnings OR catalyst OR moon OR dump) -is:retweet lang:en`;

  try {
    const params = new URLSearchParams({
      query,
      max_results: "20",
      "tweet.fields": "created_at,public_metrics,author_id,entities",
      expansions: "author_id",
      "user.fields": "username,name,verified,public_metrics",
    });

    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("X API error:", err);
      return NextResponse.json({ tweets: getMockTweets(tickers) });
    }

    const data = await res.json();

    if (!data.data?.length) {
      return NextResponse.json({ tweets: getMockTweets(tickers) });
    }

    // Map users for lookup
    const users: Record<string, XUser> = {};
    for (const user of data.includes?.users ?? []) {
      users[user.id] = user;
    }

    const tweets: Tweet[] = data.data.map((t: XTweet) => {
      const user = users[t.author_id];
      const mentionedTickers = tickers.filter((tk) =>
        t.text.toUpperCase().includes(`$${tk}`)
      );
      const sentimentScore = scoreSentiment(t.text);
      return {
        id: t.id,
        text: t.text,
        authorName: user?.name ?? "Unknown",
        authorHandle: user?.username ? `@${user.username}` : "",
        authorFollowers: user?.public_metrics?.followers_count ?? 0,
        verified: user?.verified ?? false,
        likes: t.public_metrics?.like_count ?? 0,
        retweets: t.public_metrics?.retweet_count ?? 0,
        replies: t.public_metrics?.reply_count ?? 0,
        createdAt: new Date(t.created_at ?? Date.now()).getTime(),
        tickers: mentionedTickers,
        sentiment: sentimentScore > 0.1 ? "bullish" : sentimentScore < -0.1 ? "bearish" : "neutral",
        sentimentScore,
        url: `https://twitter.com/i/web/status/${t.id}`,
      };
    });

    return NextResponse.json({ tweets });
  } catch (err) {
    console.error("X fetch error:", err);
    return NextResponse.json({ tweets: getMockTweets(tickers) });
  }
}

interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  public_metrics?: { like_count: number; retweet_count: number; reply_count: number };
  entities?: { cashtags?: { tag: string }[] };
}

interface XUser {
  id: string;
  name: string;
  username: string;
  verified?: boolean;
  public_metrics?: { followers_count: number };
}

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

const BULLISH_WORDS = [
  "bullish", "buy", "long", "breakout", "moon", "squeeze", "calls", "rip",
  "gains", "rocket", "pump", "catalyst", "strong", "support", "bounce",
  "beat", "raised", "guidance", "surge", "rally", "upside", "green",
];
const BEARISH_WORDS = [
  "bearish", "sell", "short", "dump", "puts", "crash", "drop", "tank",
  "miss", "weak", "resistance", "breakdown", "cut", "downgrade", "red",
  "collapse", "fade", "overvalued", "risk", "warning",
];

function scoreSentiment(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of BULLISH_WORDS) if (lower.includes(w)) score += 0.15;
  for (const w of BEARISH_WORDS) if (lower.includes(w)) score -= 0.15;
  return Math.max(-1, Math.min(1, score));
}

function getMockTweets(tickers: string[]): Tweet[] {
  const ticker = tickers[0] ?? "AAPL";
  const now = Date.now();
  return [
    {
      id: "mock-1",
      text: `$${ticker} breaking above VWAP with 2.3x relative volume. Bullish momentum building. Eyes on prior day high at resistance. #daytrading #stocks`,
      authorName: "TraderJoe",
      authorHandle: "@traderjoe_x",
      authorFollowers: 24500,
      verified: false,
      likes: 342,
      retweets: 87,
      replies: 23,
      createdAt: now - 4 * 60 * 1000,
      tickers: [ticker],
      sentiment: "bullish",
      sentimentScore: 0.6,
      url: "#",
    },
    {
      id: "mock-2",
      text: `$${ticker} RSI hitting 72 on the 5m chart. Getting overbought. Watch for a pullback to VWAP before reloading longs. Risk management first.`,
      authorName: "QuantSignals",
      authorHandle: "@quantsignals",
      authorFollowers: 89200,
      verified: true,
      likes: 1240,
      retweets: 320,
      replies: 91,
      createdAt: now - 9 * 60 * 1000,
      tickers: [ticker],
      sentiment: "neutral",
      sentimentScore: 0.0,
      url: "#",
    },
    {
      id: "mock-3",
      text: `Massive $${ticker} call sweep just came in — 10,000 contracts $${(Math.random() * 10 + 180).toFixed(0)} strike exp next week. Smart money loading up. 🚀`,
      authorName: "FlowAlerts",
      authorHandle: "@flowalerts_pro",
      authorFollowers: 156000,
      verified: true,
      likes: 2870,
      retweets: 940,
      replies: 287,
      createdAt: now - 14 * 60 * 1000,
      tickers: [ticker],
      sentiment: "bullish",
      sentimentScore: 0.75,
      url: "#",
    },
    {
      id: "mock-4",
      text: `$${ticker} earnings beat was expected. Stock already priced in. Selling the news here. Short-term bearish until support is retested. #trading`,
      authorName: "BearThesis",
      authorHandle: "@bearthesis",
      authorFollowers: 33100,
      verified: false,
      likes: 189,
      retweets: 44,
      replies: 67,
      createdAt: now - 22 * 60 * 1000,
      tickers: [ticker],
      sentiment: "bearish",
      sentimentScore: -0.45,
      url: "#",
    },
    {
      id: "mock-5",
      text: `Fed minutes dropped. Markets reacting. $SPY $QQQ $${ticker} all seeing volume spikes. Wait for the dust to settle before entering positions. #macro`,
      authorName: "MacroWatch",
      authorHandle: "@macrowatch_",
      authorFollowers: 412000,
      verified: true,
      likes: 5400,
      retweets: 1800,
      replies: 432,
      createdAt: now - 31 * 60 * 1000,
      tickers: [ticker, "SPY", "QQQ"],
      sentiment: "neutral",
      sentimentScore: -0.1,
      url: "#",
    },
    {
      id: "mock-6",
      text: `$${ticker} squeeze setup developing. Float rotation looks clean. Low float + high short interest = potential fireworks. Size appropriately. Not financial advice.`,
      authorName: "SqueezeScanner",
      authorHandle: "@squeezescanner",
      authorFollowers: 78400,
      verified: false,
      likes: 876,
      retweets: 231,
      replies: 55,
      createdAt: now - 47 * 60 * 1000,
      tickers: [ticker],
      sentiment: "bullish",
      sentimentScore: 0.55,
      url: "#",
    },
  ];
}
