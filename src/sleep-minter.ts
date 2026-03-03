import { Address } from "@graphprotocol/graph-ts"
import {
  Transfer as TransferEvent,
  RewardClaimed as RewardClaimedEvent,
  SleepMinter
} from "../generated/SleepMinter/SleepMinter"
import { SleepNftPosition, NftClaimEvent } from "../generated/schema"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

export function handleTransfer(event: TransferEvent): void {
  // We only care about mints, which are transfers from the zero address.
  if (event.params.from.toHexString() != ZERO_ADDRESS) {
    return
  }

  let tokenId = event.params.tokenId.toString()
  let entity = new SleepNftPosition(tokenId)

  entity.owner = event.params.to
  entity.creationTimestamp = event.block.timestamp

  // To get the rest of the mint data, we must call the contract state.
  let contract = SleepMinter.bind(event.address)
  let mintInfo = contract.mintPositions(event.params.tokenId)

  entity.maturityTimestamp = mintInfo.value0
  entity.term = mintInfo.value1
  entity.count = mintInfo.value2
  entity.rank = mintInfo.value3
  entity.amplifier = mintInfo.value4
  entity.minter = mintInfo.value5

  entity.save()
}

export function handleRewardClaimed(event: RewardClaimedEvent): void {
  let tokenId = event.params.tokenId.toString()

  // Load the NFT Position to update its owner.
  let nftPosition = SleepNftPosition.load(tokenId)
  if (nftPosition == null) {
    // This should not happen if events are processed in order.
    return
  }
  // Set owner to zero address to signify that the NFT is burned.
  nftPosition.owner = Address.fromString(ZERO_ADDRESS)
  nftPosition.save()

  // Create the separate claim event entity.
  let claimEvent = new NftClaimEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  claimEvent.nft = tokenId
  claimEvent.claimer = event.params.claimer
  claimEvent.liquidated = event.params.liquidated
  claimEvent.timestamp = event.block.timestamp
  claimEvent.blockNumber = event.block.number

  claimEvent.save()
}

