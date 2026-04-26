import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import deployments from "@/lib/deployments.json";
import { CDS_ABI } from "@/lib/abis";

// Publicly documented Hardhat #0 key — testnet only, no real funds
const DEMO_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

export async function POST(req: NextRequest) {
  try {
    const { cdsId } = await req.json();
    if (typeof cdsId !== "number") {
      return NextResponse.json({ error: "Invalid cdsId" }, { status: 400 });
    }

    const account = privateKeyToAccount(DEMO_PK);
    const transport = http("https://sepolia-rollup.arbitrum.io/rpc");
    const publicClient = createPublicClient({ chain: arbitrumSepolia, transport });
    const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport });

    const gasPrice = await publicClient.getGasPrice();
    const gas = { gasPrice: (gasPrice * BigInt(150)) / BigInt(100) };

    const hash = await walletClient.writeContract({
      address: deployments.ConfidentialCDS as `0x${string}`,
      abi: CDS_ABI,
      functionName: "checkAndSettle",
      args: [BigInt(cdsId)],
      ...gas,
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return NextResponse.json({ hash });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
