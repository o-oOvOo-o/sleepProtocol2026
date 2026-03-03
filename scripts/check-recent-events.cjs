const axios = require('axios');

async function checkRecentBlocks() {
  console.log('🔍 Checking Recent Marketplace Events on Blockchain');
  console.log('==========================================');
  
  const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';
  
  try {
    // 1. 获取当前同步的区块
    console.log('📡 Getting current synced block...');
    const metaResponse = await axios.post(SUBGRAPH_URL, {
      query: '{ _meta { block { number hash timestamp } } }'
    });
    
    if (metaResponse.data.data) {
      const block = metaResponse.data.data._meta.block;
      console.log(`✅ Subgraph synced to block: ${block.number}`);
      console.log(`   Block hash: ${block.hash}`);
      console.log(`   Block time: ${new Date(parseInt(block.timestamp) * 1000).toLocaleString()}`);
      
      // 计算区块时间差
      const blockTime = parseInt(block.timestamp) * 1000;
      const now = Date.now();
      const timeDiff = Math.floor((now - blockTime) / 1000 / 60); // 分钟
      console.log(`   ⏰ Block is ${timeDiff} minutes old`);
      
      if (timeDiff > 30) {
        console.log('   ⚠️  Block is quite old, subgraph might be behind');
      }
    }
    
    // 2. 检查最近的NFT mint事件（作为对比）
    console.log('\n🪙 Checking recent minting events...');
    const mintResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          mintingPositionNFTs(first: 5, orderBy: mintedAt, orderDirection: desc) {
            id
            tokenId
            owner
            mintedAt
            maturityTs
          }
        }
      `
    });
    
    if (mintResponse.data.data) {
      const nfts = mintResponse.data.data.mintingPositionNFTs || [];
      console.log(`✅ Found ${nfts.length} recent minting NFTs:`);
      nfts.forEach((nft, index) => {
        const mintTime = new Date(parseInt(nft.mintedAt) * 1000);
        const maturityTime = new Date(parseInt(nft.maturityTs) * 1000);
        console.log(`   ${index + 1}. Token #${nft.tokenId}`);
        console.log(`      Owner: ${nft.owner}`);
        console.log(`      Minted: ${mintTime.toLocaleString()}`);
        console.log(`      Maturity: ${maturityTime.toLocaleString()}`);
        console.log('');
      });
    }
    
    // 3. 检查marketplace事件处理器状态
    console.log('🏪 Checking marketplace event handlers...');
    
    // 检查是否有任何marketplace相关的实体
    const marketResponse = await axios.post(SUBGRAPH_URL, {
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
    
    if (marketResponse.data.data) {
      const stats = marketResponse.data.data.marketStats || [];
      console.log(`✅ Found ${stats.length} marketplace stats entries:`);
      if (stats.length > 0) {
        stats.forEach((stat, index) => {
          console.log(`   ${index + 1}. Stats ID: ${stat.id}`);
          console.log(`      Total Listings: ${stat.totalListings}`);
          console.log(`      Active Listings: ${stat.activeListings}`);
          console.log(`      Last Updated: ${new Date(parseInt(stat.lastUpdated) * 1000).toLocaleString()}`);
        });
      } else {
        console.log('   ❌ No marketplace stats found - events might not be processed');
      }
    }
    
    // 4. 检查用户的NFT所有权状态
    console.log('\n👤 Checking user NFT ownership...');
    const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
    const ownershipResponse = await axios.post(SUBGRAPH_URL, {
      query: `
        query {
          mintingPositionNFTs(where: { owner: "${userAddress.toLowerCase()}" }) {
            id
            tokenId
            owner
            mintedAt
            maturityTs
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
    
    if (ownershipResponse.data.data) {
      const userNFTs = ownershipResponse.data.data.mintingPositionNFTs || [];
      console.log(`✅ User owns ${userNFTs.length} minting NFTs:`);
      userNFTs.forEach((nft, index) => {
        console.log(`   ${index + 1}. Token #${nft.tokenId}`);
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

checkRecentBlocks().then(() => {
  console.log('🎉 Recent blocks check completed!');
}).catch(console.error);








