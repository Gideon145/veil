"use client";

import { CDS_STATUS, formatChainlinkPrice, getStatusColor, shortenAddress } from "@/lib/utils";
import Link from "next/link";

interface CDSCardProps {
  cdsId: number;
  buyer: string;
  seller: string;
  triggerPrice: bigint;
  maturityTimestamp: bigint;
  status: number;
  notionalDeposited: boolean;
  notionalHandle: string;
  connectedAddress?: string;
}

export function CDSCard({
  cdsId,
  buyer,
  seller,
  triggerPrice,
  maturityTimestamp,
  status,
  notionalDeposited,
  notionalHandle,
  connectedAddress,
}: CDSCardProps) {
  const maturityDate = new Date(Number(maturityTimestamp) * 1000).toLocaleDateString();
  const isBuyer = connectedAddress?.toLowerCase() === buyer.toLowerCase();
  const isSeller = connectedAddress?.toLowerCase() === seller.toLowerCase();

  return (
    <Link href={`/position/${cdsId}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-700 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">Hedge #{cdsId}</span>
              {isBuyer && <span className="text-xs bg-violet-900/50 text-violet-400 px-2 py-0.5 rounded-full">You · Buyer</span>}
              {isSeller && <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded-full">You · Seller</span>}
            </div>
            <div className={`text-sm font-semibold mt-1 ${getStatusColor(status)}`}>
              {CDS_STATUS[status]}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500">Price Floor</div>
            <div className="text-lg font-bold font-mono text-red-400">
              {formatChainlinkPrice(triggerPrice)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500 mb-1">Coverage</div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-violet-500 rounded-full" />
              <span className="font-mono text-gray-300 text-xs truncate">
                {notionalHandle.slice(0, 10)}...
              </span>
              <span className="text-xs text-gray-600">(encrypted)</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Collateral</div>
            <span className={`text-xs font-medium ${notionalDeposited ? "text-green-400" : "text-yellow-500"}`}>
              {notionalDeposited ? "✓ Escrowed" : "⚠ Pending"}
            </span>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Buyer</div>
            <span className="font-mono text-xs text-gray-300">{shortenAddress(buyer)}</span>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Matures</div>
            <span className="text-xs text-gray-300">{maturityDate}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
            Nox Confidential • Arbitrum Sepolia
          </div>
          <span className="text-xs text-violet-500 group-hover:text-violet-300 transition-colors">
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}
