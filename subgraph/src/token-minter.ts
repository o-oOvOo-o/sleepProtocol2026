import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  RewardClaimed as RewardClaimedEvent,
  MaturityUpdated as MaturityUpdatedEvent,
  TokenMinter
} from '../generated/TokenMinter/TokenMinter'
import { 
  MintingPositionNFT, 
  ClaimEvent, 
  GlobalStats,
  LiquidationStats 
} from '../generated/schema'


export function handleTransfer(event: TransferEvent): void {
  // Handle minting (from zero address) - 铸币事件
  if (event.params.from == Address.zero()) {
    let contract = TokenMinter.bind(event.address);
    let mintInfo = contract.mintPositions(event.params.tokenId);

    let entity = new MintingPositionNFT(event.params.tokenId.toString())
    entity.tokenId = event.params.tokenId
    entity.owner = event.params.to
    // 铸币基础信息
    entity.term = mintInfo.value1
    entity.maturityTs = mintInfo.value0
    entity.count = mintInfo.value2
    entity.amplifier = mintInfo.value4
    entity.rank = mintInfo.value3
    entity.mintedAt = event.block.timestamp
    
    // 状态初始化
    entity.isMatured = false
    entity.isClaimed = false
    entity.isLiquidated = false
    
    // 计算预期奖励 (可以后续通过合约调用或计算得出)
    entity.expectedReward = BigInt.fromI32(0) // TODO: 实现奖励计算
    entity.currentPenalty = BigInt.fromI32(0)
    
    entity.save()
    
    // 更新全局统计
    updateGlobalStats(event)
    
    log.info("Minted NFT #{} for {} with term {} days", [
      event.params.tokenId.toString(),
      event.params.to.toHex(),
      entity.term.toString()
    ])
  } 
  // Handle regular transfers - 转账事件
  else {
    let entity = MintingPositionNFT.load(event.params.tokenId.toString())
    if (entity) {
      entity.owner = event.params.to
      entity.save()
      
      log.info("Transferred NFT #{} from {} to {}", [
        event.params.tokenId.toString(),
        event.params.from.toHex(),
        event.params.to.toHex()
      ])
    }
  }
}

export function handleRewardClaimed(event: RewardClaimedEvent): void {
  let claimId = event.transaction.hash.toHex()
  let entity = ClaimEvent.load(claimId)
  if (!entity) {
    entity = new ClaimEvent(claimId)
  }

  // 直接使用事件参数 (基于TokenMinter合约的RewardClaimed事件)
  entity.tokenId = event.params.tokenId
  entity.claimer = event.params.claimer
  entity.liquidated = event.params.liquidated
  entity.rewardAmount = event.params.rewardAmount
  entity.penaltyAmount = event.params.penaltyAmount
  entity.claimedAt = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  // 获取原始持有者信息
  let nftPosition = MintingPositionNFT.load(event.params.tokenId.toString())
  if (nftPosition) {
    entity.originalOwner = nftPosition.owner
    entity.nft = nftPosition.id
    
    // 更新NFT状态
    nftPosition.isClaimed = true
    nftPosition.claimEvent = entity.id
    
    if (entity.liquidated) {
      nftPosition.isLiquidated = true
    }
    
    // 计算延迟天数
    let maturityTs = nftPosition.maturityTs
    let claimTs = event.block.timestamp
    if (claimTs > maturityTs) {
      entity.penaltyDays = (claimTs - maturityTs) / BigInt.fromI32(86400) // 秒转天数
    } else {
      entity.penaltyDays = BigInt.fromI32(0)
    }
    
    nftPosition.save()
  }

  entity.save()
  
  // 更新清算统计 (如果是清算)
  if (entity.liquidated) {
    updateLiquidationStats(event.params.rewardAmount, event.params.penaltyAmount, false)
  }
  
  // 更新全局统计
  updateGlobalStats(event)
  
  log.info("Reward claimed for NFT #{}: reward={}, penalty={}, liquidated={}", [
    event.params.tokenId.toString(),
    event.params.rewardAmount.toString(),
    event.params.penaltyAmount.toString(),
    entity.liquidated.toString()
  ])
}

export function handleMaturityUpdated(event: MaturityUpdatedEvent): void {
  let entity = MintingPositionNFT.load(event.params.tokenId.toString())
  if (entity) {
    entity.maturityTs = event.params.newMaturityTs
    
    // 更新到期状态
    entity.isMatured = event.block.timestamp >= entity.maturityTs
    
    entity.save()
    
    log.info("Maturity updated for NFT #{}: new maturity={}", [
      event.params.tokenId.toString(),
      event.params.newMaturityTs.toString()
    ])
  }
}

// 辅助函数：更新全局统计
function updateGlobalStats(event: ethereum.Event): void {
  let stats = GlobalStats.load("1")
  if (!stats) {
    stats = new GlobalStats("1")
    stats.globalRank = BigInt.fromI32(0)
    stats.totalMinted = BigInt.fromI32(0)
    stats.totalClaimed = BigInt.fromI32(0)
    stats.totalLiquidated = BigInt.fromI32(0)
    stats.currentAmplifier = BigInt.fromI32(2920) // 初始放大器值
    stats.currentMaxTerm = BigInt.fromI32(49) // 初始最大期限
    stats.currentDecayFactor = BigInt.fromI32(100000) // 初始衰减因子 (scaled)
    stats.termGrowthPhase = 1
    stats.nextTermIncrease = BigInt.fromI32(0)
  }

  // 根据事件类型更新统计
  if (event instanceof TransferEvent) {
    let transferEvent = event as TransferEvent
    if (transferEvent.params.from == Address.zero()) {
      stats.totalMinted = stats.totalMinted.plus(BigInt.fromI32(1))
      stats.globalRank = stats.globalRank.plus(BigInt.fromI32(1))
    }
  } else if (event instanceof RewardClaimedEvent) {
    let claimEvent = event as RewardClaimedEvent
    stats.totalClaimed = stats.totalClaimed.plus(BigInt.fromI32(1))
    if (claimEvent.params.liquidated) {
      stats.totalLiquidated = stats.totalLiquidated.plus(BigInt.fromI32(1))
    }
  }

  // TODO: 实现动态计算当前放大器、最大期限和衰减因子
  // 这需要基于创世时间和当前时间的差值来计算
  
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

// 辅助函数：更新清算统计
function updateLiquidationStats(rewardAmount: BigInt, penaltyAmount: BigInt, isStaking: boolean): void {
  let stats = LiquidationStats.load("1")
  if (!stats) {
    stats = new LiquidationStats("1")
    stats.totalMintingLiquidations = BigInt.fromI32(0)
    stats.totalMintingTokensLiquidated = BigInt.fromI32(0)
    stats.totalMintingLiquidatorRewards = BigInt.fromI32(0)
    stats.totalMintingPenalties = BigInt.fromI32(0)
    stats.totalStakingLiquidations = BigInt.fromI32(0)
    stats.totalStakingTokensLiquidated = BigInt.fromI32(0)
    stats.totalStakingLiquidatorRewards = BigInt.fromI32(0)
    stats.totalStakingPenalties = BigInt.fromI32(0)
    stats.totalPenaltiesToStaking = BigInt.fromI32(0)
    stats.totalPenaltiesBurned = BigInt.fromI32(0)
  }

  if (isStaking) {
    stats.totalStakingLiquidations = stats.totalStakingLiquidations.plus(BigInt.fromI32(1))
    stats.totalStakingTokensLiquidated = stats.totalStakingTokensLiquidated.plus(rewardAmount)
    stats.totalStakingPenalties = stats.totalStakingPenalties.plus(penaltyAmount)
    // TODO: 计算清算者奖励 (通常是惩罚的一小部分)
  } else {
    stats.totalMintingLiquidations = stats.totalMintingLiquidations.plus(BigInt.fromI32(1))
    stats.totalMintingTokensLiquidated = stats.totalMintingTokensLiquidated.plus(rewardAmount)
    stats.totalMintingPenalties = stats.totalMintingPenalties.plus(penaltyAmount)
  }

  // 惩罚分配: 6%给质押池，1%给清算者，93%销毁
  let penaltyToStaking = penaltyAmount.times(BigInt.fromI32(6)).div(BigInt.fromI32(100))
  let penaltyToBurn = penaltyAmount.times(BigInt.fromI32(93)).div(BigInt.fromI32(100))
  
  stats.totalPenaltiesToStaking = stats.totalPenaltiesToStaking.plus(penaltyToStaking)
  stats.totalPenaltiesBurned = stats.totalPenaltiesBurned.plus(penaltyToBurn)
  
  stats.lastUpdated = BigInt.fromI32(0) // Will be set by caller
  stats.save()
}




