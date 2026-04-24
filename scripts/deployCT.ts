import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Chainlink ETH/USD on Arbitrum Sepolia (unchanged)
const CHAINLINK_ETH_USD = "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Load existing deployments to get MockUSDC address
  const deploymentsPath = path.join(__dirname, "..", "deployments", "arbitrumSepolia.json");
  const existing = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  console.log("\nUsing existing MockUSDC:", existing.MockUSDC);

  // 1. Deploy ConfidentialUSDC wrapping MockUSDC
  console.log("\n[1/2] Deploying ConfidentialUSDC (ERC-7984 wrapper)...");
  const ConfidentialUSDC = await ethers.getContractFactory("ConfidentialUSDC");
  const cUsdc = await ConfidentialUSDC.deploy(existing.MockUSDC);
  await cUsdc.waitForDeployment();
  const cUsdcAddress = await cUsdc.getAddress();
  console.log("ConfidentialUSDC deployed to:", cUsdcAddress);

  // 2. Deploy new ConfidentialCDS using cUSDC for encrypted notional escrow
  console.log("\n[2/2] Deploying ConfidentialCDS v2 (with CT escrow)...");
  const ConfidentialCDS = await ethers.getContractFactory("ConfidentialCDS");
  const cds = await ConfidentialCDS.deploy(CHAINLINK_ETH_USD, cUsdcAddress);
  await cds.waitForDeployment();
  const cdsAddress = await cds.getAddress();
  console.log("ConfidentialCDS deployed to:", cdsAddress);

  // Update deployments — keep existing MockUSDC, PiggyBank, Chainlink references
  const updated = {
    ...existing,
    ConfidentialUSDC: cUsdcAddress,
    ConfidentialCDS: cdsAddress,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(updated, null, 2));
  console.log("\nDeployments updated:", deploymentsPath);

  // Mirror to frontend lib
  const frontendPath = path.join(__dirname, "..", "frontend", "lib", "deployments.json");
  if (fs.existsSync(path.dirname(frontendPath))) {
    fs.writeFileSync(frontendPath, JSON.stringify(updated, null, 2));
    console.log("Frontend deployments updated:", frontendPath);
  }

  console.log("\n=== Summary ===");
  console.log("ConfidentialUSDC:", cUsdcAddress);
  console.log("ConfidentialCDS (v2):", cdsAddress);
  console.log("\nNext steps:");
  console.log("1. Verify on Arbiscan:");
  console.log(`   npx hardhat verify --network arbitrumSepolia ${cUsdcAddress} "${existing.MockUSDC}"`);
  console.log(`   npx hardhat verify --network arbitrumSepolia ${cdsAddress} "${CHAINLINK_ETH_USD}" "${cUsdcAddress}"`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
