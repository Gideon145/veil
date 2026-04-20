import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.CHAINGPT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CHAINGPT_API_KEY not configured" }, { status: 500 });
  }

  const { currentPriceUSD, triggerPriceUSD, status } = await req.json();

  const distancePct = currentPriceUSD > 0
    ? (((currentPriceUSD - triggerPriceUSD) / currentPriceUSD) * 100).toFixed(1)
    : "0";

  const statusLabel = status === 0 ? "Active" : status === 1 ? "Settled (credit event fired)" : "Expired";

  const question = `You are a concise DeFi risk analyst. Analyze this ETH/USD Credit Default Swap (hedge) position:
- Current ETH/USD price: $${currentPriceUSD.toLocaleString()}
- Price floor (trigger price): $${triggerPriceUSD.toLocaleString()}
- Distance from trigger: ${distancePct}% above floor
- Status: ${statusLabel}
- Mechanism: If ETH falls below $${triggerPriceUSD.toLocaleString()}, the buyer automatically receives USDC payout from escrowed seller collateral (trustless, via Chainlink oracle).

Write exactly 2 sentences of risk analysis for the buyer. Be specific about the price distance, ETH volatility context, and credit event likelihood. No markdown, no bullet points, plain prose only.`;

  try {
    const res = await fetch("https://api.chaingpt.org/chat/stream", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "general_assistant",
        question,
        chatHistory: "off",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const insight = data?.data?.bot ?? data?.bot ?? "";
    return NextResponse.json({ insight });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
