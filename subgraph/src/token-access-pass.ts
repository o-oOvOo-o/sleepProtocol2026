import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  TokenAccessPass
} from '../generated/TokenAccessPass/TokenAccessPass'
import {
  AccessPassNFT
} from '../generated/schema'

export function handleAccessPassTransfer(event: TransferEvent): void {
    let tokenId = event.params.tokenId.toString()
    let accessPass = AccessPassNFT.load(tokenId)
    if (!accessPass) {
        accessPass = new AccessPassNFT(tokenId)
        accessPass.tokenId = event.params.tokenId
        accessPass.createdAt = event.block.timestamp
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
    }

    accessPass.owner = event.params.to
    accessPass.lastUpdated = event.block.timestamp
    accessPass.save()
}















