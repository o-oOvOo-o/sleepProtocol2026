// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * @title ISleepPool
 * @dev Interface for Sleep Protocol's custom AMM pools with built-in tax system
 */
interface ISleepPool {
    
    // =================================================================================================
    //                                      EVENTS                                            
    // =================================================================================================
    
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to,
        uint256 taxAmount,
        uint256 stage
    );
    
    event TaxCollected(
        address indexed from,
        uint256 amount,
        uint256 stage,
        bool isBuy
    );
    
    event TaxExemptionUpdated(
        address indexed account,
        bool isExempt
    );
    
    event GenesisTimestampSet(
        uint256 timestamp
    );
    
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );
    
    // =================================================================================================
    //                                      STRUCTS                                            
    // =================================================================================================
    
    struct PoolInfo {
        address token0;
        address token1;
        uint112 reserve0;
        uint112 reserve1;
        uint32 blockTimestampLast;
        uint256 genesisTimestamp;
        address treasury;
        bool taxEnabled;
    }
    
    struct TaxInfo {
        uint256 currentBuyTax;
        uint256 currentSellTax;
        uint256 stage;
        uint256 daysInStage;
        uint256 daysUntilNext;
    }
    
    // =================================================================================================
    //                                      FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Get current pool information
     */
    function getPoolInfo() external view returns (PoolInfo memory);
    
    /**
     * @dev Get current tax information
     */
    function getTaxInfo() external view returns (TaxInfo memory);
    
    /**
     * @dev Check if address is exempt from taxes
     */
    function isExemptFromTax(address account) external view returns (bool);
    
    /**
     * @dev Calculate tax amount for a trade
     * @param amount Trade amount
     * @param isBuy Whether this is a buy (true) or sell (false) trade
     * @param trader Trader address
     * @return taxAmount Calculated tax amount
     * @return netAmount Net amount after tax
     */
    function calculateTax(
        uint256 amount,
        bool isBuy,
        address trader
    ) external view returns (uint256 taxAmount, uint256 netAmount);
    
    /**
     * @dev Swap tokens with built-in tax calculation
     * @param amount0Out Amount of token0 to receive
     * @param amount1Out Amount of token1 to receive  
     * @param to Recipient address
     * @param data Callback data
     */
    function swap(
        uint amount0Out,
        uint amount1Out,
        address to,
        bytes calldata data
    ) external;
    
    /**
     * @dev Add liquidity (tax-exempt)
     * @param to Recipient of LP tokens
     * @return liquidity Amount of LP tokens minted
     */
    function mint(address to) external returns (uint liquidity);
    
    /**
     * @dev Remove liquidity (tax-exempt)
     * @param to Recipient of underlying tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function burn(address to) external returns (uint amount0, uint amount1);
    
    // =================================================================================================
    //                                      ADMIN FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Set tax exemption status for an address
     * @param account Address to update
     * @param isExempt Exemption status
     */
    function setTaxExemption(address account, bool isExempt) external;
    
    /**
     * @dev Set treasury address for tax collection
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external;
    
    /**
     * @dev Set genesis timestamp (only before first trade)
     * @param timestamp Genesis timestamp
     */
    function setGenesisTimestamp(uint256 timestamp) external;
    
    /**
     * @dev Enable or disable tax system
     * @param enabled Tax system status
     */
    function setTaxEnabled(bool enabled) external;
}




