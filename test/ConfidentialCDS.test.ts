import { expect } from "chai";
import hre from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * ConfidentialCDS unit tests — passes without Nox TEE.
 *
 * Strategy: only test paths that revert BEFORE any Nox.fromExternal() call.
 * - createCDS: validation reverts (InvalidDuration, SameBuyerAndSeller)
 * - checkAndSettle: oracle validation reverts (InvalidPrice — stale/zero)
 * - depositNotional: access-control revert on uninitialized CDS (NotSeller)
 * - claimPayout: access-control revert on uninitialized CDS (NotBuyer)
 */
describe("ConfidentialCDS — pre-TEE unit tests", function () {
  let cds: Awaited<ReturnType<typeof hre.ethers.getContractAt>>;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;

  // Fake externalEuint256 handle — any bytes32 that won't reach Nox.fromExternal
  const FAKE_HANDLE = hre.ethers.ZeroHash as `0x${string}`;
  const FAKE_PROOF  = "0x" as `0x${string}`;

  before(async function () {
    [owner, buyer, seller, attacker] = await hre.ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy ConfidentialUSDC (ERC-7984 wrapper)
    const CUSDC = await hre.ethers.getContractFactory("ConfidentialUSDC");
    const cUsdc = await CUSDC.deploy(await usdc.getAddress());
    await cUsdc.waitForDeployment();

    // Deploy MockAggregator with a healthy price ($2000 = 2000_00000000 in 8-decimal)
    const MockAgg = await hre.ethers.getContractFactory("MockAggregator");
    const agg = await MockAgg.deploy(2000_00000000n);
    await agg.waitForDeployment();

    // Deploy ConfidentialCDS
    const CDS = await hre.ethers.getContractFactory("ConfidentialCDS");
    cds = await CDS.deploy(await agg.getAddress(), await cUsdc.getAddress());
    await cds.waitForDeployment();
  });

  // ──────────────────────────────────────────────
  //  createCDS — input validation
  // ──────────────────────────────────────────────

  it("createCDS reverts InvalidDuration when durationDays = 0", async function () {
    await expect(
      cds.connect(buyer).createCDS(
        FAKE_HANDLE,
        FAKE_PROOF,
        1500_00000000n, // triggerPrice
        0,             // durationDays = 0 → InvalidDuration
        86400,
        seller.address
      )
    ).to.be.revertedWithCustomError(cds, "InvalidDuration");
  });

  it("createCDS reverts InvalidDuration when durationDays = 3651", async function () {
    await expect(
      cds.connect(buyer).createCDS(
        FAKE_HANDLE,
        FAKE_PROOF,
        1500_00000000n,
        3651,           // > 3650 → InvalidDuration
        86400,
        seller.address
      )
    ).to.be.revertedWithCustomError(cds, "InvalidDuration");
  });

  it("createCDS reverts SameBuyerAndSeller when seller = msg.sender", async function () {
    await expect(
      cds.connect(buyer).createCDS(
        FAKE_HANDLE,
        FAKE_PROOF,
        1500_00000000n,
        30,
        86400,
        buyer.address   // seller == msg.sender → SameBuyerAndSeller
      )
    ).to.be.revertedWithCustomError(cds, "SameBuyerAndSeller");
  });

  // ──────────────────────────────────────────────
  //  checkAndSettle — oracle validation
  // ──────────────────────────────────────────────

  it("checkAndSettle reverts InvalidPrice when oracle data is stale (> 2h)", async function () {
    // Deploy a fresh stale oracle
    const MockAgg = await hre.ethers.getContractFactory("MockAggregator");
    const staleAgg = await MockAgg.deploy(2000_00000000n);
    await staleAgg.waitForDeployment();

    // Get MockUSDC and ConfidentialUSDC addresses from the existing cds
    const cUsdcAddr = await cds.cUsdc();

    // Deploy a separate CDS instance pointed at the stale oracle
    const CDS = await hre.ethers.getContractFactory("ConfidentialCDS");
    const staleCds = await CDS.deploy(await staleAgg.getAddress(), cUsdcAddr);
    await staleCds.waitForDeployment();

    // Make oracle stale: set updatedAt to 3 hours ago
    const now = Math.floor(Date.now() / 1000);
    await staleAgg.setStale(now - 3 * 3600);

    // checkAndSettle on cdsId=0 (uninitialized, status=Active by default enum=0)
    await expect(
      staleCds.checkAndSettle(0)
    ).to.be.revertedWithCustomError(staleCds, "InvalidPrice");
  });

  it("checkAndSettle reverts InvalidPrice when oracle price = 0", async function () {
    const MockAgg = await hre.ethers.getContractFactory("MockAggregator");
    const zeroAgg = await MockAgg.deploy(0n);
    await zeroAgg.waitForDeployment();

    const cUsdcAddr = await cds.cUsdc();
    const CDS = await hre.ethers.getContractFactory("ConfidentialCDS");
    const zeroCds = await CDS.deploy(await zeroAgg.getAddress(), cUsdcAddr);
    await zeroCds.waitForDeployment();

    await expect(
      zeroCds.checkAndSettle(0)
    ).to.be.revertedWithCustomError(zeroCds, "InvalidPrice");
  });

  // ──────────────────────────────────────────────
  //  depositNotional — access control
  //  (uninitialized CDS: seller = address(0) ≠ msg.sender)
  // ──────────────────────────────────────────────

  it("depositNotional reverts NotSeller when caller is not the seller", async function () {
    // CDS id 0 is uninitialized — seller = address(0), so any real address ≠ seller
    await expect(
      cds.connect(attacker).depositNotional(0, FAKE_HANDLE, FAKE_PROOF)
    ).to.be.revertedWithCustomError(cds, "NotSeller");
  });

  // ──────────────────────────────────────────────
  //  claimPayout — access control
  //  (uninitialized CDS: buyer = address(0) ≠ msg.sender)
  // ──────────────────────────────────────────────

  it("claimPayout reverts NotBuyer when caller is not the buyer", async function () {
    // CDS id 0 is uninitialized — buyer = address(0), also status = Active (0) not Settled
    // The NotBuyer check fires before the NotSettled check
    await expect(
      cds.connect(attacker).claimPayout(0)
    ).to.be.revertedWithCustomError(cds, "NotBuyer");
  });
});
