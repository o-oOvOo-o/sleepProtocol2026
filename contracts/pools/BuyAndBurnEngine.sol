// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISleepRouter.sol";
import "../interfaces/IBurnableToken.sol";
import "./interfaces/ISleepPool.sol";
import "./interfaces/IWETH.sol"; // Added for wrapped native token

/**
 * @title BuyAndBurnEngine
 * @dev Implements the Buy and Burn mechanism for Sleep Protocol
 *      Uses treasury funds to buy SLEEP tokens from pools and permanently burn them
 */
contract BuyAndBurnEngine is Ownable, ReentrancyGuard {
    
    // =================================================================================================
    //                                      CONSTANTS                                            
    // =================================================================================================
    
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant MIN_BURN_AMOUNT = 1e18; // Minimum 1 SLEEP to burn
    uint256 public constant MAX_SLIPPAGE = 500; // 5% max slippage in basis points
    
    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================
    
    IERC20 public immutable sleepToken;
    IWETH public immutable wrappedNativeToken; // WOKB, WETH, etc.
    
    address public treasury;
    address public protocolPool; // V2 protocol pool for buying
    address public communityPool; // V4 community pool (backup)
    address public sleepRouter; // Router for swapping tokens
    
    // Burn statistics
    uint256 public totalBurned;
    uint256 public totalOkbSpent;
    uint256 public burnCount;
    
    // Configuration
    uint256 public minBuyAmount = 1e17; // Minimum 0.1 OKB per buy
    uint256 public maxSlippage = 300; // 3% default slippage
    bool public autoBurnEnabled = true;
    
    // =================================================================================================
    //                                      EVENTS                                            
    // =================================================================================================
    
    event TokensBurned(
        uint256 indexed burnId,
        uint256 sleepAmount,
        uint256 okbSpent,
        address pool,
        uint256 timestamp
    );
    
    event BuyAndBurnExecuted(
        uint256 okbAmount,
        uint256 sleepReceived,
        uint256 sleepBurned,
        address executor
    );
    
    event ConfigurationUpdated(
        uint256 minBuyAmount,
        uint256 maxSlippage,
        bool autoBurnEnabled
    );
    
    event PoolsUpdated(
        address protocolPool,
        address communityPool
    );
    
    // =================================================================================================
    //                                      CONSTRUCTOR                                            
    // =================================================================================================
    
    constructor(
        address _sleepToken,
        address _wrappedNativeToken,
        address _treasury,
        address _protocolPool,
        address _sleepRouter
    ) {
        require(_sleepToken != address(0), "BuyAndBurn: Invalid SLEEP token");
        require(_wrappedNativeToken != address(0), "BuyAndBurn: Invalid Wrapped Native token");
        require(_treasury != address(0), "BuyAndBurn: Invalid treasury");
        require(_protocolPool != address(0), "BuyAndBurn: Invalid protocol pool");
        require(_sleepRouter != address(0), "BuyAndBurn: Invalid sleep router");
        
        sleepToken = IERC20(_sleepToken);
        wrappedNativeToken = IWETH(_wrappedNativeToken);
        treasury = _treasury;
        protocolPool = _protocolPool;
        sleepRouter = _sleepRouter;
    }
    
    // =================================================================================================
    //                                      CORE FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Execute buy and burn with specified OKB amount
     * @param nativeAmount Amount of OKB to spend on buying SLEEP
     * @return sleepBurned Amount of SLEEP tokens burned
     */
    function executeBuyAndBurn(uint256 nativeAmount) 
        external 
        onlyOwner 
        nonReentrant 
        returns (uint256 sleepBurned) 
    {
        require(nativeAmount >= minBuyAmount, "BuyAndBurn: Amount below minimum");
        require(wrappedNativeToken.balanceOf(address(this)) >= nativeAmount, "BuyAndBurn: Insufficient wrapped native token balance");
        
        // 1. Buy SLEEP tokens from the pool
        uint256 sleepReceived = _buySleepFromPool(nativeAmount);
        require(sleepReceived >= MIN_BURN_AMOUNT, "BuyAndBurn: Insufficient SLEEP received");
        
        // 2. Burn the received SLEEP tokens
        sleepBurned = _burnSleepTokens(sleepReceived);
        
        // 3. Update statistics
        totalBurned += sleepBurned;
        totalOkbSpent += nativeAmount; // Note: Renaming this state var would be a larger migration
        burnCount++;
        
        emit BuyAndBurnExecuted(nativeAmount, sleepReceived, sleepBurned, msg.sender);
        
        return sleepBurned;
    }
    
    /**
     * @dev Auto-execute buy and burn with all available OKB
     * @return sleepBurned Total amount of SLEEP burned
     */
    function autoExecuteBuyAndBurn() 
        external 
        onlyOwner 
        nonReentrant 
        returns (uint256 sleepBurned) 
    {
        require(autoBurnEnabled, "BuyAndBurn: Auto burn disabled");
        
        uint256 availableNative = wrappedNativeToken.balanceOf(address(this));
        require(availableNative >= minBuyAmount, "BuyAndBurn: Insufficient native token for auto burn");
        
        // Execute buy and burn with available native tokens
        require(availableNative >= minBuyAmount, "BuyAndBurn: Amount below minimum");
        
        // 1. Buy SLEEP tokens from the pool
        uint256 sleepReceived = _buySleepFromPool(availableNative);
        require(sleepReceived >= MIN_BURN_AMOUNT, "BuyAndBurn: Insufficient SLEEP received");
        
        // 2. Burn the received SLEEP tokens
        sleepBurned = _burnSleepTokens(sleepReceived);
        
        // 3. Update statistics
        totalBurned += sleepBurned;
        totalOkbSpent += availableNative; // Note: Renaming this state var would be a larger migration
        burnCount++;
        
        emit BuyAndBurnExecuted(availableNative, sleepReceived, sleepBurned, msg.sender);
        
        return sleepBurned;
    }
    
    /**
     * @dev Burn SLEEP tokens directly (for tokens already held)
     * @param amount Amount of SLEEP to burn
     * @return burned Actual amount burned
     */
    function burnSleepTokens(uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
        returns (uint256 burned) 
    {
        require(amount >= MIN_BURN_AMOUNT, "BuyAndBurn: Amount below minimum");
        require(sleepToken.balanceOf(address(this)) >= amount, "BuyAndBurn: Insufficient SLEEP balance");
        
        burned = _burnSleepTokens(amount);
        
        // Update statistics
        totalBurned += burned;
        burnCount++;
        
        emit TokensBurned(burnCount, burned, 0, address(0), block.timestamp);
        
        return burned;
    }
    
    // =================================================================================================
    //                                      INTERNAL FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Buy SLEEP tokens from the protocol pool
     * @param nativeAmount Amount of wrapped native token to spend
     * @return sleepReceived Amount of SLEEP received
     */
    function _buySleepFromPool(uint256 nativeAmount) internal returns (uint256 sleepReceived) {
        // Get current reserves to calculate expected output
        ISleepPool pool = ISleepPool(protocolPool);
        ISleepPool.PoolInfo memory poolInfo = pool.getPoolInfo();
        
        // Calculate expected SLEEP output (simplified AMM formula)
        // This assumes token0 is SLEEP and token1 is the wrapped native token
        uint256 expectedSleep;
        if (poolInfo.token0 == address(sleepToken)) {
            // SLEEP is token0, wrapped native is token1
            expectedSleep = (nativeAmount * poolInfo.reserve0) / (poolInfo.reserve1 + nativeAmount);
        } else {
            // wrapped native is token0, SLEEP is token1  
            expectedSleep = (nativeAmount * poolInfo.reserve1) / (poolInfo.reserve0 + nativeAmount);
        }
        
        // Apply slippage protection
        uint256 minSleepOut = (expectedSleep * (10000 - maxSlippage)) / 10000;

        // Approve the router to spend our wrapped native token
        wrappedNativeToken.approve(sleepRouter, nativeAmount);

        // Record SLEEP balance before swap
        uint256 sleepBefore = sleepToken.balanceOf(address(this));

        // Create the SwapParams struct for the new router interface
        ISleepRouter.SwapParams memory params = ISleepRouter.SwapParams({
            tokenIn: address(wrappedNativeToken),
            tokenOut: address(sleepToken),
            amountIn: nativeAmount,
            amountOutMin: minSleepOut,
            to: address(this),
            deadline: block.timestamp + 15 minutes
        });

        // Execute swap via the router using the params struct
        ISleepRouter(sleepRouter).swapExactTokensForTokens(params);
        
        // Calculate actual SLEEP received
        sleepReceived = sleepToken.balanceOf(address(this)) - sleepBefore;
        require(sleepReceived >= minSleepOut, "BuyAndBurn: Excessive slippage");
        
        return sleepReceived;
    }
    
    /**
     * @dev Burn SLEEP tokens by sending to dead address
     * @param amount Amount to burn
     * @return burned Actual amount burned
     */
    function _burnSleepTokens(uint256 amount) internal returns (uint256 burned) {
        // Transfer to burn address (permanent destruction)
        sleepToken.transfer(BURN_ADDRESS, amount);
        
        burned = amount;
        
        emit TokensBurned(burnCount + 1, burned, 0, address(0), block.timestamp);
        
        return burned;
    }
    
    // =================================================================================================
    //                                      VIEW FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Get burn statistics
     */
    function getBurnStats() external view returns (
        uint256 _totalBurned,
        uint256 _totalOkbSpent,
        uint256 _burnCount,
        uint256 _averageBurnSize,
        uint256 _averageOkbCost
    ) {
        _totalBurned = totalBurned;
        _totalOkbSpent = totalOkbSpent;
        _burnCount = burnCount;
        
        if (burnCount > 0) {
            _averageBurnSize = totalBurned / burnCount;
            _averageOkbCost = totalOkbSpent / burnCount;
        }
    }
    
    /**
     * @dev Calculate expected SLEEP output for given OKB input
     * @param okbAmount OKB input amount
     * @return expectedSleep Expected SLEEP output
     * @return minSleepOut Minimum SLEEP after slippage
     */
    function calculateBuyOutput(uint256 okbAmount) 
        external 
        view 
        returns (uint256 expectedSleep, uint256 minSleepOut) 
    {
        ISleepPool pool = ISleepPool(protocolPool);
        ISleepPool.PoolInfo memory poolInfo = pool.getPoolInfo();
        
        // Calculate expected output using AMM formula
        if (poolInfo.token0 == address(sleepToken)) {
            expectedSleep = (okbAmount * poolInfo.reserve0) / (poolInfo.reserve1 + okbAmount);
        } else {
            expectedSleep = (okbAmount * poolInfo.reserve1) / (poolInfo.reserve0 + okbAmount);
        }
        
        // Apply slippage
        minSleepOut = (expectedSleep * (10000 - maxSlippage)) / 10000;
    }
    
    /**
     * @dev Get current configuration
     */
    function getConfiguration() external view returns (
        uint256 _minBuyAmount,
        uint256 _maxSlippage,
        bool _autoBurnEnabled,
        address _protocolPool,
        address _communityPool
    ) {
        _minBuyAmount = minBuyAmount;
        _maxSlippage = maxSlippage;
        _autoBurnEnabled = autoBurnEnabled;
        _protocolPool = protocolPool;
        _communityPool = communityPool;
    }
    
    // =================================================================================================
    //                                      ADMIN FUNCTIONS                                            
    // =================================================================================================
    
    /**
     * @dev Update configuration parameters
     */
    function updateConfiguration(
        uint256 _minBuyAmount,
        uint256 _maxSlippage,
        bool _autoBurnEnabled
    ) external onlyOwner {
        require(_maxSlippage <= MAX_SLIPPAGE, "BuyAndBurn: Slippage too high");
        
        minBuyAmount = _minBuyAmount;
        maxSlippage = _maxSlippage;
        autoBurnEnabled = _autoBurnEnabled;
        
        emit ConfigurationUpdated(_minBuyAmount, _maxSlippage, _autoBurnEnabled);
    }
    
    /**
     * @dev Update pool addresses
     */
    function updatePools(address _protocolPool, address _communityPool, address _sleepRouter) external onlyOwner {
        require(_protocolPool != address(0), "BuyAndBurn: Invalid protocol pool");
        require(_sleepRouter != address(0), "BuyAndBurn: Invalid sleep router");
        
        protocolPool = _protocolPool;
        communityPool = _communityPool;
        sleepRouter = _sleepRouter;
        
        emit PoolsUpdated(_protocolPool, _communityPool);
    }
    
    /**
     * @dev Update treasury address
     */
    function updateTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "BuyAndBurn: Invalid treasury");
        treasury = _treasury;
    }
    
    /**
     * @dev Emergency withdraw function
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @dev Receive native currency (ETH, OKB, etc.) and wrap it.
     *      Typically called by the Treasury contract.
     */
    receive() external payable {
        require(msg.sender == treasury, "BuyAndBurn: Only treasury can send native currency");
        if (msg.value > 0) {
            wrappedNativeToken.deposit{value: msg.value}();
        }
    }

    // Helper function to get the swap path (no longer needed by the new router)
    /*
    function getPath() private view returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = address(okbToken);
        path[1] = address(sleepToken);
        return path;
    }
    */
}
