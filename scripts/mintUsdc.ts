import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const usdcAddress = "0x911E87629756F34190DF34162806f00b35521FD0";
  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);

  const amount = hre.ethers.parseUnits("500000", 6); // 500k USDC
  console.log("Minting 500,000 USDC to", deployer.address);
  const tx = await usdc.mint(deployer.address, amount);
  await tx.wait();

  const bal = await usdc.balanceOf(deployer.address);
  console.log("New balance:", hre.ethers.formatUnits(bal, 6), "USDC");
}

main().catch((e) => { console.error(e); process.exit(1); });
