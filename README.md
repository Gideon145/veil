# VEIL Protocol ™

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.27-363636?style=for-the-badge&logo=solidity" />
  <img src="https://img.shields.io/badge/Hardhat-2.22-yellow?style=for-the-badge" />
  <img src="https://img.shields.io/badge/iExec_Nox-TEE-blueviolet?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Chainlink-Oracle-375BD2?style=for-the-badge&logo=chainlink" />
  <img src="https://img.shields.io/badge/Arbitrum_Sepolia-421614-28A0F0?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" />
</p>

<p align="center">
  <strong>Hedge privately. Settle trustlessly.</strong>
</p>

<p align="center">
  VEIL is the first on-chain Credit Default Swap where your position size is <strong>fully encrypted</strong>.<br/>
  Set a price floor for ETH. If the market crashes below it, you get paid automatically —<br/>
  and nobody on the blockchain — not validators, not block explorers, not the counterparty — ever sees how much you hedged.
</p>

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Live Deployment](#live-deployment--arbitrum-sepolia)
- [Live Verification](#live-verification)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Privacy Model](#privacy-model)
- [Tech Stack](#tech-stack)
- [Frontend](#frontend)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)
- [Repository Structure](#repository-structure)
- [Hackathon Checklist](#hackathon-submission-checklist)
- [What Makes VEIL Different](#what-makes-veil-different)
- [Built For](#built-for)

---

## The Problem

DeFi hedging is completely transparent. When you open a protective position on any existing on-chain protocol:

- **Your position size is public.** Every node, every block explorer, every competing trader sees your notional amount the moment you broadcast the transaction.
- **You become a target.** Large hedges signal conviction — MEV bots, arbitrageurs, and sophisticated traders read on-chain positions to front-run or manipulate price.
- **The privacy gap vs. TradFi is enormous.** A Goldman Sachs trader buying credit protection on a portfolio doesn't broadcast the notional to the market. On-chain, there's been no equivalent — until now.

**The result:** institutional and sophisticated retail participants who need to hedge large positions are forced to choose between DeFi (transparent, exploitable) and TradFi (private, but custodied). VEIL eliminates that tradeoff.

---

## The Solution

VEIL is a **Confidential Credit Default Swap** — the CDS structure from traditional finance, reimagined for on-chain execution with encrypted position data.

### How a CDS Works (Plain English)

Think of it as price insurance for your crypto:

1. **You (buyer) pick a price floor** — e.g., "protect me if ETH drops below $1,500".
2. **You pay a periodic premium** to provide compensation to the protection seller.
3. **A seller locks up USDC collateral** equal to the full payout amount.
4. **If ETH crashes below your trigger price** → the contract fires automatically, and you claim the full collateral. No human arbiter, no court, no custodian.
5. **If ETH stays above your price until expiry** → the seller gets their collateral back, having earned your premiums.

### How the Privacy Works

The critical number — **how much you hedged** — never appears in plaintext anywhere on the blockchain.

```
Browser (your device)
  │
  ├─ encryptInput(notional, "uint256", contractAddress)
  │       ↓  iExec Nox SDK  — runs inside browser TEE
  │  returns: bytes32 handle  (encrypted commitment)
  │
  └─ createCDS(handle, proof, triggerPrice, ...)
              ↓  on-chain
         euint256 stored  ←── only a ciphertext handle
         never decrypted  ←── not by nodes, not by the chain
```

The `euint256` handle stored on-chain is a **blind commitment** to the value. Only the buyer, the seller, and any explicitly granted auditor address can decrypt it via the iExec Nox ACL. The Ethereum network — and anyone reading it — sees only a `bytes32` hash.

---

## Live Deployment — Arbitrum Sepolia

All contracts are verified on Arbiscan and live on Arbitrum Sepolia (chainId **421614**).

| Contract | Address | Arbiscan |
|---|---|---|
| **ConfidentialCDS** | `0x2B9366b7fea6a1C6279edbC7B87CCB91CdCc1014` | [View ↗](https://sepolia.arbiscan.io/address/0x2B9366b7fea6a1C6279edbC7B87CCB91CdCc1014) |
| **ConfidentialPiggyBank** | `0xCa118a3d8D5798AD904607E7a4b3CC2bbe41F2DE` | [View ↗](https://sepolia.arbiscan.io/address/0xCa118a3d8D5798AD904607E7a4b3CC2bbe41F2DE) |
| **MockUSDC** (testnet) | `0x911E87629756F34190DF34162806f00b35521FD0` | [View ↗](https://sepolia.arbiscan.io/address/0x911E87629756F34190DF34162806f00b35521FD0) |
| **Chainlink ETH/USD** | `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165` | [View ↗](https://sepolia.arbiscan.io/address/0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165) |
| **iExec NoxCompute** | `0xd464B198f06756a1d00be223634b85E0a731c229` | [View ↗](https://sepolia.arbiscan.io/address/0xd464B198f06756a1d00be223634b85E0a731c229) |

| Resource | Link |
|---|---|
| **GitHub** | https://github.com/Gideon145/veil |
| **Frontend** | https://veil-protocol-tau.vercel.app |
| **Deployer wallet** | `0x94A4365E6B7E79791258A3Fa071824BC2b75a394` |
| **Deployed at** | `2026-04-11T02:13:22Z` |

---

## Live Verification

Confirm the contracts are live and the CDS counter is non-zero:

### PowerShell (Windows)
```powershell
# Read total number of CDS contracts created
$body = '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x2B9366b7fea6a1C6279edbC7B87CCB91CdCc1014","data":"0x6d2d3a0c"},"latest"],"id":1}'
Invoke-RestMethod -Uri "https://sepolia-rollup.arbitrum.io/rpc" -Method Post -ContentType "application/json" -Body $body
```

### curl (Linux / macOS)
```bash
curl -s -X POST https://sepolia.arbiscan.io/api \
  -G \
  -d "module=contract" \
  -d "action=getsourcecode" \
  -d "address=0x2B9366b7fea6a1C6279edbC7B87CCB91CdCc1014" \
  | python3 -m json.tool
```

### Check live ETH/USD price being fed to the oracle
```bash
# latestRoundData() selector = 0xfeaf968c
curl -s -X POST https://sepolia-rollup.arbitrum.io/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165","data":"0xfeaf968c"},"latest"],"id":1}'
```

---

## Architecture

### Full Protocol Flow

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                           VEIL PROTOCOL                                     │
 └─────────────────────────────────────────────────────────────────────────────┘

Buyer (Browser)                  ConfidentialCDS.sol          Chainlink ETH/USD
      │                                    │                         │
      ├─ 1. encryptInput(notional)  ───►   │                         │
      │    [iExec Nox JS SDK]              │                         │
      │    returns: bytes32 handle         │                         │
      │                                    │                         │
      ├─ 2. createCDS(                ───► │                         │
      │       handle, proof,               │                         │
      │       triggerPrice,                │                         │
      │       durationDays,                │                         │
      │       premiumInterval,             │                         │
      │       sellerAddr         )         │                         │
      │    [euint256 stored on-chain]       │                         │
      │                                    │                         │
Seller│                                    │                         │
      ├─ 3. approve(cdsAddr, amt)   ───►  USDC                       │
      ├─ 4. depositNotional(id, amt) ──► │ escrowed USDC locked │    │
      │                                    │                         │
Buyer │                                    │                         │
      ├─ 5. payPremium(             ───► │ premium → seller    │    │
      │       id, handle, proof, amt)      │ euint256 running total   │
      │                                    │                         │
Anyone│                                    │                         │
      ├─ 6. checkAndSettle(id)      ───► │◄── latestRoundData() ────┤
      │                                    │                         │
      │    if ETH/USD ≤ triggerPrice:      │                         │
      │      emit CreditEventFired         │                         │
      │      status = Settled              │                         │
      │                                    │                         │
Buyer │                                    │                         │
      └─ 7. claimPayout(id)         ───► └── transfers USDC ──────►
```

### Privacy Layer (iExec Nox)

```
                      ┌──────────────────────────────┐
                      │      iExec Nox TEE             │
                      │  (Trusted Execution Env)       │
                      │                                │
   plaintext ────────►│  encrypt(value, type, addr)   │────► euint256 handle (bytes32)
      value           │                                │       stored on-chain
                      │  ACL: buyer ✓                  │
                      │       seller ✓                 │
                      │       auditor ✓ (optional)     │
                      │       public ✗                 │
                      └──────────────────────────────┘
```

### Settlement State Machine

```
  createCDS()          depositNotional()      checkAndSettle()         expireContract()
      │                       │               (oracle price ≤ trigger)   (after maturity)
      ▼                       ▼                        │                        │
  [CREATED] ─────────► [ACTIVE] ─────────────────────►│                        │
                                                       ▼                        ▼
                                                  [SETTLED]               [EXPIRED]
                                                       │                        │
                                                  claimPayout()      seller gets collateral
                                                       │                   back
                                                  buyer gets USDC
```

---

## Smart Contracts

### `ConfidentialCDS.sol`

The core protocol contract. Implements encrypted CDS with iExec Nox `euint256` handles for position privacy and Chainlink for trustless settlement.

#### State Variables

| Variable | Type | Visibility | Description |
|---|---|---|---|
| `priceFeed` | `AggregatorV3Interface` | `public immutable` | Chainlink ETH/USD feed address |
| `usdc` | `IERC20` | `public immutable` | USDC token contract |
| `nextCDSId` | `uint256` | `public` | Auto-incrementing CDS ID counter |
| `contracts` | `mapping(uint256 => CDSContract)` | `public` | All CDS positions by ID |
| `auditorAccess` | `mapping(uint256 => mapping(address => bool))` | `public` | Selective disclosure ACL |

#### The `CDSContract` Struct

| Field | Type | Privacy | Description |
|---|---|---|---|
| `buyer` | `address` | Public | Protection buyer |
| `seller` | `address` | Public | Protection seller |
| `notional` | `euint256` | **Encrypted** | Payout amount on credit event |
| `premiumBalance` | `euint256` | **Encrypted** | Accumulated premiums in escrow |
| `triggerPrice` | `uint256` | Public | ETH/USD strike (8-decimal Chainlink format) |
| `maturityTimestamp` | `uint256` | Public | Unix timestamp of contract expiry |
| `nextPremiumDue` | `uint256` | Public | Next premium payment deadline |
| `premiumInterval` | `uint256` | Public | Seconds between premium payments |
| `status` | `CDSStatus` | Public | Active / Settled / Expired / Cancelled |
| `notionalDeposited` | `bool` | Public | Whether seller has funded the contract |

#### Core Functions

| Function | Caller | Description |
|---|---|---|
| `createCDS(handle, proof, triggerPrice, durationDays, premiumInterval, seller)` | Buyer | Opens a new CDS. Encrypts notional via Nox, sets terms, emits `CDSCreated`. Validates duration 1–3650 days. |
| `depositNotional(cdsId, amount)` | Seller | Locks USDC collateral into escrow. Activates the contract. Enforces `ReentrancyGuard`. |
| `payPremium(cdsId, handle, proof, plainAmount)` | Buyer | Transfers USDC premium to seller. Adds encrypted premium to running `premiumBalance` handle. Rejects early payments. |
| `checkAndSettle(cdsId)` | Anyone | Reads Chainlink oracle. If `ETH/USD ≤ triggerPrice`, sets status to `Settled`. Rejects stale oracle data (> 2h). |
| `claimPayout(cdsId)` | Buyer | After `Settled`, transfers full USDC escrow balance to buyer. |
| `expireContract(cdsId)` | Anyone | After `maturityTimestamp`, returns escrowed USDC to seller. |
| `grantAuditorAccess(cdsId, auditor)` | Buyer | Grants `euint256` ACL access for selective regulatory disclosure. |

#### Events

| Event | Emitted On |
|---|---|
| `CDSCreated(cdsId, buyer, seller, triggerPrice, maturityTimestamp)` | `createCDS()` |
| `NotionalDeposited(cdsId)` | `depositNotional()` |
| `PremiumPaid(cdsId, timestamp)` | `payPremium()` |
| `CreditEventFired(cdsId, oraclePrice, triggerPrice)` | `checkAndSettle()` — credit event |
| `PayoutClaimed(cdsId, buyer)` | `claimPayout()` |
| `ContractExpired(cdsId)` | `expireContract()` |
| `AuditorAccessGranted(cdsId, auditor)` | `grantAuditorAccess()` |

#### Custom Errors (Gas-Efficient)

```solidity
NotBuyer()              // msg.sender is not the CDS buyer
NotSeller()             // msg.sender is not the CDS seller
NotActive()             // CDS is not in Active status
NotSettled()            // CDS is not in Settled status
NotExpired()            // Maturity timestamp not yet reached
AlreadyDeposited()      // Seller already funded this CDS
PremiumNotDue()         // Premium interval has not elapsed
CreditEventNotTriggered() // Oracle price is above trigger
MaturityNotReached()    // Contract has not yet matured
InvalidPrice()          // Oracle returned 0 or stale data
InvalidDuration()       // Duration is 0 or exceeds 3650 days
SameBuyerAndSeller()    // buyer == seller (not permitted)
```

---

### `ConfidentialPiggyBank.sol`

A self-contained demonstration of iExec Nox encrypted balances. The owner deposits and withdraws amounts that are never visible on-chain. Built as a proof-of-concept for the Nox SDK integration and deployed independently.

| Function | Caller | Description |
|---|---|---|
| `deposit(handle, proof)` | Anyone | Adds an encrypted amount to the piggy bank balance. |
| `withdraw(handle, proof)` | Owner only | Subtracts an encrypted amount from the balance. |

**Deployed at:** `0xCa118a3d8D5798AD904607E7a4b3CC2bbe41F2DE`

---

### `MockUSDC.sol`

Standard ERC-20 test token used as the collateral and premium currency for Arbitrum Sepolia testing. Mintable for permissionless testnet use.

**Deployed at:** `0x911E87629756F34190DF34162806f00b35521FD0`

---

## Privacy Model

| Data Field | On-chain Visibility | Who Can Decrypt |
|---|---|---|
| Trigger price | **Public** — everyone | N/A |
| Buyer address | **Public** — everyone | N/A |
| Seller address | **Public** — everyone | N/A |
| Contract status | **Public** — everyone | N/A |
| Maturity / timestamps | **Public** — everyone | N/A |
| **Notional amount** | **Encrypted** — `euint256` handle only | Buyer + Seller + Auditors |
| **Premium balance** | **Encrypted** — `euint256` handle only | Buyer + Seller + Auditors |

**Selective Disclosure:** The buyer can call `grantAuditorAccess(cdsId, auditorAddress)` to grant a regulator or compliance officer decryption rights without making the data public. This mirrors how TradFi CDS contracts report to trade repositories under Dodd-Frank / EMIR while keeping positions private from the broader market.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Confidentiality** | [iExec Nox](https://docs.iex.ec) SDK | TEE-based `euint256` encrypted handles for position privacy |
| **Smart Contracts** | Solidity `0.8.27` | Core CDS logic |
| **Contract Framework** | Hardhat `2.22` + TypeScript | Compile, test, deploy |
| **Security** | OpenZeppelin `ReentrancyGuard`, `SafeERC20` | Reentrancy protection, safe token transfers |
| **Price Oracle** | Chainlink ETH/USD | Trustless settlement trigger — no human arbiter |
| **Network** | Arbitrum Sepolia (`chainId 421614`) | L2 for low-cost, fast finality |
| **Frontend** | Next.js 16 + Tailwind CSS | React server components + app router |
| **Blockchain Hooks** | wagmi `v2` + viem `v2` | Type-safe contract reads/writes |
| **Wallet Connection** | RainbowKit | Multi-wallet connect modal |
| **Deployment** | Vercel | Zero-config frontend CI/CD |
| **Contract Verification** | Arbiscan (Etherscan API) | Source code publicly verifiable |

---

## Frontend

The VEIL frontend gives users a live dashboard of all hedge positions with real-time oracle data — and the full hedge workflow in three steps.

### Pages

| Route | Description |
|---|---|
| `/` | **Dashboard** — live list of all CDS positions, real-time ETH/USD price feed, wallet status |
| `/create` | **Open Hedge** — form to encrypt a notional, set trigger price, duration, premium schedule, and counterparty |
| `/position/[id]` | **Position Detail** — status, deposit panel (for the seller), settlement button, claim payout |

### Components

| Component | Description |
|---|---|
| `CDSCard.tsx` | Compact card showing a single position: status badge, trigger price, maturity countdown, deposited state |
| `CreateCDSForm.tsx` | Multi-step form: encrypt notional via Nox SDK → set trigger → choose counterparty → preview → submit |
| `DepositNotionalPanel.tsx` | Seller-only panel: USDC approval + `depositNotional()` transaction |
| `SettlementPanel.tsx` | `checkAndSettle()` button with live oracle price; `claimPayout()` when settled |
| `PriceFeed.tsx` | Live Chainlink ETH/USD price ticker — polls every 30 seconds |
| `RiskScore.tsx` | Visual risk indicator: distance between current ETH price and the trigger price (% away from event) |
| `Navbar.tsx` | RainbowKit connect button, network badge (warns if not on Arbitrum Sepolia) |
| `Footer.tsx` | Links to GitHub, DoraHacks submission, protocol docs |

### Key UX Notes

- **Skeleton loading states** on every card — no layout shift during contract fetches.
- **Dark-mode first** — all UI elements designed for dark backgrounds.
- **Privacy banner** on the create page explains encryption before the user submits anything.
- **Stale data protection** — frontend warns if the oracle hasn't updated within 2 hours.

---

## Running Locally

### Prerequisites

- Node.js 18+
- A wallet with Arbitrum Sepolia ETH — [faucet](https://faucet.triangleplatform.com/arbitrum/sepolia)
- MetaMask (or any RainbowKit-supported wallet)

### 1. Clone and install

```bash
git clone https://github.com/Gideon145/veil.git
cd veil
npm install
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` (see [Environment Variables](#environment-variables) below).

> ⚠️ **Never commit your `.env` file.** It contains your deployment private key.

### 3. Run the frontend (connects to live deployed contracts)

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Switch MetaMask to **Arbitrum Sepolia** (chainId 421614).

### 4. Compile contracts

```bash
npx hardhat compile
```

### 5. Run tests

```bash
npx hardhat test
```

### 6. (Optional) Redeploy contracts

```bash
# Deploy MockUSDC + ConfidentialCDS
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# Deploy ConfidentialPiggyBank separately
npx hardhat run scripts/deployPiggyBank.ts --network arbitrumSepolia

# Mint test USDC to your wallet
npx hardhat run scripts/mintUsdc.ts --network arbitrumSepolia

# Seed: create a sample CDS position for demo purposes
npx hardhat run scripts/seed.ts --network arbitrumSepolia
```

### 7. (Optional) Verify on Arbiscan

```bash
npx hardhat verify --network arbitrumSepolia \
  0x2B9366b7fea6a1C6279edbC7B87CCB91CdCc1014 \
  "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165" \
  "0x911E87629756F34190DF34162806f00b35521FD0"
```

---

## Environment Variables

### `.env` (repo root — for Hardhat scripts)

| Variable | Required | Description |
|---|---|---|
| `PRIVATE_KEY` | ✅ | 64-character hex private key of deployer wallet (no `0x` prefix) |
| `ARBISCAN_API_KEY` | Optional | Arbiscan API key for contract source verification |

### `frontend/.env.local` (frontend — for Next.js)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect Cloud project ID for RainbowKit |
| `NEXT_PUBLIC_ALCHEMY_ID` | Optional | Alchemy API key for RPC (falls back to public endpoint) |

---

## Repository Structure

```
veil/
├─ contracts/
│   ├─ ConfidentialCDS.sol          # Core CDS protocol — encrypted notionals + Chainlink settlement
│   ├─ ConfidentialPiggyBank.sol    # Nox SDK demo — encrypted savings contract
│   └─ MockUSDC.sol                 # ERC-20 test token (Arbitrum Sepolia)
├─ scripts/
│   ├─ deploy.ts                    # Deploy MockUSDC + ConfidentialCDS → writes deployments.json
│   ├─ deployPiggyBank.ts           # Deploy ConfidentialPiggyBank
│   ├─ mintUsdc.ts                  # Mint test USDC to deployer wallet
│   └─ seed.ts                      # Seed: mint USDC + open a sample CDS for demo
├─ deployments/
│   └─ arbitrumSepolia.json         # Live deployed addresses (auto-written by deploy.ts)
├─ frontend/
│   ├─ app/
│   │   ├─ page.tsx                 # Dashboard — all live positions + ETH price ticker
│   │   ├─ create/page.tsx          # Open new hedge position (Nox encrypt + createCDS)
│   │   └─ position/[id]/page.tsx   # Position detail — deposit, settle, claim
│   ├─ components/
│   │   ├─ CDSCard.tsx              # Position summary card with status badge
│   │   ├─ CreateCDSForm.tsx        # Encryption + hedge setup form
│   │   ├─ DepositNotionalPanel.tsx # Seller USDC deposit flow
│   │   ├─ SettlementPanel.tsx      # Settlement trigger + payout claim
│   │   ├─ PriceFeed.tsx            # Live Chainlink ETH/USD ticker
│   │   ├─ RiskScore.tsx            # % distance from credit event
│   │   ├─ Navbar.tsx               # Wallet connect + network badge
│   │   └─ Footer.tsx               # Protocol links
│   ├─ lib/
│   │   ├─ deployments.json         # Mirror of ../deployments/arbitrumSepolia.json
│   │   ├─ abis.ts                  # Contract ABI exports
│   │   └─ wagmi.ts                 # Wagmi + RainbowKit config
│   └─ providers.tsx                # Wagmi + RainbowKit provider tree
├─ hardhat.config.ts                # Hardhat config — Arbitrum Sepolia, Arbiscan verify
├─ .env.example                     # Template — copy to .env and fill in PRIVATE_KEY
└─ README.md                        # This file
```

---

## How to Use VEIL — Full Walkthrough

### As the Buyer (protection purchaser)

1. **Connect wallet** — MetaMask on Arbitrum Sepolia
2. **Get test USDC** — run `mintUsdc.ts` or use the seed script
3. **Click "Open a Hedge"** on the dashboard
4. **Enter your notional amount** — e.g., 1000 USDC. This value is encrypted locally via iExec Nox before any transaction is sent.
5. **Set trigger price** — e.g., `150000000000` (= $1,500 in Chainlink 8-decimal format)
6. **Set duration** — e.g., 30 days
7. **Set premium interval** — e.g., 86400 seconds (daily)
8. **Enter seller address** — the counterparty who will post collateral
9. **Submit** — `createCDS()` is called with the encrypted handle. Your notional is on-chain but unreadable.

### As the Seller (protection provider)

1. Open the position page (`/position/[id]`)
2. In the **Deposit Notional** panel, approve USDC and call `depositNotional()` — the contract is now fully active.

### Settlement

- Anyone can click **"Check & Settle"** at any time.
- The contract reads Chainlink's live ETH/USD price.
- If `ETH/USD ≤ triggerPrice`, a `CreditEventFired` event is emitted and the contract moves to `Settled`.
- The buyer can now call **"Claim Payout"** to receive the full escrowed USDC.

### Expiry (no credit event)

- After `maturityTimestamp`, anyone can call `expireContract()`.
- The seller's escrowed USDC is returned to them.

---

## Hackathon Submission Checklist

- [x] Contracts deployed and live on Arbitrum Sepolia
- [x] `ConfidentialCDS` verified on Arbiscan
- [x] iExec Nox `euint256` handles used for encrypted notional + premium balance
- [x] Chainlink ETH/USD oracle integrated for trustless settlement
- [x] Selective disclosure via `grantAuditorAccess()` — demonstrating regulated privacy
- [x] Stale oracle protection (2-hour freshness check in `checkAndSettle`)
- [x] Reentrancy guards on all state-changing functions
- [x] Custom Solidity errors (gas-efficient vs string reverts)
- [x] Full Next.js 16 frontend with wallet integration
- [x] Live price feed component polling Chainlink data
- [x] Skeleton loading states and dark-mode UX
- [x] `ConfidentialPiggyBank.sol` as standalone Nox SDK demo
- [x] Deployment scripts + seed scripts for reproducibility
- [x] Repository public and documented
- [x] DoraHacks submission filed

---

## What Makes VEIL Different

| Feature | Traditional DeFi Hedges | VEIL |
|---|---|---|
| Position size visibility | ✅ Fully public | 🔒 Encrypted — nobody sees your notional |
| Settlement mechanism | Manual / multisig / governance | Trustless — Chainlink oracle, zero human arbiter |
| Selective disclosure | ❌ Not possible | ✅ Grant any address ACL access (regulators, auditors) |
| Privacy model | None | TEE-based `euint256` handles via iExec Nox |
| Premium accounting | Plaintext on-chain | Encrypted running total (`premiumBalance`) |
| CDS structure on-chain | Not available in DeFi | ✅ First confidential CDS implementation |
| Front-running exposure | High — notional is visible pre-execution | Zero — position is encrypted before broadcast |

---

## Built For

**iExec Vibe Coding Challenge 2026** — [DoraHacks Submission ↗](https://dorahacks.io/hackathon/vibe-coding-iexec/buidl)

VEIL was built to demonstrate a real-world financial primitive — the Credit Default Swap — made private and trustless using iExec's Nox confidential compute stack. The use case is immediate and real: institutional participants who want DeFi settlement guarantees without public position exposure.

---

## Team

| | |
|---|---|
| **Builder** | [@Gideon145](https://github.com/Gideon145) |
| **Protocol** | VEIL — Confidential CDS on Arbitrum |
| **Stack** | iExec Nox · Chainlink · Arbitrum · Next.js |

---

<p align="center">
  Built with iExec Nox · Powered by Chainlink · Deployed on Arbitrum Sepolia
</p>
