# Hackathon Projects Hub

Local workspace for all hackathon deployments. Each project lives in its own subfolder.

---

## Projects

### `parry/` — Parry Protocol
Autonomous delta-neutral IL protection agent on X Layer (OKX Build-X Hackathon, April 2026).

| | |
|---|---|
| GitHub | https://github.com/Gideon145/parry-protocol |
| Frontend | https://frontend-mu-three-93.vercel.app |
| Agent API | https://parry-protocol-production.up.railway.app/status |
| OnchainOS Proof | https://parry-protocol-production.up.railway.app/onchainos-proof |
| MCP Server | https://ample-wisdom-production-f4c9.up.railway.app/tools |
| x402 Server | https://radiant-recreation-production-f473.up.railway.app/payment-info |
| Agent Wallet | 0x94A4365E6B7E79791258A3Fa071824BC2b75a394 (X Layer Testnet) |
| ParryVault | 0x57C7f2F3051928E2cc7C871Bac590bF1d4BF4c8e |
| ProtectionCert NFT | 0x87E3D9fcfA4eff229A65d045A7C741E49b581187 |

**Quick checks:**
```powershell
# Is the agent live?
Invoke-RestMethod "https://parry-protocol-production.up.railway.app/status" | Select-Object demoMode, onChainTxCount, chainId, iteration

# How many on-chain TXs?
(Invoke-RestMethod "https://parry-protocol-production.up.railway.app/status").onChainTxCount

# Are all 3 OnchainOS skills showing?
(Invoke-RestMethod "https://parry-protocol-production.up.railway.app/onchainos-proof").calls | Select-Object -ExpandProperty skill | Sort-Object -Unique
```

**Deploy:**
```powershell
cd parry/frontend; vercel --prod --yes
cd parry; git add -A; git commit -m "msg"; git push origin master
```

---

### `veil/` — Veil Protocol
*(Next project — add details here)*

---

## Notes
- `parry/` has its own `.git` pointing to `github.com/Gideon145/parry-protocol` — push from inside `parry/`
- `veil/` is tracked by this repo's `.git` — push from the root `deployer/` folder

