// SPDX-License-Identifier: MIT
// Copyright (c) 2026 VEIL Protocol. All rights reserved.
// VEIL — Hedge Privately. Settle Trustlessly.
// https://github.com/Gideon145/veil
//
// This software is proprietary. Reproduction, modification or redistribution
// without express written permission from the VEIL authors is prohibited.
pragma solidity ^0.8.27;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title ConfidentialCDS
 * @notice World's first confidential Credit Default Swap on-chain.
 *
 * A CDS is an insurance contract: the buyer pays periodic premiums to the seller.
 * If the reference asset price drops below the trigger price (credit event),
 * the seller pays the full notional to the buyer.
 *
 * What stays private (encrypted euint256 handles):
 *   - notional: the payout amount owed by seller on default
 *   - premiumBalance: accumulated premiums held in escrow
 *
 * What is public (justification: in TradFi, trigger conditions are public contract terms):
 *   - triggerPrice: the ETH/USD strike at which a credit event fires
 *   - buyer / seller addresses
 *   - status / timestamps
 *
 * Chainlink ETH/USD feed on Arbitrum Sepolia:
 *   0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165
 *
 * Regulator address can be granted ACL access to read encrypted values
 * via grantAuditorAccess(), demonstrating selective disclosure.
 */
contract ConfidentialCDS is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Types ============

    enum CDSStatus {
        Active,
        Settled,
        Expired,
        Cancelled
    }

    struct CDSContract {
        address buyer;
        address seller;
        // Encrypted notional: amount seller must pay on credit event
        euint256 notional;
        // Encrypted premium balance escrowed in this contract
        euint256 premiumBalance;
        // Public terms
        uint256 triggerPrice;      // 8-decimal Chainlink price (e.g. 2000_00000000 = $2000)
        uint256 maturityTimestamp; // Unix timestamp when contract expires
        uint256 nextPremiumDue;    // Unix timestamp when next premium payment is due
        uint256 premiumInterval;   // Seconds between premium payments
        CDSStatus status;
        bool notionalDeposited;    // True once seller has deposited the notional USDC
    }

    // ============ State ============

    AggregatorV3Interface public immutable priceFeed;
    IERC20 public immutable usdc;

    uint256 public nextCDSId;
    mapping(uint256 => CDSContract) public contracts;

    // Auditor/regulator access registry
    mapping(uint256 => mapping(address => bool)) public auditorAccess;

    // ============ Events ============

    event CDSCreated(
        uint256 indexed cdsId,
        address indexed buyer,
        address indexed seller,
        uint256 triggerPrice,
        uint256 maturityTimestamp
    );

    event NotionalDeposited(uint256 indexed cdsId);

    event PremiumPaid(uint256 indexed cdsId, uint256 timestamp);

    event CreditEventFired(
        uint256 indexed cdsId,
        int256 oraclePrice,
        uint256 triggerPrice
    );

    event PayoutClaimed(uint256 indexed cdsId, address indexed buyer);

    event ContractExpired(uint256 indexed cdsId);

    event AuditorAccessGranted(uint256 indexed cdsId, address indexed auditor);

    // ============ Errors ============

    error NotBuyer();
    error NotSeller();
    error NotActive();
    error NotSettled();
    error NotExpired();
    error AlreadyDeposited();
    error PremiumNotDue();
    error CreditEventNotTriggered();
    error MaturityNotReached();
    error InvalidPrice();
    error InvalidDuration();
    error SameBuyerAndSeller();

    // ============ Constructor ============

    constructor(address _priceFeed, address _usdc) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        usdc = IERC20(_usdc);
    }

    // ============ Core Functions ============

    /**
     * @notice Buyer creates a new CDS contract.
     * @param notionalHandle    Encrypted notional amount (euint256 handle from Nox JS SDK)
     * @param notionalProof     Proof validating the encrypted notional
     * @param triggerPrice      Public ETH/USD strike price in 8-decimal Chainlink format
     * @param durationDays      Duration in days until maturity
     * @param premiumIntervalSeconds  Seconds between premium payments (e.g. 86400 = daily)
     * @param seller            Address of the protection seller
     */
    function createCDS(
        externalEuint256 notionalHandle,
        bytes calldata notionalProof,
        uint256 triggerPrice,
        uint256 durationDays,
        uint256 premiumIntervalSeconds,
        address seller
    ) external returns (uint256 cdsId) {
        if (durationDays == 0 || durationDays > 3650) revert InvalidDuration();

        euint256 notional = Nox.fromExternal(notionalHandle, notionalProof);

        cdsId = nextCDSId++;

        CDSContract storage cds = contracts[cdsId];
        cds.buyer = msg.sender;
        cds.seller = seller;
        cds.notional = notional;
        cds.premiumBalance = Nox.toEuint256(0);
        cds.triggerPrice = triggerPrice;
        cds.maturityTimestamp = block.timestamp + (durationDays * 1 days);
        cds.premiumInterval = premiumIntervalSeconds;
        cds.nextPremiumDue = block.timestamp + premiumIntervalSeconds;
        cds.status = CDSStatus.Active;
        cds.notionalDeposited = false;

        // Grant ACL so buyer + contract can use the notional handle
        Nox.allowThis(notional);
        Nox.allow(notional, msg.sender);
        Nox.allow(notional, seller);

        // Grant ACL so contract can use premiumBalance handle
        Nox.allowThis(cds.premiumBalance);

        emit CDSCreated(cdsId, msg.sender, seller, triggerPrice, cds.maturityTimestamp);
    }

    /**
     * @notice Seller deposits the notional USDC into escrow to activate the contract.
     * The seller must first approve this contract for the notional amount off-chain.
     * For testnet demo: the notional USDC amount is the decrypted value transferred here.
     * @param cdsId     The CDS contract ID
     * @param amount    The USDC amount to escrow as notional (must match encrypted notional)
     */
    function depositNotional(uint256 cdsId, uint256 amount) external nonReentrant {
        CDSContract storage cds = contracts[cdsId];
        if (msg.sender != cds.seller) revert NotSeller();
        if (cds.status != CDSStatus.Active) revert NotActive();
        if (cds.notionalDeposited) revert AlreadyDeposited();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        cds.notionalDeposited = true;

        emit NotionalDeposited(cdsId);
    }

    /**
     * @notice Buyer pays a periodic premium to the seller (encrypted amount).
     * The actual USDC transfer uses the encrypted premium handle.
     * For demo: buyer also transfers a plaintext USDC amount that gets added to escrow.
     * @param cdsId             The CDS contract ID
     * @param premiumHandle     Encrypted premium amount handle
     * @param premiumProof      Proof for the premium handle
     * @param plainAmount       Plaintext USDC amount to transfer (mirrors the encrypted value)
     */
    function payPremium(
        uint256 cdsId,
        externalEuint256 premiumHandle,
        bytes calldata premiumProof,
        uint256 plainAmount
    ) external nonReentrant {
        CDSContract storage cds = contracts[cdsId];
        if (msg.sender != cds.buyer) revert NotBuyer();
        if (cds.status != CDSStatus.Active) revert NotActive();
        if (block.timestamp < cds.nextPremiumDue) revert PremiumNotDue();

        // Transfer plaintext USDC to seller (represents the premium)
        usdc.safeTransferFrom(msg.sender, cds.seller, plainAmount);

        // Accumulate encrypted premium in the contract state for audit trail
        euint256 premium = Nox.fromExternal(premiumHandle, premiumProof);
        (,euint256 newPremiumBalance) = Nox.safeAdd(cds.premiumBalance, premium);
        cds.premiumBalance = newPremiumBalance;

        // Maintain ACL on updated handle
        Nox.allowThis(cds.premiumBalance);
        Nox.allow(cds.premiumBalance, cds.buyer);
        Nox.allow(cds.premiumBalance, cds.seller);

        cds.nextPremiumDue = block.timestamp + cds.premiumInterval;

        emit PremiumPaid(cdsId, block.timestamp);
    }

    /**
     * @notice Checks Chainlink oracle and settles if a credit event has occurred.
     * Anyone can call this — trustless settlement trigger.
     * If ETH/USD <= triggerPrice, status becomes Settled and buyer can claim notional.
     */
    function checkAndSettle(uint256 cdsId) external {
        CDSContract storage cds = contracts[cdsId];
        if (cds.status != CDSStatus.Active) revert NotActive();

        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        if (price <= 0) revert InvalidPrice();
        // Reject stale oracle data (older than 2 hours)
        if (block.timestamp - updatedAt > 2 hours) revert InvalidPrice();

        if (uint256(price) <= cds.triggerPrice) {
            cds.status = CDSStatus.Settled;
            emit CreditEventFired(cdsId, price, cds.triggerPrice);
        }
    }

    /**
     * @notice After a credit event, buyer claims the escrowed notional USDC.
     * The buyer receives the full USDC balance held as notional.
     */
    function claimPayout(uint256 cdsId) external nonReentrant {
        CDSContract storage cds = contracts[cdsId];
        if (msg.sender != cds.buyer) revert NotBuyer();
        if (cds.status != CDSStatus.Settled) revert NotSettled();
        if (!cds.notionalDeposited) revert CreditEventNotTriggered();

        // Transfer full USDC escrow balance to buyer
        uint256 balance = usdc.balanceOf(address(this));
        usdc.safeTransfer(cds.buyer, balance);

        emit PayoutClaimed(cdsId, cds.buyer);
    }

    /**
     * @notice Expire a matured contract, returning escrowed notional to seller.
     * Only callable after maturityTimestamp if no credit event occurred.
     */
    function expireContract(uint256 cdsId) external nonReentrant {
        CDSContract storage cds = contracts[cdsId];
        if (cds.status != CDSStatus.Active) revert NotActive();
        if (block.timestamp < cds.maturityTimestamp) revert MaturityNotReached();

        cds.status = CDSStatus.Expired;

        if (cds.notionalDeposited) {
            uint256 balance = usdc.balanceOf(address(this));
            usdc.safeTransfer(cds.seller, balance);
        }

        emit ContractExpired(cdsId);
    }

    // ============ Selective Disclosure ============

    /**
     * @notice Buyer grants a regulator/auditor ACL access to read encrypted handles.
     * This is the selective disclosure pattern: privacy preserved by default,
     * verifiable on demand.
     */
    function grantAuditorAccess(uint256 cdsId, address auditor) external {
        CDSContract storage cds = contracts[cdsId];
        if (msg.sender != cds.buyer && msg.sender != cds.seller) revert NotBuyer();

        auditorAccess[cdsId][auditor] = true;

        // Grant Nox ACL so auditor can decrypt the encrypted handles
        Nox.allow(cds.notional, auditor);
        Nox.allow(cds.premiumBalance, auditor);

        emit AuditorAccessGranted(cdsId, auditor);
    }

    // ============ View Functions ============

    /**
     * @notice Returns public state of a CDS contract.
     */
    function getCDS(uint256 cdsId) external view returns (
        address buyer,
        address seller,
        uint256 triggerPrice,
        uint256 maturityTimestamp,
        uint256 nextPremiumDue,
        CDSStatus status,
        bool notionalDeposited,
        bytes32 notionalHandle,
        bytes32 premiumBalanceHandle
    ) {
        CDSContract storage cds = contracts[cdsId];
        return (
            cds.buyer,
            cds.seller,
            cds.triggerPrice,
            cds.maturityTimestamp,
            cds.nextPremiumDue,
            cds.status,
            cds.notionalDeposited,
            euint256.unwrap(cds.notional),   // handle — opaque bytes32 on-chain
            euint256.unwrap(cds.premiumBalance)
        );
    }

    /**
     * @notice Returns the latest ETH/USD price from Chainlink.
     */
    function getLatestPrice() external view returns (int256 price, uint256 updatedAt) {
        (, price, , updatedAt, ) = priceFeed.latestRoundData();
    }

    /**
     * @notice Returns total number of CDS contracts created.
     */
    function totalContracts() external view returns (uint256) {
        return nextCDSId;
    }
}
