"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { getPublicClient } from "@/lib/utils";
import { CDS_ABI, USDC_ABI } from "@/lib/abis";
import DEPLOYMENTS from "@/lib/deployments.json";

interface PayPremiumPanelProps {
  cdsId: number;
  buyer: string;
  status: number;
  nextPremiumDue: bigint;
  notionalDeposited: boolean;
}

type Phase = "idle" | "approving" | "encrypting" | "paying";

export function PayPremiumPanel({
  cdsId,
  buyer,
  status,
  nextPremiumDue,
  notionalDeposited,
}: PayPremiumPanelProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paidTx, setPaidTx] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  const cdsAddress = DEPLOYMENTS.ConfidentialCDS as `0x${string}`;
  const usdcAddress = DEPLOYMENTS.MockUSDC as `0x${string}`;

  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  const { writeContractAsync } = useWriteContract();

  const isBuyer = address?.toLowerCase() === buyer.toLowerCase();
  if (!isBuyer || status !== 0 || !notionalDeposited) return null;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isDue = nextPremiumDue === 0n || now >= nextPremiumDue;
  const dueDate =
    nextPremiumDue > 0n
      ? new Date(Number(nextPremiumDue) * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const amountRaw = amount ? parseUnits(amount, 6) : 0n;

  async function getGas() {
    const client = getPublicClient();
    const gasPrice = await client.getGasPrice();
    return { gasPrice: (gasPrice * 150n) / 100n };
  }

  async function waitForTx(hash: `0x${string}`) {
    const { createPublicClient, http } = await import("viem");
    const { arbitrumSepolia } = await import("viem/chains");
    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http("https://sepolia-rollup.arbitrum.io/rpc"),
    });
    await client.waitForTransactionReceipt({ hash });
  }

  async function handleApprove() {
    if (!amountRaw) return;
    setPhase("approving");
    setErrorMsg(null);
    try {
      const gas = await getGas();
      const hash = await writeContractAsync({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "approve",
        args: [cdsAddress, amountRaw],
        ...gas,
      });
      await waitForTx(hash);
      setApproved(true);
    } catch (e) {
      setErrorMsg((e as Error).message?.split("(")[0] ?? "Approve failed");
    } finally {
      setPhase("idle");
    }
  }

  async function handlePay() {
    if (!address || !amountRaw) return;
    setPhase("encrypting");
    setErrorMsg(null);
    try {
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
      // Encrypt for CDS address — payPremium calls Nox.fromExternal with msg.sender = buyer
      const { handle, handleProof } = await noxClient.encryptInput(
        amountRaw,
        "uint256",
        cdsAddress
      );

      setPhase("paying");
      const gas = await getGas();
      const hash = await writeContractAsync({
        address: cdsAddress,
        abi: CDS_ABI,
        functionName: "payPremium",
        args: [BigInt(cdsId), handle, handleProof, amountRaw],
        gas: 800_000n,
        ...gas,
      });
      await waitForTx(hash);
      setPaidTx(hash);
    } catch (e) {
      setErrorMsg(
        (e as Error).message?.split("(")[0] ?? "Premium payment failed"
      );
    } finally {
      setPhase("idle");
    }
  }

  if (paidTx) {
    return (
      <div className="bg-gray-900 border border-green-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
          <span>✓</span> Premium Paid
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Encrypted premium recorded on-chain. Seller receives USDC.
        </p>
        <a
          href={`https://sepolia.arbiscan.io/tx/${paidTx}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-violet-400 hover:underline"
        >
          View on Arbiscan →
        </a>
      </div>
    );
  }

  const isIdle = phase === "idle";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-1">
          Pay Premium (Buyer)
        </h2>
        <p className="text-xs text-gray-500">
          Send your periodic USDC premium to the seller. Amount is encrypted
          on-chain via iExec Nox for a private audit trail.
        </p>
      </div>

      {!isDue && dueDate && (
        <div className="bg-blue-950/30 border border-blue-800/30 rounded-lg px-3 py-2 text-xs text-blue-300">
          Next premium due{" "}
          <span className="font-semibold text-blue-200">{dueDate}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            Balance:{" "}
            <span className="text-gray-300 font-mono">
              {usdcBalance !== undefined
                ? parseFloat(formatUnits(usdcBalance, 6)).toLocaleString()
                : "—"}{" "}
              USDC
            </span>
          </span>
        </div>
        <input
          type="number"
          placeholder="Premium amount (USDC)"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setApproved(false);
          }}
          disabled={!isIdle || !isDue}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600 disabled:opacity-50"
        />
      </div>

      {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

      <div className="space-y-2">
        {/* Step 1: Approve */}
        <div className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              approved
                ? "bg-green-900 text-green-400 border border-green-700"
                : phase === "approving"
                ? "bg-violet-900 text-violet-300 border border-violet-600 animate-pulse"
                : "bg-gray-800 text-gray-500 border border-gray-700"
            }`}
          >
            {approved ? "✓" : phase === "approving" ? "…" : "1"}
          </div>
          <button
            onClick={handleApprove}
            disabled={!isIdle || approved || !amountRaw || !isDue}
            className={`flex-1 text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
              approved
                ? "bg-green-900/20 border-green-800/40 text-green-400 cursor-default"
                : phase === "approving"
                ? "bg-violet-900/30 border-violet-700 text-violet-300"
                : !isIdle || !amountRaw || !isDue
                ? "bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-violet-700 hover:text-violet-300"
            }`}
          >
            {phase === "approving"
              ? "Approving…"
              : approved
              ? "✓ Approved"
              : "Approve USDC"}
          </button>
        </div>

        {/* Step 2: Encrypt + Pay */}
        <div className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              phase === "encrypting" || phase === "paying"
                ? "bg-violet-900 text-violet-300 border border-violet-600 animate-pulse"
                : "bg-gray-800 text-gray-500 border border-gray-700"
            }`}
          >
            {phase === "encrypting" || phase === "paying" ? "…" : "2"}
          </div>
          <button
            onClick={handlePay}
            disabled={!isIdle || !approved || !amountRaw || !isDue}
            className={`flex-1 text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
              phase === "encrypting" || phase === "paying"
                ? "bg-violet-900/30 border-violet-700 text-violet-300"
                : !isIdle || !approved || !amountRaw || !isDue
                ? "bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-violet-700 hover:text-violet-300"
            }`}
          >
            {phase === "encrypting"
              ? "Encrypting with Nox…"
              : phase === "paying"
              ? "Confirming on-chain…"
              : "Pay encrypted premium"}
          </button>
        </div>
      </div>
    </div>
  );
}
