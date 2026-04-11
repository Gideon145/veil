"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CDS_ABI } from "@/lib/abis";
import deployments from "@/lib/deployments.json";

interface SettlementPanelProps {
  cdsId: number;
  status: number;
  notionalDeposited: boolean;
  buyer: string;
  currentPrice: bigint | null;
  triggerPrice: bigint;
}

export function SettlementPanel({
  cdsId,
  status,
  notionalDeposited,
  buyer,
  currentPrice,
  triggerPrice,
}: SettlementPanelProps) {
  const { address } = useAccount();
  const [showDemo, setShowDemo] = useState(false);

  const { writeContract: settle, data: settleTx, isPending: isSettling } = useWriteContract();
  const { writeContract: claim, data: claimTx, isPending: isClaiming } = useWriteContract();

  useWaitForTransactionReceipt({ hash: settleTx });
  const { isSuccess: claimed } = useWaitForTransactionReceipt({ hash: claimTx });

  const isBuyer = address?.toLowerCase() === buyer.toLowerCase();
  const isActive = status === 0;
  const isSettled = status === 1;
  const creditEventTriggered = currentPrice !== null && currentPrice <= triggerPrice;

  async function getFees() {
    const { createPublicClient, http, parseGwei } = await import("viem");
    const { arbitrumSepolia } = await import("viem/chains");
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });
    const fees = await client.estimateFeesPerGas();
    return {
      maxFeePerGas: fees.maxFeePerGas ? fees.maxFeePerGas * BigInt(2) : parseGwei("0.5"),
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas ?? parseGwei("0.001"),
    };
  }

  async function handleSettle() {
    const gasFees = await getFees();
    settle({
      address: deployments.ConfidentialCDS as `0x${string}`,
      abi: CDS_ABI,
      functionName: "checkAndSettle",
      args: [BigInt(cdsId)],
      ...gasFees,
    });
  }

  async function handleClaim() {
    const gasFees = await getFees();
    claim({
      address: deployments.ConfidentialCDS as `0x${string}`,
      abi: CDS_ABI,
      functionName: "claimPayout",
      args: [BigInt(cdsId)],
      ...gasFees,
    });
  }

  if (!isActive && !isSettled) return null;

  return (
    <div className="space-y-4">
      {/* Live price vs trigger */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Credit Event Monitor</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Current ETH/USD</div>
            <div className="text-xl font-bold font-mono text-white">
              {currentPrice ? `$${(Number(currentPrice) / 1e8).toLocaleString()}` : "Loading..."}
            </div>
            <div className="text-xs text-gray-600 mt-1">Chainlink Oracle</div>
          </div>

          <div className="bg-gray-900 border border-red-900/50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Trigger Price</div>
            <div className="text-xl font-bold font-mono text-red-400">
              ${(Number(triggerPrice) / 1e8).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600 mt-1">Credit event fires below</div>
          </div>
        </div>

        {currentPrice !== null && (
          <div className={`rounded-lg p-3 text-sm font-medium ${
            creditEventTriggered
              ? "bg-red-950/50 border border-red-800 text-red-400"
              : "bg-green-950/30 border border-green-900 text-green-400"
          }`}>
            {creditEventTriggered
              ? "⚡ Credit event triggered — ETH/USD is below trigger price"
              : `✓ No credit event — ETH/USD is $${((Number(currentPrice) - Number(triggerPrice)) / 1e8).toLocaleString()} above trigger`}
          </div>
        )}
      </div>

      {/* Actions */}
      {isActive && (
        <div className="space-y-3">
          <button
            onClick={handleSettle}
            disabled={isSettling || !creditEventTriggered}
            className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-3 rounded-lg transition-colors text-sm"
          >
            {isSettling ? "Checking oracle..." : creditEventTriggered ? "Trigger Settlement" : "No Credit Event (Price Above Trigger)"}
          </button>

          {/* Demo button — for hackathon demo this simulates a credit event */}
          <div>
            <button
              onClick={() => setShowDemo(v => !v)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Demo mode {showDemo ? "▲" : "▼"}
            </button>
            {showDemo && (
              <div className="mt-2 bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-3 text-xs text-yellow-400">
                In the live demo, set the trigger price ABOVE current ETH/USD when creating the CDS to simulate a credit event immediately.
                The trigger price is public — this is realistic (TradFi contracts specify public strike conditions; the sensitivity is the notional amount, which stays encrypted).
              </div>
            )}
          </div>
        </div>
      )}

      {isSettled && isBuyer && (
        <div className="space-y-3">
          <div className="bg-red-950/30 border border-red-800 rounded-xl p-4 text-sm">
            <div className="text-red-400 font-semibold mb-1">⚡ Credit Event Fired</div>
            <div className="text-gray-400">You can now claim the escrowed notional payout.</div>
          </div>

          <button
            onClick={handleClaim}
            disabled={isClaiming || !notionalDeposited || claimed}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {claimed ? "✓ Payout Claimed" : isClaiming ? "Claiming..." : "Claim Encrypted Payout"}
          </button>

          {claimed && claimTx && (
            <a
              href={`https://sepolia.arbiscan.io/tx/${claimTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-violet-400 hover:underline"
            >
              View payout tx on Arbiscan →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
