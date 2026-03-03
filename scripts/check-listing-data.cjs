const hre = require('hardhat');
const { ethers } = hre;
const fs = require('fs');

async function main() {
  console.log('\n🔍 检查 Listing 数据一致性...\n');

  // 读取部署信息
  const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
  
  const tokenMinterAddress = deploymentInfo.contracts.TokenMinter;
  const marketplaceAddress = deploymentInfo.contracts.SleepNftMarketplace;

  console.log('📋 合约地址:');
  console.log('  TokenMinter:', tokenMinterAddress);
  console.log('  Marketplace:', marketplaceAddress);

  // 获取合约实例
  const marketplace = await ethers.getContractAt('SleepNftMarketplace', marketplaceAddress);

  // 从错误信息推断的 NFT
  const nftContractAddress = '0xc54aea182926827f7aa1ea177ea2ecfbd8c26e9d';
  const tokenId = 2;

  console.log('\n🎯 检查的 NFT:');
  console.log('  NFT Contract:', nftContractAddress);
  console.log('  Token ID:', tokenId);

  try {
    // 从合约查询 listing
    const listing = await marketplace.getListing(nftContractAddress, tokenId);
    
    console.log('\n📋 合约 Listing 数据:');
    console.log('  Seller:', listing.seller);
    console.log('  Price (Wei):', listing.price.toString());
    console.log('  Price (OKB):', ethers.formatEther(listing.price));
    console.log('  Is Listed:', listing.price > 0n ? '✅ 是' : '❌ 否');

    if (listing.price > 0n) {
      console.log('\n💡 前端应该发送的交易:');
      console.log('  Function: buyNFT(address, uint256)');
      console.log('  Args:');
      console.log('    nftContract:', nftContractAddress);
      console.log('    tokenId:', tokenId);
      console.log('  Value (Wei):', listing.price.toString());
      console.log('  Value (OKB):', ethers.formatEther(listing.price));
    }

    // 查询 Subgraph
    console.log('\n🌐 查询 Subgraph 数据...');
    const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';
    
    const query = `
      query {
        marketListings(where: { tokenId: "${tokenId}", active: true }) {
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

    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    
    if (result.data && result.data.marketListings && result.data.marketListings.length > 0) {
      const subgraphListing = result.data.marketListings[0];
      console.log('\n📊 Subgraph Listing 数据:');
      console.log('  ID:', subgraphListing.id);
      console.log('  TokenId:', subgraphListing.tokenId);
      console.log('  NFT Type:', subgraphListing.nftType);
      console.log('  Seller:', subgraphListing.seller);
      console.log('  Price (Wei string):', subgraphListing.price);
      console.log('  Price (OKB):', (Number(subgraphListing.price) / 1e18).toFixed(4));
      console.log('  Active:', subgraphListing.active);

      // 比较数据
      console.log('\n🔍 数据对比:');
      const contractPrice = listing.price.toString();
      const subgraphPrice = subgraphListing.price;
      
      if (contractPrice === subgraphPrice) {
        console.log('  ✅ 价格一致');
      } else {
        console.log('  ❌ 价格不一致！');
        console.log('     合约:', contractPrice);
        console.log('     Subgraph:', subgraphPrice);
      }

      if (listing.seller.toLowerCase() === subgraphListing.seller.toLowerCase()) {
        console.log('  ✅ 卖家一致');
      } else {
        console.log('  ❌ 卖家不一致！');
        console.log('     合约:', listing.seller);
        console.log('     Subgraph:', subgraphListing.seller);
      }
    } else {
      console.log('\n❌ Subgraph 中未找到该 listing');
      if (result.errors) {
        console.log('GraphQL 错误:', result.errors);
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });








