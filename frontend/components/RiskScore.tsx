"use client";

import { useEffect, useState } from "react";

interface RiskScoreProps {
  triggerPriceUSD: number;
  currentPriceUSD: number;
  status: number;
}

export function RiskScore({ triggerPriceUSD, currentPriceUSD, status }: RiskScoreProps) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  const distancePct = currentPriceUSD > 0
    ? ((currentPriceUSD - triggerPriceUSD) / currentPriceUSD) * 100
    : 0;

  const score = Math.max(0, Math.min(100, Math.round(distancePct * 2)));

  const getRiskLabel = () => {
    if (status === 1) return { label: "Credit Event", color: "text-red-400", bg: "bg-red-900/30 border-red-800" };
    if (score < 20) return { label: "Critical", color: "text-red-400", bg: "bg-red-900/30 border-red-800" };
    if (score < 40) return { label: "High Risk", color: "text-orange-400", bg: "bg-orange-900/30 border-orange-800" };
    if (score < 60) return { label: "Moderate", color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-800" };
    if (score < 80) return { label: "Low Risk", color: "text-green-400", bg: "bg-green-900/30 border-green-800" };
    return { label: "Minimal Risk", color: "text-green-400", bg: "bg-green-900/20 border-green-900" };
  };

  const risk = getRiskLabel();

  const fallbackInsight = () => {
    if (status === 1) return "Credit event has fired. Settlement is pending.";
    if (distancePct < 5) return "ETH/USD is dangerously close to the trigger price.";
    if (distancePct < 15) return "ETH/USD within 15% of trigger. Monitor closely.";
    if (distancePct < 30) return "Moderate margin above trigger.";
    return `ETH/USD is ${distancePct.toFixed(1)}% above trigger price.`;
  };

  useEffect(() => {
    if (currentPriceUSD <= 0 || triggerPriceUSD <= 0) return;
    setLoading(true);
    setAiError(false);
    fetch("/api/risk-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPriceUSD, triggerPriceUSD, status }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.insight) setAiInsight(data.insight);
        else setAiError(true);
      })
      .catch(() => setAiError(true))
      .finally(() => setLoading(false));
  }, [currentPriceUSD, triggerPriceUSD, status]);

  return (
    <div className={`bg-gray-900 border ${risk.bg} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Risk Score</div>
          <div className={`text-2xl font-bold ${risk.color}`}>{score}/100</div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${risk.bg} ${risk.color}`}>
          {risk.label}
        </div>
      </div>

      <div className="h-2 bg-gray-800 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            score < 40 ? "bg-red-500" : score < 60 ? "bg-yellow-500" : "bg-green-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
          Analyzing with ChainGPT…
        </div>
      ) : (
        <p className="text-sm text-gray-400">{aiInsight ?? fallbackInsight()}</p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${aiInsight ? "bg-green-600" : aiError ? "bg-red-800" : "bg-gray-600"}`} />
        {aiInsight ? "Powered by ChainGPT AI · live analysis" : aiError ? "ChainGPT unavailable · on-chain data" : "Powered by ChainGPT + on-chain data"}
      </div>
    </div>
  );
}

