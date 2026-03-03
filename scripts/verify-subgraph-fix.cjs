const axios = require('axios');

async function verifySubgraphFix() {
  console.log('🔬 Verifying Subgraph Fix for NFT Listing');
  console.log('================================================');
  
  const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';
  const txHash = '0xa5b70e55499e850363210daf9de92e13ac8beee5cf36a881914a841e767943e';
  const blockNumber = 11520686;
  const tokenId = '3';
  const contractAddress = '0xca91577aba1edf3907f9b00aa8b672ac31897183'; // Minter Marketplace
  
  console.log('📋 Transaction to Verify:');
  console.log(`   - TX Hash: ${txHash.slice(0, 10)}...`);
  console.log(`   - Block: ${blockNumber}`);
  console.log(`   - Token ID: ${tokenId} (Minter NFT)`);
  console.log(`   - Contract: ${contractAddress.slice(0, 10)}...`);
  console.log('');
  
  try {
    // 1. 检查同步状态
    console.log('===== STEP 1: CHECKING SYNC STATUS =====');
    const metaResponse = await axios.post(SUBGRAPH_URL, {
      query: '{ _meta { block { number } } }'
    });
    
    if (metaResponse.data.data) {
      const currentBlock = metaResponse.data.data._meta.block.number;
      console.log(`   - Subgraph is synced to block: ${currentBlock}`);
      if (currentBlock >= blockNumber) {
        console.log('   - ✅ SUCCESS: Subgraph has processed the transaction block.');
      } else {
        console.log(`   - ❌ ERROR: Subgraph is behind. Synced Block: ${currentBlock}, TX Block: ${blockNumber}`);
        return;
      }
    } else {
       console.log('   - ❌ ERROR: Could not fetch subgraph sync status.');
       return;
    }
    
    // 2. 检查 MarketListing 是否创建
    console.log('\n===== STEP 2: CHECKING FOR MarketListing ENTITY =====');
    const listingId = `${tokenId}-${contractAddress.toLowerCase()}`;
    const listingQuery = `
      query {
        marketListing(id: "${listingId}") {
          id
          tokenId
          seller
          price
          active
          listedAt
        }
      }`;
      
    const listingResponse = await axios.post(SUBGRAPH_URL, { query: listingQuery });
    
    if (listingResponse.data.data && listingResponse.data.data.marketListing) {
      const listing = listingResponse.data.data.marketListing;
      console.log('   - ✅ SUCCESS: Found MarketListing!');
      console.log(`     - ID: ${listing.id}`);
      console.log(`     - Token ID: ${listing.tokenId}`);
      console.log(`     - Seller: ${listing.seller}`);
      console.log(`     - Price: ${listing.price}`);
      console.log(`     - Active: ${listing.active}`);
    } else {
      console.log('   - ❌ FAILED: MarketListing entity was NOT created.');
    }
    
    // 3. 检查 MarketStats 是否更新
    console.log('\n===== STEP 3: CHECKING MarketStats UPDATE =====');
    const statsQuery = `query { marketStats(id: "1") { totalListings activeListings } }`;
    const statsResponse = await axios.post(SUBGRAPH_URL, { query: statsQuery });

    if (statsResponse.data.data && statsResponse.data.data.marketStats) {
      const stats = statsResponse.data.data.marketStats;
      console.log('   - ✅ SUCCESS: Found MarketStats!');
      console.log(`     - Total Listings: ${stats.totalListings}`);
      console.log(`     - Active Listings: ${stats.activeListings}`);
      if (parseInt(stats.totalListings) > 0) {
        console.log('     - ✅ Looks like stats were updated.');
      } else {
        console.log('     - ❌ Stats were NOT updated.');
      }
    } else {
      console.log('   - ❌ FAILED: MarketStats entity not found or not updated.');
    }

    // 4. 检查 NFT 关联
    console.log('\n===== STEP 4: CHECKING NFT to Listing ASSOCIATION =====');
    const nftQuery = `query { mintingPositionNFT(id: "${tokenId}") { id marketListing { id } } }`;
    const nftResponse = await axios.post(SUBGRAPH_URL, { query: nftQuery });
    
    if (nftResponse.data.data && nftResponse.data.data.mintingPositionNFT) {
        const nft = nftResponse.data.data.mintingPositionNFT;
        console.log(`   - ✅ SUCCESS: Found MintingPositionNFT #${nft.id}`);
        if (nft.marketListing) {
            console.log(`     - ✅ NFT is correctly associated with MarketListing: ${nft.marketListing.id}`);
        } else {
            console.log('     - ❌ NFT is NOT associated with any MarketListing.');
        }
    } else {
        console.log(`   - ❌ FAILED: Could not find MintingPositionNFT with ID ${tokenId}.`);
    }

  } catch (error) {
    console.error('\n❌ An unexpected error occurred during verification:', error.message);
  }
}

verifySubgraphFix().then(() => {
  console.log('\n🎉 Verification script finished!');
}).catch(console.error);








