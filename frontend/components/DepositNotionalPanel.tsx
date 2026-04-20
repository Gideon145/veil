"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { getPublicClient } from "@/lib/utils";
import { CDS_ABI, USDC_ABI } from "@/lib/abis";
import DEPLOYMENTS from "@/lib/deployments.json";

interface DepositNotionalPanelProps {
  cdsId: number;
  seller: string;
  status: number;
}

export function DepositNotionalPanel({ cdsId, seller, status }: DepositNotionalPanelProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<"idle" | "approving" | "depositing">("idle");

  const cdsAddress = DEPLOYMENTS.ConfidentialCDS as `0x${string}`;
  const usdcAddress = DEPLOYMENTS.MockUSDC as `0x${string}`;

  const isSeller = address?.toLowerCase() === seller.toLowerCase();

  // Read current USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  // Read current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [address as `0x${string}`, cdsAddress],
    query: { enabled: !!address },
  });

  const { writeContract: approve, data: approveTx } = useWriteContract();
  const { writeContract: deposit, data: depositTx } = useWriteContract();
  const { writeContract: mint, data: mintTx } = useWriteContract();
  const [minting, setMinting] = useState(false);

  const { isSuccess: mintSuccess, isLoading: mintConfirming } = useWaitForTransactionReceipt({ hash: mintTx });

  async function handleMint() {
    if (!address) return;
    setMinting(true);
    try {
      const client = getPublicClient();
      const price = await client.getGasPrice();
      const gasPrice = (price * BigInt(150)) / BigInt(100);
      mint({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "mint",
        args: [address, parseUnits("10000", 6)],
        gasPrice,
      });
    } finally {
      setMinting(false);
    }
  }

  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTx,
    onReplaced: () => refetchAllowance(),
  });

  const { isSuccess: depositSuccess } = useWaitForTransactionReceipt({ hash: depositTx });

  // Refetch allowance after approve confirms
  if (approveSuccess) refetchAllowance();

  const amountRaw = amount ? parseUnits(amount, 6) : 0n;
  const hasEnoughAllowance = allowance !== undefined && allowance >= amountRaw;
  const hasEnoughBalance = usdcBalance !== undefined && usdcBalance >= amountRaw;

  async function getGasPrice() {
    const { createPublicClient, http } = await import("viem");
    const { arbitrumSepolia } = await import("viem/chains");
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });
    const price = await client.getGasPrice();
    return { gasPrice: (price * BigInt(150)) / BigInt(100) };
  }

  async function handleApprove() {
    if (!amount || !amountRaw) return;
    setPhase("approving");
    try {
      const gas = await getGasPrice();
      approve({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "approve",
        args: [cdsAddress, amountRaw],
        ...gas,
      });
    } finally {
      setPhase("idle");
    }
  }

  async function handleDeposit() {
    if (!amount || !amountRaw) return;
    setPhase("depositing");
    try {
      const gas = await getGasPrice();
      deposit({
        address: cdsAddress,
        abi: CDS_ABI,
        functionName: "depositNotional",
        args: [BigInt(cdsId), amountRaw],
        ...gas,
      });
    } finally {
      setPhase("idle");
    }
  }

  // Only show to seller, only when Active (status=0) and not yet deposited
  if (!isSeller || status !== 0) return null;

  if (depositSuccess) {
    return (
      <div className="bg-gray-900 border border-green-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
          <span>✓</span> Notional Deposited
        </div>
        <p className="text-xs text-gray-500">
          USDC is now held in escrow. The buyer can claim it if a credit event fires.
        </p>
        {depositTx && (
          <a
            href={`https://sepolia.arbiscan.io/tx/${depositTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:underline mt-2 block"
          >
            View on Arbiscan →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-1">Deposit Notional (Seller)</h2>
      <p className="text-xs text-gray-500 mb-4">
        Deposit USDC into escrow to activate protection. You are the seller — funds are held until maturity or credit event.
      </p>

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-500">
          Balance:{" "}
          <span className="text-gray-300 font-mono">
            {usdcBalance !== undefined ? parseFloat(formatUnits(usdcBalance, 6)).toLocaleString() : "—"} USDC
          </span>
        </div>
        <button
          onClick={handleMint}
          disabled={minting || mintConfirming}
          className="text-xs text-violet-400 hover:text-violet-300 border border-violet-800/50 px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          {mintConfirming ? "Minting…" : mintSuccess ? "✓ Minted" : "+ Get 10k test USDC"}
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="number"
          placeholder="Amount (USDC)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600"
        />
        {usdcBalance !== undefined && usdcBalance > 0n && (
          <button
            onClick={() => setAmount(formatUnits(usdcBalance, 6))}
            className="text-xs text-violet-400 hover:text-violet-300 px-3 py-2 bg-violet-900/20 border border-violet-800/40 rounded-lg"
          >
            Max
          </button>
        )}
      </div>

      {!hasEnoughBalance && amount && (
        <p className="text-xs text-red-400 mb-3">
          Insufficient balance.{" "}
          <span className="text-gray-500">
            Run <code className="bg-gray-800 px-1 rounded">npx hardhat run scripts/seed.ts --network arbitrumSepolia</code> to mint test USDC.
          </span>
        </p>
      )}

      <div className="flex gap-3">
        {!hasEnoughAllowance ? (
          <button
            onClick={handleApprove}
            disabled={!amount || !amountRaw || phase === "approving"}
            className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {phase === "approving" ? "Approving..." : approveSuccess ? "✓ Approved" : "1. Approve USDC"}
          </button>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={!amount || !amountRaw || !hasEnoughBalance || phase === "depositing"}
            className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {phase === "depositing" ? "Depositing..." : "2. Deposit into Escrow"}
          </button>
        )}
      </div>

      {hasEnoughAllowance && amount && (
        <p className="text-xs text-green-500 mt-2">✓ Allowance set — ready to deposit</p>
      )}
    </div>
  );
}
