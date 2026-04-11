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
    <nav className="border-b border-blue-900/30 bg-[#03040a]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Logo mark — alien eye */}
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-blue-600 rounded-lg rotate-45 group-hover:rotate-90 transition-transform duration-500" />
              <div className="absolute inset-1.5 bg-[#03040a] rounded-sm rotate-45" />
              <div className="absolute inset-[7px] bg-blue-400 rounded-sm rotate-45" />
            </div>
            <span className="font-bold text-lg tracking-widest uppercase text-white">VEIL</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-300 transition-colors tracking-wide">Dashboard</Link>
            <Link href="/create" className="hover:text-blue-300 transition-colors tracking-wide">New Hedge</Link>
            <a
              href="https://github.com/Gideon145/veil"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-blue-300 transition-colors tracking-wide"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Gideon145
            </a>
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
              <div className="px-3 py-1.5 bg-blue-900/20 border border-blue-800/40 rounded-lg text-sm font-mono text-blue-300">
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
              className="relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium tracking-wide"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
