// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Testnet USDC used as the underlying asset for cUSDC (ERC-7984) wrapping.
 * Mints 1,000,000 USDC to deployer on construction.
 */
contract MockUSDC is ERC20 {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("Mock USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @notice Public mint for testnet demos — lets any address get USDC
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
