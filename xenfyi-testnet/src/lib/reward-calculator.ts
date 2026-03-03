import { parseUnits } from "viem";

// All constants are based on the Solidity contract
const SECONDS_IN_DAY = 86400;
const EAA = 100_000;

/**
 * Calculates the maximum allowed mint term in seconds.
 * @param genesisTs The genesis timestamp of the protocol.
 * @returns The maximum term in seconds.
 */
export const calculateMaxTerm = (genesisTs: number): number => {
  const daysSinceGenesis = Math.floor((Date.now() / 1000 - genesisTs) / SECONDS_IN_DAY);
  return (45 + Math.floor(daysSinceGenesis / 3)) * SECONDS_IN_DAY;
};

/**
 * Calculates the reward amplifier based on the global rank.
 * @param globalRank The current global rank.
 * @returns The calculated amplifier.
 */
export const calculateRewardAmplifier = (globalRank: number): number => {
  const reductions = Math.floor(globalRank / 100_000);
  let baseAmplifier = 100;
  for (let i = 0; i < reductions; i++) {
    baseAmplifier = (baseAmplifier * 98) / 100;
  }
  return baseAmplifier > 1 ? baseAmplifier : 1;
};

/**
 * Calculates the time decay factor.
 * @param genesisTs The genesis timestamp of the protocol.
 * @returns A factor between 0 and 1.
 */
export const calculateTimeDecayFactorFromDays = (daysSinceGenesis: number): number => {
  const exponent = -0.0038 * daysSinceGenesis;
  return Math.exp(exponent);
};

export const calculateTimeDecayFactor = (genesisTs: number): number => {
  const daysSinceGenesis = Math.floor((Date.now() / 1000 - genesisTs) / SECONDS_IN_DAY);
  return calculateTimeDecayFactorFromDays(daysSinceGenesis);
};

/**
 * Calculates the estimated mint reward per unit.
 * @param term The user-selected term in days.
 * @param globalRank The current global rank from context.
 * @param userRank The user's specific mint rank.
 * @param genesisTs The genesis timestamp from context.
 * @returns An object containing totalReward, baseReward, and rankBonus as BigInts.
 */
export const calculateMintReward = (
  term: number, 
  globalRank: number, 
  userRank: number, 
  genesisTs: number
): { totalReward: bigint; baseReward: bigint; rankBonus: bigint } => {
  if (term <= 0 || globalRank <= 0 || userRank <= 0 || genesisTs <= 0) {
    return { totalReward: 0n, baseReward: 0n, rankBonus: 0n };
  }
  
  const rankDelta = globalRank > userRank ? globalRank - userRank : 0;
  const effectiveRankDelta = rankDelta < 2 ? 2 : rankDelta;

  const termInSeconds = term * SECONDS_IN_DAY;
  
  // Base reward is calculated with the minimum rank difference (log2(2) = 1)
  const baseRankDiff = 1; // Math.log2(2)

  // Actual reward is calculated with the real rank difference
  const actualRankDiff = Math.log2(effectiveRankDelta);

  const amplifier = calculateRewardAmplifier(globalRank);
  const timeDecayFactor = calculateTimeDecayFactor(genesisTs);

  const calculateDecayedReward = (rankDiff: number): bigint => {
    const grossRewardFloat = (rankDiff * amplifier * termInSeconds * EAA) / 1_000_000;
    const decayedRewardFloat = grossRewardFloat * timeDecayFactor;
    if (decayedRewardFloat <= 0 || !isFinite(decayedRewardFloat)) {
      return 0n;
    }
    const rewardString = decayedRewardFloat.toFixed(18);
    return parseUnits(rewardString, 18);
  };

  const totalReward = calculateDecayedReward(actualRankDiff);
  const baseReward = calculateDecayedReward(baseRankDiff);
  const rankBonus = totalReward > baseReward ? totalReward - baseReward : 0n;

  return { totalReward, baseReward, rankBonus };
};

/**
 * Calculates the estimated mint reward for the simulator.
 * @param term The user-selected term in days.
 * @param globalRank The simulated global rank.
 * @param daysSinceGenesis The simulated days since genesis.
 * @returns The estimated reward as a BigInt with 18 decimals.
 */
export const calculateSimulatedMintReward = (term: number, globalRank: number, daysSinceGenesis: number): bigint => {
  if (term <= 0 || globalRank <= 1) { // globalRank must be > 1 for log to work
    return 0n;
  }

  const termInSeconds = term * SECONDS_IN_DAY;
  
  // In simulation, user's rank is `globalRank`, so rankDelta is effectively `globalRank - globalRank = 0`, which becomes 2.
  const effectiveRankDelta = 2;
  const rankDiff = Math.log2(effectiveRankDelta); 
  
  const amplifier = calculateRewardAmplifier(globalRank);

  const grossRewardFloat = (rankDiff * amplifier * termInSeconds * EAA) / 1_000_000;

  const timeDecayFactor = calculateTimeDecayFactorFromDays(daysSinceGenesis);

  const decayedRewardFloat = grossRewardFloat * timeDecayFactor;
  
  if (decayedRewardFloat <= 0 || !isFinite(decayedRewardFloat)) {
    return 0n;
  }

  const rewardString = decayedRewardFloat.toFixed(18);
  return parseUnits(rewardString, 18);
};

/**
 * Calculates the penalty percentage based on the maturity timestamp.
 * This function mirrors the logic in the SleepMinter.sol contract.
 * @param maturityTs The maturity timestamp of the NFT in seconds.
 * @returns The penalty percentage (0-99).
 */
export const calculatePenaltyPercent = (maturityTs: number): number => {
  const now = Date.now() / 1000;
  if (now < maturityTs) {
    return 0;
  }

  const secondsLate = now - maturityTs;
  const daysLate = Math.floor(secondsLate / SECONDS_IN_DAY);

  // Phase 1: Rest Period (Days 1-2 Post-Maturity)
  if (daysLate < 2) {
    return 0;
  }

  // Phase 2: Strategic Window (Days 3-5 Post-Maturity)
  if (daysLate <= 4) { // Corresponds to Day 3, 4, 5
    return (daysLate - 1) * 5;
  }

  // Phase 3: Wake-up Call (Days 6-10 Post-Maturity)
  if (daysLate <= 9) { // Corresponds to Day 6, 7, 8, 9, 10
    const basePenalty = 15; // Penalty at the end of Day 5
    const additionalPenalty = (daysLate - 4) * 15;
    const totalPenalty = basePenalty + additionalPenalty;
    // On day 10 (daysLate=9), penalty should be 99% as per paper.
    return totalPenalty > 99 ? 99 : totalPenalty;
  }

  // After 10 days
  return 99;
};

/**
 * Applies the calculated penalty to a gross reward amount.
 * @param grossReward The original reward as a BigInt.
 * @param penaltyPercent The penalty percentage (0-99).
 * @returns The net reward after penalty as a BigInt.
 */
export const applyPenalty = (grossReward: bigint, penaltyPercent: number): bigint => {
  if (penaltyPercent <= 0) {
    return grossReward;
  }
  if (penaltyPercent >= 99) {
    // To avoid floating point issues, calculate 1% of the reward for 99% penalty
    return grossReward / 100n;
  }
  const penaltyAmount = (grossReward * BigInt(penaltyPercent)) / 100n;
  return grossReward - penaltyAmount;
};
