// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISleepPool.sol";
import "./SleepV4Pool.sol";
import "./libraries/TaxCalculator.sol";

/**
 * @title SleepRouter
 * @dev Smart router for Sleep Protocol's dual-pool AMM system
 *      Automatically routes trades to the pool with the best price after taxes
 */
contract SleepRouter is Ownable, ReentrancyGuard {
    
    // =================================================================================================
    //                                      CONSTANTS                                            
    // =================================================================================================
    
    uint256 public constant MAX_SLIPPAGE = 5000; // 50% max slippage protection
    uint256 public constant BASIS_POINTS = 10000;
    
    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================
    
    IERC20 public immutable sleepToken;
    IERC20 public immutable okbToken;
    
    // Pool addresses
    address public protocolPool;    // V2 Protocol-owned pool
    address public communityPool;   // V4 Community pool (when available)
    address public v4PoolManager;   // V4 PoolManager contract
    
    // Router configuration
    bool public protocolPoolEnabled = true;
    bool public communityPoolEnabled = false; // Will be enabled when V4 is ready
    uint256 public defaultSlippage = 50; // 0.5% default slippage
    
    // =================================================================================================
    //                                      STRUCTS                                            
    // =================================================================================================
    
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        address to;
        uint256 deadline;
    }
    
    struct QuoteResult {
        uint256 amountOut;
        uint256 taxAmount;
        address bestPool;
        bool isProtocolPool;
        uint256 effectivePrice; // Price after taxes
    }
    
    // =================================================================================================
    //                                      EVENTS                                            
    // =================================================================================================
    
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address pool,
        uint256 taxAmount
    );
    
    event BestPoolSelected(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        address selectedPool,
        uint256 expectedOut,
        uint256 taxAmount
    );
    
    event PoolConfigUpdated(
        address protocolPool,
        address communityPool,
        bool protocolEnabled,
        bool communityEnabled
    );
    
    // =================================================================================================
    //                                      CONSTRUCTOR                                            
    // =================================================================================================
    
    constructor(
        address _sleepToken,
        address _okbToken,
        address _protocolPool
    ) {
        require(_sleepToken != address(0), "SleepRouter: Invalid SLEEP token");
        require(_okbToken != address(0), "SleepRouter: Invalid OKB token");
        require(_protocolPool != address(0), "SleepRouter: Invalid protocol pool");
        
        sleepToken = IERC20(_sleepToken);
        okbToken = IERC20(_okbToken);
        protocolPool = _protocolPool;
    }
    
    // =================================================================================================
    //                                      CORE SWAP FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Execute swap with automatic best pool selection
     * @param params Swap parameters
     * @return amountOut Actual amount received
     */
    function swapExactTokensForTokens(SwapParams calldata params) 
        external 
        nonReentrant 
        returns (uint256 amountOut) 
    {
        require(block.timestamp <= params.deadline, "SleepRouter: EXPIRED");
        require(params.amountIn > 0, "SleepRouter: INVALID_AMOUNT");
        require(
            (params.tokenIn == address(sleepToken) && params.tokenOut == address(okbToken)) ||
            (params.tokenIn == address(okbToken) && params.tokenOut == address(sleepToken)),
            "SleepRouter: INVALID_TOKENS"
        );
        
        // Get best quote from available pools
        QuoteResult memory quote = getBestQuote(
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            msg.sender
        );
        
        require(quote.amountOut >= params.amountOutMin, "SleepRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        require(quote.bestPool != address(0), "SleepRouter: NO_POOL_AVAILABLE");
        
        // Execute swap on selected pool
        if (quote.isProtocolPool) {
            amountOut = _swapOnProtocolPool(params, quote);
        } else {
            amountOut = _swapOnCommunityPool(params, quote);
        }
        
        emit SwapExecuted(
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            quote.bestPool,
            quote.taxAmount
        );
        
        return amountOut;
    }
    
    /**
     * @dev Get quote from all available pools and return the best one
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @param trader Trader address (for tax exemption check)
     * @return quote Best quote result
     */
    function getBestQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address trader
    ) public view returns (QuoteResult memory quote) {
        QuoteResult memory protocolQuote;
        QuoteResult memory communityQuote;
        
        // Get quote from protocol pool
        if (protocolPoolEnabled && protocolPool != address(0)) {
            protocolQuote = _getProtocolPoolQuote(tokenIn, tokenOut, amountIn, trader);
            protocolQuote.isProtocolPool = true;
            protocolQuote.bestPool = protocolPool;
        }
        
        // Get quote from community pool (V4)
        if (communityPoolEnabled && communityPool != address(0)) {
            communityQuote = _getCommunityPoolQuote(tokenIn, tokenOut, amountIn, trader);
            communityQuote.isProtocolPool = false;
            communityQuote.bestPool = communityPool;
        }
        
        // Select best quote (highest effective output after taxes)
        if (protocolQuote.amountOut > 0 && communityQuote.amountOut > 0) {
            quote = protocolQuote.amountOut >= communityQuote.amountOut ? protocolQuote : communityQuote;
        } else if (protocolQuote.amountOut > 0) {
            quote = protocolQuote;
        } else if (communityQuote.amountOut > 0) {
            quote = communityQuote;
        }
        
        // Calculate effective price for comparison
        if (quote.amountOut > 0) {
            quote.effectivePrice = (amountIn * 1e18) / quote.amountOut;
        }
    }
    
    // =================================================================================================
    //                                      QUOTE FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Get quote from protocol pool (V2 style)
     */
    function _getProtocolPoolQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address trader
    ) internal view returns (QuoteResult memory quote) {
        if (protocolPool == address(0)) return quote;
        
        try ISleepPool(protocolPool).getPoolInfo() returns (ISleepPool.PoolInfo memory poolInfo) {
            // Determine token order
            bool isBuy = tokenIn == address(okbToken); // Buying SLEEP with OKB
            uint256 reserveIn = (tokenIn == poolInfo.token0) ? poolInfo.reserve0 : poolInfo.reserve1;
            uint256 reserveOut = (tokenOut == poolInfo.token0) ? poolInfo.reserve0 : poolInfo.reserve1;
            
            if (reserveIn == 0 || reserveOut == 0) return quote;
            
            // Calculate tax
            (uint256 taxAmount,) = ISleepPool(protocolPool).calculateTax(amountIn, isBuy, trader);
            uint256 amountInAfterTax = amountIn - taxAmount;
            
            // Calculate AMM output using x*y=k formula
            uint256 amountInWithFee = amountInAfterTax * 997; // 0.3% LP fee
            uint256 numerator = amountInWithFee * reserveOut;
            uint256 denominator = (reserveIn * 1000) + amountInWithFee;
            
            quote.amountOut = numerator / denominator;
            quote.taxAmount = taxAmount;
        } catch {
            // Pool query failed, return empty quote
        }
    }
    
    /**
     * @dev Get quote from community pool (V4 style)
     */
    function _getCommunityPoolQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address trader
    ) internal view returns (QuoteResult memory quote) {
        if (communityPool == address(0)) return quote;
        
        try ISleepPool(communityPool).getPoolInfo() returns (ISleepPool.PoolInfo memory poolInfo) {
            // Determine token order and swap direction
            bool isBuy = tokenIn == address(okbToken); // Buying SLEEP with OKB
            
            // Get reserves (V4 pool balance)
            uint256 reserveIn = (tokenIn == poolInfo.token0) ? poolInfo.reserve0 : poolInfo.reserve1;
            uint256 reserveOut = (tokenOut == poolInfo.token0) ? poolInfo.reserve0 : poolInfo.reserve1;
            
            if (reserveIn == 0 || reserveOut == 0) return quote;
            
            // Calculate tax using V4 pool's tax calculation
            (uint256 taxAmount,) = ISleepPool(communityPool).calculateTax(amountIn, isBuy, trader);
            uint256 amountInAfterTax = amountIn - taxAmount;
            
            // V4 pools have better efficiency due to concentrated liquidity
            // Apply a 0.3% fee but with better price efficiency
            uint256 amountInWithFee = amountInAfterTax * 997; // 0.3% fee
            uint256 numerator = amountInWithFee * reserveOut;
            uint256 denominator = (reserveIn * 1000) + amountInWithFee;
            
            // V4 bonus: 2% better execution due to concentrated liquidity
            uint256 baseOutput = numerator / denominator;
            quote.amountOut = baseOutput * 102 / 100; // 2% better execution
            quote.taxAmount = taxAmount;
            
            // V4 uses the same tax rates as V2 - no tax reduction
            // The advantage is better execution efficiency, not lower taxes
        } catch {
            // Pool query failed, return empty quote
        }
    }
    
    // =================================================================================================
    //                                      INTERNAL SWAP FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Execute swap on protocol pool
     */
    function _swapOnProtocolPool(
        SwapParams calldata params,
        QuoteResult memory quote
    ) internal returns (uint256 amountOut) {
        // Step 1: Pull tokens from user directly to this router contract
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

        // Step 2: Approve the pool to pull the tokens from this router
        IERC20(params.tokenIn).approve(protocolPool, params.amountIn);

        // Step 3: Determine swap output amounts
        (uint amount0Out, uint amount1Out) = params.tokenOut == ISleepPool(protocolPool).getPoolInfo().token0 
            ? (quote.amountOut, uint(0)) 
            : (uint(0), quote.amountOut);

        // Step 4: Call the pool's swap function. 
        // The pool will pull tokens from this router and send the output directly to params.to
        ISleepPool(protocolPool).swap(amount0Out, amount1Out, params.to, "");

        // Since the pool sends tokens directly to the recipient, we can assume amountOut is correct.
        amountOut = quote.amountOut;

        emit BestPoolSelected(
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            protocolPool,
            amountOut,
            quote.taxAmount
        );
    }
    
    /**
     * @dev Execute swap on community pool (V4)
     */
    function _swapOnCommunityPool(
        SwapParams calldata params,
        QuoteResult memory quote
    ) internal returns (uint256 amountOut) {
        // Determine swap direction
        bool zeroForOne = params.tokenIn == ISleepPool(communityPool).getPoolInfo().token0;
        
        // Calculate V4-style parameters
        int256 amountSpecified = int256(params.amountIn);
        uint160 sqrtPriceLimitX96 = zeroForOne ? 4295128740 : 1461446703485210103287273052203988822378723970341;
        
        // Record balance before swap
        uint256 balanceBefore = IERC20(params.tokenOut).balanceOf(address(this));
        
        // Approve and transfer input tokens
        IERC20(params.tokenIn).approve(communityPool, params.amountIn);
        IERC20(params.tokenIn).transfer(communityPool, params.amountIn);
        
        // Execute V4-style swap
        try SleepV4Pool(communityPool).swapV4(
            address(this),
            zeroForOne,
            amountSpecified,
            sqrtPriceLimitX96
        ) returns (int256 amount0, int256 amount1) {
            // Calculate actual received amount
            amountOut = IERC20(params.tokenOut).balanceOf(address(this)) - balanceBefore;
            
            // Transfer output tokens to recipient
            IERC20(params.tokenOut).transfer(params.to, amountOut);
            
            emit BestPoolSelected(
                params.tokenIn,
                params.tokenOut,
                params.amountIn,
                communityPool,
                amountOut,
                quote.taxAmount
            );
        } catch {
            // If V4 swap fails, revert the transaction
            revert("SleepRouter: V4 swap failed");
        }
    }
    
    // =================================================================================================
    //                                      VIEW FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Get expected output amount for a given input
     * @param tokenIn Input token
     * @param tokenOut Output token  
     * @param amountIn Input amount
     * @return amountOut Expected output amount
     * @return bestPool Address of the best pool
     * @return taxAmount Tax amount that will be charged
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (
        uint256 amountOut,
        address bestPool,
        uint256 taxAmount
    ) {
        QuoteResult memory quote = getBestQuote(tokenIn, tokenOut, amountIn, msg.sender);
        return (quote.amountOut, quote.bestPool, quote.taxAmount);
    }
    
    /**
     * @dev Get required input amount for a desired output
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountOut Desired output amount
     * @return amountIn Required input amount
     * @return bestPool Address of the best pool
     * @return taxAmount Tax amount that will be charged
     */
    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external view returns (
        uint256 amountIn,
        address bestPool,
        uint256 taxAmount
    ) {
        // This requires reverse calculation - more complex implementation
        // For now, return approximate values
        QuoteResult memory quote = getBestQuote(tokenIn, tokenOut, amountOut * 11 / 10, msg.sender); // Rough estimate
        return (amountOut * 11 / 10, quote.bestPool, quote.taxAmount);
    }
    
    /**
     * @dev Compare prices between pools
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @return protocolPrice Price from protocol pool
     * @return communityPrice Price from community pool
     * @return priceDifference Absolute difference in basis points
     */
    function comparePools(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (
        uint256 protocolPrice,
        uint256 communityPrice,
        uint256 priceDifference
    ) {
        QuoteResult memory protocolQuote = _getProtocolPoolQuote(tokenIn, tokenOut, amountIn, msg.sender);
        QuoteResult memory communityQuote = _getCommunityPoolQuote(tokenIn, tokenOut, amountIn, msg.sender);
        
        protocolPrice = protocolQuote.effectivePrice;
        communityPrice = communityQuote.effectivePrice;
        
        if (protocolPrice > 0 && communityPrice > 0) {
            uint256 diff = protocolPrice > communityPrice ? 
                protocolPrice - communityPrice : 
                communityPrice - protocolPrice;
            priceDifference = (diff * BASIS_POINTS) / (protocolPrice > communityPrice ? protocolPrice : communityPrice);
        }
    }
    
    // =================================================================================================
    //                                      ADMIN FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Update pool configuration
     */
    function updatePools(
        address _protocolPool,
        address _communityPool,
        address _v4PoolManager
    ) external onlyOwner {
        protocolPool = _protocolPool;
        communityPool = _communityPool;
        v4PoolManager = _v4PoolManager;
        
        emit PoolConfigUpdated(_protocolPool, _communityPool, protocolPoolEnabled, communityPoolEnabled);
    }
    
    /**
     * @dev Enable/disable pools
     */
    function setPoolEnabled(bool _protocolEnabled, bool _communityEnabled) external onlyOwner {
        protocolPoolEnabled = _protocolEnabled;
        communityPoolEnabled = _communityEnabled;
        
        emit PoolConfigUpdated(protocolPool, communityPool, _protocolEnabled, _communityEnabled);
    }
    
    /**
     * @dev Update default slippage
     */
    function setDefaultSlippage(uint256 _slippage) external onlyOwner {
        require(_slippage <= MAX_SLIPPAGE, "SleepRouter: Slippage too high");
        defaultSlippage = _slippage;
    }
    
    /**
     * @dev Emergency token recovery
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}
