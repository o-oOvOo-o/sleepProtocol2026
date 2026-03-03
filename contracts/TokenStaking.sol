// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IStakingRewards.sol";
import "./interfaces/IBurnableToken.sol";
import "./pools/libraries/v4/FullMath.sol";

// Interface to get adjusted time from TokenMinter
interface ITokenMinter {
    function getAdjustedTime() external view returns (uint256);
    function adminControlsEnabled() external view returns (bool);
}

/**
 * @title TokenStaking - The NFT-based Share System of Sleep Protocol
 * @dev This contract acts as a pure ledger to track NFT-based stakes and manage
 *      the multi-period rolling dividend system. SLEEP tokens are held by this contract.
 */
contract TokenStaking is Ownable, ReentrancyGuard {

    // =================================================================================================
    //                                      STATE VARIABLES                                            
    // =================================================================================================

    IERC20 public sleepToken;
    address public accessPassContract; // The only address allowed to register/deregister stakes.
    address public tokenMinterContract; // Reference to TokenMinter for admin time functions
    address public treasuryContract; // Address of the TokenTreasury contract

    // --- NFT-based Staking System ---
    struct DepositRecord {
        uint256 amount;          // Amount of SLEEP tokens
        uint256 shares;          // Converted shares (base shares)
        uint256 effectiveShares; // Shares including all bonuses (BiggerBenefit, LongerPaysMore)
        uint256 timestamp;       // Deposit timestamp
        uint256 stakingDays;     // Intended staking period
        uint256 biggerBenefit;   // APY bonus level (0-6%)
        bool isInfinite;         // Infinite staking mode
        bool isActive;           // Whether this record is active
    }

    // Each NFT can have up to 6 deposit records
    mapping(uint256 => DepositRecord[6]) public nftDeposits;
    mapping(uint256 => uint256) public nftDepositCount; // Number of active deposits per NFT
    mapping(uint256 => uint256) public nftTotalShares; // Total base shares per NFT
    mapping(uint256 => uint256) public nftTotalEffectiveShares; // Total effective shares per NFT
    mapping(uint256 => uint256) public nftTotalStaked; // Total staked amount per NFT

    // Global state
    uint256 public totalShares;
    uint256 public totalEffectiveShares;
    uint256 public totalStaked;
    
    // --- Multi-Period Rolling Dividend System ---
    enum DividendPeriod { SIX_DAYS, THIRTY_DAYS, NINETY_DAYS, THREESIXTY_DAYS, SEVENTY_TWENTY_DAYS }
    
    struct DividendPool {
        uint256 totalRewards;     // Total OKB in this pool for the current period
        uint256 lastDistribution; // Last distribution timestamp (will be renamed to lastSettlementTime)
        uint256 periodDays;       // Period in days
        uint256 allocationPercent; // Percentage of income allocated to this pool
        uint256 rewardPerSharePaid; // ACCUMULATOR: Total rewards paid out per share since genesis
    }

    mapping(DividendPeriod => DividendPool) public dividendPools;
    mapping(uint256 => mapping(DividendPeriod => uint256)) public nftEligibleShares; // DEPRECATED - to be removed
    mapping(uint256 => mapping(DividendPeriod => uint256)) public nftClaimedRewards; // DEPRECATED - to be removed

    // --- New State Variables for Accumulator Model ---
    // NFT's "reward debt" - tracks the rewardPerSharePaid at the time of its last interaction
    mapping(uint256 => mapping(uint => uint256)) public nftRewardDebt;
    // NFT's "pending rewards" - a personal safe for rewards that have been settled but not yet claimed, per pool
    mapping(uint256 => mapping(uint => uint256)) public nftPendingRewards;

    uint256 public protocolStartTime;
    uint256 public constant SECONDS_IN_DAY = 86400;
    uint256 public constant YEAR_IN_SECONDS = 365 * SECONDS_IN_DAY;

    // Burn address for infinite staking
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // Mapping to track SLEEP rewards from penalties for each dividend pool
    mapping(DividendPeriod => uint256) public sleepRewardPools;

    /**
     * @dev Get current time (adjusted if admin controls are enabled)
     */
    function getCurrentTime() public view returns (uint256) {
        if (tokenMinterContract != address(0)) {
            try ITokenMinter(tokenMinterContract).adminControlsEnabled() returns (bool enabled) {
                if (enabled) {
                    try ITokenMinter(tokenMinterContract).getAdjustedTime() returns (uint256 adjustedTime) {
                        return adjustedTime;
                    } catch {
                        return block.timestamp;
                    }
                }
            } catch {
                // If call fails, fall back to block.timestamp
            }
        }
        return block.timestamp;
    }

    // --- Events ---
    event StakeRegistered(uint256 indexed tokenId, uint256 indexed depositIndex, uint256 amount, uint256 shares, uint256 stakingDays);
    event StakeDeregistered(uint256 indexed tokenId, uint256 indexed depositIndex, uint256 amount, uint256 shares);
    event SharesConverted(uint256 amount, uint256 shares, uint256 shareRate);
    event DividendDistributed(DividendPeriod indexed period, uint256 amount, uint256 totalEligibleShares);
    event RewardsClaimed(uint256 indexed tokenId, DividendPeriod indexed period, uint256 amount);
    event BiggerBenefitCalculated(uint256 indexed tokenId, uint256 level, uint256 bonus);
    event AccessPassContractUpdated(address indexed newContract);
    event StakeOwnershipTransferred(uint256 indexed tokenId, address indexed oldOwner, address indexed newOwner, uint256 stakedAmount, uint256 shares);
    event StakingPeriodSet(uint256 indexed tokenId, uint256 indexed depositIndex, uint256 stakingDays, bool isInfinite);
    event PenaltyApplied(uint256 indexed tokenId, uint256 penaltyAmount, string reason);
    event StakeLiquidated(uint256 indexed tokenId, uint256 indexed depositIndex, address indexed liquidator, uint256 liquidatorReward, uint256 penaltyAmount);
    event TokenMinterContractUpdated(address indexed newContract);
    event StakeBurnedForInfinite(uint256 indexed tokenId, uint256 indexed depositIndex, uint256 amount);
    event TreasuryContractUpdated(address indexed newContract);

    // =================================================================================================
    //                                          CONSTRUCTOR                                            
    // =================================================================================================

    constructor(address _sleepTokenAddress) {
        require(_sleepTokenAddress != address(0), "Staking: SleepToken address cannot be zero");
        sleepToken = IERC20(_sleepTokenAddress);
        protocolStartTime = getCurrentTime();
        
        // Initialize dividend pools according to whitepaper
        dividendPools[DividendPeriod.SIX_DAYS] = DividendPool({
            totalRewards: 0,
            lastDistribution: getCurrentTime(), // will be renamed to lastSettlementTime
            periodDays: 6,
            allocationPercent: 25, // 25%
            rewardPerSharePaid: 0
        });
        
        dividendPools[DividendPeriod.THIRTY_DAYS] = DividendPool({
            totalRewards: 0,
            lastDistribution: getCurrentTime(), // will be renamed to lastSettlementTime
            periodDays: 30,
            allocationPercent: 25, // 25%
            rewardPerSharePaid: 0
        });
        
        dividendPools[DividendPeriod.NINETY_DAYS] = DividendPool({
            totalRewards: 0,
            lastDistribution: getCurrentTime(), // will be renamed to lastSettlementTime
            periodDays: 90,
            allocationPercent: 17, // 17%
            rewardPerSharePaid: 0
        });
        
        dividendPools[DividendPeriod.THREESIXTY_DAYS] = DividendPool({
            totalRewards: 0,
            lastDistribution: getCurrentTime(), // will be renamed to lastSettlementTime
            periodDays: 360,
            allocationPercent: 17, // 17%
            rewardPerSharePaid: 0
        });
        
        dividendPools[DividendPeriod.SEVENTY_TWENTY_DAYS] = DividendPool({
            totalRewards: 0,
            lastDistribution: getCurrentTime(), // will be renamed to lastSettlementTime
            periodDays: 720,
            allocationPercent: 16, // 16%
            rewardPerSharePaid: 0
        });
    }

    /**
     * @dev Receive function to accept OKB rewards from the Treasury.
     */
    receive() external payable {
        require(msg.sender == treasuryContract, "Staking: Only Treasury can send rewards");
        depositReward();
    }

    // =================================================================================================
    //                        STAKE REGISTRATION (ONLY CALLED BY ACCESS PASS)                                   
    // =================================================================================================

    /**
     * @dev Registers a new stake entry for an NFT. Called by TokenAccessPass contract.
     * @param user The address of the NFT owner.
     * @param tokenId The ID of the NFT.
     * @param amount The amount of SLEEP tokens to stake.
     * @param stakingDays The intended staking period in days.
     * @param isInfinite Whether this is an infinite stake.
     */
    function registerStake(
        address user,
        uint256 tokenId,
        uint256 amount,
        uint256 stakingDays,
        bool isInfinite
    ) external nonReentrant {
        require(msg.sender == accessPassContract, "Staking: Caller is not the Access Pass contract");
        require(amount > 0, "Staking: Cannot stake 0");
        require(nftDepositCount[tokenId] < 6, "Staking: Maximum 6 deposits per NFT");
        require(stakingDays >= 26 || isInfinite, "Staking: Minimum staking period is 26 days");
        require(stakingDays <= 1500 || isInfinite, "Staking: Days must be <= 1500 or infinite");

        // --- FAIRNESS ENGINE: Settle rewards BEFORE changing share balance ---
        _massUpdatePools();
        _updateNftRewards(tokenId);
        // --------------------------------------------------------------------

        // Transfer tokens from user to this contract
        sleepToken.transferFrom(user, address(this), amount);

        // Find next available deposit slot
        uint256 depositIndex = 6;
        for (uint i = 0; i < 6; i++) {
            if (!nftDeposits[tokenId][i].isActive) {
                depositIndex = i;
                break;
            }
        }
        require(depositIndex < 6, "Staking: No available deposit slots");
        
        // --- Logic from setStakingPeriod is now integrated here ---
        if (isInfinite) {
            // For infinite staking, burn the tokens immediately
            sleepToken.transfer(BURN_ADDRESS, amount);
            emit StakeBurnedForInfinite(tokenId, depositIndex, amount);
        }

        // --- Share Calculation ---
        uint256 currentShareRate = _getCurrentShareRate();
        uint256 shares = FullMath.mulDiv(amount, currentShareRate, 1e18);
        
        // Calculate BiggerBenefit level and LongerPaysMore bonus
        uint256 biggerBenefitLevel = _calculateBiggerBenefit(tokenId, amount);
        uint256 timeBonus = _calculateLongerPaysMoreBonus(stakingDays);

        // Calculate effective shares with all bonuses applied
        uint256 effectiveShares = shares;
        effectiveShares = FullMath.mulDiv(effectiveShares, 100 + biggerBenefitLevel, 100);
        effectiveShares = FullMath.mulDiv(effectiveShares, 100 + timeBonus, 100);
        
        // Create deposit record with period set
        nftDeposits[tokenId][depositIndex] = DepositRecord({
            amount: amount,
            shares: shares,
            effectiveShares: effectiveShares,
            timestamp: getCurrentTime(),
            stakingDays: stakingDays,
            biggerBenefit: biggerBenefitLevel,
            isInfinite: isInfinite,
            isActive: true
        });

        // Update counters
        nftDepositCount[tokenId]++;
        nftTotalShares[tokenId] += shares;
        nftTotalEffectiveShares[tokenId] += effectiveShares;
        nftTotalStaked[tokenId] += amount;
        totalShares += shares;
        totalEffectiveShares += effectiveShares;
        totalStaked += amount;

        emit StakeRegistered(tokenId, depositIndex, amount, shares, stakingDays);
        emit SharesConverted(amount, shares, currentShareRate);
        emit BiggerBenefitCalculated(tokenId, biggerBenefitLevel, biggerBenefitLevel);
    }

    /**
     * @dev Updates the pending rewards for a specific NFT based on the latest rewardPerSharePaid values.
     * This function calculates rewards earned since the last update and stores them in nftPendingRewards.
     * It should be called before any action that changes the NFT's share balance.
     * @param tokenId The ID of the NFT to update.
     */
    function _updateNftRewards(uint256 tokenId) internal {
        uint256 effectiveShares = nftTotalEffectiveShares[tokenId];
        if (effectiveShares == 0) {
            return; // No shares to earn rewards on
        }

        for (uint i = 0; i < 5; i++) {
            DividendPeriod period = DividendPeriod(i);
            DividendPool storage pool = dividendPools[period];
            
            uint256 rewardPerShare = pool.rewardPerSharePaid;
            uint256 lastRewardPerShare = nftRewardDebt[tokenId][i];

            if (rewardPerShare > lastRewardPerShare) {
                uint256 earned = FullMath.mulDiv(effectiveShares, rewardPerShare - lastRewardPerShare, 1e18);
                nftPendingRewards[tokenId][i] += earned;
            }

            // Update the debt to the latest value, regardless of whether rewards were earned
            nftRewardDebt[tokenId][i] = rewardPerShare;
        }
    }

    /**
     * @dev Calculate BiggerBenefit level based on amount and NFT total
     */
    function _calculateBiggerBenefit(uint256 tokenId, uint256 newAmount) internal view returns (uint256) {
        uint256 currentTotal = nftTotalStaked[tokenId];
        uint256 newTotal = currentTotal + newAmount;
        
        // Get level based on single deposit amount
        uint256 singleDepositLevel = _getBiggerBenefitLevel(newAmount);
        
        // Get level based on total amount in NFT
        uint256 totalAmountLevel = _getBiggerBenefitLevel(newTotal);
        
        // Return the maximum of the two (as per whitepaper)
        return singleDepositLevel > totalAmountLevel ? singleDepositLevel : totalAmountLevel;
    }

    /**
     * @dev Get BiggerBenefit level for a given amount
     */
    function _getBiggerBenefitLevel(uint256 amount) internal pure returns (uint256) {
        if (amount >= 500000 * 1e18) return 6; // 500,000+ SLEEPING: +6% APY
        if (amount >= 100000 * 1e18) return 5; // 100,000-499,999 SLEEPING: +5% APY
        if (amount >= 50000 * 1e18) return 4;  // 50,000-99,999 SLEEPING: +4% APY
        if (amount >= 10000 * 1e18) return 3;  // 10,000-49,999 SLEEPING: +3% APY
        if (amount >= 5000 * 1e18) return 2;   // 5,000-9,999 SLEEPING: +2% APY
        if (amount >= 1000 * 1e18) return 1;   // 1,000-4,999 SLEEPING: +1% APY
        return 0; // 100-999 SLEEPING: +0% APY
    }

    /**
     * @dev Deregisters a specific deposit entry. Called by TokenAccessPass contract.
     * This single function handles all withdrawal cases (early, matured, late)
     * by calculating penalties based on the deposit's status at the time of call.
     * @param user The address of the NFT owner to send tokens to.
     * @param tokenId The ID of the NFT.
     * @param depositIndex The index (0-5) of the deposit to deregister.
     */
    function deregisterDeposit(address user, uint256 tokenId, uint256 depositIndex) external nonReentrant {
        require(msg.sender == accessPassContract, "Staking: Caller is not the Access Pass contract");
        require(depositIndex < 6, "Staking: Invalid deposit index");

        DepositRecord storage deposit = nftDeposits[tokenId][depositIndex];

        // --- Pre-flight Checks ---
        require(deposit.isActive, "Staking: Deposit not active");
        require(!deposit.isInfinite, "Staking: Cannot deregister an infinite stake");
        require(deposit.stakingDays > 0, "Staking: Staking period not set");

        uint256 amountToDeregister = deposit.amount;
        uint256 sharesToDeregister = deposit.shares;

        // --- Penalty Calculation ---
        (uint256 recoverableAmount, uint256 penaltyAmount, uint256 burnAmount, uint256 rewardPoolAmount) = _calculateWithdrawalPenalty(deposit);
        
        // --- Effects (State Changes) ---
        // Mark deposit as inactive and clear data
        deposit.isActive = false;
        deposit.amount = 0;
        deposit.shares = 0;
        // Other fields are kept for historical reference but are now inert.

        // Update counters
        nftDepositCount[tokenId]--;
        nftTotalStaked[tokenId] -= amountToDeregister;
        nftTotalShares[tokenId] -= sharesToDeregister;
        totalStaked -= amountToDeregister;
        totalShares -= sharesToDeregister;

        // --- Interactions ---
        // Handle penalty distribution
        if (burnAmount > 0) {
            sleepToken.transfer(BURN_ADDRESS, burnAmount);
        }
        if (rewardPoolAmount > 0) {
            _distributeSleepPenalty(rewardPoolAmount);
        }

        // Send recoverable amount to the user
        if (recoverableAmount > 0) {
            sleepToken.transfer(user, recoverableAmount);
        }

        if (penaltyAmount > 0) {
            emit PenaltyApplied(tokenId, penaltyAmount, "Withdrawal penalty");
        }
        emit StakeDeregistered(tokenId, depositIndex, amountToDeregister, sharesToDeregister);
    }

    /**
     * @dev Updates records when NFT ownership changes. Called by TokenAccessPass.
     * @param tokenId The NFT being transferred
     * @param oldOwner Previous owner (for event logging)
     * @param newOwner New owner (for event logging)
     */
    function updateStakerAddress(uint256 tokenId, address oldOwner, address newOwner) external {
        require(msg.sender == accessPassContract, "Staking: Caller is not the Access Pass contract");
        
        // The staking data automatically stays with the NFT (tokenId-based storage)
        // We just emit an event for tracking purposes
        emit StakeOwnershipTransferred(tokenId, oldOwner, newOwner, nftTotalStaked[tokenId], nftTotalShares[tokenId]);
    }

    /**
     * @dev Set staking period for a specific deposit. Called by TokenAccessPass.
     * @param tokenId The NFT ID
     * @param depositIndex The deposit index (0-5)
     * @param stakingDays The intended staking period in days
     * @param isInfinite Whether this is infinite staking
     */
    /*
    function setStakingPeriod(uint256 tokenId, uint256 depositIndex, uint256 stakingDays, bool isInfinite) external {
        require(msg.sender == accessPassContract, "Staking: Caller is not the Access Pass contract");
        require(depositIndex < 6, "Staking: Invalid deposit index");
        require(nftDeposits[tokenId][depositIndex].isActive, "Staking: Deposit not active");
        require(stakingDays <= 1500 || isInfinite, "Staking: Days must be <= 1500 or infinite");
        
        DepositRecord storage deposit = nftDeposits[tokenId][depositIndex];
        require(deposit.stakingDays == 0, "Staking: Staking period already set"); // Ensure it's only set once

        if (isInfinite) {
            // For infinite staking, burn the tokens and record it
            uint256 burnAmount = deposit.amount;
            if (burnAmount > 0) {
                 sleepToken.transfer(BURN_ADDRESS, burnAmount);
                 emit StakeBurnedForInfinite(tokenId, depositIndex, burnAmount);
            }
        }
        
        deposit.stakingDays = stakingDays;
        deposit.isInfinite = isInfinite;
        
        // Recalculate BiggerBenefit with the new staking period
        uint256 newBiggerBenefit = _calculateBiggerBenefit(tokenId, deposit.amount);
        deposit.biggerBenefit = newBiggerBenefit;
        
        emit StakingPeriodSet(tokenId, depositIndex, stakingDays, isInfinite);
        emit BiggerBenefitCalculated(tokenId, newBiggerBenefit, newBiggerBenefit);
    }
    */

    /**
     * @dev Calculates the current share rate. It starts at 1.1 and linearly decreases to 1.0 over one year.
     * @return The current share rate, scaled by 1e18.
     */
    function _getCurrentShareRate() internal view returns (uint256) {
        uint256 timeSinceStart = getCurrentTime() - protocolStartTime;

        if (timeSinceStart >= YEAR_IN_SECONDS) {
            // After one year, the rate is fixed at 1.0
            return 1e18;
        }

        // The bonus part of the share rate, starts at 0.1 and decreases to 0
        uint256 bonusRate = 0.1e18; // 0.1 * 1e18

        // Calculate how much the bonus has decayed
        uint256 decay = FullMath.mulDiv(bonusRate, timeSinceStart, YEAR_IN_SECONDS);
        
        // Current rate = 1.0 + (initial bonus - decay)
        return 1e18 + (bonusRate - decay);
    }

    /**
     * @dev 清算过期质押 - 根据白皮书规范
     * @param tokenId NFT ID
     * @param depositIndex 存款索引
     */
    function liquidateStake(uint256 tokenId, uint256 depositIndex) external nonReentrant {
        require(depositIndex < 6, "Staking: Invalid deposit index");
        
        DepositRecord storage deposit = nftDeposits[tokenId][depositIndex];
        require(deposit.isActive, "Staking: Deposit not active");
        require(!deposit.isInfinite, "Staking: Cannot liquidate infinite staking");
        
        // 计算到期时间和宽限期
        uint256 maturityTime = deposit.timestamp + (deposit.stakingDays * SECONDS_IN_DAY);
        uint256 graceTime = maturityTime + (6 * SECONDS_IN_DAY);
        
        require(getCurrentTime() > graceTime, "Staking: Still in grace period");
        
        // 计算累计罚金
        uint256 daysOverdue = (getCurrentTime() - graceTime) / SECONDS_IN_DAY;
        uint256 penaltyPercent = daysOverdue * 145; // 1.45% per day
        
        // 只有累计罚金超过50%才能清算
        require(penaltyPercent > 5000, "Staking: Penalty must exceed 50% for liquidation");
        
        // 最大罚没96%
        if (penaltyPercent > 9600) penaltyPercent = 9600;
        
        uint256 depositAmount = deposit.amount;
        uint256 penaltyAmount = FullMath.mulDiv(depositAmount, penaltyPercent, 10000);
        uint256 recoverableAmount = depositAmount - penaltyAmount;
        
        // 清算分配：6%奖励池 + 2%清算人 + 92%销毁
        uint256 rewardPoolAmount = FullMath.mulDiv(penaltyAmount, 6, 100);
        uint256 liquidatorReward = FullMath.mulDiv(penaltyAmount, 2, 100);
        uint256 burnAmount = penaltyAmount - rewardPoolAmount - liquidatorReward;
        
        // 更新状态
        deposit.isActive = false;
        deposit.amount = 0;
        deposit.shares = 0;
        
        // 更新计数器
        nftTotalStaked[tokenId] -= depositAmount;
        nftTotalShares[tokenId] -= deposit.shares;
        totalStaked -= depositAmount;
        totalShares -= deposit.shares;
        
        // 更新存款计数
        uint256 activeCount = 0;
        for (uint i = 0; i < 6; i++) {
            if (nftDeposits[tokenId][i].isActive) {
                activeCount++;
            }
        }
        nftDepositCount[tokenId] = activeCount;
        
        // 执行转账
        if (burnAmount > 0) {
            sleepToken.transfer(BURN_ADDRESS, burnAmount);
        }
        if (liquidatorReward > 0) {
            sleepToken.transfer(msg.sender, liquidatorReward);
        }
        if (recoverableAmount > 0) {
            // 可取回的本金发送给NFT持有者
            address nftOwner = IERC721(accessPassContract).ownerOf(tokenId);
            sleepToken.transfer(nftOwner, recoverableAmount);
        }
        // rewardPoolAmount 保留在合约中用于分红
        _distributeSleepPenalty(rewardPoolAmount);
        
        emit StakeLiquidated(tokenId, depositIndex, msg.sender, liquidatorReward, penaltyAmount);
    }

    /**
     * @dev Internal function to distribute SLEEP penalty rewards to the pools
     * @param amount The total amount of SLEEP tokens from penalties
     */
    function _distributeSleepPenalty(uint256 amount) internal {
        if (amount == 0) return;

        // Per whitepaper 6.5, penalty fees are distributed among 4 pools (excluding 6-day pool)
        // 25% (from 6-day pool) / 4 = 6.25% extra per pool
        uint256 sixDayAllocation = dividendPools[DividendPeriod.SIX_DAYS].allocationPercent; // 25
        uint256 extraAllocationPerPool = FullMath.mulDiv(amount, sixDayAllocation, 400); // amount * 25 / 400 = amount * 6.25%

        uint256 thirtyDayAllocation = FullMath.mulDiv(amount, dividendPools[DividendPeriod.THIRTY_DAYS].allocationPercent, 100);
        sleepRewardPools[DividendPeriod.THIRTY_DAYS] += thirtyDayAllocation + extraAllocationPerPool;

        uint256 ninetyDayAllocation = FullMath.mulDiv(amount, dividendPools[DividendPeriod.NINETY_DAYS].allocationPercent, 100);
        sleepRewardPools[DividendPeriod.NINETY_DAYS] += ninetyDayAllocation + extraAllocationPerPool;

        uint256 threeSixtyDayAllocation = FullMath.mulDiv(amount, dividendPools[DividendPeriod.THREESIXTY_DAYS].allocationPercent, 100);
        sleepRewardPools[DividendPeriod.THREESIXTY_DAYS] += threeSixtyDayAllocation + extraAllocationPerPool;

        uint256 sevenTwentyDayAllocation = FullMath.mulDiv(amount, dividendPools[DividendPeriod.SEVENTY_TWENTY_DAYS].allocationPercent, 100);
        sleepRewardPools[DividendPeriod.SEVENTY_TWENTY_DAYS] += sevenTwentyDayAllocation + extraAllocationPerPool;
    }

    // ===================================================================
    //                           DIVIDEND SYSTEM
    // ===================================================================

    /**
     * @dev Updates reward variables for all pools.
     * This should be called before any user action that changes share balance.
     */
    function _massUpdatePools() internal {
        for (uint i = 0; i < 5; i++) {
            _settlePeriodRewards(i);
        }
    }

    /**
     * @dev Settles the rewards for a single pool if its period has ended.
     * It calculates the rewards earned per share for the period and adds it to the accumulator.
     * @param poolIndex The index of the pool to settle (0-4).
     */
    function _settlePeriodRewards(uint256 poolIndex) internal {
        DividendPool storage pool = dividendPools[DividendPeriod(poolIndex)];
        uint256 periodSeconds = pool.periodDays * SECONDS_IN_DAY;
        
        // Check if the period is over
        if (getCurrentTime() < pool.lastDistribution + periodSeconds) {
            return; // Not time to settle yet
        }

        // If there are no shares or no rewards, just update the timestamp and return
        if (totalEffectiveShares == 0 || pool.totalRewards == 0) {
            pool.lastDistribution = getCurrentTime();
            return;
        }

        // Calculate the reward increment per share for this period
        uint256 rewardIncrement = FullMath.mulDiv(pool.totalRewards, 1e18, totalEffectiveShares);

        // Add the increment to the pool's accumulator
        pool.rewardPerSharePaid += rewardIncrement;

        // Reset the pool's temporary rewards and update the settlement time
        pool.totalRewards = 0;
        pool.lastDistribution = getCurrentTime();
        
        emit DividendDistributed(DividendPeriod(poolIndex), rewardIncrement, totalEffectiveShares);
    }

    /**
     * @dev Deposit OKB rewards to be distributed across dividend pools
     */
    function depositReward() public payable {
        uint256 amount = msg.value;
        require(amount > 0, "Staking: Cannot deposit 0");
        
        // Distribute to pools according to allocation percentages
        uint256 remaining = amount;
        
        DividendPeriod[5] memory periods = [
            DividendPeriod.SIX_DAYS,
            DividendPeriod.THIRTY_DAYS, 
            DividendPeriod.NINETY_DAYS,
            DividendPeriod.THREESIXTY_DAYS,
            DividendPeriod.SEVENTY_TWENTY_DAYS
        ];
        
        for (uint i = 0; i < 4; i++) {
            uint256 allocation = FullMath.mulDiv(amount, dividendPools[periods[i]].allocationPercent, 100);
            dividendPools[periods[i]].totalRewards += allocation;
            remaining -= allocation;
        }
        
        // Add remaining to the last pool to handle rounding
        dividendPools[periods[4]].totalRewards += remaining;
    }

    /**
     * @dev Deposit SLEEP rewards from TokenMinter penalty system
     * @param amount Amount of SLEEP tokens to distribute
     */
    function depositSleepReward(uint256 amount) external {
        require(msg.sender == tokenMinterContract, "Staking: Only TokenMinter can deposit SLEEP rewards");
        require(amount > 0, "Staking: Cannot deposit 0");
        
        // Transfer the tokens from TokenMinter to this contract
        sleepToken.transferFrom(msg.sender, address(this), amount);
        
        // Distribute the SLEEP penalty rewards using the same logic as internal penalties
        _distributeSleepPenalty(amount);
        
        emit RewardsClaimed(0, DividendPeriod.SIX_DAYS, amount); // Using generic event for now
    }

    /**
     * @dev Check if a dividend period is ready for distribution
     */
    function isDividendReady(DividendPeriod period) public view returns (bool) {
        DividendPool storage pool = dividendPools[period];
        uint256 timeSinceLastDistribution = getCurrentTime() - pool.lastDistribution;
        uint256 periodSeconds = pool.periodDays * SECONDS_IN_DAY;
        
        return timeSinceLastDistribution >= periodSeconds;
    }

    /**
     * @dev Distribute dividends for a specific period
     */
    function distributeDividends(DividendPeriod period) external {
        require(isDividendReady(period), "Staking: Period not ready for distribution");
        
        // This function is now effectively replaced by the automatic settlement logic.
        // We can call the settlement function directly.
        _settlePeriodRewards(uint(period));

        /* OLD LOGIC
        DividendPool storage pool = dividendPools[period];
        uint256 rewardsToDistribute = pool.totalRewards;
        
        if (rewardsToDistribute > 0 && totalShares > 0) {
            // Reset pool
            pool.totalRewards = 0;
            pool.lastDistribution = getCurrentTime();
            
            emit DividendDistributed(period, rewardsToDistribute, totalShares);
        }
        */
    }

    /**
     * @dev Claim all available rewards (OKB) for a given NFT.
     * This function is now highly efficient thanks to the accumulator model.
     * @param tokenId The NFT to claim rewards for
     */
    function claimAllRewards(uint256 tokenId) external nonReentrant {
        address nftOwner = IERC721(accessPassContract).ownerOf(tokenId);
        require(msg.sender == nftOwner, "Staking: Caller is not the NFT owner");

        // --- Settle all pending rewards first ---
        _massUpdatePools();
        _updateNftRewards(tokenId);

        // --- Sum up all claimable rewards from the NFT's pending balances ---
        uint256 totalOkbRewards = 0;
        for (uint i = 0; i < 5; i++) {
            totalOkbRewards += nftPendingRewards[tokenId][i];
            nftPendingRewards[tokenId][i] = 0; // Reset after counting
        }
        
        if (totalOkbRewards > 0) {
            payable(msg.sender).transfer(totalOkbRewards);
            emit RewardsClaimed(tokenId, DividendPeriod.SIX_DAYS, totalOkbRewards); // Emitting with a generic period for now
        }

        // --- Claiming SLEEP rewards remains unchanged, as it's a separate system ---
        (uint256 totalSleepRewards, DividendPeriod[4] memory sleepPeriods, uint256[] memory sleepRewardsPerPeriod) = getClaimableSleepRewards(tokenId);

        if (totalSleepRewards > 0) {
            for (uint i = 0; i < sleepPeriods.length; i++) {
                if (sleepRewardsPerPeriod[i] > 0) {
                    sleepRewardPools[sleepPeriods[i]] -= sleepRewardsPerPeriod[i];
                }
            }
            sleepToken.transfer(msg.sender, totalSleepRewards);
            // We can emit a new event for this or reuse the existing one
            // emit SleepRewardsClaimed(tokenId, totalSleepRewards);
        }
    }

    /**
     * @notice Get the reward status for a specific NFT.
     * @dev Returns both the rewards that are settled and ready to be claimed,
     *      and an estimate of the rewards pending in the current, unsettled periods.
     * @param tokenId The ID of the NFT to query.
     * @return claimableRewards Total OKB that can be claimed right now.
     * @return pendingRewards Estimated OKB from the current, not-yet-settled periods.
     */
    function getPendingRewards(uint256 tokenId) public view returns (uint256 claimableRewards, uint256 pendingRewards) {
        uint256 effectiveShares = nftTotalEffectiveShares[tokenId];
        
        // 1. Calculate settled, claimable rewards
        for (uint i = 0; i < 5; i++) {
            claimableRewards += nftPendingRewards[tokenId][i];
        }

        // 2. Estimate pending, unsettled rewards
        if (effectiveShares > 0) {
            for (uint i = 0; i < 5; i++) {
                DividendPeriod period = DividendPeriod(i);
                DividendPool storage pool = dividendPools[period];

                // Calculate the potential reward increment if the period were to settle now
                uint256 rewardIncrement = FullMath.mulDiv(pool.totalRewards, 1e18, totalEffectiveShares);
                uint256 totalRewardPerShare = pool.rewardPerSharePaid + rewardIncrement;
                
                uint256 lastRewardPerShare = nftRewardDebt[tokenId][i];

                if (totalRewardPerShare > lastRewardPerShare) {
                    uint256 earned = FullMath.mulDiv(effectiveShares, totalRewardPerShare - lastRewardPerShare, 1e18);
                    pendingRewards += earned;
                }
            }
        }
    }

    // ===================================================================
    //                           NFT-BASED VIEW FUNCTIONS
    // ===================================================================

    /**
     * @dev Get deposit records for an NFT
     */
    function getNftDeposits(uint256 tokenId) external view returns (DepositRecord[6] memory) {
        return nftDeposits[tokenId];
    }

    /**
     * @dev Get available deposit slots for an NFT
     */
    function getAvailableDepositSlots(uint256 tokenId) external view returns (uint256[] memory availableSlots) {
        uint256 availableCount = 0;
        
        // First pass: count available slots
        for (uint i = 0; i < 6; i++) {
            if (!nftDeposits[tokenId][i].isActive) {
                availableCount++;
            }
        }
        
        // Second pass: populate array
        availableSlots = new uint256[](availableCount);
        uint256 index = 0;
        for (uint i = 0; i < 6; i++) {
            if (!nftDeposits[tokenId][i].isActive) {
                availableSlots[index] = i;
                index++;
            }
        }
    }

    /**
     * @dev Get NFT staking summary
     */
    function getNftStakingSummary(uint256 tokenId) external view returns (
        uint256 nftStaked,
        uint256 nftShares,
        uint256 depositCount,
        uint256 maxBiggerBenefit
    ) {
        nftStaked = nftTotalStaked[tokenId];
        nftShares = nftTotalShares[tokenId];
        depositCount = nftDepositCount[tokenId];
        
        // Calculate max BiggerBenefit across all deposits
        maxBiggerBenefit = 0;
        for (uint i = 0; i < depositCount; i++) {
            if (nftDeposits[tokenId][i].isActive && nftDeposits[tokenId][i].biggerBenefit > maxBiggerBenefit) {
                maxBiggerBenefit = nftDeposits[tokenId][i].biggerBenefit;
            }
        }
    }

    /**
     * @dev [DEPRECATED] - Old reward calculation logic. All rewards are now calculated via the accumulator.
     */
    /*
    function getClaimableOkbRewards(uint256 tokenId) public view returns (uint256 totalClaimable, DividendPeriod[5] memory periods, uint256[] memory rewardsPerPeriod) {
        totalClaimable = 0;
        rewardsPerPeriod = new uint256[](5);
        periods = [
            DividendPeriod.SIX_DAYS,
            DividendPeriod.THIRTY_DAYS,
            DividendPeriod.NINETY_DAYS,
            DividendPeriod.THREESIXTY_DAYS,
            DividendPeriod.SEVENTY_TWENTY_DAYS
        ];
        
        for (uint i = 0; i < 6; i++) {
            if (nftDeposits[tokenId][i].isActive) {
                 for (uint j = 0; j < periods.length; j++) {
                    if (_isDepositEligibleForPeriod(tokenId, i, periods[j])) {
                        uint256 periodReward = _calculatePeriodRewardForDeposit(tokenId, i, periods[j]);
                        uint256 alreadyClaimed = nftClaimedRewards[tokenId][periods[j]];
                        if (periodReward > alreadyClaimed) {
                            uint256 claimable = periodReward - alreadyClaimed;
                            rewardsPerPeriod[j] += claimable;
                            totalClaimable += claimable;
                        }
                    }
                }
            }
        }
    }
    */

    /**
     * @dev Get claimable SLEEP rewards for an NFT from the penalty pools
     */
    function getClaimableSleepRewards(uint256 tokenId) public view returns (uint256 totalClaimable, DividendPeriod[4] memory periods, uint256[] memory rewardsPerPeriod) {
        totalClaimable = 0;
        rewardsPerPeriod = new uint256[](4);
        periods = [
            DividendPeriod.THIRTY_DAYS,
            DividendPeriod.NINETY_DAYS,
            DividendPeriod.THREESIXTY_DAYS,
            DividendPeriod.SEVENTY_TWENTY_DAYS
        ];

        uint256 nftShares = nftTotalShares[tokenId];
        if (nftShares == 0 || totalEffectiveShares == 0) {
            return (0, periods, rewardsPerPeriod);
        }

        for (uint i = 0; i < periods.length; i++) {
            DividendPeriod period = periods[i];
            uint256 poolBalance = sleepRewardPools[period];
            if (poolBalance > 0) {
                uint256 reward = FullMath.mulDiv(poolBalance, nftShares, totalEffectiveShares);
                rewardsPerPeriod[i] = reward;
                totalClaimable += reward;
            }
        }
    }

    /**
     * @dev [DEPRECATED] - Old reward calculation logic.
     */
    /*
    function _calculateDepositRewards(uint256 tokenId, uint256 depositIndex) internal view returns (uint256 depositRewards) {
        DepositRecord storage deposit = nftDeposits[tokenId][depositIndex];
        if (!deposit.isActive) return 0;
        
        depositRewards = 0;
        
        // Check each dividend period
        DividendPeriod[5] memory periods = [
            DividendPeriod.SIX_DAYS,
            DividendPeriod.THIRTY_DAYS,
            DividendPeriod.NINETY_DAYS,
            DividendPeriod.THREESIXTY_DAYS,
            DividendPeriod.SEVENTY_TWENTY_DAYS
        ];
        
        for (uint i = 0; i < 5; i++) {
            DividendPeriod period = periods[i];
            
            // Check if this deposit is eligible for this period
            if (_isDepositEligibleForPeriod(tokenId, depositIndex, period)) {
                // Calculate this deposit's share of the period rewards
                uint256 periodReward = _calculatePeriodRewardForDeposit(tokenId, depositIndex, period);
                uint256 alreadyClaimed = nftClaimedRewards[tokenId][period];
                if (periodReward > alreadyClaimed) {
                     depositRewards += periodReward - alreadyClaimed;
                }
            }
        }
    }
    */

    /**
     * @dev [DEPRECATED] - Old reward calculation logic.
     */
    /*
    function _isDepositEligibleForPeriod(uint256 tokenId, uint256 depositIndex, DividendPeriod period) internal view returns (bool) {
        DepositRecord storage deposit = nftDeposits[tokenId][depositIndex];
        DividendPool storage pool = dividendPools[period];
        
        // Calculate time since deposit
        uint256 timeSinceDeposit = block.timestamp - deposit.timestamp;
        uint256 periodSeconds = pool.periodDays * SECONDS_IN_DAY;
        
        // Must be within the entry window (1/3 of the period)
        uint256 entryWindow = periodSeconds / 3;
        
        // Check if deposit was made within the entry window for the current cycle
        uint256 timeSinceLastDistribution = getCurrentTime() - pool.lastDistribution;
        
        return timeSinceDeposit >= entryWindow && timeSinceLastDistribution <= periodSeconds;
    }
    */
    
    /**
     * @dev [DEPRECATED] - Old reward calculation logic.
     */
    /*
    function _calculatePeriodRewardForDeposit(uint256 tokenId, uint256 depositIndex, DividendPeriod period) internal view returns (uint256) {
        DepositRecord storage deposit = nftDeposits[tokenId][depositIndex];
        DividendPool storage pool = dividendPools[period];
        
        if (pool.totalRewards == 0 || totalEffectiveShares == 0) return 0;
        
        // This was the old logic that had a flaw (using effective shares in numerator and base in denominator)
        // The new model is mathematically sound.
        uint256 effectiveShares = deposit.effectiveShares;
        
        return FullMath.mulDiv(pool.totalRewards, effectiveShares, totalEffectiveShares);
    }
    */

    /**
     * @dev Calculate LongerPaysMore bonus based on staking days
     * Maximum 206% bonus for 1500+ days
     */
    function _calculateLongerPaysMoreBonus(uint256 stakingDays) internal pure returns (uint256) {
        if (stakingDays >= 1500) {
            return 206; // Maximum bonus
        }
        
        // Linear scaling from 0% to 206% over 1500 days
        return FullMath.mulDiv(stakingDays, 206, 1500);
    }

    /**
     * @dev 计算提前取回惩罚 - 根据白皮书规范！
     * @param deposit 存款记录
     * @return recoverableAmount 可取回的本金数量
     * @return penaltyAmount 惩罚的本金数量
     * @return burnAmount 需要销毁的数量
     * @return rewardPoolAmount 进入奖励池的数量
     */
    function _calculateWithdrawalPenalty(DepositRecord memory deposit) internal view returns (uint256 recoverableAmount, uint256 penaltyAmount, uint256 burnAmount, uint256 rewardPoolAmount) {
        // This function now encapsulates all withdrawal penalty logic.
        uint256 withdrawAmount = deposit.amount;

        // 最低质押期检查：26天 (already checked by stakingDays >= 26 in registerStake, but kept for safety)
        require(deposit.stakingDays >= 26, "Staking: Minimum staking period is 26 days");

        // 计算到期时间和宽限期
        uint256 maturityTime = deposit.timestamp + (deposit.stakingDays * SECONDS_IN_DAY);
        
        if (getCurrentTime() < maturityTime) {
            // === CASE A: Early Withdrawal (未到期) ===
            uint256 timeElapsed = getCurrentTime() - deposit.timestamp;
            uint256 totalDuration = deposit.stakingDays * SECONDS_IN_DAY;
            
            // 质押期未满50%时，不允许结束质押
            require(timeElapsed * 100 >= totalDuration * 50, "Staking: Cannot withdraw before 50% of staking period");
            
            // 55%惩罚：49%销毁 + 6%奖励池，45%返回用户
            penaltyAmount = FullMath.mulDiv(withdrawAmount, 55, 100);
            recoverableAmount = withdrawAmount - penaltyAmount;
            burnAmount = FullMath.mulDiv(penaltyAmount, 49, 55); // 49/55 of penalty
            rewardPoolAmount = penaltyAmount - burnAmount; // 6/55 of penalty
            
        } else {
            // === CASE B: Matured or Late Withdrawal (已到期或延迟) ===
            uint256 graceTime = maturityTime + (6 * SECONDS_IN_DAY); // 6天宽限期

            if (getCurrentTime() <= graceTime) {
                // --- Matured, within grace period ---
                recoverableAmount = withdrawAmount;
                penaltyAmount = 0;
                burnAmount = 0;
                rewardPoolAmount = 0;
            } else {
                // --- Late, after grace period ---
                uint256 secondsOverdue = getCurrentTime() - graceTime;
                // Use mulDiv to prevent overflow before division
                uint256 daysOverdue = FullMath.mulDiv(secondsOverdue, 1, SECONDS_IN_DAY);
                uint256 penaltyPercent = daysOverdue * 145; // 1.45% per day = 145 basis points
                
                // 最大罚没96%
                if (penaltyPercent > 9600) penaltyPercent = 9600; // 96%
                
                penaltyAmount = FullMath.mulDiv(withdrawAmount, penaltyPercent, 10000);
                recoverableAmount = withdrawAmount - penaltyAmount;
                
                // 延迟惩罚分配：6%奖励池 + 94%销毁 (清算人奖励在 liquidateStake 中处理)
                rewardPoolAmount = FullMath.mulDiv(penaltyAmount, 6, 100);
                burnAmount = penaltyAmount - rewardPoolAmount;
            }
        }
    }


    // ===================================================================
    //                           ADMIN FUNCTIONS
    // ===================================================================

    function setAccessPassContract(address _accessPassContract) external onlyOwner {
        accessPassContract = _accessPassContract;
        emit AccessPassContractUpdated(_accessPassContract);
    }

    function setTokenMinterContract(address _tokenMinterContract) external onlyOwner {
        tokenMinterContract = _tokenMinterContract;
        emit TokenMinterContractUpdated(_tokenMinterContract);
    }

    function setTreasuryContract(address _treasuryContract) external onlyOwner {
        treasuryContract = _treasuryContract;
        emit TreasuryContractUpdated(_treasuryContract);
    }

    function setSleepTokenAddress(address _sleepTokenAddress) external onlyOwner {
        require(_sleepTokenAddress != address(0), "Staking: SleepToken address cannot be zero");
        sleepToken = IERC20(_sleepTokenAddress);
    }

    // Emergency function to withdraw stuck tokens
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }

    // Emergency function to withdraw OKB
    function emergencyWithdrawOKB(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
    }
}
