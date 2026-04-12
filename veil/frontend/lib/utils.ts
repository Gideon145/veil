import { createPublicClient, createWalletClient, custom, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

export function getPublicClient() {
  return createPublicClient({
    chain: arbitrumSepolia,
    transport: http("https://sepolia-rollup.arbitrum.io/rpc"),
  });
}

export function getWalletClient() {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  if (!eth) return null;
  return createWalletClient({
    chain: arbitrumSepolia,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: custom(eth as any),
  });
}

/** Format a Chainlink 8-decimal price (e.g. 200000000000 -> "$2,000.00") */
export function formatChainlinkPrice(raw: bigint): string {
  const price = Number(raw) / 1e8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(price);
}

/** Convert USD string to Chainlink 8-decimal bigint (e.g. "2000" -> 200000000000n) */
export function toChainlinkPrice(usdString: string): bigint {
  const val = parseFloat(usdString);
  return BigInt(Math.round(val * 1e8));
}

/** Format USDC with 6 decimals */
export function formatUSDC(raw: bigint): string {
  return (Number(raw) / 1e6).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Shorten an address for display */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const CDS_STATUS = ["Active", "Settled", "Expired", "Cancelled"] as const;
export type CDSStatusType = typeof CDS_STATUS[number];

export function getStatusColor(status: number): string {
  switch (status) {
    case 0: return "text-green-400";
    case 1: return "text-red-400";
    case 2: return "text-gray-400";
    case 3: return "text-yellow-400";
    default: return "text-gray-400";
  }
}
