"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { getPublicClient } from "@/lib/utils";
import { CDS_ABI, CUSDC_ABI, USDC_ABI } from "@/lib/abis";
import DEPLOYMENTS from "@/lib/deployments.json";

interface DepositNotionalPanelProps {
  cdsId: number;
  seller: string;
  status: number;
}

type Phase =
  | "idle"
  | "minting"
  | "approving"
  | "wrapping"
  | "operator"
  | "encrypting"
  | "depositing";

const STEPS = [
  { key: "approve",  label: "Approve USDC → cUSDC" },
  { key: "wrap",     label: "Wrap USDC → cUSDC" },
  { key: "operator", label: "Authorise CDS contract" },
  { key: "deposit",  label: "Deposit encrypted notional" },
] as const;

export function DepositNotionalPanel({ cdsId, seller, status }: DepositNotionalPanelProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cdsAddress   = DEPLOYMENTS.ConfidentialCDS as `0x${string}`;
  const cUsdcAddress = DEPLOYMENTS.ConfidentialUSDC as `0x${string}`;
  const usdcAddress  = DEPLOYMENTS.MockUSDC as `0x${string}`;

  const isSeller = address?.toLowerCase() === seller.toLowerCase();

  // Read current USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  // Check if CDS contract is already an operator on cUSDC for this seller
  const { data: operatorSet, refetch: refetchOperator } = useReadContract({
    address: cUsdcAddress,
    abi: CUSDC_ABI,
    functionName: "isOperator",
    args: [address as `0x${string}`, cdsAddress],
    query: { enabled: !!address },
  });

  const { writeContractAsync } = useWriteContract();
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: depositSuccess } = useWaitForTransactionReceipt({ hash: depositTxHash });

  const amountRaw = amount ? parseUnits(amount, 6) : 0n;

  async function getGas() {
    const client = getPublicClient();
    const price = await client.getGasPrice();
    return { gasPrice: (price * 150n) / 100n };
  }

  function markDone(step: string) {
    setCompletedSteps(prev => new Set([...prev, step]));
  }

  async function waitForTx(hash: `0x${string}`) {
    const { createPublicClient, http } = await import("viem");
    const { arbitrumSepolia } = await import("viem/chains");
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });
    await client.waitForTransactionReceipt({ hash });
  }

  async function handleMint() {
    if (!address) return;
    setPhase("minting");
    setErrorMsg(null);
    try {
      const gas = await getGas();
      const hash = await writeContractAsync({ address: usdcAddress, abi: USDC_ABI, functionName: "mint", args: [address, parseUnits("10000", 6)], ...gas });
      await waitForTx(hash);
      refetchBalance();
    } catch (e) { setErrorMsg((e as Error).message?.split("(")[0] ?? "Mint failed"); }
    finally { setPhase("idle"); }
  }

  async function handleApprove() {
    if (!amountRaw) return;
    setPhase("approving");
    setErrorMsg(null);
    try {
      const gas = await getGas();
      const hash = await writeContractAsync({ address: usdcAddress, abi: USDC_ABI, functionName: "approve", args: [cUsdcAddress, amountRaw], ...gas });
      await waitForTx(hash);
      markDone("approve");
    } catch (e) { setErrorMsg((e as Error).message?.split("(")[0] ?? "Approve failed"); }
    finally { setPhase("idle"); }
  }

  async function handleWrap() {
    if (!address || !amountRaw) return;
    setPhase("wrapping");
    setErrorMsg(null);
    try {
      const gas = await getGas();
      const hash = await writeContractAsync({ address: cUsdcAddress, abi: CUSDC_ABI, functionName: "wrap", args: [address, amountRaw], ...gas });
      await waitForTx(hash);
      markDone("wrap");
    } catch (e) { setErrorMsg((e as Error).message?.split("(")[0] ?? "Wrap failed"); }
    finally { setPhase("idle"); }
  }

  async function handleSetOperator() {
    setPhase("operator");
    setErrorMsg(null);
    try {
      const gas = await getGas();
      const UINT48_MAX = 281474976710655; // uint48 max — viem infers uint48 as number
      const hash = await writeContractAsync({ address: cUsdcAddress, abi: CUSDC_ABI, functionName: "setOperator", args: [cdsAddress, UINT48_MAX], ...gas });
      await waitForTx(hash);
      markDone("operator");
      refetchOperator();
    } catch (e) { setErrorMsg((e as Error).message?.split("(")[0] ?? "setOperator failed"); }
    finally { setPhase("idle"); }
  }

  async function handleDeposit() {
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
      // Encrypt for cUSDC address — cUSDC calls Nox.fromExternal internally
      const { handle, handleProof } = await noxClient.encryptInput(amountRaw, "uint256", cUsdcAddress);

      setPhase("depositing");
      const gas = await getGas();
      const hash = await writeContractAsync({
        address: cdsAddress,
        abi: CDS_ABI,
        functionName: "depositNotional",
        args: [BigInt(cdsId), handle, handleProof],
        gas: 800_000n, // explicit limit — bypasses estimateGas which fails on Nox TEE calls
        ...gas,
      });
      setDepositTxHash(hash);
      markDone("deposit");
    } catch (e) {
      setErrorMsg((e as Error).message?.split("(")[0] ?? "Deposit failed");
      setPhase("idle");
    }
  }

  if (!isSeller || status !== 0) return null;

  if (depositSuccess) {
    return (
      <div className="bg-gray-900 border border-green-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
          <span>✓</span> Notional Deposited (Confidential)
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Encrypted cUSDC is held in escrow. The amount is hidden on-chain — only you and the buyer can decrypt it via iExec Nox ACL.
        </p>
        {depositTxHash && (
          <a href={`https://sepolia.arbiscan.io/tx/${depositTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline">
            View on Arbiscan →
          </a>
        )}
      </div>
    );
  }

  const isIdle = phase === "idle";
  const stepDone = (k: string) => completedSteps.has(k) || (k === "operator" && !!operatorSet);

  const stepLabel = (key: string) => {
    if (key === "approve")  return phase === "approving"  ? "Approving…"          : stepDone("approve")  ? "✓ Approved"        : "Approve USDC → cUSDC";
    if (key === "wrap")     return phase === "wrapping"   ? "Wrapping…"           : stepDone("wrap")     ? "✓ Wrapped"         : "Wrap USDC → cUSDC";
    if (key === "operator") return phase === "operator"   ? "Authorising…"        : stepDone("operator") ? "✓ CDS Authorised"  : "Authorise CDS contract";
    /* deposit */           return phase === "encrypting" ? "Encrypting with Nox…": phase === "depositing" ? "Confirming on-chain…" : stepDone("deposit") ? "✓ Deposited" : "Deposit encrypted notional";
  };

  const stepAction = (key: string) =>
    key === "approve" ? handleApprove : key === "wrap" ? handleWrap : key === "operator" ? handleSetOperator : handleDeposit;

  const prevDone = (key: string) =>
    key === "approve" ? true : key === "wrap" ? stepDone("approve") : key === "operator" ? stepDone("wrap") : stepDone("operator");

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-1">Deposit Notional (Seller)</h2>
        <p className="text-xs text-gray-500">Lock collateral as encrypted cUSDC. Amount stays hidden — only you and the buyer can decrypt it via Nox ACL.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Balance: <span className="text-gray-300 font-mono">{usdcBalance !== undefined ? parseFloat(formatUnits(usdcBalance, 6)).toLocaleString() : "—"} USDC</span></span>
          <button onClick={handleMint} disabled={phase === "minting" || !isIdle} className="text-xs text-violet-400 border border-violet-800/50 px-2 py-1 rounded disabled:opacity-40">
            {phase === "minting" ? "Minting…" : "+ Get 10k test USDC"}
          </button>
        </div>
        <div className="flex gap-2">
          <input type="number" placeholder="Amount (USDC)" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!isIdle}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-600 disabled:opacity-50" />
          {usdcBalance !== undefined && usdcBalance > 0n && (
            <button onClick={() => setAmount(formatUnits(usdcBalance, 6))} disabled={!isIdle} className="text-xs text-violet-400 px-3 py-2 bg-violet-900/20 border border-violet-800/40 rounded-lg disabled:opacity-40">Max</button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const done = stepDone(step.key);
          const active = (step.key === "approve" && phase === "approving") || (step.key === "wrap" && phase === "wrapping") || (step.key === "operator" && phase === "operator") || (step.key === "deposit" && (phase === "encrypting" || phase === "depositing"));
          const enabled = isIdle && !done && prevDone(step.key) && !!amount && amountRaw > 0n;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? "bg-green-900 text-green-400 border border-green-700" : active ? "bg-violet-900 text-violet-300 border border-violet-600 animate-pulse" : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
                {done ? "✓" : active ? "…" : i + 1}
              </div>
              <button onClick={stepAction(step.key)} disabled={!enabled}
                className={`flex-1 text-left text-sm px-3 py-2 rounded-lg border transition-colors ${done ? "bg-green-900/20 border-green-800/40 text-green-400 cursor-default" : active ? "bg-violet-900/30 border-violet-700 text-violet-300" : !enabled ? "bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-violet-700 hover:text-violet-300"}`}>
                {stepLabel(step.key)}
              </button>
            </div>
          );
        })}
      </div>

      {errorMsg && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{errorMsg}</p>}
      <p className="text-xs text-gray-600">🔒 Notional deposited as cUSDC — amount hidden on-chain via iExec Nox TEE</p>
    </div>
  );
}
