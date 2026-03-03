import { BigInt } from "@graphprotocol/graph-ts";
import { RewardClaimed as RewardClaimedEvent } from "../generated/SleepMinter/SleepMinter";
import { LiquidationStats } from "../generated/schema";

// This function is called when a reward claim is identified as a liquidation event.
export function updateLiquidationStats(event: RewardClaimedEvent): void {
  // Load or create the singleton LiquidationStats entity.
  let stats = LiquidationStats.load("1");
  if (stats == null) {
    stats = new LiquidationStats("1");
    stats.totalMintingLiquidations = BigInt.fromI32(0);
    stats.totalMintingTokensLiquidated = BigInt.fromI32(0);
    stats.totalMintingLiquidatorRewards = BigInt.fromI32(0);
    stats.totalMintingPenalties = BigInt.fromI32(0);
    stats.totalStakingLiquidations = BigInt.fromI32(0);
    stats.totalStakingTokensLiquidated = BigInt.fromI32(0);
    stats.totalStakingLiquidatorRewards = BigInt.fromI32(0);
    stats.totalStakingPenalties = BigInt.fromI32(0);
    stats.totalPenaltiesToStaking = BigInt.fromI32(0);
    stats.totalPenaltiesBurned = BigInt.fromI32(0);
    stats.totalBurnedTokens = BigInt.fromI32(0);
    stats.totalLiquidatedTokens = BigInt.fromI32(0);
  }

  // From the event, we get the penaltyAmount.
  const penaltyAmount = event.params.penaltyAmount;

  // The liquidator's reward is 1% of the original gross reward. 
  // Since penalty is 99% of gross, gross reward is penalty / 0.99.
  const grossReward = penaltyAmount.times(BigInt.fromI32(100)).div(BigInt.fromI32(99));
  const liquidatorReward = grossReward.minus(penaltyAmount);

  // The stakers' reward is 6% of the penalty amount.
  const stakingReward = penaltyAmount.times(BigInt.fromI32(6)).div(BigInt.fromI32(100));
  
  // The rest of the penalty is burned.
  const burnedAmount = penaltyAmount.minus(stakingReward);

  // Update the statistics.
  // Update minting liquidation stats (assuming this is a minting liquidation)
  stats.totalMintingLiquidations = stats.totalMintingLiquidations.plus(BigInt.fromI32(1));
  stats.totalMintingLiquidatorRewards = stats.totalMintingLiquidatorRewards.plus(liquidatorReward);
  stats.totalPenaltiesToStaking = stats.totalPenaltiesToStaking.plus(stakingReward);
  stats.totalBurnedTokens = stats.totalBurnedTokens.plus(burnedAmount);
  stats.totalLiquidatedTokens = stats.totalLiquidatedTokens.plus(grossReward); // Track total value liquidated
  stats.lastUpdated = event.block.timestamp;

  stats.save();
}
