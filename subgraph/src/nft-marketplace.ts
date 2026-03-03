import { Address, BigInt, Bytes, log, dataSource } from "@graphprotocol/graph-ts";
import {
  NFTListed as NFTListedEvent,
  NFTSold as NFTSoldEvent,
  NFTDelisted as NFTDelistedEvent,
  MarketplaceFeeUpdated as MarketplaceFeeUpdatedEvent,
  TreasuryUpdated as TreasuryUpdatedEvent
} from "../generated/SleepNftMarketplace/SleepNftMarketplace";
import {
  MarketListing,
  MarketSale,
  MarketStats,
  MarketplaceFeeUpdate,
  MintingPositionNFT,
  AccessPassNFT
} from "../generated/schema";

// Helper to get or create MarketStats singleton
function getOrCreateMarketStats(): MarketStats {
  let stats = MarketStats.load("1");
  if (!stats) {
    stats = new MarketStats("1");
    stats.totalListings = BigInt.fromI32(0);
    stats.activeListings = BigInt.fromI32(0);
    stats.mintingNFTListings = BigInt.fromI32(0);
    stats.accessPassListings = BigInt.fromI32(0);
    stats.totalVolume = BigInt.fromI32(0);
    stats.totalSales = BigInt.fromI32(0);
    stats.totalFees = BigInt.fromI32(0);
    stats.avgMintingNFTPrice = BigInt.fromI32(0);
    stats.avgAccessPassPrice = BigInt.fromI32(0);
    stats.currentFeePercent = BigInt.fromI32(50); // Default 0.5%
    stats.lastUpdated = BigInt.fromI32(0);
  }
  return stats;
}

// No longer needed, as nftContract address is in the event
// function getNFTType(): string { ... }

export function handleNFTListed(event: NFTListedEvent): void {
  log.info("=== NFTListed Event Received ===", []);
  log.info("NFT Contract: {}, TokenId: {}, Seller: {}, Price: {}", [
    event.params.nftContract.toHex(),
    event.params.tokenId.toString(),
    event.params.seller.toHex(),
    event.params.price.toString()
  ]);

  let stats = getOrCreateMarketStats();
  
  // Determine NFT Type from the event parameter (nftContract address)
  // NOTE: These addresses will be updated by update-configs.ts during deployment
  const tokenMinterAddress = "0x3c36c96e69c6585f7b2d877239989a25f80de68f";
  const tokenAccessPassAddress = "0xa4304c2767b18769b795647e45b9d37c06dc0aee";
  let nftType: string;

  const nftContractLower = event.params.nftContract.toHex().toLowerCase();
  
  if (nftContractLower == tokenMinterAddress.toLowerCase()) {
      nftType = "MINTING_POSITION";
  } else if (nftContractLower == tokenAccessPassAddress.toLowerCase()) {
      nftType = "ACCESS_PASS";
  } else {
      log.error("❌ Unrecognized NFT contract address: {}. Expected {} or {}", [
        event.params.nftContract.toHex(),
        tokenMinterAddress,
        tokenAccessPassAddress
      ]);
      return;
  }
  log.info("✅ Determined NFT Type: {}", [nftType]);

  // Create unique listing ID using tokenId + nftContract
  let listingId = event.params.tokenId.toString() + "-" + event.params.nftContract.toHex().toLowerCase();
  
  let listing = new MarketListing(listingId);
  listing.tokenId = event.params.tokenId;
  listing.nftContract = event.params.nftContract;
  listing.nftType = nftType;
  listing.seller = event.params.seller;
  listing.price = event.params.price;
  listing.active = true;
  listing.listedAt = event.block.timestamp;
  listing.delistedAt = null;

  // Link to the corresponding NFT entity
  if (nftType == "MINTING_POSITION") {
    let nft = MintingPositionNFT.load(event.params.tokenId.toString());
    if (nft) {
      listing.mintingNFT = nft.id;
      nft.marketListing = listing.id;
      nft.save();
      log.info("✅ Linked to MintingPositionNFT #{}", [nft.id]);
    } else {
      log.warning("⚠️  MintingPositionNFT #{} not found", [event.params.tokenId.toString()]);
    }
    stats.mintingNFTListings = stats.mintingNFTListings.plus(BigInt.fromI32(1));
  } else if (nftType == "ACCESS_PASS") {
    let nft = AccessPassNFT.load(event.params.tokenId.toString());
    if (nft) {
      listing.accessPassNFT = nft.id;
      nft.marketListing = listing.id;
      nft.save();
      log.info("✅ Linked to AccessPassNFT #{}", [nft.id]);
    } else {
      log.warning("⚠️  AccessPassNFT #{} not found", [event.params.tokenId.toString()]);
    }
    stats.accessPassListings = stats.accessPassListings.plus(BigInt.fromI32(1));
  }
  
  log.info("💾 Saving MarketListing entity with ID: {}", [listing.id]);
  listing.save();
  log.info("✅ MarketListing saved successfully", []);

  // Update global marketplace stats
  stats.totalListings = stats.totalListings.plus(BigInt.fromI32(1));
  stats.activeListings = stats.activeListings.plus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
  log.info("✅ Marketplace stats updated", []);
  log.info("=== NFTListed Event Handler Completed Successfully ===", []);
}

export function handleNFTSold(event: NFTSoldEvent): void {
  log.info("=== NFTSold Event Received ===", []);
  log.info("NFT Contract: {}, TokenId: {}, Seller: {}, Buyer: {}, Price: {}", [
    event.params.nftContract.toHex(),
    event.params.tokenId.toString(),
    event.params.seller.toHex(),
    event.params.buyer.toHex(),
    event.params.price.toString()
  ]);

  let stats = getOrCreateMarketStats();
  
  // Determine NFT Type from the event parameter
  const tokenMinterAddress = "0x3c36c96e69c6585f7b2d877239989a25f80de68f";
  const tokenAccessPassAddress = "0xa4304c2767b18769b795647e45b9d37c06dc0aee";
  let nftType: string;

  const nftContractLower = event.params.nftContract.toHex().toLowerCase();
  
  if (nftContractLower == tokenMinterAddress.toLowerCase()) {
      nftType = "MINTING_POSITION";
  } else if (nftContractLower == tokenAccessPassAddress.toLowerCase()) {
      nftType = "ACCESS_PASS";
  } else {
      log.error("❌ Unrecognized NFT contract address: {}. Expected {} or {}", [
        event.params.nftContract.toHex(),
        tokenMinterAddress,
        tokenAccessPassAddress
      ]);
      return;
  }
  log.info("✅ Determined NFT Type: {}", [nftType]);
  
  // Load the listing
  let listingId = event.params.tokenId.toString() + "-" + event.params.nftContract.toHex().toLowerCase();
  let listing = MarketListing.load(listingId);

  if (!listing) {
    log.error("❌ MarketListing {} not found for sold NFT", [listingId]);
    return;
  }

  // Mark listing as inactive
  listing.active = false;
  listing.delistedAt = event.block.timestamp;
  listing.save();
  log.info("✅ MarketListing marked as sold", []);

  // Create sale record
  let saleId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let sale = new MarketSale(saleId);
  sale.listing = listing.id;
  sale.tokenId = event.params.tokenId;
  sale.nftContract = event.params.nftContract;
  sale.nftType = nftType;
  sale.seller = event.params.seller;
  sale.buyer = event.params.buyer;
  sale.price = event.params.price;
  sale.fee = event.params.fee;
  sale.timestamp = event.block.timestamp;
  sale.soldAt = event.block.timestamp;
  sale.blockNumber = event.block.number;
  sale.transactionHash = event.transaction.hash;
  sale.save();
  log.info("✅ MarketSale record created", []);

  // Update NFT entity: clear market listing and update owner
  if (nftType == "MINTING_POSITION") {
      let nft = MintingPositionNFT.load(event.params.tokenId.toString());
      if(nft) {
          nft.marketListing = null;
          nft.owner = event.params.buyer;
          nft.save();
          log.info("✅ Updated MintingPositionNFT #{} owner to {}", [nft.id, event.params.buyer.toHex()]);
      }
  } else if (nftType == "ACCESS_PASS") {
      let nft = AccessPassNFT.load(event.params.tokenId.toString());
      if(nft) {
          nft.marketListing = null;
          nft.owner = event.params.buyer;
          nft.save();
          log.info("✅ Updated AccessPassNFT #{} owner to {}", [nft.id, event.params.buyer.toHex()]);
      }
  }

  // Update global stats
  stats.activeListings = stats.activeListings.minus(BigInt.fromI32(1));
  stats.totalVolume = stats.totalVolume.plus(event.params.price);
  stats.totalSales = stats.totalSales.plus(BigInt.fromI32(1));
  stats.totalFees = stats.totalFees.plus(event.params.fee);
  stats.lastUpdated = event.block.timestamp;
  stats.save();
  log.info("✅ Marketplace stats updated", []);
  log.info("=== NFTSold Event Handler Completed Successfully ===", []);
}

export function handleNFTDelisted(event: NFTDelistedEvent): void {
  log.info("=== NFTDelisted Event Received ===", []);
  log.info("NFT Contract: {}, TokenId: {}, Seller: {}", [
    event.params.nftContract.toHex(),
    event.params.tokenId.toString(),
    event.params.seller.toHex()
  ]);

  let stats = getOrCreateMarketStats();
  
  // Determine NFT Type from the event parameter
  const tokenMinterAddress = "0x3c36c96e69c6585f7b2d877239989a25f80de68f";
  const tokenAccessPassAddress = "0xa4304c2767b18769b795647e45b9d37c06dc0aee";
  let nftType: string;

  const nftContractLower = event.params.nftContract.toHex().toLowerCase();
  
  if (nftContractLower == tokenMinterAddress.toLowerCase()) {
      nftType = "MINTING_POSITION";
  } else if (nftContractLower == tokenAccessPassAddress.toLowerCase()) {
      nftType = "ACCESS_PASS";
  } else {
      log.error("❌ Unrecognized NFT contract address: {}. Expected {} or {}", [
        event.params.nftContract.toHex(),
        tokenMinterAddress,
        tokenAccessPassAddress
      ]);
      return;
  }
  log.info("✅ Determined NFT Type: {}", [nftType]);

  // Load the listing
  let listingId = event.params.tokenId.toString() + "-" + event.params.nftContract.toHex().toLowerCase();
  let listing = MarketListing.load(listingId);

  if (!listing) {
    log.error("❌ MarketListing {} not found for delisted NFT", [listingId]);
    return;
  }

  // Mark listing as inactive
  listing.active = false;
  listing.delistedAt = event.block.timestamp;
  listing.save();
  log.info("✅ MarketListing marked as delisted", []);

  // Clear market listing link on the NFT
  if (nftType == "MINTING_POSITION") {
      let nft = MintingPositionNFT.load(event.params.tokenId.toString());
      if(nft) {
          nft.marketListing = null;
          nft.save();
          log.info("✅ Cleared marketListing from MintingPositionNFT #{}", [nft.id]);
      }
  } else if (nftType == "ACCESS_PASS") {
      let nft = AccessPassNFT.load(event.params.tokenId.toString());
      if(nft) {
          nft.marketListing = null;
          nft.save();
          log.info("✅ Cleared marketListing from AccessPassNFT #{}", [nft.id]);
      }
  }

  // Update global stats
  stats.activeListings = stats.activeListings.minus(BigInt.fromI32(1));
  stats.lastUpdated = event.block.timestamp;
  stats.save();
  log.info("✅ Marketplace stats updated", []);
  log.info("=== NFTDelisted Event Handler Completed Successfully ===", []);
}

export function handleMarketplaceFeeUpdated(event: MarketplaceFeeUpdatedEvent): void {
  // Update market stats with new fee
  let stats = getOrCreateMarketStats();
  stats.currentFeePercent = event.params.newFee;
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  // Create fee update record
  let feeUpdate = new MarketplaceFeeUpdate(event.transaction.hash.toHex() + "-" + event.logIndex.toString());
  feeUpdate.oldFee = event.params.oldFee;
  feeUpdate.newFee = event.params.newFee;
  feeUpdate.updatedAt = event.block.timestamp;
  feeUpdate.transactionHash = event.transaction.hash;
  feeUpdate.save();
}

export function handleTreasuryUpdated(event: TreasuryUpdatedEvent): void {
  log.info("=== TreasuryUpdated Event Received ===", []);
  log.info("Old Treasury: {}, New Treasury: {}", [
    event.params.oldTreasury.toHex(),
    event.params.newTreasury.toHex()
  ]);

  // Update market stats with new treasury address
  let stats = getOrCreateMarketStats();
  stats.treasury = event.params.newTreasury;
  stats.lastUpdated = event.block.timestamp;
  stats.save();
  
  log.info("✅ MarketStats treasury updated to: {}", [event.params.newTreasury.toHex()]);
  log.info("=== TreasuryUpdated Event Handler Completed Successfully ===", []);
}
