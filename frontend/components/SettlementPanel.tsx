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

  const [autoSettling, setAutoSettling] = useState(false);
  const [autoSettleTx, setAutoSettleTx] = useState<string | null>(null);
  const [autoSettleError, setAutoSettleError] = useState<string | null>(null);

  async function getGasPrice() {
    const { createPublicClient, http } = await import("viem");
    const { arbitrumSepolia } = await import("viem/chains");
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });
    const price = await client.getGasPrice();
    return { gasPrice: (price * BigInt(150)) / BigInt(100) };
  }

  async function handleSettle() {
    const gas = await getGasPrice();
    settle({
      address: deployments.ConfidentialCDS as `0x${string}`,
      abi: CDS_ABI,
      functionName: "checkAndSettle",
      args: [BigInt(cdsId)],
      ...gas,
    });
  }

  async function handleClaim() {
    const gas = await getGasPrice();
    claim({
      address: deployments.ConfidentialCDS as `0x${string}`,
      abi: CDS_ABI,
      functionName: "claimPayout",
      args: [BigInt(cdsId)],
      ...gas,
    });
  }

  // Demo key: publicly documented Hardhat #0 — safe for testnet only
  const DEMO_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

  async function handleAutoSettle() {
    setAutoSettling(true);
    setAutoSettleError(null);
    try {
      const { createWalletClient, createPublicClient, http } = await import("viem");
      const { privateKeyToAccount } = await import("viem/accounts");
      const { arbitrumSepolia } = await import("viem/chains");
      const account = privateKeyToAccount(DEMO_PK);
      const transport = http("https://sepolia-rollup.arbitrum.io/rpc");
      const publicClient = createPublicClient({ chain: arbitrumSepolia, transport });
      const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport });
      const gasPrice = await publicClient.getGasPrice();
      const gas = { gasPrice: (gasPrice * BigInt(150)) / BigInt(100) };
      const hash = await walletClient.writeContract({
        address: deployments.ConfidentialCDS as `0x${string}`,
        abi: CDS_ABI,
        functionName: "checkAndSettle",
        args: [BigInt(cdsId)],
        ...gas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setAutoSettleTx(hash);
    } catch (err) {
      setAutoSettleError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutoSettling(false);
    }
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
          {!notionalDeposited ? (
            <div className="w-full bg-gray-900 border border-orange-800/40 rounded-lg py-3 px-4 text-sm text-orange-400 text-center">
              ⚠ Seller must deposit first — use the shortcut above
            </div>
          ) : (
            <button
              onClick={handleSettle}
              disabled={isSettling || !creditEventTriggered}
              className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-3 rounded-lg transition-colors text-sm"
            >
              {isSettling ? "Checking oracle..." : creditEventTriggered ? "Trigger Settlement" : "No Credit Event (Price Above Trigger)"}
            </button>
          )}

          {/* Demo shortcut */}
          <div>
            <button
              onClick={() => setShowDemo(v => !v)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Demo mode {showDemo ? "▲" : "▼"}
            </button>
            {showDemo && (
              <div className="mt-2 bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-3 space-y-3">
                <p className="text-xs text-yellow-400/80 leading-relaxed">
                  To trigger a credit event: create a new hedge with a <strong>Price Floor above the current ETH price</strong> (e.g. $9,999).
                  Then use the ⚡ Demo shortcut below to deposit, and click "Force settle" here — the oracle will confirm ETH is below that floor and fire the event.
                </p>
                {creditEventTriggered ? (
                  <div className="space-y-2">
                    {autoSettleTx ? (
                      <div className="space-y-1">
                        <div className="text-xs text-green-400 font-medium">✓ Credit event fired on-chain</div>
                        <a
                          href={`https://sepolia.arbiscan.io/tx/${autoSettleTx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-violet-400 hover:underline"
                        >
                          View settlement tx →
                        </a>
                        <div className="text-xs text-gray-500 mt-1">Refresh page — buyer can now claim payout.</div>
                      </div>
                    ) : (
                      <button
                        onClick={handleAutoSettle}
                        disabled={autoSettling}
                        className="w-full text-sm font-medium py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black transition-colors"
                      >
                        {autoSettling ? "Settling on-chain…" : "⚡ Force settle via demo key"}
                      </button>
                    )}
                    {autoSettleError && (
                      <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2 break-words">
                        {autoSettleError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-yellow-600">
                    Price floor must be above current ETH price to force settle. Current ETH: ${currentPrice ? (Number(currentPrice) / 1e8).toLocaleString() : "…"} — floor: ${(Number(triggerPrice) / 1e8).toLocaleString()}
                  </div>
                )}
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
