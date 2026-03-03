import { Address } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  RewardClaimed as RewardClaimedEvent,
  MaturityUpdated as MaturityUpdatedEvent,
  SleepMinter
} from '../generated/SleepMinter/SleepMinter'
import { SleepNftPosition, NftClaimEvent } from '../generated/schema'
import { updateLiquidationStats } from './liquidation-stats'

export function handleTransfer(event: TransferEvent): void {
  // Handle minting (from zero address)
  if (event.params.from == Address.zero()) {
    let contract = SleepMinter.bind(event.address);
    let mintInfo = contract.mintPositions(event.params.tokenId);

    let entity = new SleepNftPosition(event.params.tokenId.toString())
    entity.tokenId = event.params.tokenId
    entity.owner = event.params.to
    entity.term = mintInfo.value1
    entity.maturityTs = mintInfo.value0
    entity.count = mintInfo.value2
    entity.amplifier = mintInfo.value4
    entity.rank = mintInfo.value3
    entity.mintedAt = event.block.timestamp
    entity.isLiquidated = false // Explicitly set initial value
    entity.save()
  } 
  // Handle regular transfers
  else {
    let entity = SleepNftPosition.load(event.params.tokenId.toString())
    if (entity) {
      entity.owner = event.params.to
      entity.save()
    }
  }
}

export function handleRewardClaimed(event: RewardClaimedEvent): void {
  let entity = NftClaimEvent.load(event.transaction.hash.toHex())
  if (!entity) {
    entity = new NftClaimEvent(event.transaction.hash.toHex())
  }
  entity.tokenId = event.params.tokenId
  entity.claimer = event.params.claimer
  entity.rewardAmount = event.params.rewardAmount
  entity.penaltyAmount = event.params.penaltyAmount
  entity.liquidated = event.params.liquidated
  entity.claimedAt = event.block.timestamp
  entity.save()

  // If the claim was a liquidation, update the original NFT position
  if (event.params.liquidated) {
    let nftPosition = SleepNftPosition.load(event.params.tokenId.toString())
    if (nftPosition) {
      nftPosition.isLiquidated = true
      nftPosition.save()
    }
    // Also, update the global liquidation statistics
    updateLiquidationStats(event)
  }
}

export function handleMaturityUpdated(event: MaturityUpdatedEvent): void {
  let entity = SleepNftPosition.load(event.params.tokenId.toString())
  if (entity) {
    entity.maturityTs = event.params.newMaturityTs
    entity.save()
  }
}
