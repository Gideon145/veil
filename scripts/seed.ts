import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", "arbitrumSepolia.json");

  if (!fs.existsSync(deploymentPath)) {
    console.error("No deployment found. Run deploy.ts first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const [deployer] = await ethers.getSigners();

  console.log("Seeding demo data with account:", deployer.address);
  console.log("ConfidentialCDS at:", deployment.ConfidentialCDS);
  console.log("MockUSDC at:", deployment.MockUSDC);

  const usdc = await ethers.getContractAt("MockUSDC", deployment.MockUSDC);
  const cds = await ethers.getContractAt("ConfidentialCDS", deployment.ConfidentialCDS);

  // Mint USDC to deployer
  const mintAmount = ethers.parseUnits("100000", 6); // 100k USDC
  console.log("\nMinting 100,000 USDC...");
  const mintTx = await usdc.mint(deployer.address, mintAmount);
  await mintTx.wait();

  // Approve CDS contract to spend USDC
  console.log("Approving USDC spend...");
  const approveTx = await usdc.approve(deployment.ConfidentialCDS, mintAmount);
  await approveTx.wait();

  console.log("\n=== Seed complete ===");
  console.log("Deployer USDC balance:", ethers.formatUnits(await usdc.balanceOf(deployer.address), 6));
  console.log("\nNOTE: CDS creation requires encrypted handles from the Nox JS SDK.");
  console.log("Use the frontend to create demo CDS positions.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
