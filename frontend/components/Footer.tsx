export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-900/60 mt-10">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 border border-violet-600 rotate-45 rounded-sm" />
            <div className="absolute inset-1 border border-violet-400 rotate-45 rounded-sm" />
            <div className="absolute inset-2 bg-violet-400 rotate-45 rounded-sm" />
          </div>
          <span className="text-xs font-mono tracking-widest text-gray-600 uppercase">
            VEIL Protocol
          </span>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-700 font-mono text-center">
          © {year} VEIL Protocol. All rights reserved.{" "}
          <span className="text-violet-900">™</span>
          <br className="sm:hidden" />
          <span className="hidden sm:inline"> · </span>
          Built for the{" "}
          <a
            href="https://iex.ec"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-800 hover:text-violet-600 transition-colors"
          >
            iExec
          </a>{" "}
          Vibe Coding Challenge 2026
        </p>

        {/* Stack links */}
        <div className="flex items-center gap-4 text-xs text-gray-700 font-mono">
          <a
            href="https://iex.ec"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet-500 transition-colors"
          >
            iExec Nox
          </a>
          <span>·</span>
          <a
            href="https://arbiscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet-500 transition-colors"
          >
            Arbitrum
          </a>
          <span>·</span>
          <a
            href="https://chain.link"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet-500 transition-colors"
          >
            Chainlink
          </a>
        </div>
      </div>
    </footer>
  );
}
