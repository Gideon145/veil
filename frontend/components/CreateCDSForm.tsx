"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { CDS_ABI } from "@/lib/abis";
import { toChainlinkPrice, getPublicClient, formatChainlinkPrice } from "@/lib/utils";
import deployments from "@/lib/deployments.json";

export function CreateCDSForm() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<"form" | "encrypting" | "confirm" | "success">("form");
  const [livePrice, setLivePrice] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const client = getPublicClient();
        const result = await client.readContract({
          address: deployments.ConfidentialCDS as `0x${string}`,
          abi: CDS_ABI,
          functionName: "getLatestPrice",
        });
        setLivePrice(formatChainlinkPrice(result[0] as unknown as bigint));
      } catch { /* ignore */ }
    }
    fetchPrice();
  }, []);

  const [form, setForm] = useState({
    seller: "",
    notionalUSDC: "",
    triggerPriceUSD: "",
    durationDays: "30",
    premiumIntervalDays: "7",
  });

  const [encryptedData, setEncryptedData] = useState<{
    handle: `0x${string}`;
    proof: `0x${string}`;
  } | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function handleEncryptNotional() {
    if (!form.notionalUSDC || !address) return;
    setStep("encrypting");

    try {
      // Dynamic import to avoid SSR issues with Nox SDK
      const { createViemHandleClient } = await import("@iexec-nox/handle");
      const { createWalletClient, custom } = await import("viem");
      const { arbitrumSepolia } = await import("viem/chains");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).ethereum) throw new Error("MetaMask not found");
      const walletClient = createWalletClient({
        chain: arbitrumSepolia,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom((window as any).ethereum),
        account: address,
      });
      const noxClient = await createViemHandleClient(walletClient);

      const notionalRaw = parseUnits(form.notionalUSDC, 6);
      const { handle, handleProof } = await noxClient.encryptInput(
        notionalRaw,
        "uint256",
        deployments.ConfidentialCDS as `0x${string}`,
      );

      setEncryptedData({
        handle: handle as `0x${string}`,
        proof: handleProof as `0x${string}`,
      });
      setStep("confirm");
    } catch (err) {
      console.error("Encryption failed:", err);
      setStep("form");
      alert("Encryption failed. Make sure MetaMask is connected to Arbitrum Sepolia.");
    }
  }

  async function handleSubmit() {
    if (!encryptedData || !form.seller) return;

    try {
      // Fetch current gas fees to avoid "max fee per gas less than base fee" revert
      const { createPublicClient, http, parseGwei } = await import("viem");
      const { arbitrumSepolia } = await import("viem/chains");
      const publicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http("https://sepolia-rollup.arbitrum.io/rpc"),
      });
      const fees = await publicClient.estimateFeesPerGas();
      // Apply 2x buffer to ensure we're always above base fee
      const maxFeePerGas = fees.maxFeePerGas
        ? fees.maxFeePerGas * BigInt(2)
        : parseGwei("0.5");
      const maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? parseGwei("0.001");

      writeContract({
        address: deployments.ConfidentialCDS as `0x${string}`,
        abi: CDS_ABI,
        functionName: "createCDS",
        args: [
          encryptedData.handle,
          encryptedData.proof,
          toChainlinkPrice(form.triggerPriceUSD),
          BigInt(form.durationDays),
          BigInt(Number(form.premiumIntervalDays) * 86400),
          form.seller as `0x${string}`,
        ],
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
    } catch (err) {
      console.error("Transaction failed:", err);
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-[#04080f] border border-green-700/50 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-green-900/40 border border-green-700/60 flex items-center justify-center text-lg">✅</div>
          <div>
            <h2 className="text-lg font-bold text-green-400">Hedge Opened</h2>
            <p className="text-xs text-gray-500">Your position is live on Arbitrum Sepolia</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Floor Price</div>
            <div className="text-lg font-bold font-mono text-red-400">${parseFloat(form.triggerPriceUSD).toLocaleString()}</div>
            <div className="text-xs text-gray-600 mt-0.5">Triggers payout below this</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Coverage Amount</div>
            <div className="text-lg font-bold font-mono text-blue-400">*** ENCRYPTED</div>
            <div className="text-xs text-gray-600 mt-0.5">Hidden via iExec Nox TEE</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Duration</div>
            <div className="text-lg font-bold">{form.durationDays} days</div>
            <div className="text-xs text-gray-600 mt-0.5">Time to maturity</div>
          </div>
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Nox Handle</div>
            <div className="text-xs font-mono text-blue-300 truncate">{encryptedData?.handle.slice(0, 18)}…</div>
            <div className="text-xs text-gray-600 mt-0.5">On-chain ciphertext ref</div>
          </div>
        </div>

        {/* Privacy note */}
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl px-4 py-3 mb-5 text-xs text-blue-300 flex items-start gap-2">
          <span className="mt-0.5">🔒</span>
          <span>Your position size is encrypted on-chain. Nobody — not even node operators — can read it. Etherscan only sees the 32-byte Nox handle above.</span>
        </div>

        {/* Links */}
        <div className="flex gap-3">
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg py-2.5 transition-colors"
          >
            View on Arbiscan →
          </a>
          <a
            href="/"
            className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 transition-colors font-medium"
          >
            Back to Dashboard →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-6 h-6 bg-violet-600/30 border border-violet-600 rounded text-violet-400 text-xs flex items-center justify-center font-bold">
            {step === "form" ? "1" : step === "encrypting" ? "2" : "3"}
          </div>
          <h2 className="font-semibold">
            {step === "form" ? "Open a Hedge" :
             step === "encrypting" ? "Encrypting via iExec Nox TEE..." :
             "Review & Confirm"}
          </h2>
        </div>
        <p className="text-xs text-gray-500 ml-9">
          Your coverage amount will be encrypted before hitting the blockchain — nobody can see your position size.
        </p>
      </div>

      {step === "form" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">Counterparty Address</label>
              {address && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, seller: address }))}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Use my address (testnet demo)
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="0x..."
              value={form.seller}
              onChange={e => setForm(f => ({ ...f, seller: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600"
            />
            <p className="text-xs text-gray-600 mt-1">The wallet that will pay you if ETH drops below your floor price</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Coverage Amount (USDC)</label>
              <input
                type="number"
                placeholder="100000"
                value={form.notionalUSDC}
                onChange={e => setForm(f => ({ ...f, notionalUSDC: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600"
              />
              <p className="text-xs text-gray-600 mt-1">🔒 Encrypted — nobody sees this on-chain</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">Price Floor (USD)</label>
                {livePrice && (
                  <span className="text-xs text-green-400 font-mono">Live: {livePrice}</span>
                )}
              </div>
              <input
                type="number"
                placeholder="1500"
                value={form.triggerPriceUSD}
                onChange={e => setForm(f => ({ ...f, triggerPriceUSD: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600"
              />
              <p className="text-xs text-gray-600 mt-1">You get paid if ETH drops below this</p>
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Duration (days)</label>
              <div className="flex gap-2">
                {["7", "14", "30", "90"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, durationDays: d }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.durationDays === d
                        ? "bg-violet-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleEncryptNotional}
            disabled={!isConnected || !form.notionalUSDC || !form.seller || !form.triggerPriceUSD}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 rounded-lg transition-colors mt-2"
          >
            {!isConnected ? "Connect Wallet First" : "Encrypt & Continue →"}
          </button>
        </div>
      )}

      {step === "encrypting" && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 font-medium">Encrypting via Nox TEE</p>
          <p className="text-gray-500 text-sm mt-1">
            Your coverage amount is being encrypted inside an Intel TDX Trusted Execution Environment.
            MetaMask will prompt you to sign — this keeps your position size hidden on-chain.
          </p>
        </div>
      )}

      {step === "confirm" && encryptedData && (
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nox Handle</span>
              <span className="font-mono text-xs text-violet-400">{encryptedData.handle.slice(0, 18)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Price Floor</span>
              <span className="text-red-400 font-mono">${parseFloat(form.triggerPriceUSD).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span>{form.durationDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Seller</span>
              <span className="font-mono text-xs">{form.seller.slice(0, 10)}...</span>
            </div>
          </div>

          <div className="bg-violet-950/30 border border-violet-800/50 rounded-lg p-3 text-xs text-violet-300">
            ✓ Notional encrypted. Etherscan will show only a 32-byte handle — the actual USDC amount is invisible on-chain.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("form")}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || isConfirming}
              className="flex-2 flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {isPending ? "Confirm in MetaMask..." : isConfirming ? "Deploying..." : "Open Hedge →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
