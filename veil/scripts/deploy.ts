import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Chainlink ETH/USD price feed on Arbitrum Sepolia
const CHAINLINK_ETH_USD_ARBITRUM_SEPOLIA = "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // 1. Deploy MockUSDC
  console.log("\n[1/2] Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", usdcAddress);

  // 2. Deploy ConfidentialCDS
  console.log("\n[2/2] Deploying ConfidentialCDS...");
  const ConfidentialCDS = await ethers.getContractFactory("ConfidentialCDS");
  const cds = await ConfidentialCDS.deploy(
    CHAINLINK_ETH_USD_ARBITRUM_SEPOLIA,
    usdcAddress
  );
  await cds.waitForDeployment();
  const cdsAddress = await cds.getAddress();
  console.log("ConfidentialCDS deployed to:", cdsAddress);

  // Save addresses for frontend use
  const addresses = {
    network: "arbitrumSepolia",
    chainId: 421614,
    MockUSDC: usdcAddress,
    ConfidentialCDS: cdsAddress,
    ChainlinkETHUSD: CHAINLINK_ETH_USD_ARBITRUM_SEPOLIA,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(
    path.join(outDir, "arbitrumSepolia.json"),
    JSON.stringify(addresses, null, 2)
  );

  // Also write to frontend lib dir for easy access
  const frontendDir = path.join(__dirname, "..", "frontend", "lib");
  if (fs.existsSync(frontendDir)) {
    fs.writeFileSync(
      path.join(frontendDir, "deployments.json"),
      JSON.stringify(addresses, null, 2)
    );
    console.log("\nDeployment addresses written to frontend/lib/deployments.json");
  }

  console.log("\n=== Deployment Complete ===");
  console.log("MockUSDC:       ", usdcAddress);
  console.log("ConfidentialCDS:", cdsAddress);
  console.log("\nVerify on Arbiscan:");
  console.log(`https://sepolia.arbiscan.io/address/${cdsAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
