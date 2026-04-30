/**
 * VEIL Protocol — Autonomous Agent
 *
 * Every 30 seconds:
 *   - Reads Chainlink ETH/USD oracle via getLatestPrice()
 *   - Calls checkAndSettle(id) on every active CDS — if ETH/USD <= triggerPrice, credit event fires
 *   - Calls expireContract(id) on any matured positions
 *   - Exposes GET /status for health checks
 *
 * No encrypted handles needed — checkAndSettle + expireContract are permissionless,
 * anyone can call them (the contract reads the oracle itself).
 */

import { ethers } from "ethers";
import * as http from "http";
import * as dotenv from "dotenv";
dotenv.config();

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL    = (process.env.ARB_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc").trim();
const PRIVATE_KEY = (process.env.VEIL_PRIVATE_KEY ?? "").trim();
const CDS_ADDRESS = (process.env.CDS_ADDRESS ?? "0xB2326A7A1EA88054906b16783B12E451d1Af0791").trim();
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS ?? "30000");
const STATUS_PORT = parseInt(process.env.STATUS_PORT ?? "3001");

// ── ABI (minimal — only what the agent calls) ─────────────────────────────────

const ABI = [
  "function totalContracts() view returns (uint256)",
  "function getCDS(uint256 cdsId) view returns (address buyer, address seller, uint256 triggerPrice, uint256 maturityTimestamp, uint256 nextPremiumDue, uint8 status, bool notionalDeposited, bytes32 notionalHandle, bytes32 premiumBalanceHandle)",
  "function checkAndSettle(uint256 cdsId)",
  "function expireContract(uint256 cdsId)",
  "function getLatestPrice() view returns (int256 price, uint256 updatedAt)",
];

// ── State ─────────────────────────────────────────────────────────────────────

interface AgentStats {
  startTime: string;
  iterations: number;
  settledCount: number;
  expiredCount: number;
  lastIterationAt: string;
  lastPriceUSD: string;
  totalCDS: number;
  activeCDS: number;
  errors: number;
  wallet: string;
  cdsAddress: string;
  rpcUrl: string;
}

const stats: AgentStats = {
  startTime: new Date().toISOString(),
  iterations: 0,
  settledCount: 0,
  expiredCount: 0,
  lastIterationAt: "",
  lastPriceUSD: "0",
  totalCDS: 0,
  activeCDS: 0,
  errors: 0,
  wallet: "",
  cdsAddress: CDS_ADDRESS,
  rpcUrl: RPC_URL,
};

// ── Logger ────────────────────────────────────────────────────────────────────

function log(level: "INFO" | "WARN" | "ERROR", msg: string) {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 23);
  console.log(`${ts} [${level.padEnd(5)}] ${msg}`);
}

// ── Agent loop ────────────────────────────────────────────────────────────────

async function runIteration(contract: ethers.Contract, wallet: ethers.Wallet) {
  stats.iterations++;
  stats.lastIterationAt = new Date().toISOString();

  // 1. Read oracle price
  try {
    const [price] = await contract.getLatestPrice();
    const priceUSD = (Number(price) / 1e8).toFixed(2);
    stats.lastPriceUSD = priceUSD;
    log("INFO", `ETH/USD: $${priceUSD}`);
  } catch (e: any) {
    log("WARN", `getLatestPrice failed: ${e.message?.slice(0, 80)}`);
  }

  // 2. Enumerate all CDS positions
  let total = 0n;
  try {
    total = await contract.totalContracts();
    stats.totalCDS = Number(total);
  } catch (e: any) {
    log("ERROR", `totalContracts failed: ${e.message?.slice(0, 80)}`);
    stats.errors++;
    return;
  }

  let active = 0;
  const now = BigInt(Math.floor(Date.now() / 1000));

  for (let id = 0n; id < total; id++) {
    let cds: any;
    try {
      cds = await contract.getCDS(id);
    } catch {
      continue;
    }

    const status: number = Number(cds.status);
    // 0 = Active, 1 = Settled, 2 = Expired, 3 = Cancelled
    if (status !== 0) continue;

    active++;

    // Try checkAndSettle — reverts silently if price is above trigger (NotActive / CreditEventNotTriggered)
    try {
      const tx = await contract.checkAndSettle(id);
      await tx.wait();
      stats.settledCount++;
      log("INFO", `CDS #${id} — SETTLED via checkAndSettle. Tx: ${tx.hash}`);
      active--;
    } catch {
      // Not triggered yet — normal, no log spam
    }

    // Try expireContract if past maturity
    if (cds.maturityTimestamp <= now) {
      try {
        const tx = await contract.expireContract(id);
        await tx.wait();
        stats.expiredCount++;
        log("INFO", `CDS #${id} — EXPIRED via expireContract. Tx: ${tx.hash}`);
        active--;
      } catch {
        // Already handled or not matured
      }
    }
  }

  stats.activeCDS = active;
  log("INFO", `Iteration ${stats.iterations} done — total: ${stats.totalCDS}, active: ${active}, settled: ${stats.settledCount}, expired: ${stats.expiredCount}`);
}

// ── Status HTTP server ─────────────────────────────────────────────────────────

function startStatusServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/status" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ...stats }, null, 2));
    } else {
      res.writeHead(404);
      res.end('{"error":"not found"}');
    }
  });
  server.listen(STATUS_PORT, () => log("INFO", `Status server: http://0.0.0.0:${STATUS_PORT}/status`));
}

// ── Banner ────────────────────────────────────────────────────────────────────

function banner() {
  console.log(`
  ██╗   ██╗███████╗██╗██╗
  ██║   ██║██╔════╝██║██║
  ██║   ██║█████╗  ██║██║
  ╚██╗ ██╔╝██╔══╝  ██║██║
   ╚████╔╝ ███████╗██║███████╗
    ╚═══╝  ╚══════╝╚═╝╚══════╝
  Confidential CDS Protocol — Arbitrum Sepolia
  Autonomous settlement agent — checks every ${INTERVAL_MS / 1000}s
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  banner();

  if (!PRIVATE_KEY) throw new Error("VEIL_PRIVATE_KEY not set");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CDS_ADDRESS, ABI, wallet);

  stats.wallet = wallet.address;

  log("INFO", `Wallet    : ${wallet.address}`);
  log("INFO", `CDS       : ${CDS_ADDRESS}`);
  log("INFO", `RPC       : ${RPC_URL}`);
  log("INFO", `Interval  : ${INTERVAL_MS / 1000}s`);

  startStatusServer();

  // Run immediately on start, then on interval
  await runIteration(contract, wallet).catch(e => {
    log("ERROR", e.message);
    stats.errors++;
  });

  setInterval(async () => {
    await runIteration(contract, wallet).catch(e => {
      log("ERROR", e.message);
      stats.errors++;
    });
  }, INTERVAL_MS);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
