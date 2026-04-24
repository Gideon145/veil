/**
 * seedCDS.ts -- Creates 2 demo CDS positions on the live ConfidentialCDS v2 contract.
 *
 * Uses the @iexec-nox/handle SDK directly from Node.js (Ethers adapter) to
 * generate real Nox TEE handles -- NOT mock data.
 *
 * Run: npx hardhat run scripts/seedCDS.ts --network arbitrumSepolia
 */
import pkg from "hardhat";
const { ethers } = pkg;
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", "arbitrumSepolia.json");

  if (!fs.existsSync(deploymentPath)) {
    console.error("No deployment found. Run deployCT.ts first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const [deployer] = await ethers.getSigners();

  console.log("Seeding with account:", deployer.address);
  console.log("ConfidentialCDS v2:", deployment.ConfidentialCDS);
  console.log("MockUSDC:", deployment.MockUSDC);

  const usdc = await ethers.getContractAt("MockUSDC", deployment.MockUSDC);
  const cds = await ethers.getContractAt("ConfidentialCDS", deployment.ConfidentialCDS);

  // --- 1. Mint USDC to deployer ---
  const mintAmount = ethers.parseUnits("200000", 6); // 200k USDC
  console.log("\nMinting 200,000 MockUSDC...");
  const mintTx = await usdc.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log("Minted. Balance:", ethers.formatUnits(await usdc.balanceOf(deployer.address), 6), "USDC");

  // --- 2. Encrypt notional amounts via Nox TEE ---
  console.log("\nConnecting to Nox TEE gateway...");

  // Dynamic import to avoid module resolution issues
  const { createEthersHandleClient } = await import("@iexec-nox/handle");

  // The hardhat signer from ethers -- compatible with createEthersHandleClient
  const handleClient = await createEthersHandleClient(deployer as any);

  const cdsAddress = deployment.ConfidentialCDS as string;

  console.log("Encrypting notional for CDS #0 (50,000 USDC protection)...");
  const { handle: handle0, handleProof: proof0 } = await handleClient.encryptInput(
    BigInt(50000 * 1e6), // 50,000 USDC in base units (6 decimals)
    "uint256",
    cdsAddress
  );
  console.log("  handle:", handle0);

  console.log("Encrypting notional for CDS #1 (100,000 USDC protection)...");
  const { handle: handle1, handleProof: proof1 } = await handleClient.encryptInput(
    BigInt(100000 * 1e6), // 100,000 USDC
    "uint256",
    cdsAddress
  );
  console.log("  handle:", handle1);

  // --- 3. Create CDS #0 ---
  const signers = await ethers.getSigners();
  const demoSeller = "0x000000000000000000000000000000000000dEaD"; 

  const triggerPrice1500 = BigInt("150000000000"); 
  const triggerPrice1200 = BigInt("120000000000"); 

  const duration90 = 90n;
  const premiumIntervalSeconds = 7n * 24n * 3600n; 

  console.log("\nCreating CDS #0: ,500 trigger, 50k notional, 90 days...");

  try {
    const tx0 = await cds.createCDS(
      handle0,
      proof0,
      triggerPrice1500,
      duration90,
      premiumIntervalSeconds,
      demoSeller
    );
    const receipt0 = await tx0.wait();
    console.log("  CDS #0 created. Tx:", receipt0?.hash);
  } catch (e: any) {
    console.error("  CDS #0 failed:", e.message?.slice(0, 120));
  }

  console.log("\nCreating CDS #1: ,200 trigger, 100k notional, 180 days...");
  try {
    const tx1 = await cds.createCDS(
      handle1,
      proof1,
      triggerPrice1200,
      180n,
      premiumIntervalSeconds,
      demoSeller
    );
    const receipt1 = await tx1.wait();
    console.log("  CDS #1 created. Tx:", receipt1?.hash);
  } catch (e: any) {
    console.error("  CDS #1 failed:", e.message?.slice(0, 120));
  }

  const total = await cds.totalContracts();
  console.log("\n=== Seed complete ===");
  console.log("Total CDS contracts on-chain:", total.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
