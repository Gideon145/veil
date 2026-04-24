"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PriceFeed } from "@/components/PriceFeed";
import { SettlementPanel } from "@/components/SettlementPanel";
import { DepositNotionalPanel } from "@/components/DepositNotionalPanel";
import { RiskScore } from "@/components/RiskScore";
import { CDS_ABI } from "@/lib/abis";
import {
  CDS_STATUS,
  formatChainlinkPrice,
  getStatusColor,
  shortenAddress,
  getPublicClient,
} from "@/lib/utils";
import DEPLOYMENTS from "@/lib/deployments.json";

interface CDSData {
  buyer: string;
  seller: string;
  triggerPrice: bigint;
  maturityTimestamp: bigint;
  status: number;
  notionalDeposited: boolean;
  notionalHandle: string;
}

export default function PositionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const cdsId = parseInt(id, 10);
  const { address } = useAccount();

  const [cds, setCds] = useState<CDSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<bigint | null>(null);
  const [auditorAddress, setAuditorAddress] = useState("");
  const [grantingAuditor, setGrantingAuditor] = useState(false);

  const cdsAddress = (DEPLOYMENTS.ConfidentialCDS || undefined) as `0x${string}` | undefined;

  const { writeContract: grantAuditor, data: grantTx } = useWriteContract();
  const { isSuccess: grantSuccess } = useWaitForTransactionReceipt({ hash: grantTx });

  useEffect(() => {
    async function loadCDS() {
      if (!cdsAddress) return;
      try {
        const client = getPublicClient();
        const data = (await client.readContract({
          address: cdsAddress,
          abi: CDS_ABI,
          functionName: "getCDS",
          args: [BigInt(cdsId)],
        })) as unknown as [string, string, bigint, bigint, bigint, number, boolean, string, string];

        setCds({
          buyer: data[0],
          seller: data[1],
          triggerPrice: data[2],
          maturityTimestamp: data[3],
          status: data[5],
          notionalDeposited: data[6],
          notionalHandle: data[7],
        });

        // Also try to get current price via getLatestPrice
        try {
          const priceResult = (await client.readContract({
            address: cdsAddress,
            abi: CDS_ABI,
            functionName: "getLatestPrice",
          })) as [bigint, bigint];
          setCurrentPrice(priceResult[0]);
        } catch {
          // not deployed or chainlink not available
        }
      } catch {
        // invalid id
      } finally {
        setLoading(false);
      }
    }

    loadCDS();
    const interval = setInterval(loadCDS, 30000);
    return () => clearInterval(interval);
  }, [cdsId, cdsAddress]);

  async function handleGrantAuditor() {
    if (!auditorAddress || !/^0x[0-9a-fA-F]{40}$/.test(auditorAddress) || !cdsAddress) return;
    setGrantingAuditor(true);
    try {
      const { createPublicClient, http, parseGwei } = await import("viem");
      const { arbitrumSepolia } = await import("viem/chains");
      const client = createPublicClient({ chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });
      const fees = await client.estimateFeesPerGas();
      grantAuditor({
        address: cdsAddress,
        abi: CDS_ABI,
        functionName: "grantAuditorAccess",
        args: [BigInt(cdsId), auditorAddress as `0x${string}`],
        maxFeePerGas: fees.maxFeePerGas ? fees.maxFeePerGas * BigInt(2) : parseGwei("0.5"),
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas ?? parseGwei("0.001"),
      });
    } finally {
      setGrantingAuditor(false);
    }
  }

  const isBuyer = address?.toLowerCase() === cds?.buyer?.toLowerCase();
  const maturityDate = cds
    ? new Date(Number(cds.maturityTimestamp) * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white px-6 py-12 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-48 bg-gray-800 rounded" />
          <div className="h-8 w-64 bg-gray-800 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="h-40 bg-gray-900 rounded-xl" />
            <div className="h-40 bg-gray-900 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!cds) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">404</div>
          <p className="text-gray-400 mb-4">Hedge #{cdsId} not found.</p>
          <Link href="/" className="text-violet-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-gray-300 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-200">Hedge #{cdsId}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">Hedge #{cdsId}</h1>
              <span className={`text-sm font-semibold ${getStatusColor(cds.status)}`}>
                {CDS_STATUS[cds.status]}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Matures {maturityDate}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Price Floor</div>
            <div className="text-2xl font-bold font-mono text-red-400">
              {formatChainlinkPrice(cds.triggerPrice)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contract details */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Contract Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Buyer</span>
                  <span className="font-mono text-white flex items-center gap-2">
                    {shortenAddress(cds.buyer)}
                    {isBuyer && (
                      <span className="text-xs bg-violet-900/50 text-violet-400 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Counterparty (Seller)</span>
                  <span className="font-mono text-white flex items-center gap-2">
                    {shortenAddress(cds.seller)}
                    {address?.toLowerCase() === cds.seller.toLowerCase() && (
                      <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Maturity</span>
                  <span className="text-white">{maturityDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coverage Status</span>
                  <span className={cds.notionalDeposited ? "text-green-400" : "text-orange-400"}>
                    {cds.notionalDeposited ? "✓ Escrowed" : "Pending deposit"}
                  </span>
                </div>
                {!cds.notionalDeposited && (
                  <div className="mt-1 bg-orange-950/30 border border-orange-800/30 rounded-lg px-3 py-2.5 text-xs text-orange-300/80 leading-relaxed">
                    <span className="font-semibold text-orange-300">Waiting for counterparty to deposit.</span>{" "}
                    The seller ({shortenAddress(cds.seller)}) must lock USDC into escrow before this hedge becomes active.
                    Once they deposit, if ETH drops below your price floor, the contract automatically pays you out — no action needed on your end.
                  </div>
                )}

                {cds.notionalHandle && cds.notionalHandle !== "0" && (
                  <div className="pt-2 border-t border-gray-800">
                    <div className="text-xs text-gray-500 mb-2">Encrypted Coverage Handle</div>
                    <div className="bg-gray-950 rounded-lg px-3 py-2 font-mono text-xs text-violet-300 break-all">
                      {cds.notionalHandle}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Decrypt via iExec Nox SDK with your authorized key
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deposit notional — only seller, only when not yet deposited */}
            {!cds.notionalDeposited && (
              <DepositNotionalPanel
                cdsId={cdsId}
                seller={cds.seller}
                status={cds.status}
              />
            )}

            {/* Settlement panel */}
            <SettlementPanel
              cdsId={cdsId}
              status={cds.status}
              notionalDeposited={cds.notionalDeposited}
              buyer={cds.buyer}
              currentPrice={currentPrice}
              triggerPrice={cds.triggerPrice}
            />

            {/* Auditor access — only buyer can grant */}
            {isBuyer && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-300 mb-1">Grant Auditor Access</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Authorize an address to decrypt the notional amount from the iExec Nox TEE.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={auditorAddress}
                    onChange={(e) => setAuditorAddress(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-600 focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleGrantAuditor}
                    disabled={
                      grantingAuditor ||
                      !/^0x[0-9a-fA-F]{40}$/.test(auditorAddress)
                    }
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {grantingAuditor ? "Granting..." : "Grant"}
                  </button>
                </div>
                {grantSuccess && (
                  <p className="text-xs text-green-400 mt-2">
                    Auditor access granted successfully.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Live price */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-2">Live ETH/USD</div>
              <PriceFeed compact />
            </div>

            {/* Risk score */}
            <RiskScore
              triggerPriceUSD={Number(cds.triggerPrice) / 1e8}
              currentPriceUSD={currentPrice ? Number(currentPrice) / 1e8 : 0}
              status={cds.status}
            />

            {/* Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-2">
              <div className="font-semibold text-gray-400">Privacy Model</div>
              <p>
                Notional encrypted via iExec Nox. Only authorized parties can
                decrypt using the TEE key-management system.
              </p>
              <p>
                Settlement is trustless via Chainlink ETH/USD oracle — no
                off-chain counterparty required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
