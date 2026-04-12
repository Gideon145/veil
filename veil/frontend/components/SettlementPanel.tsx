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
          {claimed && claimTx ? (
            /* ── Position-closed summary card ── */
            <div className="bg-[#04080f] border border-green-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-900/40 border border-green-700/60 flex items-center justify-center text-lg">✅</div>
                <div>
                  <h2 className="text-lg font-bold text-green-400">Position Closed</h2>
                  <p className="text-xs text-gray-500">Payout claimed · CDS #{cdsId} settled</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Settlement Type</div>
                  <div className="text-base font-bold text-red-400">⚡ Credit Event</div>
                  <div className="text-xs text-gray-600 mt-0.5">ETH fell below floor</div>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Floor Price</div>
                  <div className="text-base font-bold font-mono text-red-400">
                    ${(Number(triggerPrice) / 1e8).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Trigger threshold</div>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">ETH at Settlement</div>
                  <div className="text-base font-bold font-mono text-white">
                    {currentPrice ? `$${(Number(currentPrice) / 1e8).toLocaleString()}` : "—"}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Chainlink oracle price</div>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Payout</div>
                  <div className="text-base font-bold font-mono text-blue-400">*** ENCRYPTED</div>
                  <div className="text-xs text-gray-600 mt-0.5">Decrypted privately in TEE</div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl px-4 py-3 mb-5 text-xs text-blue-300 flex items-start gap-2">
                <span className="mt-0.5">🔒</span>
                <span>Your payout was computed inside an iExec Nox Trusted Execution Environment. The notional was never exposed on-chain.</span>
              </div>

              <div className="flex gap-3">
                <a
                  href={`https://sepolia.arbiscan.io/tx/${claimTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg py-2.5 transition-colors"
                >
                  View payout tx on Arbiscan →
                </a>
                <a
                  href="/"
                  className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 transition-colors font-medium"
                >
                  Back to Dashboard →
                </a>
              </div>
            </div>
          ) : (
            /* ── Pre-claim: credit event fired, claim button ── */
            <>
              <div className="bg-red-950/30 border border-red-800 rounded-xl p-4 text-sm">
                <div className="text-red-400 font-semibold mb-1">⚡ Credit Event Fired</div>
                <div className="text-gray-400">You can now claim the escrowed notional payout.</div>
              </div>

              <button
                onClick={handleClaim}
                disabled={isClaiming || !notionalDeposited}
                className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isClaiming ? "Claiming..." : "Claim Encrypted Payout"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
