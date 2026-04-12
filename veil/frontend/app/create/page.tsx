"use client";

import Link from "next/link";
import { CreateCDSForm } from "@/components/CreateCDSForm";

export default function CreatePage() {
  return (
    <div className="min-h-screen text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-8 font-mono">
          <Link href="/" className="hover:text-gray-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-300">New Hedge</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Open a Hedge Position
          </h1>
          <p className="text-gray-400 leading-relaxed">
            Pick a price floor for ETH. If the market crashes below it, you get paid automatically.
            Your position size is <span className="text-blue-400 font-medium">encrypted by iExec Nox</span> before
            it ever touches the blockchain — nobody else can see how much you&apos;re hedging.
          </p>
        </div>

        {/* Info strip */}
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl px-4 py-3 mb-8 text-sm text-blue-300 flex items-start gap-3">
          <span className="text-blue-400 mt-0.5">🔒</span>
          <div>
            <span className="font-semibold text-blue-200">Your amount is private. </span>
            The size of your hedge is encrypted on your device before anything is sent to the blockchain.
            Nobody — not even node operators — can read your position size.
          </div>
        </div>

        <CreateCDSForm />
      </div>
    </div>
  );
}
