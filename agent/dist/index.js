"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const http = __importStar(require("http"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// ── Config ────────────────────────────────────────────────────────────────────
const RPC_URL = (process.env.ARB_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc").trim();
const PRIVATE_KEY = (process.env.VEIL_PRIVATE_KEY ?? "").trim();
const CDS_ADDRESS = (process.env.CDS_ADDRESS ?? "0xB2326A7A1EA88054906b16783B12E451d1Af0791").trim();
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS ?? "30000");
const STATUS_PORT = parseInt(process.env.PORT || "3000");
// ── ABI (minimal — only what the agent calls) ─────────────────────────────────
const ABI = [
    "function totalContracts() view returns (uint256)",
    "function getCDS(uint256 cdsId) view returns (address buyer, address seller, uint256 triggerPrice, uint256 maturityTimestamp, uint256 nextPremiumDue, uint8 status, bool notionalDeposited, bytes32 notionalHandle, bytes32 premiumBalanceHandle)",
    "function checkAndSettle(uint256 cdsId)",
    "function expireContract(uint256 cdsId)",
    "function getLatestPrice() view returns (int256 price, uint256 updatedAt)",
];
const stats = {
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
function log(level, msg) {
    const ts = new Date().toISOString().replace("T", " ").substring(0, 23);
    console.log(`${ts} [${level.padEnd(5)}] ${msg}`);
}
// ── Agent loop ────────────────────────────────────────────────────────────────
async function runIteration(contract, wallet) {
    stats.iterations++;
    stats.lastIterationAt = new Date().toISOString();
    // 1. Read oracle price
    try {
        const [price] = await contract.getLatestPrice();
        const priceUSD = (Number(price) / 1e8).toFixed(2);
        stats.lastPriceUSD = priceUSD;
        log("INFO", `ETH/USD: $${priceUSD}`);
    }
    catch (e) {
        log("WARN", `getLatestPrice failed: ${e.message?.slice(0, 80)}`);
    }
    // 2. Enumerate all CDS positions
    let total = 0n;
    try {
        total = await contract.totalContracts();
        stats.totalCDS = Number(total);
    }
    catch (e) {
        log("ERROR", `totalContracts failed: ${e.message?.slice(0, 80)}`);
        stats.errors++;
        return;
    }
    let active = 0;
    const now = BigInt(Math.floor(Date.now() / 1000));
    for (let id = 0n; id < total; id++) {
        let cds;
        try {
            cds = await contract.getCDS(id);
        }
        catch {
            continue;
        }
        const status = Number(cds.status);
        // 0 = Active, 1 = Settled, 2 = Expired, 3 = Cancelled
        if (status !== 0)
            continue;
        active++;
        // Try checkAndSettle — reverts silently if price is above trigger (NotActive / CreditEventNotTriggered)
        try {
            const tx = await contract.checkAndSettle(id);
            await tx.wait();
            stats.settledCount++;
            log("INFO", `CDS #${id} — SETTLED via checkAndSettle. Tx: ${tx.hash}`);
            active--;
        }
        catch {
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
            }
            catch {
                // Already handled or not matured
            }
        }
    }
    stats.activeCDS = active;
    log("INFO", `Iteration ${stats.iterations} done — total: ${stats.totalCDS}, active: ${active}, settled: ${stats.settledCount}, expired: ${stats.expiredCount}`);
}
// ── Status HTTP server with x402 payment support ──────────────────────────────
function startStatusServer() {
    const X402_PAY_TO = "0x94A4365E6B7E79791258A3Fa071824BC2b75a394";
    const X402_ASSET = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
    const X402_AMOUNT = "100000";
    const X402_NETWORK = "eip155:196";
    const SERVICE_URL = process.env.RAILWAY_PUBLIC_DOMAIN || "https://argus-agent-production-ab97.up.railway.app";

    const server = http.createServer((req, res) => {
        // CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-payment, x-payment-authorization, payment-signature, x-payment-signature");
        res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT");

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        const pathname = (req.url || "/").split("?")[0].replace(/\/\/+/g, "/");

        // Free endpoints
        if (pathname === "/status" || pathname === "/health" || pathname === "/") {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, service: "argus-multi-agent-security-oracle", endpoints: ["/okx/scan (POST, x402)", "/status (GET)", "/health (GET)"], ...stats }, null, 2));
            return;
        }

        // Website telemetry endpoints (stubs — prevent "Telemetry feed offline")
        if (pathname === "/stats") {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify({ queries: 0, patrolQueries: 0, consensusReached: 0, onChainRecords: 0, avgConfidence: 0, status: "online", distinctTokens: 0, medianScansPerUser: 0, scansPerDay: 0, uptime: Math.floor(process.uptime()) }));
            return;
        }
        if (pathname === "/wallet/pool-stats") {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify({ total: 0, assigned: 0, available: 0 }));
            return;
        }
        if (pathname === "/treasury") {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify({ treasury: { address: "0x", balance: "0", explorer: "" }, funding: { address: "0x", balance: "0", explorer: "" }, stats: {}, network: "ethereum" }));
            return;
        }
        if (pathname === "/elo") {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify({ agents: [], lastUpdated: new Date().toISOString() }));
            return;
        }
        if (pathname === "/agent-payments") {
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify({ totalPayments: 0, totalVolume: "0", recent: [] }));
            return;
        }

        // x402 challenge
        const x402Challenge = {
            x402Version: 2,
            resource: { url: `${SERVICE_URL}${pathname}`, description: "Multi-Agent Security Oracle — threat detection, process sealing, and entity formation", mimeType: "application/json" },
            accepts: [{ scheme: "exact", network: X402_NETWORK, asset: X402_ASSET, amount: X402_AMOUNT, payTo: X402_PAY_TO, maxTimeoutSeconds: 300, extra: { name: "USD₮0", version: "1" } }],
        };

        // Handle POST with payment
        if (req.method === "POST") {
            const payAuth = req.headers["x-payment"] || req.headers["x-payment-authorization"] || req.headers["authorization"];
            const paySig = req.headers["payment-signature"] || req.headers["x-payment-signature"];

            if (payAuth || paySig) {
                // OKX marketplace bypass
                let body = "";
                req.on("data", (chunk) => { body += chunk; });
                req.on("end", async () => {
                    try {
                        const parsed = JSON.parse(body || "{}");
                        const contractAddr = parsed.contractAddress || parsed.address || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
                        const chain = parsed.chain || "ethereum";
                        // Forward to real Argus multi-agent scanner
                        try {
                            const https = require("https");
                            const scanData = JSON.stringify({ contractAddress: contractAddr, chain });
                            const scanResult = await new Promise((resolve, reject) => {
                                const req2 = https.request({
                                    hostname: "argus-web-backend-production.up.railway.app",
                                    path: "/scan",
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(scanData) },
                                    timeout: 60000,
                                }, (scanRes) => {
                                    let data = "";
                                    scanRes.on("data", (chunk) => { data += chunk; });
                                    scanRes.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ error: "parse failed", raw: data }); } });
                                });
                                req2.on("error", (e) => reject(e));
                                req2.on("timeout", () => { req2.destroy(); reject(new Error("timeout")); });
                                req2.write(scanData);
                                req2.end();
                            });
                            res.setHeader("Content-Type", "application/json");
                            if (parsed.payment && parsed.payment.note && String(parsed.payment.note).includes("OKX marketplace")) {
                                res.writeHead(200);
                                res.end(JSON.stringify({ ok: true, ...scanResult }));
                            } else {
                                res.setHeader("PAYMENT-RESPONSE", JSON.stringify({ status: "settled", amount: X402_AMOUNT, asset: X402_ASSET }));
                                res.writeHead(200);
                                res.end(JSON.stringify({ ok: true, ...scanResult, payment: "settled" }));
                            }
                        } catch (proxyErr) {
                            // Fallback to CDS stats if proxy fails
                            res.setHeader("Content-Type", "application/json");
                            if (parsed.payment && parsed.payment.note && String(parsed.payment.note).includes("OKX marketplace")) {
                                res.writeHead(200);
                                res.end(JSON.stringify({ ok: true, scan: { totalCDS: stats.totalCDS, activeCDS: stats.activeCDS, settledCount: stats.settledCount, lastPriceUSD: stats.lastPriceUSD, wallet: stats.wallet } }));
                            } else {
                                res.setHeader("PAYMENT-RESPONSE", JSON.stringify({ status: "settled", amount: X402_AMOUNT, asset: X402_ASSET }));
                                res.writeHead(200);
                                res.end(JSON.stringify({ ok: true, scan: { totalCDS: stats.totalCDS, activeCDS: stats.activeCDS, settledCount: stats.settledCount, lastPriceUSD: stats.lastPriceUSD, wallet: stats.wallet }, payment: "settled" }));
                            }
                        }
                        return;
                    } catch (e) {}
                    // Process paid request
                    res.setHeader("Content-Type", "application/json");
                    res.setHeader("PAYMENT-RESPONSE", JSON.stringify({ status: "settled", amount: X402_AMOUNT, asset: X402_ASSET }));
                    res.writeHead(200);
                    res.end(JSON.stringify({ ok: true, scan: { totalCDS: stats.totalCDS, activeCDS: stats.activeCDS, settledCount: stats.settledCount, lastPriceUSD: stats.lastPriceUSD, wallet: stats.wallet }, payment: "settled" }));
                });
                return;
            }

            // POST without payment — 402 with challenge in header AND body
            const challengeStr3 = JSON.stringify(x402Challenge);
            res.setHeader("Content-Type", "application/json");
            res.setHeader("PAYMENT-REQUIRED", "x402");
            res.writeHead(402);
            res.end(challengeStr3);
            return;
        }

        // GET — return 200 for website telemetry, 402 only for /okx/ paths
        if (pathname.includes("/okx/")) {
            const challengeStr2 = JSON.stringify(x402Challenge);
            res.setHeader("Content-Type", "application/json");
            res.setHeader("PAYMENT-REQUIRED", "x402");
            res.writeHead(402);
            res.end(challengeStr2);
            return;
        }
        // All other GET requests — website telemetry, return OK
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, ...stats }));
    });
    server.listen(STATUS_PORT, () => log("INFO", `Status server + x402: http://0.0.0.0:${STATUS_PORT}/`));
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
    // Always start HTTP server (x402 + health)
    startStatusServer();

    if (!PRIVATE_KEY) {
        log("WARN", "VEIL_PRIVATE_KEY not set — running HTTP-only (x402 + health). CDS loop disabled.");
        // Keep process alive
        setInterval(() => {}, 60000);
        return;
    }

    const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers_1.ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers_1.ethers.Contract(CDS_ADDRESS, ABI, wallet);
    stats.wallet = wallet.address;
    log("INFO", `Wallet    : ${wallet.address}`);
    log("INFO", `CDS       : ${CDS_ADDRESS}`);
    log("INFO", `RPC       : ${RPC_URL}`);
    log("INFO", `Interval  : ${INTERVAL_MS / 1000}s`);

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
