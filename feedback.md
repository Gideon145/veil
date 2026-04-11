# Hackathon Feedback — VEIL Protocol (Confidential On-Chain Hedging)

## Project Summary

**VEIL** is the world's first on-chain confidential hedge protocol, built on iExec Nox on Arbitrum Sepolia.

Anyone can set a price floor for ETH. If the market crashes below it, they get paid automatically. The critical difference: the position size (notional amount) is fully encrypted on-chain using iExec Nox TEE — nobody on the blockchain can see how much they hedged.

---

## What iExec Nox Enabled

Before Nox, confidential on-chain finance was impossible — you could either have privacy (centralised, off-chain) or trustless execution (on-chain, fully public). Nox bridges this gap.

**Specific use of Nox in VEIL:**

1. **`Nox.fromExternal(externalEuint256)`** — accepts a client-side encrypted euint256 (the notional) and converts it into an on-chain encrypted handle.
2. **`Nox.toEuint256(handle)`** — unwraps the stored handle for arithmetic inside the contract.
3. **`Nox.safeAdd()` / `Nox.safeSub()`** — accumulates encrypted premium payments directly on encrypted balances.
4. **`Nox.allow(notional, buyer)` + `Nox.allow(notional, seller)`** — grants ACL so only the two counterparties can decrypt the notional.
5. **`Nox.allowThis()`** — grants the contract itself access for settlement arithmetic.
6. **`@iexec-nox/handle` TypeScript SDK** — used in the frontend (`CreateCDSForm.tsx`) to encrypt the notional client-side before the `createCDS` transaction is submitted.

---

## What Worked Well

- The Nox ACL model (`allow` / `allowThis`) is a clean fit for two-party financial contracts. We didn't need any custom permission logic — it mapped naturally.
- `fromExternal()` made client-side encryption straightforward: encrypt in JS, pass the handle to the contract, done.
- The Nox library composes cleanly with OpenZeppelin (ReentrancyGuard, SafeERC20) and Chainlink oracle patterns.
- Hardhat compilation with the Nox Solidity library worked first-try once we pinned `hardhat@^2.22` + `hardhat-toolbox@^4`.

---

## What Was Challenging

- **Documentation gaps:** The `@iexec-nox/handle` SDK is at `0.1.0-beta.10`. Some of the TypeScript types (`NoxHandleClient`, `encrypt()` method signature) required reading the package source directly since docs are incomplete.
- **Testnet faucets:** Getting RLC on Arbitrum Sepolia required the iExec faucet, which is separate from the ETH faucet. Documentation on which testnet is recommended for Nox (iExec-native chain vs Arbitrum Sepolia) could be clearer.
- **`externalEuint256` type:** Understanding how the encrypted ciphertext from the JS SDK maps to the Solidity `externalEuint256` type took some exploration. A clear ABI-encoding example in the docs would help.

---

## Suggestions for iExec / Nox

1. **End-to-end code sample:** A minimal Hardhat + Next.js + Nox example showing the full encrypt-in-browser → pass-to-contract → decrypt flow would dramatically reduce onboarding time.
2. **Typed SDK:** Ship a fully typed `@iexec-nox/handle` (not beta) with JSDoc examples for `encrypt()`, `decrypt()`, and ACL grant patterns.
3. **Multi-party ACL helper:** A convenience function for common N-of-M party access patterns (buyer + seller + optional auditor) would reduce boilerplate.
4. **Stale handle handling:** Clear guidance on what happens if an encrypted handle is passed to a new contract after a TEE key rotation.

---

## Repository

GitHub: [github.com/Gideon145/ccds](https://github.com/Gideon145/ccds) *(to be pushed)*

Deployed on Arbitrum Sepolia — contract addresses in `deployments/arbitrumSepolia.json` after deployment.

---

*Built for the iExec Vibe Coding Challenge, April–May 2026.*
