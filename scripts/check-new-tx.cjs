const axios = require('axios');

async function checkSpecificNewTransaction() {
  console.log('🔍 Checking New Transaction Processing');
  console.log('==========================================');
  
  const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';
  const txHash = '0xa5b70e55499e850363210daf9de92e13ac8beee5cf36a881914a841e767943e';
  const blockNumber = 11520686;
  const tokenId = '3';
  const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
  const contractAddress = '0xca91577aba1edf3907f9b00aa8b672ac31897183'; // Minter Marketplace
  
  console.log('📋 New Transaction Details:');
  console.log(`   TX Hash: ${txHash}`);
  console.log(`   Block: ${blockNumber}`);
  console.log(`   Token ID: ${tokenId}`);
  console.log(`   User: ${userAddress}`);
  console.log(`   Contract: ${contractAddress} (Minter Marketplace)`);
  console.log(`   Price: 1000 OKB`);
  console.log('');
  
  try {
    // 1. 检查subgraph当前同步状态
    console.log('📡 Checking subgraph sync status...');
    const metaResponse = await axios.post(SUBGRAPH_URL, {
      query: '{ _meta { block { number hash timestamp } } }'
    });
    
    if (metaResponse.data.data) {
      const currentBlock = metaResponse.data.data._meta.block.number;
      console.log(`✅ Subgraph synced to block: ${currentBlock}`);
      
      if (currentBlock >= blockNumber) {
        console.log(`✅ Subgraph should have processed block ${blockNumber}`);
      } else {
        console.log(`❌ Subgraph has not reached block ${blockNumber} yet`);
        console.log(`   Need to wait ${blockNumber - currentBlock} more blocks`);
        return;
      }
    }
    
    // 2. 直接查询这个tokenId的listing
    console.log(`\n🔍 Checking specific token ${tokenId} listing...`);
    const tokenResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          marketListings(where: { tokenId: "${tokenId}" }) {
            id
            tokenId
            nftType
            seller
            price
            active
            listedAt
            nftContract
          }
        }
      `
    });
    
    if (tokenResponse.data.errors) {
      console.error('❌ Token query errors:', tokenResponse.data.errors);
    } else {
      const listings = tokenResponse.data.data.marketListings || [];
      console.log(`✅ Found ${listings.length} listings for token #${tokenId}:`);
      
      if (listings.length > 0) {
        listings.forEach((listing, index) => {
          console.log(`   ${index + 1}. Listing ID: ${listing.id}`);
          console.log(`      Token ID: #${listing.tokenId}`);
          console.log(`      NFT Type: ${listing.nftType}`);
          console.log(`      Seller: ${listing.seller}`);
          console.log(`      Price: ${(Number(listing.price) / 1e18).toFixed(4)} OKB`);
          console.log(`      Active: ${listing.active}`);
          console.log(`      Contract: ${listing.nftContract}`);
          console.log(`      Listed: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
          console.log('');
        });
      } else {
        console.log('   ❌ No listings found for this token');
        console.log('   🔍 This means the subgraph event handler is still not working');
      }
    }
    
    // 3. 检查MintingPositionNFT是否关联了marketplace listing
    console.log(`\n🔗 Checking Minting NFT #${tokenId} marketplace association...`);
    const nftResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          mintingPositionNFTs(where: { tokenId: "${tokenId}" }) {
            id
            tokenId
            owner
            marketListing {
              id
              price
              active
              listedAt
            }
          }
        }
      `
    });
    
    if (nftResponse.data.data) {
      const nfts = nftResponse.data.data.mintingPositionNFTs || [];
      console.log(`✅ Found ${nfts.length} Minting NFTs with token ID ${tokenId}:`);
      
      if (nfts.length > 0) {
        nfts.forEach((nft, index) => {
          console.log(`   ${index + 1}. NFT ID: ${nft.id}`);
          console.log(`      Token ID: #${nft.tokenId}`);
          console.log(`      Owner: ${nft.owner}`);
          if (nft.marketListing) {
            console.log(`      📦 Marketplace Listing:`);
            console.log(`         ID: ${nft.marketListing.id}`);
            console.log(`         Price: ${(Number(nft.marketListing.price) / 1e18).toFixed(4)} OKB`);
            console.log(`         Active: ${nft.marketListing.active}`);
            console.log(`         Listed: ${new Date(parseInt(nft.marketListing.listedAt) * 1000).toLocaleString()}`);
          } else {
            console.log(`      📦 No marketplace listing associated`);
          }
        });
      }
    }
    
    // 4. 检查marketplace统计是否更新
    console.log('\n📊 Checking marketplace stats updates...');
    const statsResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          marketStats(first: 5) {
            id
            totalListings
            activeListings
            mintingNFTListings
            lastUpdated
          }
        }
      `
    });
    
    if (statsResponse.data.data) {
      const stats = statsResponse.data.data.marketStats || [];
      console.log(`✅ Found ${stats.length} marketplace stats:`);
      
      if (stats.length > 0) {
        stats.forEach((stat, index) => {
          console.log(`   ${index + 1}. Stats ID: ${stat.id}`);
          console.log(`      Total Listings: ${stat.totalListings}`);
          console.log(`      Active Listings: ${stat.activeListings}`);
          console.log(`      Minting NFT Listings: ${stat.mintingNFTListings}`);
          console.log(`      Last Updated: ${new Date(parseInt(stat.lastUpdated) * 1000).toLocaleString()}`);
        });
      } else {
        console.log('   ❌ No marketplace stats found - event handler not working');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkSpecificNewTransaction().then(() => {
  console.log('\n🎉 New transaction check completed!');
}).catch(console.error);








