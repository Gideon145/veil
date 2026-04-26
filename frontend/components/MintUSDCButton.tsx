"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { getPublicClient } from "@/lib/utils";
import { USDC_ABI } from "@/lib/abis";
import DEPLOYMENTS from "@/lib/deployments.json";

export function MintUSDCButton() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  if (!isConnected) return null;

  async function handleMint() {
    if (!address) return;
    setStatus("pending");
    setErrMsg(null);
    try {
      const client = getPublicClient();
      const gasPrice = await client.getGasPrice();
      const gas = { gasPrice: (gasPrice * 150n) / 100n };
      const hash = await writeContractAsync({
        address: DEPLOYMENTS.MockUSDC as `0x${string}`,
        abi: USDC_ABI,
        functionName: "mint",
        args: [address, parseUnits("10000", 6)],
        ...gas,
      });
      await client.waitForTransactionReceipt({ hash });
      setStatus("done");
    } catch (e) {
      setErrMsg((e as Error).message?.split("(")[0] ?? "Mint failed");
      setStatus("error");
    }
  }

  return (
    <div className="bg-violet-900/10 border border-violet-800/30 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
      <div>
        <span className="text-sm text-violet-200 font-medium">Need test USDC?</span>
        <p className="text-xs text-violet-400/70 mt-0.5">Mint 10,000 USDC to your wallet (Arbitrum Sepolia testnet)</p>
        {errMsg && <p className="text-xs text-red-400 mt-1">{errMsg}</p>}
      </div>
      <button
        onClick={handleMint}
        disabled={status === "pending" || status === "done"}
        className="ml-4 flex-shrink-0 text-xs font-medium px-3 py-2 rounded-lg border transition-colors disabled:opacity-50
          bg-violet-900/30 border-violet-700 text-violet-300 hover:bg-violet-800/40 disabled:cursor-not-allowed"
      >
        {status === "pending" ? "Minting…" : status === "done" ? "✓ Minted" : "+ Get 10k test USDC"}
      </button>
    </div>
  );
}
