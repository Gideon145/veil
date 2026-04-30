# VEIL Protocol — Judge Guide

**Live Frontend:** https://veil-protocol-tau.vercel.app  
**Autonomous Agent:** https://veil-agent.fly.dev/status  
**Network:** Arbitrum Sepolia (chainId 421614)  
**GitHub:** https://github.com/Gideon145/veil

---

## Fastest Demo Path (5 minutes)

### Step 1 — Open the Dashboard

Go to https://veil-protocol-tau.vercel.app

You'll see **8 live CDS positions** already on-chain. The ETH/USD Chainlink ticker in the navbar refreshes every 30 seconds. Each card shows trigger price, status badge, and maturity countdown.

---

### Step 2 — View a Live Position

Click any active position. You'll see immediately:

- **ChainGPT AI Risk Score** — loads ~2 seconds after page open. Real API call to ChainGPT with current oracle price, trigger price, and distance percentage. Shows a live 2-sentence risk analysis with a green confirmation dot.
- **Live ETH/USD price** from Chainlink — the same feed that governs trustless settlement.
- **Encrypted notional** — the USDC amount is stored as a `euint256` handle on-chain. Neither validators, block explorers, nor the counterparty can read it.

---

### Step 3 — Create Your Own Hedge (as Buyer)

1. Connect MetaMask to **Arbitrum Sepolia** (chainId 421614). [Faucet →](https://faucet.triangleplatform.com/arbitrum/sepolia)
2. Click **"Open a Hedge"** on the dashboard.
3. Fill in the form:
   - Notional: `1000` (USDC)
   - Trigger price: `5000` (set high so you can settle immediately in the demo)
   - Duration: `1` day
   - Premium interval: `86400` seconds
   - Seller: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (public Hardhat #0 key)
4. Click **"Get 10k test USDC"** first if your wallet is empty.
5. Submit — your notional is encrypted by iExec Nox in the browser before any transaction is sent.
6. You'll be redirected to the new position page.

---

### Step 4 — Deposit as Seller (one click, no MetaMask switch)

On the position page, in the **Deposit Notional** section:

1. Expand **"⚡ Demo shortcut"**.
2. Click **"Run demo deposit"** — this runs the full seller flow (mint USDC → approve → depositNotional) using the publicly documented Hardhat #0 key. No MetaMask prompt for the seller side.
3. The deposit state updates live. The settlement section unlocks.

---

### Step 5 — Trigger Settlement

> If you set trigger price to `$5,000` and ETH/USD is below that, settlement fires immediately.

1. Click **"Trigger Settlement"** — calls `checkAndSettle()` which reads Chainlink on-chain.
2. If `ETH/USD ≤ triggerPrice`, the contract emits `CreditEventFired` and status → `Settled`.
3. Click **"Claim Encrypted Payout"** — 3-state button: "Confirm in wallet…" → "Confirming on-chain…" → "Position Closed".

---

## What to Verify On-Chain

| Item | Link |
|---|---|
| ConfidentialCDS contract | [0xB2326A7A1EA88054906b16783B12E451d1Af0791](https://sepolia.arbiscan.io/address/0xB2326A7A1EA88054906b16783B12E451d1Af0791) |
| MockUSDC | [0x911E87629756F34190DF34162806f00b35521FD0](https://sepolia.arbiscan.io/address/0x911E87629756F34190DF34162806f00b35521FD0) |
| ConfidentialUSDC (ERC-7984) | [0xA947f7395B98AE41f862e6F0BDef8C852953a4E3](https://sepolia.arbiscan.io/address/0xA947f7395B98AE41f862e6F0BDef8C852953a4E3) |
| ConfidentialPiggyBank | [0xCa118a3d8D5798AD904607E7a4b3CC2bbe41F2DE](https://sepolia.arbiscan.io/address/0xCa118a3d8D5798AD904607E7a4b3CC2bbe41F2DE) |
| Deployer wallet | [0x94A4365E6B7E79791258A3Fa071824BC2b75a394](https://sepolia.arbiscan.io/address/0x94A4365E6B7E79791258A3Fa071824BC2b75a394) |

---

## Autonomous Agent

VEIL runs an autonomous settlement agent on **Fly.io** that:
- Polls every 30 seconds
- Calls `checkAndSettle(id)` on every active CDS — if ETH/USD drops below trigger, the contract fires
- Calls `expireContract(id)` on matured positions
- Exposes `/status` for health checks

**Live status:** https://veil-agent.fly.dev/status

```json
{
  "ok": true,
  "lastPriceUSD": "2256.84",
  "totalCDS": 8,
  "wallet": "0x94A4365E6B7E79791258A3Fa071824BC2b75a394"
}
```

This means no human needs to manually trigger settlement — the protocol is truly autonomous.

---

## Three-Layer Privacy Proof

Open any position and inspect it on Arbiscan:

1. **`notionalHandle`** — a `bytes32` ciphertext. You cannot decode what USDC amount was hedged.
2. **`premiumBalanceHandle`** — another encrypted running total. Invisible to everyone except buyer/seller/auditors.
3. Call `grantAuditorAccess(cdsId, yourAddress)` as the buyer to add yourself as an auditor — demonstrating the selective disclosure model used in TradFi regulatory reporting (Dodd-Frank / EMIR equivalent).

---

## Security

- `ConfidentialCDS.sol` audited by [ChainGPT AI Smart Contract Auditor](https://app.chaingpt.org/smart-contract-auditor) on April 14, 2026 — **no critical vulnerabilities found**
- `ReentrancyGuard` on all state-changing functions
- Oracle freshness check (rejects Chainlink data older than 2 hours)
- `SafeERC20` for all token transfers
- Custom Solidity errors (gas-efficient)
- ChainGPT API key stored server-side only — never exposed to the browser

---

## Run Locally

```bash
git clone https://github.com/Gideon145/veil.git
cd veil
npm install
cd frontend && npm install
cp .env.example .env  # add PRIVATE_KEY
npm run dev           # from frontend/
```
