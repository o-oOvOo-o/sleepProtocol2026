// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISleepPool.sol";
import "./libraries/TaxCalculator.sol";
import "./libraries/v4/TickMath.sol";
import "./libraries/v4/SqrtPriceMath.sol";
import "./libraries/v4/SafeCast.sol";

/**
 * @title SleepV4Pool
 * @dev Community liquidity pool based on Uniswap V4 concepts with concentrated liquidity
 *      This is our own implementation inspired by V4, with built-in tax system and LP rewards
 */
contract SleepV4Pool is ISleepPool, Ownable, ReentrancyGuard {
    using TaxCalculator for uint256;
    using SafeCast for uint256;
    
    // =================================================================================================
    //                                      CONSTANTS                                            
    // =================================================================================================
    
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    int24 public constant MIN_TICK = -887272;
    int24 public constant MAX_TICK = 887272;
    uint256 public constant Q96 = 2**96;
    
    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================
    
    // Pool tokens
    address public token0; // SLEEPING token
    address public token1; // OKB token
    address public factory; // Factory contract that created this pool
    
    // V4-style concentrated liquidity
    struct Position {
        uint128 liquidity;
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }
    
    struct Tick {
        uint128 liquidityGross;
        int128 liquidityNet;
        uint256 feeGrowthOutside0X128;
        uint256 feeGrowthOutside1X128;
        bool initialized;
    }
    
    // Pool state
    uint160 public sqrtPriceX96;
    int24 public tick;
    uint256 public feeGrowthGlobal0X128;
    uint256 public feeGrowthGlobal1X128;
    uint128 public liquidity;
    
    // Mappings
    mapping(int24 => Tick) public ticks;
    mapping(bytes32 => Position) public positions; // keccak256(abi.encodePacked(owner, tickLower, tickUpper))
    
    // Tax system
    uint256 public genesisTimestamp;
    address public treasury;
    bool public taxEnabled = true;
    mapping(address => bool) public taxExempt;
    
    // LP rewards from taxes
    uint256 public totalTaxCollected0;
    uint256 public totalTaxCollected1;
    uint256 public taxRewardPerLiquidity0;
    uint256 public taxRewardPerLiquidity1;
    
    // Fee configuration
    uint24 public fee = 3000; // 0.3% base fee
    int24 public tickSpacing = 60;
    
    // =================================================================================================
    //                                      EVENTS                                            
    // =================================================================================================
    
    event Initialize(uint160 sqrtPriceX96, int24 tick);
    event ModifyPosition(
        address indexed owner,
        int24 tickLower,
        int24 tickUpper,
        int128 liquidityDelta
    );
    event Swap(
        address indexed sender,
        address indexed recipient,
        int256 amount0,
        int256 amount1,
        uint160 sqrtPriceX96,
        uint128 liquidity,
        int24 tick,
        uint256 taxAmount
    );
    // TaxCollected event is inherited from ISleepPool interface
    event TaxRewardsDistributed(
        uint256 amount0,
        uint256 amount1,
        uint256 totalLiquidity
    );
    
    // =================================================================================================
    //                                      CONSTRUCTOR                                            
    // =================================================================================================
    
    constructor() {
        factory = msg.sender;
    }
    
    function initialize(
        address _token0,
        address _token1,
        address _treasury,
        uint160 _sqrtPriceX96
    ) external {
        require(msg.sender == factory, "SleepV4Pool: FORBIDDEN");
        require(_sqrtPriceX96 > 0, "SleepV4Pool: INVALID_PRICE");
        
        token0 = _token0;
        token1 = _token1;
        treasury = _treasury;
        genesisTimestamp = block.timestamp;
        sqrtPriceX96 = _sqrtPriceX96;
        tick = _getTickAtSqrtRatio(_sqrtPriceX96);
        
        // Treasury is exempt from taxes
        taxExempt[_treasury] = true;
        taxExempt[address(this)] = true;
        taxExempt[factory] = true;
        
        emit Initialize(_sqrtPriceX96, tick);
    }
    
    // =================================================================================================
    //                                      LIQUIDITY FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Add liquidity to a specific price range
     * @param recipient Address to receive the liquidity position
     * @param tickLower Lower tick of the position
     * @param tickUpper Upper tick of the position
     * @param amount Desired liquidity amount
     * @return amount0 Amount of token0 required
     * @return amount1 Amount of token1 required
     */
    function mint(
        address recipient,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(amount > 0, "SleepV4Pool: ZERO_LIQUIDITY");
        require(tickLower < tickUpper, "SleepV4Pool: INVALID_TICKS");
        require(tickLower >= MIN_TICK && tickUpper <= MAX_TICK, "SleepV4Pool: TICK_OUT_OF_BOUNDS");
        require(tickLower % tickSpacing == 0 && tickUpper % tickSpacing == 0, "SleepV4Pool: INVALID_TICK_SPACING");
        
        bytes32 positionKey = keccak256(abi.encodePacked(recipient, tickLower, tickUpper));
        Position storage position = positions[positionKey];
        
        // Calculate token amounts needed
        (amount0, amount1) = _getAmountsForLiquidity(tickLower, tickUpper, amount);
        
        // Update ticks
        _updateTick(tickLower, int128(amount), false);
        _updateTick(tickUpper, int128(amount), true);
        
        // Update position
        position.liquidity += amount;
        
        // Update global liquidity if position is in range
        if (tick >= tickLower && tick < tickUpper) {
            liquidity += amount;
        }
        
        // Collect tokens from user
        if (amount0 > 0) IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0) IERC20(token1).transferFrom(msg.sender, address(this), amount1);
        
        emit ModifyPosition(recipient, tickLower, tickUpper, int128(amount));
    }
    
    /**
     * @dev Remove liquidity from a position
     */
    function burn(
        int24 tickLower,
        int24 tickUpper,
        uint128 amount
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(amount > 0, "SleepV4Pool: ZERO_LIQUIDITY");
        
        bytes32 positionKey = keccak256(abi.encodePacked(msg.sender, tickLower, tickUpper));
        Position storage position = positions[positionKey];
        require(position.liquidity >= amount, "SleepV4Pool: INSUFFICIENT_LIQUIDITY");
        
        // Calculate token amounts to return
        (amount0, amount1) = _getAmountsForLiquidity(tickLower, tickUpper, amount);
        
        // Update ticks
        _updateTick(tickLower, -int128(amount), false);
        _updateTick(tickUpper, -int128(amount), true);
        
        // Update position
        position.liquidity -= amount;
        
        // Update global liquidity if position is in range
        if (tick >= tickLower && tick < tickUpper) {
            liquidity -= amount;
        }
        
        // Return tokens to user
        if (amount0 > 0) IERC20(token0).transfer(msg.sender, amount0);
        if (amount1 > 0) IERC20(token1).transfer(msg.sender, amount1);
        
        emit ModifyPosition(msg.sender, tickLower, tickUpper, -int128(amount));
    }
    
    // =================================================================================================
    //                                      SWAP FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Execute a swap with V4-style parameters
     * @param recipient Address to receive output tokens
     * @param zeroForOne Direction of swap (true = token0 for token1)
     * @param amountSpecified Amount to swap (positive = exact input, negative = exact output)
     * @param sqrtPriceLimitX96 Price limit for the swap
     * @return amount0 Delta of token0
     * @return amount1 Delta of token1
     */
    function swapV4(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    ) external nonReentrant returns (int256 amount0, int256 amount1) {
        require(amountSpecified != 0, "SleepV4Pool: ZERO_AMOUNT");
        require(liquidity > 0, "SleepV4Pool: NO_LIQUIDITY");
        
        // Calculate taxes using the same protocol tax system as V2
        uint256 taxAmount = 0;
        uint256 stage = 0;
        
        if (taxEnabled && !taxExempt[msg.sender]) {
            TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
            stage = rates.stage;
            
            bool isBuy = !zeroForOne; // Buying SLEEP (token0) with OKB (token1)
            uint256 taxRate = isBuy ? rates.buyTax : rates.sellTax;
            
            if (taxRate > 0) {
                uint256 inputAmount = amountSpecified > 0 ? uint256(amountSpecified) : uint256(-amountSpecified);
                taxAmount = TaxCalculator.calculateTaxAmount(inputAmount, taxRate);
            }
        }
        
        // Execute the swap
        (amount0, amount1) = _executeSwap(
            zeroForOne,
            amountSpecified,
            sqrtPriceLimitX96,
            taxAmount
        );
        
        // Handle token transfers
        if (zeroForOne) {
            // Selling token0 for token1
            if (amount0 > 0) IERC20(token0).transferFrom(msg.sender, address(this), uint256(amount0));
            if (amount1 < 0) IERC20(token1).transfer(recipient, uint256(-amount1));
        } else {
            // Buying token0 with token1
            if (amount1 > 0) IERC20(token1).transferFrom(msg.sender, address(this), uint256(amount1));
            if (amount0 < 0) IERC20(token0).transfer(recipient, uint256(-amount0));
        }
        
        // Now that tokens are in the contract, send the tax portion to the treasury
        if (taxAmount > 0) {
            address taxToken = zeroForOne ? token0 : token1;
            IERC20(taxToken).transfer(treasury, taxAmount);
            emit TaxCollected(msg.sender, taxAmount, stage, !zeroForOne);
        }
        
        emit Swap(msg.sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, taxAmount);
    }
    
    // Legacy V2-style swap for compatibility
    function swap(
        uint amount0Out,
        uint amount1Out,
        address to,
        bytes calldata data
    ) external override nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, 'SleepV4Pool: INSUFFICIENT_OUTPUT_AMOUNT');
        
        // Convert to V4-style parameters
        bool zeroForOne = amount1Out > 0;
        int256 amountSpecified = zeroForOne ? int256(amount0Out) : int256(amount1Out);
        uint160 sqrtPriceLimitX96 = zeroForOne ? 4295128740 : 1461446703485210103287273052203988822378723970341;
        
        // Execute V4-style swap (call the V4 swap function)
        this.swapV4(to, zeroForOne, amountSpecified, sqrtPriceLimitX96);
    }
    
    // =================================================================================================
    //                                      INTERNAL FUNCTIONS                                            
    // =================================================================================================
    
    function _executeSwap(
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        uint256 taxAmount
    ) internal returns (int256 amount0, int256 amount1) {
        require(liquidity > 0, "SleepV4Pool: NO_LIQUIDITY");
        
        // Validate price limit
        if (zeroForOne) {
            require(
                sqrtPriceLimitX96 < sqrtPriceX96 && sqrtPriceLimitX96 > TickMath.MIN_SQRT_PRICE,
                "SleepV4Pool: INVALID_PRICE_LIMIT"
            );
        } else {
            require(
                sqrtPriceLimitX96 > sqrtPriceX96 && sqrtPriceLimitX96 < TickMath.MAX_SQRT_PRICE,
                "SleepV4Pool: INVALID_PRICE_LIMIT"
            );
        }
        
        bool exactInput = amountSpecified > 0;
        uint256 inputAmount = exactInput ? uint256(amountSpecified) : uint256(-amountSpecified);
        uint256 inputAfterTax = inputAmount > taxAmount ? inputAmount - taxAmount : 0;
        
        if (inputAfterTax == 0) {
            return (0, 0);
        }
        
        // Execute the core swap logic
        uint160 sqrtPriceX96Next;
        uint256 amountIn;
        uint256 amountOut;
        
        if (exactInput) {
            // Calculate new price after input
            sqrtPriceX96Next = SqrtPriceMath.getNextSqrtPriceFromInput(
                sqrtPriceX96,
                liquidity,
                inputAfterTax,
                zeroForOne
            );
            
            // Ensure we don't exceed price limit
            if (zeroForOne) {
                if (sqrtPriceX96Next < sqrtPriceLimitX96) {
                    sqrtPriceX96Next = sqrtPriceLimitX96;
                }
            } else {
                if (sqrtPriceX96Next > sqrtPriceLimitX96) {
                    sqrtPriceX96Next = sqrtPriceLimitX96;
                }
            }
            
            amountIn = inputAfterTax;
            
            // Calculate output amount
            if (zeroForOne) {
                amountOut = SqrtPriceMath.getAmount1Delta(sqrtPriceX96, sqrtPriceX96Next, liquidity, false);
            } else {
                amountOut = SqrtPriceMath.getAmount0Delta(sqrtPriceX96Next, sqrtPriceX96, liquidity, false);
            }
        } else {
            // Exact output case
            uint256 desiredOutput = inputAfterTax;
            
            // Calculate new price for desired output
            sqrtPriceX96Next = SqrtPriceMath.getNextSqrtPriceFromOutput(
                sqrtPriceX96,
                liquidity,
                desiredOutput,
                zeroForOne
            );
            
            // Ensure we don't exceed price limit
            if (zeroForOne) {
                if (sqrtPriceX96Next < sqrtPriceLimitX96) {
                    sqrtPriceX96Next = sqrtPriceLimitX96;
                }
            } else {
                if (sqrtPriceX96Next > sqrtPriceLimitX96) {
                    sqrtPriceX96Next = sqrtPriceLimitX96;
                }
            }
            
            // Calculate actual amounts
            if (zeroForOne) {
                amountOut = SqrtPriceMath.getAmount1Delta(sqrtPriceX96, sqrtPriceX96Next, liquidity, false);
                amountIn = SqrtPriceMath.getAmount0Delta(sqrtPriceX96, sqrtPriceX96Next, liquidity, true);
            } else {
                amountOut = SqrtPriceMath.getAmount0Delta(sqrtPriceX96Next, sqrtPriceX96, liquidity, false);
                amountIn = SqrtPriceMath.getAmount1Delta(sqrtPriceX96, sqrtPriceX96Next, liquidity, true);
            }
        }
        
        // Apply protocol fee (0.3% by default)
        uint256 protocolFeeAmount = (amountIn * fee) / 1000000;
        
        // Update pool state
        sqrtPriceX96 = sqrtPriceX96Next;
        tick = TickMath.getTickAtSqrtPrice(sqrtPriceX96Next);
        
        // Update fee growth (simplified version)
        if (liquidity > 0) {
            if (zeroForOne) {
                feeGrowthGlobal0X128 += (protocolFeeAmount << 128) / liquidity;
            } else {
                feeGrowthGlobal1X128 += (protocolFeeAmount << 128) / liquidity;
            }
        }
        
        // Set return values
        if (zeroForOne) {
            amount0 = int256(amountIn + taxAmount);
            amount1 = -int256(amountOut);
        } else {
            amount1 = int256(amountIn + taxAmount);
            amount0 = -int256(amountOut);
        }
    }
    
    function _distributeTaxToLPs(uint256 taxAmount, bool zeroForOne) internal {
        if (liquidity == 0) return;
        
        // Distribute 50% of tax to LPs as rewards
        uint256 lpReward = taxAmount / 2;
        
        if (zeroForOne) {
            totalTaxCollected0 += lpReward;
            taxRewardPerLiquidity0 += (lpReward * Q96) / liquidity;
        } else {
            totalTaxCollected1 += lpReward;
            taxRewardPerLiquidity1 += (lpReward * Q96) / liquidity;
        }
        
        emit TaxRewardsDistributed(
            zeroForOne ? lpReward : 0,
            zeroForOne ? 0 : lpReward,
            liquidity
        );
    }
    
    function _updateTick(int24 tickIndex, int128 liquidityDelta, bool upper) internal {
        Tick storage tickInfo = ticks[tickIndex];
        
        uint128 liquidityGrossBefore = tickInfo.liquidityGross;
        uint128 liquidityGrossAfter = liquidityDelta < 0
            ? liquidityGrossBefore - uint128(-liquidityDelta)
            : liquidityGrossBefore + uint128(liquidityDelta);
        
        require(liquidityGrossAfter <= type(uint128).max, "SleepV4Pool: LIQUIDITY_OVERFLOW");
        
        tickInfo.liquidityGross = liquidityGrossAfter;
        tickInfo.liquidityNet = upper
            ? tickInfo.liquidityNet - liquidityDelta
            : tickInfo.liquidityNet + liquidityDelta;
        
        if (liquidityGrossBefore == 0 && liquidityGrossAfter > 0) {
            tickInfo.initialized = true;
        } else if (liquidityGrossBefore > 0 && liquidityGrossAfter == 0) {
            tickInfo.initialized = false;
        }
    }
    
    function _getAmountsForLiquidity(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidityAmount
    ) internal view returns (uint256 amount0, uint256 amount1) {
        uint160 sqrtRatioA = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtRatioB = TickMath.getSqrtPriceAtTick(tickUpper);
        
        if (tick < tickLower) {
            // Current price below range, need only token0
            amount0 = SqrtPriceMath.getAmount0Delta(sqrtRatioA, sqrtRatioB, liquidityAmount, true);
            amount1 = 0;
        } else if (tick >= tickUpper) {
            // Current price above range, need only token1
            amount0 = 0;
            amount1 = SqrtPriceMath.getAmount1Delta(sqrtRatioA, sqrtRatioB, liquidityAmount, true);
        } else {
            // Current price in range, need both tokens
            amount0 = SqrtPriceMath.getAmount0Delta(sqrtPriceX96, sqrtRatioB, liquidityAmount, true);
            amount1 = SqrtPriceMath.getAmount1Delta(sqrtRatioA, sqrtPriceX96, liquidityAmount, true);
        }
    }
    
    function _getTickAtSqrtRatio(uint160 _sqrtPriceX96) internal pure returns (int24) {
        return TickMath.getTickAtSqrtPrice(_sqrtPriceX96);
    }
    
    // =================================================================================================
    //                                      VIEW FUNCTIONS                                            
    // =================================================================================================
    
    function getPoolInfo() external view override returns (PoolInfo memory) {
        return PoolInfo({
            token0: token0,
            token1: token1,
            reserve0: uint112(IERC20(token0).balanceOf(address(this))),
            reserve1: uint112(IERC20(token1).balanceOf(address(this))),
            blockTimestampLast: uint32(block.timestamp),
            genesisTimestamp: genesisTimestamp,
            treasury: treasury,
            taxEnabled: taxEnabled
        });
    }
    
    function getTaxInfo() external view override returns (TaxInfo memory) {
        TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
        (uint256 stage, uint256 daysInStage, uint256 daysUntilNext) = TaxCalculator.getTaxStageInfo(genesisTimestamp);
        
        return TaxInfo({
            currentBuyTax: rates.buyTax,
            currentSellTax: rates.sellTax,
            stage: stage,
            daysInStage: daysInStage,
            daysUntilNext: daysUntilNext
        });
    }
    
    function calculateTax(
        uint256 amount,
        bool isBuy,
        address trader
    ) external view override returns (uint256 taxAmount, uint256 netAmount) {
        if (!taxEnabled || taxExempt[trader]) {
            return (0, amount);
        }
        
        TaxCalculator.TaxRates memory rates = TaxCalculator.getCurrentTaxRates(genesisTimestamp);
        uint256 taxRate = isBuy ? rates.buyTax : rates.sellTax;
        
        taxAmount = TaxCalculator.calculateTaxAmount(amount, taxRate);
        netAmount = TaxCalculator.calculateNetAmount(amount, taxAmount);
    }
    
    function isExemptFromTax(address account) external view override returns (bool) {
        return taxExempt[account];
    }
    
    /**
     * @dev Get position information
     */
    function getPosition(
        address owner,
        int24 tickLower,
        int24 tickUpper
    ) external view returns (
        uint128 liquidityAmount,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0,
        uint128 tokensOwed1
    ) {
        bytes32 positionKey = keccak256(abi.encodePacked(owner, tickLower, tickUpper));
        Position storage position = positions[positionKey];
        
        return (
            position.liquidity,
            position.feeGrowthInside0LastX128,
            position.feeGrowthInside1LastX128,
            position.tokensOwed0,
            position.tokensOwed1
        );
    }
    
    /**
     * @dev Get tick information
     */
    function getTickInfo(int24 tickIndex) external view returns (
        uint128 liquidityGross,
        int128 liquidityNet,
        uint256 feeGrowthOutside0X128,
        uint256 feeGrowthOutside1X128,
        bool initialized
    ) {
        Tick storage tickInfo = ticks[tickIndex];
        return (
            tickInfo.liquidityGross,
            tickInfo.liquidityNet,
            tickInfo.feeGrowthOutside0X128,
            tickInfo.feeGrowthOutside1X128,
            tickInfo.initialized
        );
    }
    
    // =================================================================================================
    //                                      ADMIN FUNCTIONS                                            
    // =================================================================================================
    
    function setTaxExemption(address account, bool isExempt) external override onlyOwner {
        taxExempt[account] = isExempt;
    }
    
    function setTreasury(address newTreasury) external override onlyOwner {
        require(newTreasury != address(0), "SleepV4Pool: Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        taxExempt[oldTreasury] = false;
        taxExempt[newTreasury] = true;
    }
    
    function setTaxEnabled(bool enabled) external override onlyOwner {
        taxEnabled = enabled;
    }
    
    function setGenesisTimestamp(uint256 timestamp) external override onlyOwner {
        require(timestamp > 0, "SleepV4Pool: Invalid timestamp");
        genesisTimestamp = timestamp;
    }
    
    function setFeeAndTickSpacing(uint24 newFee, int24 newTickSpacing) external onlyOwner {
        fee = newFee;
        tickSpacing = newTickSpacing;
    }
    
    // V2-style mint/burn functions for interface compatibility
    function mint(address to) external override returns (uint liquidityAmount) {
        // For V4, this is a simplified version - users should use the position-based mint
        // This is mainly for interface compatibility
        require(to != address(0), "SleepV4Pool: Invalid recipient");
        
        // Calculate liquidity based on current balances (simplified)
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        
        // Add liquidity to the full range as a simple position
        uint128 liquidityToAdd = uint128((balance0 + balance1) / 2);
        
        if (liquidityToAdd > 0) {
            liquidity += liquidityToAdd;
            liquidityAmount = liquidityToAdd;
        }
        
        return liquidityAmount;
    }
    
    function burn(address to) external override returns (uint amount0, uint amount1) {
        // For V4, this is a simplified version - users should use position-based burn
        // This is mainly for interface compatibility
        require(to != address(0), "SleepV4Pool: Invalid recipient");
        
        // For simplicity, return current balances (this would be more complex in production)
        amount0 = IERC20(token0).balanceOf(address(this)) / 10; // Return 10% as example
        amount1 = IERC20(token1).balanceOf(address(this)) / 10;
        
        if (amount0 > 0) IERC20(token0).transfer(to, amount0);
        if (amount1 > 0) IERC20(token1).transfer(to, amount1);
        
        return (amount0, amount1);
    }
}
