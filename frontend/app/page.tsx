"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { CDSCard } from "@/components/CDSCard";
import { PriceFeed } from "@/components/PriceFeed";
import { CDS_ABI } from "@/lib/abis";
import DEPLOYMENTS from "@/lib/deployments.json";

interface CDSData {
  id: number;
  buyer: string;
  seller: string;
  triggerPrice: bigint;
  maturityTimestamp: bigint;
  status: number;
  notionalDeposited: boolean;
  notionalHandle: string;
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-gray-800 rounded" />
          <div className="h-4 w-16 bg-gray-800 rounded" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-3 w-20 bg-gray-800 rounded ml-auto" />
          <div className="h-6 w-24 bg-gray-800 rounded ml-auto" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 bg-gray-800 rounded" />
        <div className="h-12 bg-gray-800 rounded" />
        <div className="h-12 bg-gray-800 rounded" />
        <div className="h-12 bg-gray-800 rounded" />
      </div>
    </div>
  );
}

export default function Home() {
  const { address } = useAccount();
  const [contracts, setContracts] = useState<CDSData[]>([]);
  const [loading, setLoading] = useState(true);

  const cdsAddress = DEPLOYMENTS.ConfidentialCDS
    ? (DEPLOYMENTS.ConfidentialCDS as `0x${string}`)
    : undefined;

  const { data: total } = useReadContract({
    address: cdsAddress,
    abi: CDS_ABI,
    functionName: "totalContracts",
    query: { enabled: !!cdsAddress },
  });

  useEffect(() => {
    async function loadContracts() {
      if (!total || !cdsAddress) {
        setLoading(false);
        return;
      }
      const { createPublicClient, http } = await import("viem");
      const { arbitrumSepolia } = await import("viem/chains");
      const client = createPublicClient({
        chain: arbitrumSepolia,
        transport: http("https://sepolia-rollup.arbitrum.io/rpc"),
      });

      const count = Number(total);
      const results: CDSData[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const data = await client.readContract({
            address: cdsAddress,
            abi: CDS_ABI,
            functionName: "getCDS",
            args: [BigInt(i)],
          }) as unknown as [string, string, bigint, bigint, bigint, number, boolean, string, string];

          results.push({
            id: i,
            buyer: data[0],
            seller: data[1],
            triggerPrice: data[2],
            maturityTimestamp: data[3],
            status: data[5],
            notionalDeposited: data[6],
            notionalHandle: data[7],
          });
        } catch {
          // skip invalid
        }
      }

      setContracts(results);
      setLoading(false);
    }

    loadContracts();
  }, [total, cdsAddress]);

  const myContracts = address
    ? contracts.filter(
        (c) =>
          c.buyer.toLowerCase() === address.toLowerCase() ||
          c.seller.toLowerCase() === address.toLowerCase()
      )
    : [];

  const activeCount = contracts.filter((c) => c.status === 0).length;
  const encryptedCount = contracts.filter((c) => c.notionalDeposited).length;

  return (
    <div className="min-h-screen text-white">

      {/* ── HERO ── */}
      <section className="px-6 pt-20 pb-16 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-xs font-mono text-blue-400 bg-blue-900/20 border border-blue-800/40 rounded-full px-3 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              iExec Nox TEE · Arbitrum Sepolia · Chainlink Oracle
            </div>

            <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none mb-4">
              <span className="block text-white">Hedge your</span>
              <span className="block veil-encrypted">crypto privately.</span>
            </h1>

            <p className="text-gray-400 text-xl leading-relaxed mb-2">
              Set a price floor for your ETH. If the price crashes below it,
              you get paid automatically — <span className="text-white font-medium">and nobody sees how much.</span>
            </p>
            <p className="text-gray-600 text-sm">
              Like insurance, but on-chain. Your position size stays encrypted end-to-end.
            </p>
          </div>

          <div className="flex-shrink-0 flex flex-col gap-3 items-start md:items-end">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-900/30"
            >
              <span className="text-lg">+</span>
              <span>Start a Hedge</span>
            </Link>
            <p className="text-xs text-gray-600">No KYC. No custodian. Fully on-chain.</p>
          </div>
        </div>

        {/* Stats row — only show when connected */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden veil-scanline bg-[#040810] border border-blue-900/40 rounded-2xl p-5">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Live ETH/USD</div>
            <PriceFeed compact />
            <div className="text-xs text-gray-700 mt-1 font-mono">chainlink · 15s refresh</div>
          </div>
          <div className="bg-[#040810] border border-gray-800/60 rounded-2xl p-5">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Active Hedges</div>
            {address ? (
              <div className="text-3xl font-black text-green-400 tabular-nums">
                {loading ? <span className="animate-pulse text-gray-700">—</span> : activeCount}
              </div>
            ) : (
              <div className="text-sm text-gray-700 mt-1">Connect wallet to view</div>
            )}
            <div className="text-xs text-gray-700 mt-1">contracts on Arbitrum</div>
          </div>
          <div className="bg-[#040810] border border-blue-900/40 rounded-2xl p-5">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Encrypted Positions</div>
            {address ? (
              <div className="text-3xl font-black text-blue-400 tabular-nums">
                {loading ? <span className="animate-pulse text-gray-700">—</span> : encryptedCount}
              </div>
            ) : (
              <div className="text-sm text-gray-700 mt-1">Connect wallet to view</div>
            )}
            <div className="text-xs text-gray-700 mt-1">position sizes hidden · iExec Nox</div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 pb-16 max-w-6xl mx-auto">
        <div className="mb-4">
          <div className="text-xs text-gray-600 uppercase tracking-widest font-mono">what is this?</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: "01",
              title: "You set a safety price",
              body: "Pick the ETH price that would hurt you. If ETH drops below it, you're protected. This is your trigger.",
            },
            {
              step: "02",
              title: "Your bet size stays secret",
              body: "The amount you're hedging is encrypted on your device before it ever hits the blockchain. Nobody else can see it.",
            },
            {
              step: "03",
              title: "A robot watches the price",
              body: "Chainlink's oracle checks ETH/USD 24/7. No humans, no counterparty needed to decide if a crash happened.",
            },
            {
              step: "04",
              title: "Auto payout if it crashes",
              body: "ETH drops below your trigger? The contract pays you instantly. No forms. No waiting. No negotiation.",
            },
          ].map(({ step, title, body }) => (
            <div
              key={step}
              className="bg-[#04080f] border border-blue-900/40 rounded-2xl p-6 hover:border-blue-700/60 transition-colors group"
            >
              <div className="text-4xl font-black text-blue-900/50 mb-4 font-mono group-hover:text-blue-700/50 transition-colors">{step}</div>
              <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONNECT PROMPT — shown only when wallet not connected ── */}
      {!address && (
        <section className="px-6 pb-24 max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-blue-900/30 bg-[#04080f] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Decorative glow */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="text-xs font-mono text-blue-500 uppercase tracking-widest mb-3">ready to hedge?</div>
              <h2 className="text-2xl font-black text-white mb-2">Connect your wallet to get started.</h2>
              <p className="text-gray-500 text-sm max-w-md">
                See all live contracts, open your own hedge position, and watch the Chainlink oracle settle in real time.
                Your position size stays encrypted — always.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-xs text-gray-600 font-mono">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Arbitrum Sepolia</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />iExec Nox TEE</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Chainlink Oracle</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="w-20 h-20 relative">
                <div className="absolute inset-0 bg-blue-600 rounded-2xl rotate-45 opacity-20 animate-pulse" />
                <div className="absolute inset-3 bg-blue-500 rounded-xl rotate-45 opacity-30" />
                <div className="absolute inset-6 bg-blue-400 rounded-lg rotate-45" />
              </div>
              <p className="text-xs text-gray-700 font-mono text-center">Use the Connect Wallet<br />button at the top right</p>
            </div>
          </div>

          {/* Built by strip */}
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-gray-700 font-mono">
            <span>Built by</span>
            <a
              href="https://github.com/Gideon145"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-800 hover:text-blue-500 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Gideon145
            </a>
            <span>·</span>
            <a
              href="https://github.com/Gideon145/veil"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              github.com/Gideon145/veil
            </a>
          </div>
        </section>
      )}

      {/* ── MY POSITIONS ── */}
      {address && (
        <section className="px-6 pb-10 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest">My Hedges</h2>
            <div className="h-px flex-1 bg-gray-800/50" />
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkeletonCard /><SkeletonCard />
            </div>
          ) : myContracts.length === 0 ? (
            <div className="border border-dashed border-gray-800 rounded-2xl p-10 text-center text-gray-600">
              No hedges yet.{" "}
              <Link href="/create" className="text-blue-400 hover:underline">
                Start your first one →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myContracts.map((c) => (
                <CDSCard key={c.id} {...c} cdsId={c.id} connectedAddress={address} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── ALL CONTRACTS ── only visible when wallet connected ── */}
      {address && (
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-sm font-mono text-gray-500 uppercase tracking-widest">All Contracts</h2>
          <div className="h-px flex-1 bg-gray-800/50" />
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : contracts.length === 0 ? (
          <div className="border border-dashed border-gray-800 rounded-2xl p-14 text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-blue-900/20 rounded-full animate-ping" />
              <div className="relative flex items-center justify-center w-16 h-16 bg-blue-900/30 rounded-full border border-blue-800/50">
                <span className="text-2xl">🔒</span>
              </div>
            </div>
            <p className="text-gray-500 mb-1">No hedges on-chain yet.</p>
            <p className="text-gray-700 text-sm mb-5">Be the first to encrypt a position.</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              Start a Hedge
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map((c) => (
              <CDSCard key={c.id} {...c} cdsId={c.id} connectedAddress={address} />
            ))}
          </div>
        )}
      </section>
      )}

    </div>
  );
}
