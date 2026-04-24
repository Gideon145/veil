// AutoDepositDemo is disabled — depositNotional now requires Nox TEE encryption
// via DepositNotionalPanel's 4-step CT flow. Kept as a stub to avoid import errors.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AutoDepositDemo(_props: { cdsId: number; notionalDeposited: boolean; onDeposited: () => void }) {
  return null;
}

// Publicly documented Hardhat account #0 — safe for testnet demo only
const DEMO_SELLER_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const DEMO_AMOUNT = parseUnits("5000", 6); // 5000 USDC

type Step = "idle" | "minting" | "approving" | "depositing" | "done" | "error";

export function AutoDepositDemo({ cdsId, notionalDeposited, onDeposited }: {
  cdsId: number;
  notionalDeposited: boolean;
  onDeposited: () => void;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (notionalDeposited) return null;

  async function runAutoDeposit() {
    setStep("minting");
    setErrorMsg(null);
    setTxHash(null);

    try {
      const { createWalletClient, createPublicClient, http } = await import("viem");
      const { privateKeyToAccount } = await import("viem/accounts");
      const { arbitrumSepolia } = await import("viem/chains");

      const account = privateKeyToAccount(DEMO_SELLER_PK);
      const transport = http("https://sepolia-rollup.arbitrum.io/rpc");
      const publicClient = createPublicClient({ chain: arbitrumSepolia, transport });
      const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport });

      const gasPrice = await publicClient.getGasPrice();
      const gas = { gasPrice: (gasPrice * BigInt(150)) / BigInt(100) };

      const cdsAddress = DEPLOYMENTS.ConfidentialCDS as `0x${string}`;
      const usdcAddress = DEPLOYMENTS.MockUSDC as `0x${string}`;

      // 1. Mint USDC to demo seller
      setStep("minting");
      const mintHash = await walletClient.writeContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "mint",
        args: [account.address, DEMO_AMOUNT],
        ...gas,
      });
      await publicClient.waitForTransactionReceipt({ hash: mintHash });

      // 2. Approve CDS contract to spend USDC
      setStep("approving");
      const freshGasPrice = await publicClient.getGasPrice();
      const freshGas = { gasPrice: (freshGasPrice * BigInt(150)) / BigInt(100) };
      const approveHash = await walletClient.writeContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "approve",
        args: [cdsAddress, DEMO_AMOUNT],
        ...freshGas,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 3. Deposit notional
      setStep("depositing");
      const freshGasPrice2 = await publicClient.getGasPrice();
      const freshGas2 = { gasPrice: (freshGasPrice2 * BigInt(150)) / BigInt(100) };
      const depositHash = await walletClient.writeContract({
        address: cdsAddress,
        abi: CDS_ABI,
        functionName: "depositNotional",
        args: [BigInt(cdsId), DEMO_AMOUNT],
        ...freshGas2,
      });
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      setTxHash(depositHash);
      setStep("done");
      onDeposited();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  const label: Record<Step, string> = {
    idle: "Simulate seller deposit →",
    minting: "Minting test USDC…",
    approving: "Approving spend…",
    depositing: "Depositing into escrow…",
    done: "✓ Deposited",
    error: "Failed — retry",
  };

  return (
    <div className="border border-yellow-800/40 bg-yellow-950/20 rounded-xl p-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-yellow-500 hover:text-yellow-400 font-medium flex items-center gap-1 transition-colors"
      >
        ⚡ Demo shortcut {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-yellow-400/80 leading-relaxed">
            For judges: this auto-runs the full seller flow on-chain using a public testnet key
            (Hardhat #0) — mints 5,000 USDC, approves, and deposits into escrow in one click.
            No wallet switch needed.
          </p>

          {step === "done" ? (
            <div className="space-y-2">
              <div className="text-xs text-green-400 font-medium">✓ Collateral escrowed — hedge is now active</div>
              {txHash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-400 hover:underline"
                >
                  View deposit tx →
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={runAutoDeposit}
              disabled={step !== "idle" && step !== "error"}
              className="w-full text-sm font-medium py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-900/50 disabled:text-yellow-700 text-black transition-colors"
            >
              {label[step]}
            </button>
          )}

          {step !== "idle" && step !== "done" && step !== "error" && (
            <div className="flex items-center gap-2 text-xs text-yellow-400/60">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
              {step === "minting" && "Step 1/3 — minting MockUSDC to seller…"}
              {step === "approving" && "Step 2/3 — approving escrow contract…"}
              {step === "depositing" && "Step 3/3 — depositing into escrow…"}
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2 break-words">
              {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
