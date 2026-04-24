// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

/**
 * @title ConfidentialUSDC
 * @notice Confidential ERC-7984 wrapper for MockUSDC.
 *
 * Wraps plain USDC (1:1) into cUSDC with hidden balances via iExec Nox TEE.
 * Used by ConfidentialCDS to escrow notional amounts with full end-to-end privacy:
 * the deposit amount, payout amount, and running balance are all encrypted on-chain.
 *
 * Flow for deposit:
 *   1. Seller mints / acquires MockUSDC.
 *   2. Seller approves this contract for the notional amount.
 *   3. Seller calls wrap(seller, amount) → receives cUSDC in their confidential balance.
 *   4. Seller calls setOperator(cdsAddress, uint48.max) → authorises the CDS contract.
 *   5. Seller calls cds.depositNotional(cdsId, handle, proof) → CDS pulls cUSDC via
 *      confidentialTransferFrom and stores the encrypted escrow handle.
 */
contract ConfidentialUSDC is ERC20ToERC7984Wrapper {
    constructor(address underlyingUSDC)
        ERC7984("Confidential USDC", "cUSDC", "")
        ERC20ToERC7984Wrapper(IERC20(underlyingUSDC))
    {}
}
