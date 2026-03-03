import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  SleepMinter,
  Transfer,
  RewardClaimed
} from "../generated/SleepMinter/SleepMinter";
import { SleepNftPosition } from "../generated/schema";

// Handles the creation of a new NFT (minting)
export function handleTransfer(event: Transfer): void {
  // We are only interested in mint events, which are Transfers from the zero address
  if (event.params.from.toHexString() == "0x0000000000000000000000000000000000000000") {
    let entity = new SleepNftPosition(event.params.tokenId.toString());
    
    entity.owner = event.params.to;
    entity.creationTimestamp = event.block.timestamp;

    // Fetch the detailed mint info from the contract
    let contract = SleepMinter.bind(event.address);
    let mintInfo = contract.mintPositions(event.params.tokenId);

    entity.minter = mintInfo.getMinter();
    entity.maturityTimestamp = mintInfo.getMaturityTs();
    entity.term = mintInfo.getTerm();
    entity.count = mintInfo.getCount();
    entity.rank = mintInfo.getRank();
    entity.amplifier = mintInfo.getAmplifier();
    
    // Initialize lifecycle fields
    entity.claimedAt = null;
    entity.claimer = null;
    entity.liquidated = false; // Default to not liquidated

    entity.save();
  } else {
    // This is a regular transfer, update the owner
    let entity = SleepNftPosition.load(event.params.tokenId.toString());
    if (entity) {
      entity.owner = event.params.to;
      entity.save();
    }
  }
}

// Handles the end-of-life of an NFT (claimed or liquidated)
export function handleRewardClaimed(event: RewardClaimed): void {
  let entity = SleepNftPosition.load(event.params.tokenId.toString());
  if (entity) {
    entity.claimedAt = event.block.timestamp;
    entity.claimer = event.params.claimer;
    entity.liquidated = event.params.liquidated;
    entity.save();
  }
}

