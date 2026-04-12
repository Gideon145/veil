export const CDS_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_priceFeed", "type": "address"}, {"internalType": "address", "name": "_usdc", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "notionalHandle", "type": "bytes32"},
      {"internalType": "bytes", "name": "notionalProof", "type": "bytes"},
      {"internalType": "uint256", "name": "triggerPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "durationDays", "type": "uint256"},
      {"internalType": "uint256", "name": "premiumIntervalSeconds", "type": "uint256"},
      {"internalType": "address", "name": "seller", "type": "address"}
    ],
    "name": "createCDS",
    "outputs": [{"internalType": "uint256", "name": "cdsId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "cdsId", "type": "uint256"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "depositNotional",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "cdsId", "type": "uint256"},
      {"internalType": "bytes32", "name": "premiumHandle", "type": "bytes32"},
      {"internalType": "bytes", "name": "premiumProof", "type": "bytes"},
      {"internalType": "uint256", "name": "plainAmount", "type": "uint256"}
    ],
    "name": "payPremium",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "cdsId", "type": "uint256"}],
    "name": "checkAndSettle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "cdsId", "type": "uint256"}],
    "name": "claimPayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "cdsId", "type": "uint256"}],
    "name": "expireContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "cdsId", "type": "uint256"}, {"internalType": "address", "name": "auditor", "type": "address"}],
    "name": "grantAuditorAccess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "cdsId", "type": "uint256"}],
    "name": "getCDS",
    "outputs": [
      {"internalType": "address", "name": "buyer", "type": "address"},
      {"internalType": "address", "name": "seller", "type": "address"},
      {"internalType": "uint256", "name": "triggerPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "maturityTimestamp", "type": "uint256"},
      {"internalType": "uint256", "name": "nextPremiumDue", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "bool", "name": "notionalDeposited", "type": "bool"},
      {"internalType": "bytes32", "name": "notionalHandle", "type": "bytes32"},
      {"internalType": "bytes32", "name": "premiumBalanceHandle", "type": "bytes32"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLatestPrice",
    "outputs": [
      {"internalType": "int256", "name": "price", "type": "int256"},
      {"internalType": "uint256", "name": "updatedAt", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalContracts",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "cdsId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "seller", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "triggerPrice", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "maturityTimestamp", "type": "uint256"}
    ],
    "name": "CDSCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "cdsId", "type": "uint256"},
      {"indexed": false, "internalType": "int256", "name": "oraclePrice", "type": "int256"},
      {"indexed": false, "internalType": "uint256", "name": "triggerPrice", "type": "uint256"}
    ],
    "name": "CreditEventFired",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{"indexed": true, "internalType": "uint256", "name": "cdsId", "type": "uint256"}],
    "name": "NotionalDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "cdsId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "auditor", "type": "address"}
    ],
    "name": "AuditorAccessGranted",
    "type": "event"
  }
] as const;

export const USDC_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
