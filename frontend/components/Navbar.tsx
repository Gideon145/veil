"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { arbitrumSepolia } from "wagmi/chains";
import { shortenAddress } from "@/lib/utils";
import Link from "next/link";

export function Navbar() {
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== arbitrumSepolia.id;

  return (
    <nav className="border-b border-violet-900/30 bg-[#03040a]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Logo mark — alien eye */}
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-violet-600 rounded-lg rotate-45 group-hover:rotate-90 transition-transform duration-500" />
              <div className="absolute inset-1.5 bg-[#03040a] rounded-sm rotate-45" />
              <div className="absolute inset-[7px] bg-violet-400 rounded-sm rotate-45" />
            </div>
            <span className="font-bold text-lg tracking-widest uppercase text-white">VEIL</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-violet-300 transition-colors tracking-wide">Dashboard</Link>
            <Link href="/create" className="hover:text-violet-300 transition-colors tracking-wide">New Hedge</Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isWrongNetwork && (
            <button
              onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
              className="text-xs bg-red-900/50 border border-red-700 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-900 transition-colors"
            >
              Switch to Arbitrum Sepolia
            </button>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-violet-900/20 border border-violet-800/40 rounded-lg text-sm font-mono text-violet-300">
                {shortenAddress(address!)}
              </div>
              <button
                onClick={() => disconnect()}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-2"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="relative overflow-hidden bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium tracking-wide"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
