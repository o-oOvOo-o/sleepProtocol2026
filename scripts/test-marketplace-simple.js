import axios from 'axios';

const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

async function testMarketplaceSimple() {
  console.log('🔍 Testing Simple Marketplace Query');
  console.log('==========================================\n');

  try {
    // 简单查询，不包含可能不存在的字段
    const simpleQuery = `
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
    `;

    console.log('📋 Querying marketplace listings (simple)...');
    const result = await axios.post(SUBGRAPH_URL, {
      query: simpleQuery
    });

    if (result.data.errors) {
      console.error('❌ Query errors:', result.data.errors);
      return;
    }

    const listings = result.data.data.marketListings || [];
    console.log(`✅ Found ${listings.length} marketplace listings:`);
    
    listings.forEach((listing, index) => {
      console.log(`   ${index + 1}. Listing ID: ${listing.id}`);
      console.log(`      Token ID: #${listing.tokenId}`);
      console.log(`      NFT Type: ${listing.nftType}`);
      console.log(`      Seller: ${listing.seller}`);
      console.log(`      Price: ${(Number(listing.price) / 1e18).toFixed(4)} OKB`);
      console.log(`      Active: ${listing.active}`);
      console.log(`      Listed At: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
      console.log('');
    });

    // 测试用户查询
    const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
    const userQuery = `
      query GetUserListings($userAddress: String!) {
        marketListings(where: { seller: $userAddress, active: true }) {
          id
          tokenId
          nftType
          seller
          price
          active
          listedAt
        }
      }
    `;

    console.log(`📋 Querying active listings for user: ${userAddress}...`);
    const userResult = await axios.post(SUBGRAPH_URL, {
      query: userQuery,
      variables: { userAddress: userAddress.toLowerCase() }
    });

    if (userResult.data.errors) {
      console.error('❌ User query errors:', userResult.data.errors);
      return;
    }

    const userListings = userResult.data.data.marketListings || [];
    console.log(`✅ User has ${userListings.length} ACTIVE listings:`);
    
    if (userListings.length > 0) {
      userListings.forEach((listing, index) => {
        console.log(`   ${index + 1}. Token #${listing.tokenId} (${listing.nftType})`);
        console.log(`      Price: ${(Number(listing.price) / 1e18).toFixed(4)} OKB`);
        console.log(`      Active: ${listing.active}`);
        console.log(`      Listed: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('   No active listings found for this user.');
    }

  } catch (error) {
    console.error('❌ Error testing marketplace query:', error.message);
  }
}

// 运行测试
testMarketplaceSimple().then(() => {
  console.log('🎉 Simple marketplace query test completed!');
}).catch(console.error);








