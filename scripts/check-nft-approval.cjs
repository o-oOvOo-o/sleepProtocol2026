const hre = require('hardhat');
const { ethers } = hre;
const fs = require('fs');

async function main() {
  console.log('\n🔍 检查 NFT 授权状态...\n');

  // 读取部署信息
  const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));
  
  const tokenMinterAddress = deploymentInfo.contracts.TokenMinter;
  const tokenAccessPassAddress = deploymentInfo.contracts.TokenAccessPass;
  const marketplaceAddress = deploymentInfo.contracts.SleepNftMarketplace;

  console.log('📋 合约地址:');
  console.log('  TokenMinter:', tokenMinterAddress);
  console.log('  TokenAccessPass:', tokenAccessPassAddress);
  console.log('  Marketplace:', marketplaceAddress);

  // 获取合约实例
  const tokenMinter = await ethers.getContractAt('TokenMinter', tokenMinterAddress);
  const tokenAccessPass = await ethers.getContractAt('TokenAccessPass', tokenAccessPassAddress);
  const marketplace = await ethers.getContractAt('SleepNftMarketplace', marketplaceAddress);

  // 从错误信息中提取的数据
  // data: "0xa82ba76f000000000000000000000000c54aea182926827f7aa1ea177ea2ecfbd8c26e9d0000000000000000000000000000000000000000000000000000000000000002"
  // 函数选择器: 0xa82ba76f (buyNFT)
  // 参数1 (nftContract): 0xc54aea182926827f7aa1ea177ea2ecfbd8c26e9d
  // 参数2 (tokenId): 2

  const nftContractAddress = '0xc54aea182926827f7aa1ea177ea2ecfbd8c26e9d';
  const tokenId = 2;

  console.log('\n🎯 检查的 NFT:');
  console.log('  NFT Contract:', nftContractAddress);
  console.log('  Token ID:', tokenId);

  // 确定是哪个合约
  let nftContract;
  let nftType;
  if (nftContractAddress.toLowerCase() === tokenMinterAddress.toLowerCase()) {
    nftContract = tokenMinter;
    nftType = 'TokenMinter (Mint Card)';
  } else if (nftContractAddress.toLowerCase() === tokenAccessPassAddress.toLowerCase()) {
    nftContract = tokenAccessPass;
    nftType = 'TokenAccessPass (Access Pass)';
  } else {
    console.log('❌ 未知的 NFT 合约地址');
    return;
  }

  console.log('  NFT Type:', nftType);

  try {
    // 检查 NFT 所有者
    const owner = await nftContract.ownerOf(tokenId);
    console.log('\n👤 NFT 所有者:', owner);

    // 检查单个授权
    const approvedAddress = await nftContract.getApproved(tokenId);
    console.log('🔐 单个授权 (getApproved):', approvedAddress);
    console.log('   是否授权给 Marketplace:', approvedAddress.toLowerCase() === marketplaceAddress.toLowerCase() ? '✅ 是' : '❌ 否');

    // 检查全局授权
    const isApprovedForAll = await nftContract.isApprovedForAll(owner, marketplaceAddress);
    console.log('🔓 全局授权 (isApprovedForAll):', isApprovedForAll ? '✅ 是' : '❌ 否');

    // 检查 listing 状态
    const listing = await marketplace.getListing(nftContractAddress, tokenId);
    console.log('\n📋 Marketplace Listing:');
    console.log('  Seller:', listing.seller);
    console.log('  Price:', ethers.formatEther(listing.price), 'OKB');
    console.log('  Is Listed:', listing.price > 0n ? '✅ 是' : '❌ 否');

    // 综合判断
    console.log('\n🔍 诊断结果:');
    if (listing.price === 0n) {
      console.log('❌ NFT 未在 marketplace 上架');
    } else if (approvedAddress.toLowerCase() !== marketplaceAddress.toLowerCase() && !isApprovedForAll) {
      console.log('❌ NFT 已上架，但未授权给 marketplace');
      console.log('   原因: 卖家可能在上架后取消了授权');
      console.log('   解决方案: 卖家需要重新授权或取消上架');
    } else {
      console.log('✅ NFT 已正确上架且已授权');
      console.log('   可以正常购买');
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








