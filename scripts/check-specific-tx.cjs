const axios = require('axios');

async function checkSpecificTransaction() {
  console.log('🔍 Checking Specific Transaction Processing');
  console.log('==========================================');
  
  const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';
  const txHash = '0xf1e1011d34b01111344a4f879661ad0049e81d3efb20b65ec3d28a8be5872d92b';
  const blockNumber = 11517486;
  const tokenId = '2';
  const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
  
  console.log('📋 Transaction Details:');
  console.log(`   TX Hash: ${txHash}`);
  console.log(`   Block: ${blockNumber}`);
  console.log(`   Token ID: ${tokenId}`);
  console.log(`   User: ${userAddress}`);
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
        return;
      }
    }
    
    // 2. 直接查询这个tokenId的listing
    console.log('\n🔍 Checking specific token listing...');
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
      }
    }
    
    // 3. 检查marketplace stats是否更新
    console.log('📊 Checking marketplace stats...');
    const statsResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          marketStats(first: 5) {
            id
            totalListings
            activeListings
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
          console.log(`      Last Updated: ${new Date(parseInt(stat.lastUpdated) * 1000).toLocaleString()}`);
        });
      } else {
        console.log('   ❌ No marketplace stats found');
      }
    }
    
    // 4. 检查AccessPassNFT是否关联了marketplace listing
    console.log('\n🔗 Checking NFT marketplace association...');
    const nftResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          accessPassNFTs(where: { tokenId: "${tokenId}" }) {
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
      const nfts = nftResponse.data.data.accessPassNFTs || [];
      console.log(`✅ Found ${nfts.length} AccessPass NFTs with token ID ${tokenId}:`);
      
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
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkSpecificTransaction().then(() => {
  console.log('\n🎉 Specific transaction check completed!');
}).catch(console.error);








