const axios = require('axios');

const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

async function checkMarketplace() {
  console.log('🔍 Checking Marketplace Data');
  console.log('==========================================');
  
  try {
    // 1. 测试基本连接
    console.log('📡 Testing basic connection...');
    const metaResponse = await axios.post(SUBGRAPH_URL, {
      query: '{ _meta { block { number } } }'
    });
    
    if (metaResponse.data.data) {
      console.log('✅ Connection successful, block:', metaResponse.data.data._meta.block.number);
    }
    
    // 2. 查询marketplace listings
    console.log('\n📋 Checking marketplace listings...');
    const listingsResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          marketListings(first: 10) {
            id
            tokenId
            nftType
            seller
            price
            active
            listedAt
          }
        }
      `
    });
    
    if (listingsResponse.data.errors) {
      console.error('❌ Listings query errors:', listingsResponse.data.errors);
    } else {
      const listings = listingsResponse.data.data.marketListings || [];
      console.log(`✅ Found ${listings.length} marketplace listings`);
      
      if (listings.length > 0) {
        listings.forEach((listing, index) => {
          console.log(`   ${index + 1}. Token #${listing.tokenId} (${listing.nftType})`);
          console.log(`      Price: ${(Number(listing.price) / 1e18).toFixed(4)} OKB`);
          console.log(`      Active: ${listing.active}`);
          console.log(`      Seller: ${listing.seller}`);
          console.log('');
        });
      }
    }
    
    // 3. 查询用户的listings
    console.log('👤 Checking user listings...');
    const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
    const userListingsResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          marketListings(where: { seller: "${userAddress.toLowerCase()}" }) {
            id
            tokenId
            nftType
            seller
            price
            active
            listedAt
          }
        }
      `
    });
    
    if (userListingsResponse.data.errors) {
      console.error('❌ User listings query errors:', userListingsResponse.data.errors);
    } else {
      const userListings = userListingsResponse.data.data.marketListings || [];
      console.log(`✅ User has ${userListings.length} listings (total)`);
      
      if (userListings.length > 0) {
        userListings.forEach((listing, index) => {
          console.log(`   ${index + 1}. Token #${listing.tokenId} (${listing.nftType})`);
          console.log(`      Price: ${(Number(listing.price) / 1e18).toFixed(4)} OKB`);
          console.log(`      Active: ${listing.active}`);
          console.log(`      Listed: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

checkMarketplace().then(() => {
  console.log('🎉 Marketplace check completed!');
}).catch(console.error);








