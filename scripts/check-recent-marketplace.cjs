const axios = require('axios');

async function checkRecentMarketplaceActivity() {
  console.log('🔍 Checking Recent Marketplace Activity');
  console.log('==========================================');
  
  const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';
  
  try {
    // 1. 检查当前同步状态
    console.log('📡 Checking current sync status...');
    const metaResponse = await axios.post(SUBGRAPH_URL, {
      query: '{ _meta { block { number hash timestamp } } }'
    });
    
    if (metaResponse.data.data) {
      const block = metaResponse.data.data._meta.block;
      console.log(`✅ Subgraph synced to block: ${block.number}`);
      console.log(`   Block time: ${new Date(parseInt(block.timestamp) * 1000).toLocaleString()}`);
      
      const now = Date.now();
      const blockTime = parseInt(block.timestamp) * 1000;
      const timeDiff = Math.floor((now - blockTime) / 1000 / 60);
      console.log(`   ⏰ Block is ${timeDiff} minutes old`);
    }
    
    // 2. 检查所有marketplace listings（包括非活跃的）
    console.log('\n📋 Checking ALL marketplace listings...');
    const allListingsResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          marketListings(first: 20, orderBy: listedAt, orderDirection: desc) {
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
    
    if (allListingsResponse.data.errors) {
      console.error('❌ All listings query errors:', allListingsResponse.data.errors);
    } else {
      const listings = allListingsResponse.data.data.marketListings || [];
      console.log(`✅ Found ${listings.length} total marketplace listings:`);
      
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
        console.log('   ❌ No listings found in subgraph');
      }
    }
    
    // 3. 检查marketplace统计
    console.log('📊 Checking marketplace statistics...');
    const statsResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          marketStats(first: 5, orderBy: lastUpdated, orderDirection: desc) {
            id
            totalListings
            activeListings
            totalVolume
            totalSales
            lastUpdated
          }
        }
      `
    });
    
    if (statsResponse.data.data) {
      const stats = statsResponse.data.data.marketStats || [];
      console.log(`✅ Found ${stats.length} marketplace stats entries:`);
      
      if (stats.length > 0) {
        stats.forEach((stat, index) => {
          console.log(`   ${index + 1}. Stats ID: ${stat.id}`);
          console.log(`      Total Listings: ${stat.totalListings}`);
          console.log(`      Active Listings: ${stat.activeListings}`);
          console.log(`      Total Volume: ${stat.totalVolume}`);
          console.log(`      Total Sales: ${stat.totalSales}`);
          console.log(`      Last Updated: ${new Date(parseInt(stat.lastUpdated) * 1000).toLocaleString()}`);
          console.log('');
        });
      } else {
        console.log('   ❌ No marketplace stats found');
      }
    }
    
    // 4. 检查用户的所有NFT状态
    console.log('👤 Checking user NFT status...');
    const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
    const userNFTsResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          mintingPositionNFTs(where: { owner: "${userAddress.toLowerCase()}" }) {
            id
            tokenId
            owner
            marketListing {
              id
              active
              price
              listedAt
            }
          }
          accessPassNFTs(where: { owner: "${userAddress.toLowerCase()}" }) {
            id
            tokenId
            owner
            marketListing {
              id
              active
              price
              listedAt
            }
          }
        }
      `
    });
    
    if (userNFTsResponse.data.data) {
      const mintingNFTs = userNFTsResponse.data.data.mintingPositionNFTs || [];
      const accessNFTs = userNFTsResponse.data.data.accessPassNFTs || [];
      
      console.log(`✅ User has ${mintingNFTs.length} minting NFTs and ${accessNFTs.length} access pass NFTs:`);
      
      [...mintingNFTs, ...accessNFTs].forEach((nft, index) => {
        const nftType = mintingNFTs.includes(nft) ? 'MINTING' : 'ACCESS';
        console.log(`   ${index + 1}. ${nftType} NFT #${nft.tokenId}`);
        console.log(`      Owner: ${nft.owner}`);
        if (nft.marketListing) {
          console.log(`      📦 Listed: ${nft.marketListing.active ? 'Active' : 'Inactive'}`);
          console.log(`      💰 Price: ${(Number(nft.marketListing.price) / 1e18).toFixed(4)} OKB`);
          console.log(`      📅 Listed At: ${new Date(parseInt(nft.marketListing.listedAt) * 1000).toLocaleString()}`);
        } else {
          console.log(`      📦 Not listed`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkRecentMarketplaceActivity().then(() => {
  console.log('🎉 Recent marketplace activity check completed!');
}).catch(console.error);








