// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IBurnableToken.sol";
import "./pools/interfaces/ISleepRouter.sol";
import "./pools/libraries/v4/FullMath.sol";
import "./interfaces/ISleepMinter.sol";
import "./interfaces/IStakingRewards.sol";
import "./interfaces/ISleepCoin.sol";

/**
 * @title TokenTreasury - Advanced 16-Day Epoch Dynamic Allocation System
 * @dev Implements the sophisticated treasury management system described in the whitepaper
 *      with 16-day epochs and dynamic allocation based on globalRank growth
 */
contract TokenTreasury is Ownable, ReentrancyGuard {

    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================
    
    // --- Core Contracts ---
    ISleepCoin public sleepToken;
    ISleepMinter public sleepMinter;
    IStakingRewards public stakingRewards;

    // --- Addresses ---
    address public stakingRewardsAddress;
    address public polAddress; // Protocol-Owned Liquidity address
    address public buyAndBurnEngine; // Buy and Burn engine for token buyback
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // --- 16-Day Epoch System ---
    uint256 public constant EPOCH_DURATION = 16 days;
    uint256 public protocolStartTime;
    uint256 public currentEpoch;
    
    struct EpochData {
        uint256 startTime;
        uint256 endTime;
        uint256 startGlobalRank;
        uint256 endGlobalRank;
        uint256 rankGrowth;
        bool isFinalized;
        // Allocation percentages for this epoch
        uint8 polPercent;
        uint8 stakingPercent;
        uint8 burnPercent;
    }
    
    mapping(uint256 => EpochData) public epochs;
    
    // --- Dynamic Allocation Thresholds ---
    uint256 public constant WINTER_THRESHOLD = 5000;   // Low growth threshold
    uint256 public constant BULL_THRESHOLD = 50000;    // High growth threshold
    
    // --- Allocation Modes ---
    struct AllocationMode {
        uint8 polPercent;
        uint8 stakingPercent;
        uint8 burnPercent;
    }
    
    AllocationMode public winterMode = AllocationMode(55, 40, 5);   // Winter: 55% POL, 40% Staking, 5% Burn
    AllocationMode public bullMode = AllocationMode(10, 70, 20);    // Bull: 10% POL, 70% Staking, 20% Burn
    
    // --- Revenue Tracking ---
    uint256 public totalOkbReceived;
    uint256 public totalSleepReceived;
    mapping(uint256 => uint256) public epochOkbRevenue;
    mapping(uint256 => uint256) public epochSleepRevenue;

    // --- Events ---
    event EpochStarted(uint256 indexed epochNumber, uint256 startTime, uint256 startGlobalRank);
    event EpochFinalized(uint256 indexed epochNumber, uint256 rankGrowth, uint8 polPercent, uint8 stakingPercent, uint8 burnPercent);
    event RevenueDistributed(uint256 indexed epochNumber, uint256 okbAmount, uint256 sleepAmount);
    event AllocationExecuted(address indexed recipient, uint256 amount, string allocationType);
    event POLAddressUpdated(address indexed newAddress);
    event StakingRewardsAddressUpdated(address indexed newAddress);
    event BuyAndBurnEngineUpdated(address indexed newEngine);

    // =================================================================================================
    //                                          CONSTRUCTOR                                            
    // =================================================================================================

    constructor(
        address _sleepToken,
        address _sleepMinter,
        address _stakingRewards,
        address _polAddress
    ) {
        require(_sleepToken != address(0), "Treasury: Invalid sleep token address");
        require(_sleepMinter != address(0), "Treasury: Invalid minter address");
        require(_stakingRewards != address(0), "Treasury: Invalid staking rewards address");
        require(_polAddress != address(0), "Treasury: Invalid POL address");
        
        sleepToken = ISleepCoin(_sleepToken);
        sleepMinter = ISleepMinter(_sleepMinter);
        stakingRewards = IStakingRewards(_stakingRewards);
        stakingRewardsAddress = _stakingRewards;
        polAddress = _polAddress;
        
        protocolStartTime = block.timestamp;
        currentEpoch = 0;
        
        // Initialize first epoch
        _initializeEpoch(0);
    }

    // =================================================================================================
    //                                      EPOCH MANAGEMENT                                         
    // =================================================================================================

    /**
     * @dev Initialize a new epoch
     */
    function _initializeEpoch(uint256 epochNumber) internal {
        uint256 currentGlobalRank = sleepMinter.globalRank();
        
        epochs[epochNumber] = EpochData({
            startTime: block.timestamp,
            endTime: block.timestamp + EPOCH_DURATION,
            startGlobalRank: currentGlobalRank,
            endGlobalRank: 0,
            rankGrowth: 0,
            isFinalized: false,
            polPercent: 0,
            stakingPercent: 0,
            burnPercent: 0
        });
        
        emit EpochStarted(epochNumber, block.timestamp, currentGlobalRank);
    }

    /**
     * @dev Check if current epoch should be finalized and start new one
     */
    function checkAndUpdateEpoch() public {
        EpochData storage epoch = epochs[currentEpoch];
        
        if (block.timestamp >= epoch.endTime && !epoch.isFinalized) {
            _finalizeCurrentEpoch();
            _startNewEpoch();
        }
    }

    /**
     * @dev Finalize the current epoch and calculate allocation percentages
     */
    function _finalizeCurrentEpoch() internal {
        EpochData storage epoch = epochs[currentEpoch];
        uint256 currentGlobalRank = sleepMinter.globalRank();
        
        epoch.endGlobalRank = currentGlobalRank;
        epoch.rankGrowth = currentGlobalRank - epoch.startGlobalRank;
        epoch.isFinalized = true;
        
        // Calculate allocation percentages based on rank growth
        (uint8 polPercent, uint8 stakingPercent, uint8 burnPercent) = _calculateAllocation(epoch.rankGrowth);
        
        epoch.polPercent = polPercent;
        epoch.stakingPercent = stakingPercent;
        epoch.burnPercent = burnPercent;
        
        emit EpochFinalized(currentEpoch, epoch.rankGrowth, polPercent, stakingPercent, burnPercent);
    }

    /**
     * @dev Start a new epoch
     */
    function _startNewEpoch() internal {
        currentEpoch++;
        _initializeEpoch(currentEpoch);
    }

    /**
     * @dev Calculate allocation percentages based on globalRank growth
     */
    function _calculateAllocation(uint256 rankGrowth) internal view returns (uint8 pol, uint8 staking, uint8 burn) {
        if (rankGrowth <= WINTER_THRESHOLD) {
            // Winter Mode: Low growth
            return (winterMode.polPercent, winterMode.stakingPercent, winterMode.burnPercent);
        } else if (rankGrowth >= BULL_THRESHOLD) {
            // Bull Mode: High growth
            return (bullMode.polPercent, bullMode.stakingPercent, bullMode.burnPercent);
        } else {
            // Standard Mode: Linear interpolation
            uint256 alpha = FullMath.mulDiv(rankGrowth - WINTER_THRESHOLD, 100, BULL_THRESHOLD - WINTER_THRESHOLD);
            
            // Linear interpolation formula: winter + α * (bull - winter)
            pol = uint8(winterMode.polPercent - FullMath.mulDiv(alpha, (winterMode.polPercent - bullMode.polPercent), 100));
            staking = uint8(winterMode.stakingPercent + FullMath.mulDiv(alpha, (bullMode.stakingPercent - winterMode.stakingPercent), 100));
            burn = uint8(winterMode.burnPercent + FullMath.mulDiv(alpha, (bullMode.burnPercent - winterMode.burnPercent), 100));
            
            return (pol, staking, burn);
        }
    }

    // =================================================================================================
    //                                      REVENUE MANAGEMENT                                       
    // =================================================================================================

    /**
     * @dev Receive OKB revenue (from minting fees, DEX taxes)
     */
    receive() external payable nonReentrant {
        if (msg.value > 0) {
            checkAndUpdateEpoch();
            
            totalOkbReceived += msg.value;
            epochOkbRevenue[currentEpoch] += msg.value;
            
            // Distribute immediately using current epoch's allocation
            _distributeOkbRevenue(msg.value);
        }
    }

    /**
     * @dev Receive OKB revenue from TokenMinter contract
     */
    function receiveOkbRevenue() external payable nonReentrant {
        if (msg.value > 0) {
            checkAndUpdateEpoch();
            
            totalOkbReceived += msg.value;
            epochOkbRevenue[currentEpoch] += msg.value;
            
            // Distribute immediately using current epoch's allocation
            _distributeOkbRevenue(msg.value);
        }
    }

    /**
     * @dev Receive SLEEP tokens (from transaction taxes)
     */
    function receiveSleepTokens(uint256 amount) external {
        require(amount > 0, "Treasury: Amount must be greater than 0");
        
        checkAndUpdateEpoch();
        
        sleepToken.transferFrom(msg.sender, address(this), amount);
        
        totalSleepReceived += amount;
        epochSleepRevenue[currentEpoch] += amount;
        
        // Convert SLEEP to OKB and distribute
        _convertAndDistributeSleep(amount);
    }

    /**
     * @dev Distribute OKB revenue according to current allocation
     */
    function _distributeOkbRevenue(uint256 amount) internal {
        if (amount == 0) return;

        // Get allocation percentages from previous epoch (or default for first epoch)
        (uint8 polPercent, uint8 stakingPercent, uint8 burnPercent) = _getCurrentAllocation();
        
        uint256 polAmount = (amount * polPercent) / 100;
        uint256 stakingAmount = (amount * stakingPercent) / 100;
        uint256 burnAmount = amount - polAmount - stakingAmount; // Ensure no rounding errors
        
        // Distribute to POL
        if (polAmount > 0) {
            (bool success, ) = polAddress.call{value: polAmount}("");
            if (success) {
                emit AllocationExecuted(polAddress, polAmount, "POL");
            }
        }
        
        // 3. Allocate to Staking Rewards
        if (stakingAmount > 0) {
            // Transfer directly to the staking contract, which handles it via receive()
            (bool success, ) = address(stakingRewards).call{value: stakingAmount}("");
            require(success, "Treasury: Failed to send OKB to Staking contract");
            emit RevenueDistributed(currentEpoch, stakingAmount, 0); // Updated event
        }

        // 4. Allocate to Buy and Burn
        if (burnAmount > 0) {
            // Send OKB to buy and burn engine for SLEEP token buyback
            if (buyAndBurnEngine != address(0)) {
                (bool success, ) = buyAndBurnEngine.call{value: burnAmount}("");
                if (success) {
                    emit AllocationExecuted(buyAndBurnEngine, burnAmount, "BuyAndBurn");
                } else {
                    // Fallback: send to burn address if engine fails
                    (bool fallbackSuccess, ) = BURN_ADDRESS.call{value: burnAmount}("");
                    if (fallbackSuccess) {
                        emit AllocationExecuted(BURN_ADDRESS, burnAmount, "Burn");
                    }
                }
            } else {
                // Fallback: send to burn address if no engine set
                (bool success, ) = BURN_ADDRESS.call{value: burnAmount}("");
                if (success) {
                    emit AllocationExecuted(BURN_ADDRESS, burnAmount, "Burn");
                }
            }
        }
        
        emit RevenueDistributed(currentEpoch, amount, 0);
    }

    /**
     * @dev Convert SLEEP tokens to OKB and distribute
     */
    function _convertAndDistributeSleep(uint256 sleepAmount) internal {
        // For now, we'll hold SLEEP tokens and distribute them separately
        // In a full implementation, this would swap SLEEP for OKB via DEX
        
        // TODO: Implement DEX swap logic
        // For now, just emit event
        emit RevenueDistributed(currentEpoch, 0, sleepAmount);
    }

    /**
     * @dev Get current allocation percentages
     */
    function _getCurrentAllocation() internal view returns (uint8 pol, uint8 staking, uint8 burn) {
        if (currentEpoch == 0) {
            // First epoch: use winter mode as default
            return (winterMode.polPercent, winterMode.stakingPercent, winterMode.burnPercent);
        }
        
        // Use previous epoch's calculated allocation
        EpochData storage prevEpoch = epochs[currentEpoch - 1];
        if (prevEpoch.isFinalized) {
            return (prevEpoch.polPercent, prevEpoch.stakingPercent, prevEpoch.burnPercent);
        }
        
        // Fallback to winter mode
        return (winterMode.polPercent, winterMode.stakingPercent, winterMode.burnPercent);
    }

    // =================================================================================================
    //                                      VIEW FUNCTIONS                                          
    // =================================================================================================

    /**
     * @dev Get current epoch information
     */
    function getCurrentEpochInfo() external view returns (
        uint256 epochNumber,
        uint256 startTime,
        uint256 endTime,
        uint256 timeRemaining,
        uint256 startGlobalRank,
        uint256 currentGlobalRank,
        uint256 currentGrowth
    ) {
        EpochData storage epoch = epochs[currentEpoch];
        uint256 currentGlobalRankValue = sleepMinter.globalRank();
        
        return (
            currentEpoch,
            epoch.startTime,
            epoch.endTime,
            epoch.endTime > block.timestamp ? epoch.endTime - block.timestamp : 0,
            epoch.startGlobalRank,
            currentGlobalRankValue,
            currentGlobalRankValue - epoch.startGlobalRank
        );
    }

    /**
     * @dev Get epoch data by number
     */
    function getEpochData(uint256 epochNumber) external view returns (EpochData memory) {
        return epochs[epochNumber];
    }

    /**
     * @dev Preview allocation for current growth
     */
    function previewAllocation() external view returns (uint8 pol, uint8 staking, uint8 burn) {
        EpochData storage epoch = epochs[currentEpoch];
        uint256 currentGlobalRankValue = sleepMinter.globalRank();
        uint256 currentGrowth = currentGlobalRankValue - epoch.startGlobalRank;
        
        return _calculateAllocation(currentGrowth);
    }

    /**
     * @dev Get revenue statistics
     */
    function getRevenueStats() external view returns (
        uint256 totalOkb,
        uint256 totalSleep,
        uint256 currentEpochOkb,
        uint256 currentEpochSleep
    ) {
        return (
            totalOkbReceived,
            totalSleepReceived,
            epochOkbRevenue[currentEpoch],
            epochSleepRevenue[currentEpoch]
        );
    }

    // =================================================================================================
    //                                      ADMIN FUNCTIONS                                         
    // =================================================================================================

    function setPOLAddress(address _polAddress) external onlyOwner {
        require(_polAddress != address(0), "Treasury: Invalid POL address");
        polAddress = _polAddress;
        emit POLAddressUpdated(_polAddress);
    }

    function setStakingRewardsAddress(address _stakingRewards) external onlyOwner {
        require(_stakingRewards != address(0), "Treasury: Invalid staking rewards address");
        stakingRewardsAddress = _stakingRewards;
        stakingRewards = IStakingRewards(_stakingRewards);
        emit StakingRewardsAddressUpdated(_stakingRewards);
    }

    function setBuyAndBurnEngine(address _buyAndBurnEngine) external onlyOwner {
        buyAndBurnEngine = _buyAndBurnEngine; // Allow setting to zero to disable
        emit BuyAndBurnEngineUpdated(_buyAndBurnEngine);
    }

    function updateAllocationModes(
        uint8 winterPol, uint8 winterStaking, uint8 winterBurn,
        uint8 bullPol, uint8 bullStaking, uint8 bullBurn
    ) external onlyOwner {
        require(winterPol + winterStaking + winterBurn == 100, "Treasury: Winter percentages must sum to 100");
        require(bullPol + bullStaking + bullBurn == 100, "Treasury: Bull percentages must sum to 100");
        
        winterMode = AllocationMode(winterPol, winterStaking, winterBurn);
        bullMode = AllocationMode(bullPol, bullStaking, bullBurn);
    }

    // Emergency function to manually finalize epoch (if needed)
    function manuallyFinalizeEpoch() external onlyOwner {
        require(!epochs[currentEpoch].isFinalized, "Treasury: Epoch already finalized");
        _finalizeCurrentEpoch();
        _startNewEpoch();
    }

    // Emergency withdrawal function
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
}
