import axios from 'axios';

const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';
const TEST_USER_ADDRESS = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';

async function testUserQuery() {
  console.log('🧪 Testing User Data Query');
  console.log('==========================================');
  
  try {
    const query = `
      query GetUserMintData($userAddress: String!) {
        mintingPositionNFTs(where: { owner: $userAddress }) {
          id
          tokenId
          owner
          term
          maturityTs
          rank
          amplifier
          count
          isMatured
          isClaimed
          mintedAt
        }
      }
    `;

    console.log(`📡 Querying user data for: ${TEST_USER_ADDRESS}`);
    
    const response = await axios.post(SUBGRAPH_URL, {
      query,
      variables: { userAddress: TEST_USER_ADDRESS.toLowerCase() }
    });

    if (response.data.errors) {
      console.error('❌ GraphQL Errors:', response.data.errors);
      return;
    }

    const mintingNFTs = response.data.data.mintingPositionNFTs || [];
    
    console.log(`✅ Found ${mintingNFTs.length} NFTs for user`);
    
    mintingNFTs.forEach((nft, index) => {
      console.log(`\n📄 NFT ${index + 1}:`);
      console.log(`   Token ID: ${nft.tokenId}`);
      console.log(`   Owner: ${nft.owner}`);
      console.log(`   Term: ${nft.term} seconds`);
      console.log(`   Count: ${nft.count}`);
      console.log(`   Rank: ${nft.rank}`);
      console.log(`   Maturity: ${new Date(parseInt(nft.maturityTs) * 1000).toLocaleString()}`);
      console.log(`   Status: ${nft.isClaimed ? '✅ Claimed' : nft.isMatured ? '⏰ Ready to Claim' : '⏳ Pending'}`);
    });

    // 测试数据结构
    if (mintingNFTs.length > 0) {
      console.log('\n🔍 Testing data processing...');
      const testNFT = mintingNFTs[0];
      const processedData = {
        id: parseInt(testNFT.tokenId),
        type: 'mint',
        maturityDate: new Date(parseInt(testNFT.maturityTs) * 1000).toLocaleDateString(),
        term: parseInt(testNFT.term) / 86400, // 转换为天数
        quantity: parseInt(testNFT.count),
        rank: testNFT.rank,
        isMatured: Date.now() > parseInt(testNFT.maturityTs) * 1000,
        isClaimed: testNFT.isClaimed
      };
      
      console.log('✅ Processed NFT data:', processedData);
    }

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testUserQuery();








