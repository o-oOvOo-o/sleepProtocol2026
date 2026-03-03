import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import {
  EpochFinalized as EpochFinalizedEvent,
  RevenueDistributed as RevenueDistributedEvent,
  POLAddressUpdated as POLAddressUpdatedEvent,
  TokenTreasury
} from '../generated/TokenTreasury/TokenTreasury'
import {
  EpochInfo,
  FeeDistribution,
  TreasuryStats
} from '../generated/schema'

// Helper function to get or create TreasuryStats
function getOrCreateTreasuryStats(): TreasuryStats {
  let stats = TreasuryStats.load("1")
  if (!stats) {
    stats = new TreasuryStats("1")
    stats.totalEpochs = BigInt.fromI32(0)
    stats.totalOkbRevenue = BigInt.fromI32(0)
    stats.totalSleepRevenue = BigInt.fromI32(0)
    stats.totalDistributedToPOL = BigInt.fromI32(0)
    stats.totalDistributedToStaking = BigInt.fromI32(0)
    stats.totalDistributedToBurn = BigInt.fromI32(0)
    stats.polAddress = Address.zero()
    stats.lastUpdated = BigInt.fromI32(0)
  }
  return stats
}

export function handleEpochFinalized(event: EpochFinalizedEvent): void {
  let epochNumber = event.params.epochNumber
  let rankGrowth = event.params.rankGrowth
  let polPercent = event.params.polPercent
  let stakingPercent = event.params.stakingPercent
  let burnPercent = event.params.burnPercent

  let epoch = new EpochInfo(epochNumber.toString())
  epoch.epochNumber = epochNumber
  epoch.rankGrowth = rankGrowth
  epoch.polPercent = polPercent
  epoch.stakingPercent = stakingPercent
  epoch.burnPercent = burnPercent
  epoch.finalizedAt = event.block.timestamp
  
  // Determine mode based on growth
  if (rankGrowth.le(BigInt.fromI32(5000))) {
    epoch.mode = "WINTER"
  } else if (rankGrowth.ge(BigInt.fromI32(50000))) {
    epoch.mode = "BULL"
  } else {
    epoch.mode = "STANDARD"
  }
  epoch.save()

  let stats = getOrCreateTreasuryStats()
  stats.totalEpochs = stats.totalEpochs.plus(BigInt.fromI32(1))
  stats.lastUpdated = event.block.timestamp
  stats.save()
  
  log.info("Epoch #{} finalized. Growth: {}, Allocation: {}% POL, {}% Staking, {}% Burn", [
    epochNumber.toString(),
    rankGrowth.toString(),
    polPercent.toString(),
    stakingPercent.toString(),
    burnPercent.toString()
  ])
}

export function handleRevenueDistributed(event: RevenueDistributedEvent): void {
  let epochNumber = event.params.epochNumber
  let okbAmount = event.params.okbAmount
  let sleepAmount = event.params.sleepAmount

  let distributionId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let feeDistribution = new FeeDistribution(distributionId)
  feeDistribution.epoch = epochNumber.toString()
  feeDistribution.okbAmount = okbAmount
  feeDistribution.sleepAmount = sleepAmount
  feeDistribution.distributedAt = event.block.timestamp
  feeDistribution.save()

  let stats = getOrCreateTreasuryStats()
  stats.totalOkbRevenue = stats.totalOkbRevenue.plus(okbAmount)
  stats.totalSleepRevenue = stats.totalSleepRevenue.plus(sleepAmount)
  
  // Note: More detailed distribution tracking might require access to epoch allocation percentages
  // For now, we just track the total revenue.
  
  stats.lastUpdated = event.block.timestamp
  stats.save()

  log.info("Revenue distributed in Epoch #{}: {} OKB, {} SLEEP", [
    epochNumber.toString(),
    okbAmount.toString(),
    sleepAmount.toString()
  ])
}

export function handlePOLAddressUpdated(event: POLAddressUpdatedEvent): void {
  let newAddress = event.params.newAddress
  
  let stats = getOrCreateTreasuryStats()
  stats.polAddress = newAddress
  stats.lastUpdated = event.block.timestamp
  stats.save()

  log.info("POL address updated to: {}", [newAddress.toHex()])
}















