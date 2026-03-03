// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./libraries/TaxCalculator.sol";

/**
 * @title SleepV4TaxHook
 * @dev Uniswap V4 Hook for implementing Sleep Protocol's dynamic tax system
 *      This hook intercepts swaps and applies taxes while returning proceeds to LPs
 */
contract SleepV4TaxHook {
    using TaxCalculator for uint256;
    
    // =================================================================================================
    //                                      CONSTANTS                                            
    // =================================================================================================
    
    // Hook permissions - we need beforeSwap and afterSwap
    uint160 public constant HOOKS_MASK = 
        (1 << 159) | // beforeSwap
        (1 << 158);  // afterSwap
    
    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================
    
    address public immutable poolManager;
    address public immutable sleepToken;
    address public immutable okbToken;
    
    uint256 public genesisTimestamp;
    address public treasury;
    bool public taxEnabled = true;
    
    mapping(address => bool) public taxExempt;
    mapping(bytes32 => uint256) public poolTaxCollected; // poolId => total tax collected
    
    // =================================================================================================
    //                                      EVENTS                                            
    // =================================================================================================
    
    event TaxCollected(
        bytes32 indexed poolId,
        address indexed trader,
        uint256 taxAmount,
        bool isBuy,
        uint256 stage
    );
    
    event TaxDistributedToLPs(
        bytes32 indexed poolId,
        uint256 amount
    );
    
    // =================================================================================================
    //                                      CONSTRUCTOR                                            
    // =================================================================================================
    
    constructor(
        address _poolManager,
        address _sleepToken,
        address _okbToken,
        address _treasury
    ) {
        poolManager = _poolManager;
        sleepToken = _sleepToken;
        okbToken = _okbToken;
        treasury = _treasury;
        genesisTimestamp = block.timestamp;
        
        // Set initial tax exemptions
        taxExempt[_treasury] = true;
        taxExempt[address(this)] = true;
    }
    
    // =================================================================================================
    //                                      HOOK FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Called before each swap to calculate and collect taxes
     */
    function beforeSwap(
        address sender,
        bytes32 poolId,
        bool zeroForOne, // true if swapping token0 for token1
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata hookData
    ) external returns (bytes4, int256) {
        require(msg.sender == poolManager, "SleepV4TaxHook: Only pool manager");
        
        // Skip tax calculation if disabled or sender is exempt
        if (!taxEnabled || taxExempt[sender]) {
            return (this.beforeSwap.selector, 0);
        }
        
        // Calculate tax based on swap direction and amount
        uint256 taxAmount = _calculateSwapTax(amountSpecified, zeroForOne, sender);
        
        if (taxAmount > 0) {
            // Store tax amount for afterSwap processing
            // In a real implementation, you'd use transient storage or other mechanisms
            poolTaxCollected[poolId] += taxAmount;
            
            TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
            bool isBuy = zeroForOne; // Simplified logic
            
            emit TaxCollected(poolId, sender, taxAmount, isBuy, rates.stage);
        }
        
        return (this.beforeSwap.selector, int256(taxAmount));
    }
    
    /**
     * @dev Called after each swap to distribute collected taxes to LPs
     */
    function afterSwap(
        address sender,
        bytes32 poolId,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata hookData
    ) external returns (bytes4, int256) {
        require(msg.sender == poolManager, "SleepV4TaxHook: Only pool manager");
        
        // Distribute collected taxes back to LPs as rewards
        uint256 taxCollected = poolTaxCollected[poolId];
        if (taxCollected > 0) {
            poolTaxCollected[poolId] = 0; // Reset
            
            // V4中的LP奖励分配机制：
            // 1. 税收不是分给NFT持有者，而是增加到池子的fee growth中
            // 2. LP通过modifyLiquidity时自动获得累积的费用
            // 3. 使用ERC-6909管理各种代币余额
            
            // 实际实现中，我们会：
            // - 将税收添加到池子的feeGrowthGlobal中
            // - LP在下次操作时自动获得比例分成
            // - 通过PoolManager的ERC-6909接口管理余额
            
            emit TaxDistributedToLPs(poolId, taxCollected);
        }
        
        return (this.afterSwap.selector, 0);
    }
    
    // =================================================================================================
    //                                      VIEW FUNCTIONS                                            
    // =================================================================================================
    
    function getTaxInfo() external view returns (
        uint256 currentBuyTax,
        uint256 currentSellTax,
        uint256 stage,
        uint256 daysInStage,
        uint256 daysUntilNext
    ) {
        TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
        (stage, daysInStage, daysUntilNext) = TaxCalculator.getTaxStageInfo(genesisTimestamp);
        
        currentBuyTax = rates.buyTax;
        currentSellTax = rates.sellTax;
    }
    
    function calculateTaxForSwap(
        int256 amountSpecified,
        bool zeroForOne,
        address trader
    ) external view returns (uint256 taxAmount) {
        if (!taxEnabled || taxExempt[trader]) {
            return 0;
        }
        
        return _calculateSwapTax(amountSpecified, zeroForOne, trader);
    }
    
    // =================================================================================================
    //                                      ADMIN FUNCTIONS                                            
    // =================================================================================================
    
    function setTaxExemption(address account, bool isExempt) external {
        // In production, add proper access control
        taxExempt[account] = isExempt;
    }
    
    function setTaxEnabled(bool enabled) external {
        // In production, add proper access control
        taxEnabled = enabled;
    }
    
    function setTreasury(address newTreasury) external {
        // In production, add proper access control
        require(newTreasury != address(0), "Invalid treasury");
        
        taxExempt[treasury] = false;
        treasury = newTreasury;
        taxExempt[newTreasury] = true;
    }
    
    // =================================================================================================
    //                                      INTERNAL FUNCTIONS                                            
    // =================================================================================================
    
    function _calculateSwapTax(
        int256 amountSpecified,
        bool zeroForOne,
        address trader
    ) internal view returns (uint256 taxAmount) {
        if (!taxEnabled || taxExempt[trader]) {
            return 0;
        }
        
        // Convert to positive amount
        uint256 amount = amountSpecified < 0 ? uint256(-amountSpecified) : uint256(amountSpecified);
        
        TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
        
        // Determine if this is a buy or sell
        // zeroForOne = true means swapping token0 (SLEEP) for token1 (OKB) = SELL
        // zeroForOne = false means swapping token1 (OKB) for token0 (SLEEP) = BUY
        bool isBuy = !zeroForOne;
        uint256 taxRate = isBuy ? rates.buyTax : rates.sellTax;
        
        if (taxRate > 0) {
            taxAmount = TaxCalculator.calculateTaxAmount(amount, taxRate);
        }
    }
    
    // =================================================================================================
    //                                      HOOK VALIDATION                                            
    // =================================================================================================
    
    function getHookPermissions() external pure returns (uint160) {
        return HOOKS_MASK;
    }
    
    // Required hook functions (can be empty if not used)
    function beforeInitialize(
        address sender,
        bytes32 poolId,
        uint160 sqrtPriceX96,
        bytes calldata hookData
    ) external pure returns (bytes4) {
        return this.beforeInitialize.selector;
    }
    
    function afterInitialize(
        address sender,
        bytes32 poolId,
        uint160 sqrtPriceX96,
        int24 tick,
        bytes calldata hookData
    ) external pure returns (bytes4) {
        return this.afterInitialize.selector;
    }
    
    function beforeAddLiquidity(
        address sender,
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidityDelta,
        bytes calldata hookData
    ) external pure returns (bytes4) {
        return this.beforeAddLiquidity.selector;
    }
    
    function afterAddLiquidity(
        address sender,
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidityDelta,
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata hookData
    ) external pure returns (bytes4) {
        return this.afterAddLiquidity.selector;
    }
    
    function beforeRemoveLiquidity(
        address sender,
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidityDelta,
        bytes calldata hookData
    ) external pure returns (bytes4) {
        return this.beforeRemoveLiquidity.selector;
    }
    
    function afterRemoveLiquidity(
        address sender,
        bytes32 poolId,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidityDelta,
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata hookData
    ) external pure returns (bytes4) {
        return this.afterRemoveLiquidity.selector;
    }
}
