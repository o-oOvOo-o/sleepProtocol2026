// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * @title ISleepRouter
 * @dev Interface for the SleepRouter, defining all external functions.
 */
interface ISleepRouter {
    
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        address to;
        uint256 deadline;
    }

    function swapExactTokensForTokens(SwapParams calldata params) 
        external 
        returns (uint256 amountOut);
        
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (
        uint256 amountOut,
        address bestPool,
        uint256 taxAmount
    );
    
    function getAmountIn(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external view returns (
        uint256 amountIn,
        address bestPool,
        uint256 taxAmount
    );

    function comparePools(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (
        uint256 protocolPrice,
        uint256 communityPrice,
        uint256 priceDifference
    );
}






