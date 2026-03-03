import axios from 'axios';

const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

async function testMarketplaceQuery() {
  console.log('🔍 Testing Marketplace Listing Query');
  console.log('==========================================\n');

  try {
    // 测试查询所有marketplace listings
    const allListingsQuery = `
      query {
        marketListings(first: 10, orderBy: createdAt, orderDirection: desc) {
          id
          tokenId
          nftType
          seller
          price
          active
          listedAt
          createdAt
          delistedAt
        }
      }
    `;

    console.log('📋 Querying all marketplace listings...');
    const allResult = await axios.post(SUBGRAPH_URL, {
      query: allListingsQuery
    });

    if (allResult.data.errors) {
      console.error('❌ Query errors:', allResult.data.errors);
      return;
    }

    const listings = allResult.data.data.marketListings || [];
    console.log(`✅ Found ${listings.length} marketplace listings:`);
    
    listings.forEach((listing, index) => {
      console.log(`   ${index + 1}. Listing ID: ${listing.id}`);
      console.log(`      Token ID: #${listing.tokenId}`);
      console.log(`      NFT Type: ${listing.nftType}`);
      console.log(`      Seller: ${listing.seller}`);
      console.log(`      Price: ${listing.price} wei`);
      console.log(`      Active: ${listing.active}`);
      console.log(`      Listed At: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
      console.log(`      Created At: ${new Date(parseInt(listing.createdAt) * 1000).toLocaleString()}`);
      if (listing.delistedAt) {
        console.log(`      Delisted At: ${new Date(parseInt(listing.delistedAt) * 1000).toLocaleString()}`);
      }
      console.log('');
    });

    // 测试查询特定用户的listings
    const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
    const userListingsQuery = `
      query GetUserListings($userAddress: String!) {
        marketListings(where: { seller: $userAddress }) {
          id
          tokenId
          nftType
          seller
          price
          active
          listedAt
          createdAt
          delistedAt
        }
      }
    `;

    console.log(`📋 Querying listings for user: ${userAddress}...`);
    const userResult = await axios.post(SUBGRAPH_URL, {
      query: userListingsQuery,
      variables: { userAddress: userAddress.toLowerCase() }
    });

    if (userResult.data.errors) {
      console.error('❌ User query errors:', userResult.data.errors);
      return;
    }

    const userListings = userResult.data.data.marketListings || [];
    console.log(`✅ User has ${userListings.length} listings (including inactive):`);
    
    if (userListings.length > 0) {
      userListings.forEach((listing, index) => {
        console.log(`   ${index + 1}. Token #${listing.tokenId} (${listing.nftType})`);
        console.log(`      Price: ${(Number(listing.price) / 1e18).toFixed(4)} OKB`);
        console.log(`      Active: ${listing.active}`);
        console.log(`      Listed: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
        if (listing.delistedAt) {
          console.log(`      Delisted: ${new Date(parseInt(listing.delistedAt) * 1000).toLocaleString()}`);
        }
        console.log('');
      });
    }

    // 测试查询只有active的listings
    const activeListingsQuery = `
      query GetActiveUserListings($userAddress: String!) {
        marketListings(where: { seller: $userAddress, active: true }) {
          id
          tokenId
          nftType
          seller
          price
          active
          listedAt
          createdAt
        }
      }
    `;

    console.log(`📋 Querying ACTIVE listings for user: ${userAddress}...`);
    const activeResult = await axios.post(SUBGRAPH_URL, {
      query: activeListingsQuery,
      variables: { userAddress: userAddress.toLowerCase() }
    });

    if (activeResult.data.errors) {
      console.error('❌ Active query errors:', activeResult.data.errors);
      return;
    }

    const activeListings = activeResult.data.data.marketListings || [];
    console.log(`✅ User has ${activeListings.length} ACTIVE listings:`);
    
    if (activeListings.length > 0) {
      activeListings.forEach((listing, index) => {
        console.log(`   ${index + 1}. Token #${listing.tokenId} (${listing.nftType})`);
        console.log(`      Price: ${(Number(listing.price) / 1e18).toFixed(4)} OKB`);
        console.log(`      Listed: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error testing marketplace query:', error.message);
  }
}

// 运行测试
testMarketplaceQuery().then(() => {
  console.log('🎉 Marketplace query test completed!');
}).catch(console.error);








