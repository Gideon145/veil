# VEIL Protocol ™

> **Hedge privately. Settle trustlessly.**

**VEIL** is an on-chain confidential hedge protocol where your position size is **fully encrypted**. Set a price floor for your ETH. If the market crashes below it, you get paid automatically — and nobody on the blockchain ever sees how much you hedged.

---

## What Is This, In Plain English?

Think of VEIL like price insurance for your crypto:

1. You pick a price (e.g. "I want protection if ETH drops below $1,500").
2. You put up a small premium payment.
3. A counterparty (the "seller") puts up collateral.
4. If ETH crashes below your chosen price → **you get paid the full collateral automatically**.
5. If ETH stays above your price until the contract expires → **the seller gets their money back**.

The key difference from anything else on the market: **your position size is encrypted**. Nobody — not node operators, not block explorers, not even miners — can see the dollar amount of your hedge. It's sealed inside a Trusted Execution Environment (TEE) using iExec Nox.

---

## How It Works (Technical)

```
Buyer                        VEIL Contract                Chainlink Oracle
  │                               │                              │
  ├─ encrypt notional locally ──► │                              │
  ├─ createCDS(encNotional,       │                              │
  │   triggerPrice, maturity) ──► │◄── ETH/USD price feed ──────┤
  │                               │                              │
Seller                            │                              │
  ├─ depositNotional(USDC) ─────► │                              │
  │                               │                              │
  ├─ payPremium() ──────────────► │                              │
  │                               │                              │
Anyone                            │                              │
  ├─ checkAndSettle() ──────────► │◄── latestRoundData() ───────┤
  │                               │                              │
  │  if price < trigger:          │                              │
  │    emit CreditEventFired      │                              │
  │                               │                              │
Buyer                             │                              │
  └─ claimPayout() ─────────────► └── transfers USDC ──────────►
```

### Privacy via iExec Nox TEE

- The buyer calls `encryptInput(notional, "uint256", contractAddress)` locally in the browser before any transaction is submitted.
- This returns an encrypted `handle` (a `bytes32` commitment) that is stored on-chain.
- The actual dollar amount is never in plaintext on the blockchain.
- Only the buyer, seller, and any explicitly granted auditors can decrypt it.

### Settlement via Chainlink

- The contract holds a reference to the Chainlink **ETH/USD** price feed on Arbitrum Sepolia.
- Anyone can call `checkAndSettle()` — it reads the oracle and fires the credit event if triggered.
- No human arbitrator. No trusted middleman. Pure code.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Privacy / Encryption | [iExec Nox](https://docs.iex.ec) · TEE-based handle SDK |
| Smart Contracts | Solidity 0.8.27 · Hardhat 2.22 · OpenZeppelin |
| Price Oracle | [Chainlink ETH/USD](https://data.chain.link) · Arbitrum Sepolia |
| Blockchain | [Arbitrum Sepolia](https://sepolia.arbiscan.io) (chainId 421614) |
| Frontend | Next.js 16 · Tailwind CSS · wagmi v2 · viem v2 |
| Wallet Connection | RainbowKit |
| Deployment | Vercel (frontend) |

---

## Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|---|---|
| ConfidentialCDS | [`0x2B9366b7fea6a1C6279edbC7B87CCB91CdCc1014`](https://sepolia.arbiscan.io/address/0x2B9366b7fea6a1C6279edbC7B87CCB91CdCc1014) |
| MockUSDC (testnet) | [`0x911E87629756F34190DF34162806f00b35521FD0`](https://sepolia.arbiscan.io/address/0x911E87629756F34190DF34162806f00b35521FD0) |
| Chainlink ETH/USD | `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165` |
| iExec NoxCompute | `0xd464B198f06756a1d00be223634b85E0a731c229` |

---

## Repository Structure

```
veil/
├── contracts/
│   ├── ConfidentialCDS.sol   # Main CDS contract with Nox encrypted handles
│   └── MockUSDC.sol          # ERC-20 test token for Sepolia
├── scripts/
│   ├── deploy.ts             # Hardhat deploy script
│   └── seed.ts               # Seed script: mint USDC + create sample CDS
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Dashboard: live positions + hero
│   │   ├── create/page.tsx   # Open a hedge position form
│   │   └── position/[id]/    # Position detail + settlement panel
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── CDSCard.tsx
│   │   ├── CreateCDSForm.tsx
│   │   ├── DepositNotionalPanel.tsx
│   │   ├── SettlementPanel.tsx
│   │   ├── PriceFeed.tsx
│   │   └── RiskScore.tsx
│   └── lib/
│       ├── deployments.json  # Contract addresses
│       └── wagmi.ts          # Wagmi + RainbowKit config
├── hardhat.config.ts
└── .env.example              # Template — copy to .env and fill in PRIVATE_KEY
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- A wallet with Arbitrum Sepolia ETH ([faucet](https://faucet.triangleplatform.com/arbitrum/sepolia))

### 1. Clone and install

```bash
git clone https://github.com/Gideon145/veil.git
cd veil
npm install
cd frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your PRIVATE_KEY (no 0x prefix)
```

> ⚠️ **Never commit your `.env` file.** It contains your wallet's private key.

### 3. Run the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect MetaMask to **Arbitrum Sepolia** (chainId 421614).

### 4. (Optional) Redeploy contracts

```bash
# From repo root
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# Seed with test USDC
npx hardhat run scripts/seed.ts --network arbitrumSepolia
```

---

## How to Use VEIL (Step by Step)

1. **Connect wallet** — MetaMask on Arbitrum Sepolia
2. **Get test USDC** — run the seed script or ask via Discord
3. **Click "Start a Hedge"**
   - Set a trigger price (e.g. $1,500)
   - Enter your notional (e.g. 1000 USDC)
   - Set a duration + premium interval
   - A second address acts as seller (can be same wallet on testnet)
4. **As seller — Deposit Notional** — the `DepositNotionalPanel` will appear on the position page
5. **Watch the oracle** — click "Check & Settle" to run settlement
6. **Claim payout** — if credit event fired, claim your USDC

---

## Privacy Model

| What | Who can see it |
|---|---|
| Trigger price | Everyone (public contract term) |
| Buyer / Seller addresses | Everyone |
| Contract status | Everyone |
| **Notional amount** | **Buyer + Seller + Auditors only** |
| **Premium balance** | **Buyer + Seller + Auditors only** |

Auditor access is granted via `grantAuditorAccess(cdsId, auditorAddress)` by the buyer, enabling selective regulatory disclosure without exposing data to the public.

---

## Built For

**iExec Vibe Coding Challenge 2026** — [DoraHacks submission](https://dorahacks.io/hackathon/vibe-coding-iexec/buidl)

Category: DeFi × Confidential Computing

---

## License & Trademark

Copyright © 2026 **VEIL Protocol™**. All rights reserved.

The VEIL Protocol name, logo, and smart contract code are proprietary. The frontend source is provided for educational reference only. Reproduction, redistribution, or commercial use without express written permission from the VEIL authors is prohibited.

The smart contracts are deployed on a public blockchain as immutable infrastructure; this does not constitute a license to the underlying source code or any derivative works.

---

## Authors

Built by the VEIL team. Questions? Open an issue.

- Notional stored as `euint256` encrypted handle — unreadable on-chain
- ACL grants only buyer + seller (+ optional auditors) access to decrypt
- Settlement arithmetic runs on encrypted values — no cleartext ever touches the EVM

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Solidity 0.8.27, Hardhat 2.22 |
| Privacy | iExec Nox (`euint256`, `Nox.fromExternal`, `Nox.safeAdd`, `Nox.allow`) |
| Oracle | Chainlink ETH/USD (Arbitrum Sepolia) |
| ERC-20 | MockUSDC (6 decimals, mintable) |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Web3 | wagmi v2 + viem v2 + @tanstack/react-query |
| Network | Arbitrum Sepolia (chainId 421614) |

---

## Project Structure

```
deployer/
├── contracts/
│   ├── ConfidentialCDS.sol    # Core CDS logic with euint256 notional
│   └── MockUSDC.sol           # ERC-20 with public mint()
├── scripts/
│   ├── deploy.ts              # Deploys both contracts, writes addresses
│   └── seed.ts                # Mints USDC to deployer
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Dashboard (all positions)
│   │   ├── create/page.tsx    # New CDS form
│   │   └── position/[id]/page.tsx  # Position detail + settlement
│   ├── components/
│   │   ├── Navbar.tsx         # Wallet connect, wrong-network detection
│   │   ├── PriceFeed.tsx      # Live Chainlink price (15s polling)
│   │   ├── CDSCard.tsx        # Position summary card
│   │   ├── CreateCDSForm.tsx  # 3-step: configure → encrypt → submit
│   │   ├── SettlementPanel.tsx # Credit event trigger + payout claim
│   │   └── RiskScore.tsx      # AI-style risk score (0–100)
│   └── lib/
│       ├── abis.ts            # Full CDS + USDC ABIs
│       ├── deployments.json   # Contract addresses (auto-filled by deploy.ts)
│       └── utils.ts           # Formatters, viem clients, constants
├── feedback.md
└── README.md
```

---

## Setup & Deployment

### 1. Install dependencies

```bash
# Root (Hardhat)
npm install

# Frontend
cd frontend && npm install
```

### 2. Configure environment

```bash
# deployer/.env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

> You need Arbitrum Sepolia ETH (bridge from [Sepolia](https://bridge.arbitrum.io/?l2ChainId=421614)), testnet USDC ([Circle faucet](https://faucet.circle.com/)), and RLC ([iExec faucet](https://faucet.iex.ec/)).

### 3. Compile contracts

```bash
npx hardhat compile
```

### 4. Deploy to Arbitrum Sepolia

```bash
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
```

This outputs:
- `deployments/arbitrumSepolia.json`
- `frontend/lib/deployments.json` (auto-updated — frontend reads this)

### 5. Seed (optional)

```bash
npx hardhat run scripts/seed.ts --network arbitrumSepolia
```

### 6. Run the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Nox Primitives Used

| Primitive | Where used |
|-----------|-----------|
| `euint256` | Notional + premium balance state variables |
| `externalEuint256` | Input type for `createCDS()` — client-encrypted ciphertext |
| `Nox.fromExternal()` | Converts client-encrypted input into on-chain handle |
| `Nox.toEuint256()` | Unwraps stored handle for arithmetic |
| `Nox.safeAdd()` | Accumulates encrypted premium payments |
| `Nox.allow(handle, addr)` | Grants buyer + seller ACL to decrypt |
| `Nox.allowThis()` | Grants contract itself access for settlement |
| `@iexec-nox/handle` | TypeScript SDK — encrypts notional in browser before tx |

---

## Contract Addresses (Arbitrum Sepolia)

> Filled after deployment. See `frontend/lib/deployments.json`.

| Contract | Address |
|----------|---------|
| MockUSDC | [`0x87E3D9fcfA4eff229A65d045A7C741E49b581187`](https://sepolia.arbiscan.io/address/0x87E3D9fcfA4eff229A65d045A7C741E49b581187) |
| ConfidentialCDS | [`0x57C7f2F3051928E2cc7C871Bac590bF1d4BF4c8e`](https://sepolia.arbiscan.io/address/0x57C7f2F3051928E2cc7C871Bac590bF1d4BF4c8e) |
| NoxCompute | `0xd464B198f06756a1d00be223634b85E0a731c229` |
| Chainlink ETH/USD | `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165` |

---

## iExec Vibe Coding Challenge

Built for the [iExec Vibe Coding Challenge](https://dorahacks.io/hackathon/iexec-vibe-coding) — May 1, 2026 deadline.

See [feedback.md](./feedback.md) for detailed notes on developer experience, what worked, and suggestions for the Nox team.
