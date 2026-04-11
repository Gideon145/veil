"use client";

import { useEffect, useState } from "react";
import { getPublicClient, formatChainlinkPrice } from "@/lib/utils";
import { CDS_ABI } from "@/lib/abis";
import deployments from "@/lib/deployments.json";

export function PriceFeed({ compact = false }: { compact?: boolean }) {
  const [price, setPrice] = useState<bigint | null>(null);
  const [updatedAt, setUpdatedAt] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchPrice() {
    try {
      const client = getPublicClient();
      const result = await client.readContract({
        address: deployments.ConfidentialCDS as `0x${string}`,
        abi: CDS_ABI,
        functionName: "getLatestPrice",
      });
      setPrice(result[0] as unknown as bigint);
      setUpdatedAt(result[1] as unknown as bigint);
    } catch {
      // Contract not deployed yet — show placeholder
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => clearInterval(interval);
  }, []);

  const isStale = updatedAt && Date.now() / 1000 - Number(updatedAt) > 7200;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {loading ? (
          <div className="h-6 w-28 bg-gray-800 animate-pulse rounded" />
        ) : price ? (
          <span className="text-xl font-bold font-mono text-white">{formatChainlinkPrice(price)}</span>
        ) : (
          <span className="text-gray-500 text-sm">—</span>
        )}
        <span className="text-xs font-medium text-green-400">● Live</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 uppercase tracking-wider">ETH/USD</span>
        {loading ? (
          <div className="h-6 w-24 bg-gray-800 animate-pulse rounded mt-0.5" />
        ) : price ? (
          <span className="text-xl font-bold font-mono text-white">
            {formatChainlinkPrice(price)}
          </span>
        ) : (
          <span className="text-gray-500 text-sm">Deploy contracts first</span>
        )}
      </div>
      <div className="ml-auto flex flex-col items-end gap-1">
        <span className="text-xs font-medium text-green-400">● Live</span>
        {isStale && <span className="text-xs text-yellow-500">Stale data</span>}
        <span className="text-xs text-gray-600">Chainlink</span>
      </div>
    </div>
  );
}
