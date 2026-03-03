import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import {
  StakeRegistered as StakeRegisteredEvent,
  StakeDeregistered as StakeDeregisteredEvent,
  SharesConverted as SharesConvertedEvent,
  DividendDistributed as DividendDistributedEvent,
  TokenStaking
} from '../generated/TokenStaking/TokenStaking'
import {
  AccessPassNFT,
  StakingDeposit,
  DividendDistribution,
  StakingStats
} from '../generated/schema'

function getOrCreateStakingStats(): StakingStats {
  let stats = StakingStats.load("1")
  if (!stats) {
    stats = new StakingStats("1")
    stats.totalAccessPasses = BigInt.fromI32(0)
    stats.totalStakedAmount = BigInt.fromI32(0)
    stats.totalActiveDeposits = 0
    stats.totalShares = BigInt.fromI32(0)
    stats.totalDividendsDistributed = BigInt.fromI32(0)
    stats.totalDividendRounds = BigInt.fromI32(0)
    stats.currentShareRate = BigInt.fromI32(10).pow(18) // 1e18
    stats.averageAPY = BigInt.fromI32(100)
    stats.maxAPYLevel = 100
    stats.lastDividendTime = BigInt.fromI32(0)
    stats.lastUpdated = BigInt.fromI32(0)
  }
  return stats
}

export function handleStakeRegistered(event: StakeRegisteredEvent): void {
  let tokenId = event.params.tokenId
  let depositIndex = event.params.depositIndex
  let amount = event.params.amount
  let stakingDays = event.params.stakingDays
  let shares = event.params.shares

  // 获取或创建AccessPass NFT
  let accessPass = AccessPassNFT.load(tokenId.toString())
  if (!accessPass) {
    accessPass = new AccessPassNFT(tokenId.toString())
    accessPass.tokenId = tokenId
    accessPass.owner = event.transaction.from // 初始设置，会被TokenAccessPass的Transfer事件更新
    accessPass.totalAmount = BigInt.fromI32(0)
    accessPass.depositCount = 0
    accessPass.activeDeposits = 0
    accessPass.biggerBenefitLevel = 0
    accessPass.maxLongerPaysBonusLevel = 0
    accessPass.hasInfiniteStaking = false
    accessPass.totalShares = BigInt.fromI32(0)
    accessPass.claimableRewards = BigInt.fromI32(0)
    accessPass.totalRewardsClaimed = BigInt.fromI32(0)
    accessPass.customSvg = ""
    accessPass.cardLevel = "Bronze"
    accessPass.createdAt = event.block.timestamp
    accessPass.lastUpdated = event.block.timestamp
  }

  // 创建存款记录
  let depositId = tokenId.toString() + "-" + depositIndex.toString()
  let deposit = new StakingDeposit(depositId)
  deposit.accessPass = accessPass.id
  deposit.depositIndex = depositIndex.toI32()
  deposit.amount = amount
  deposit.shares = shares
  deposit.stakingDays = stakingDays
  deposit.maturityTs = event.block.timestamp.plus(stakingDays.times(BigInt.fromI32(86400)))
  deposit.depositedAt = event.block.timestamp
  deposit.shareRate = getOrCreateStakingStats().currentShareRate
  deposit.amplifierSnapshot = BigInt.fromI32(2920) // Placeholder
  
  // 计算APY加成
  let isInfinite = stakingDays.equals(BigInt.fromI32(0)) // 0表示无限质押
  deposit.isInfinite = isInfinite
  
  // 计算LongerPaysMore奖励 (最高206% for 1500天，无限质押366%)
  if (isInfinite) {
    deposit.longerPaysMoreBonus = 366
  } else {
    let maxDays = BigInt.fromI32(1500)
    if (stakingDays.gt(maxDays)) {
      deposit.longerPaysMoreBonus = 206
    } else {
      deposit.longerPaysMoreBonus = stakingDays.times(BigInt.fromI32(206)).div(maxDays).toI32()
    }
  }
  
  // 计算BiggerBenefit等级 (基于当前存款金额)
  deposit.biggerBenefitBonus = calculateBiggerBenefitLevel(amount)
  
  // 计算总APY
  deposit.totalAPY = 100 + deposit.longerPaysMoreBonus + deposit.biggerBenefitBonus
  
  // 状态设置
  deposit.isActive = true
  deposit.isMatured = false
  deposit.isWithdrawn = false
  deposit.penaltyAmount = BigInt.fromI32(0)
  
  deposit.save()

  // 更新AccessPass信息
  accessPass.totalAmount = accessPass.totalAmount.plus(amount)
  accessPass.totalShares = accessPass.totalShares.plus(shares)
  accessPass.depositCount = accessPass.depositCount + 1
  accessPass.activeDeposits = accessPass.activeDeposits + 1
  
  // 更新BiggerBenefit等级 (取卡内最高等级)
  let newBiggerBenefitLevel = calculateBiggerBenefitLevel(accessPass.totalAmount)
  if (newBiggerBenefitLevel > accessPass.biggerBenefitLevel) {
    accessPass.biggerBenefitLevel = newBiggerBenefitLevel
  }
  
  // 更新最高LongerPaysMore等级
  if (deposit.longerPaysMoreBonus > accessPass.maxLongerPaysBonusLevel) {
    accessPass.maxLongerPaysBonusLevel = deposit.longerPaysMoreBonus
  }
  
  // 检查是否有无限质押
  if (isInfinite) {
    accessPass.hasInfiniteStaking = true
  }
  
  // 更新卡片等级
  accessPass.cardLevel = calculateCardLevel(accessPass.totalAmount)
  accessPass.lastUpdated = event.block.timestamp
  accessPass.save()

  // 更新质押统计
  updateStakingStats(amount, true, event.block.timestamp)

  log.info("Stake registered: AccessPass #{}, Deposit #{}, Amount: {}, Days: {}", [
    tokenId.toString(),
    depositIndex.toString(),
    amount.toString(),
    stakingDays.toString()
  ])
}

export function handleStakeDeregistered(event: StakeDeregisteredEvent): void {
  let tokenId = event.params.tokenId
  let depositIndex = event.params.depositIndex
  let amount = event.params.amount
  let shares = event.params.shares

  // 更新存款记录
  let depositId = tokenId.toString() + "-" + depositIndex.toString()
  let deposit = StakingDeposit.load(depositId)
  if (deposit) {
    deposit.isWithdrawn = true
    deposit.withdrawnAt = event.block.timestamp
    // penalty is not available in this event, it will be handled by another event or logic
    deposit.isActive = false
    deposit.save()

    // 更新AccessPass
    let accessPass = AccessPassNFT.load(tokenId.toString())
    if (accessPass) {
      accessPass.totalAmount = accessPass.totalAmount.minus(amount)
      accessPass.totalShares = accessPass.totalShares.minus(shares)
      accessPass.activeDeposits = accessPass.activeDeposits - 1
      
      // 重新计算BiggerBenefit等级
      accessPass.biggerBenefitLevel = calculateBiggerBenefitLevel(accessPass.totalAmount)
      accessPass.cardLevel = calculateCardLevel(accessPass.totalAmount)
      accessPass.lastUpdated = event.block.timestamp
      accessPass.save()
    }

    // 更新质押统计
    updateStakingStats(amount, false, event.block.timestamp)

    log.info("Stake deregistered: AccessPass #{}, Deposit #{}, Amount: {}", [
      tokenId.toString(),
      depositIndex.toString(),
      amount.toString()
    ])
  }
}

export function handleSharesConverted(event: SharesConvertedEvent): void {
  let stats = getOrCreateStakingStats()
  stats.currentShareRate = event.params.shareRate
  stats.lastUpdated = event.block.timestamp
  stats.save()

  log.info("Share rate updated: new rate = {}", [
    event.params.shareRate.toString()
  ])
}

export function handleDividendDistributed(event: DividendDistributedEvent): void {
  let period = event.params.period
  let amount = event.params.amount
  let totalShares = event.params.totalEligibleShares

  // 创建分红分配记录
  let epoch = BigInt.fromI32(1) // TODO: 从合约获取实际epoch
  let distributionId = epoch.toString() + "-" + period.toString()
  
  let distribution = new DividendDistribution(distributionId)
  distribution.epoch = epoch
  distribution.period = mapDividendPeriod(period)
  distribution.totalAmount = amount
  distribution.totalShares = totalShares
  
  if (totalShares.gt(BigInt.fromI32(0))) {
    distribution.sharePrice = amount.div(totalShares)
  } else {
    distribution.sharePrice = BigInt.fromI32(0)
  }
  
  distribution.participantCount = 0 // TODO: 计算参与者数量
  distribution.accessPassCount = 0 // TODO: 计算参与的AccessPass数量
  distribution.distributedAt = event.block.timestamp
  distribution.blockNumber = event.block.number
  distribution.save()

  // 更新质押统计
  let stats = getOrCreateStakingStats()
  stats.totalDividendsDistributed = stats.totalDividendsDistributed.plus(amount)
  stats.totalDividendRounds = stats.totalDividendRounds.plus(BigInt.fromI32(1))
  stats.lastDividendTime = event.block.timestamp
  stats.lastUpdated = event.block.timestamp
  stats.save()

  log.info("Dividend distributed: period = {}, amount = {}, totalShares = {}", [
    period.toString(),
    amount.toString(),
    totalShares.toString()
  ])
}

// 辅助函数：计算BiggerBenefit等级
function calculateBiggerBenefitLevel(amount: BigInt): i32 {
  const ONE_ETHER = BigInt.fromI32(10).pow(18)
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(1000)))) return 0        // < 1,000
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(5000)))) return 1        // 1,000-4,999
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(10000)))) return 2       // 5,000-9,999
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(50000)))) return 3       // 10,000-49,999
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(100000)))) return 4      // 50,000-99,999
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(500000)))) return 5      // 100,000-499,999
  return 6                                             // 500,000+
}

// 辅助函数：计算卡片等级
function calculateCardLevel(amount: BigInt): string {
  const ONE_ETHER = BigInt.fromI32(10).pow(18)
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(10000)))) return "Bronze"
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(100000)))) return "Silver"
  if (amount.lt(ONE_ETHER.times(BigInt.fromI32(500000)))) return "Gold"
  return "Diamond"
}

// 辅助函数：映射分红周期
function mapDividendPeriod(period: i32): string {
  if (period == 0) return "SIX_DAYS"
  if (period == 1) return "THIRTY_DAYS"
  if (period == 2) return "NINETY_DAYS"
  if (period == 3) return "THREESIXTY_DAYS"
  if (period == 4) return "SEVENTY_TWENTY_DAYS"
  return "SIX_DAYS" // 默认值
}

// 辅助函数：更新质押统计
function updateStakingStats(amount: BigInt, isDeposit: boolean, timestamp: BigInt): void {
  let stats = getOrCreateStakingStats()

  if (isDeposit) {
    stats.totalStakedAmount = stats.totalStakedAmount.plus(amount)
    stats.totalActiveDeposits = stats.totalActiveDeposits + 1
  } else {
    stats.totalStakedAmount = stats.totalStakedAmount.minus(amount)
    stats.totalActiveDeposits = stats.totalActiveDeposits - 1
  }

  stats.lastUpdated = timestamp
  stats.save()
}















