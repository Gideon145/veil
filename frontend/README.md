# VEIL Protocol — Frontend

> Next.js 15 frontend for the VEIL Confidential CDS Protocol.
>
> **Live:** https://veil-protocol-tau.vercel.app — Arbitrum Sepolia (chainId 421614)

## Overview

The VEIL frontend gives users a live dashboard of all confidential hedge positions with real-time Chainlink oracle data, ChainGPT AI risk scoring, and a complete hedge workflow (create → deposit → settle → claim) in four steps.

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — live CDS positions, real-time ETH/USD price feed |
| `/create` | Open a new hedge — encrypt notional via iExec Nox, set trigger, counterparty, duration |
| `/position/[id]` | Position detail — deposit, settle, claim, AI risk card, auditor access |

## Key Components

| Component | Description |
|---|---|
| `RiskScore.tsx` | Calls `/api/risk-score` on mount → ChainGPT AI 2-sentence live risk analysis |
| `AutoDepositDemo.tsx` | One-click seller deposit demo (mint + approve + deposit) using Hardhat #0 — no MetaMask switch needed |
| `SettlementPanel.tsx` | Gated settlement (requires deposit first) + 3-state claim button |
| `DepositNotionalPanel.tsx` | Seller USDC approval + deposit flow with mint shortcut |
| `CreateCDSForm.tsx` | Nox encryption + CDS creation with gas-compatible writes |
| `PriceFeed.tsx` | Live Chainlink ETH/USD ticker polling every 30s |

## Running Locally

```bash
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID + CHAINGPT_API_KEY
npm run dev
```

Open http://localhost:3000. Switch MetaMask to **Arbitrum Sepolia** (chainId 421614).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect Cloud project ID for RainbowKit |
| `CHAINGPT_API_KEY` | ✅ | ChainGPT B2B API key — server-side only, never sent to browser |
| `NEXT_PUBLIC_ALCHEMY_ID` | Optional | Alchemy RPC key (falls back to public endpoint) |

## Tech Stack

- **Next.js 15** App Router
- **wagmi v2** + **viem v2** — type-safe contract reads/writes
- **RainbowKit** — wallet connection modal
- **Tailwind CSS** — dark-mode-first styling
- **ChainGPT AI API** — server-side risk analysis (via `/app/api/risk-score/route.ts`)

## Gas Note

All on-chain writes use `getGasPrice()` × 1.5 as a legacy `gasPrice` field. Arbitrum Sepolia's MetaMask rejects EIP-1559 `maxFeePerGas` parameters; the legacy format is fully accepted and avoids all gas-related MetaMask errors.

## Deployment

Deployed to Vercel. The `CHAINGPT_API_KEY` is stored as a Vercel environment variable — it is never bundled into client-side JavaScript.

```powershell
# From the repo root (c:\Users\vergio\Dev\deployer):
$env:VERCEL_ORG_ID = "team_hYDbqeLCgKDqHNp5SsSLvZPm"
$env:VERCEL_PROJECT_ID = "prj_uymrUJthxXTFH4NzGaF50YY1PjG5"
vercel --prod
```

See the [root README](../README.md) for the full protocol documentation.
