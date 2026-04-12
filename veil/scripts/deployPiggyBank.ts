import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying ConfidentialPiggyBank with:", deployer.address);

  const PiggyBank = await hre.ethers.getContractFactory("ConfidentialPiggyBank");
  const piggyBank = await PiggyBank.deploy();
  await piggyBank.waitForDeployment();

  const address = await piggyBank.getAddress();
  console.log("ConfidentialPiggyBank deployed to:", address);

  // Save to deployments
  const deploymentsPath = path.join(__dirname, "../deployments/arbitrumSepolia.json");
  const existing = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  existing.ConfidentialPiggyBank = address;
  fs.writeFileSync(deploymentsPath, JSON.stringify(existing, null, 2));
  console.log("Saved to deployments/arbitrumSepolia.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
