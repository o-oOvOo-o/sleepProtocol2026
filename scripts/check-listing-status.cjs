const hre = require('hardhat');
const fs = require('fs');

const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));

async function checkListingStatus() {
  console.log('🔍 检查 NFT 上架状态...\n');

  const [signer] = await hre.ethers.getSigners();
  const userAddress = signer.address;
  console.log('用户地址:', userAddress);

  const marketplaceAddress = deploymentInfo.SleepNftMarketplace.address;
  const tokenMinterAddress = deploymentInfo.TokenMinter.address;
  const tokenAccessPassAddress = deploymentInfo.TokenAccessPass.address;

  console.log('Marketplace:', marketplaceAddress);
  console.log('TokenMinter:', tokenMinterAddress);
  console.log('TokenAccessPass:', tokenAccessPassAddress);
  console.log('');

  // Marketplace ABI
  const marketplaceAbi = [
    'function listings(address nftContract, uint256 tokenId) view returns (address seller, uint256 price)',
    'function isListed(address nftContract, uint256 tokenId) view returns (bool)',
    'function getListing(address nftContract, uint256 tokenId) view returns (address seller, uint256 price)',
    'function isWhitelisted(address nftContract) view returns (bool)',
    'function getWhitelistedContracts() view returns (address[])'
  ];

  const marketplace = new hre.ethers.Contract(marketplaceAddress, marketplaceAbi, signer);

  try {
    // 1. 检查白名单
    console.log('📋 检查白名单状态...');
    const isMinterWhitelisted = await marketplace.isWhitelisted(tokenMinterAddress);
    const isAccessPassWhitelisted = await marketplace.isWhitelisted(tokenAccessPassAddress);
    
    console.log('TokenMinter 在白名单:', isMinterWhitelisted ? '✅' : '❌');
    console.log('TokenAccessPass 在白名单:', isAccessPassWhitelisted ? '✅' : '❌');
    
    if (!isMinterWhitelisted || !isAccessPassWhitelisted) {
      console.log('\n⚠️  警告: NFT 合约不在白名单中！这会导致上架失败！');
      console.log('请运行部署脚本或手动添加到白名单。');
    }
    console.log('');

    // 2. 检查特定 Token 的上架状态
    console.log('📋 检查 Mint Card #1 的上架状态...');
    try {
      const mintCard1Listed = await marketplace.isListed(tokenMinterAddress, 1);
      console.log('Mint Card #1 已上架:', mintCard1Listed ? '✅' : '❌');
      
      if (mintCard1Listed) {
        const listing = await marketplace.getListing(tokenMinterAddress, 1);
        console.log('  卖家:', listing.seller);
        console.log('  价格:', hre.ethers.formatEther(listing.price), 'OKB');
      }
    } catch (error) {
      console.log('❌ 查询失败:', error.message);
    }
    console.log('');

    // 3. 检查用户的 NFT 余额和授权
    console.log('📋 检查用户 NFT 余额和授权...');
    
    const nftAbi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function getApproved(uint256 tokenId) view returns (address)',
      'function isApprovedForAll(address owner, address operator) view returns (bool)'
    ];
    
    const tokenMinter = new hre.ethers.Contract(tokenMinterAddress, nftAbi, signer);
    
    try {
      const balance = await tokenMinter.balanceOf(userAddress);
      console.log('Mint Card 余额:', balance.toString());
      
      if (balance > 0n) {
        const owner = await tokenMinter.ownerOf(1);
        console.log('Mint Card #1 所有者:', owner);
        console.log('是否是您:', owner.toLowerCase() === userAddress.toLowerCase() ? '✅' : '❌');
        
        const approved = await tokenMinter.getApproved(1);
        console.log('Mint Card #1 授权给:', approved);
        console.log('已授权给 Marketplace:', approved.toLowerCase() === marketplaceAddress.toLowerCase() ? '✅' : '❌');
        
        const isApprovedForAll = await tokenMinter.isApprovedForAll(userAddress, marketplaceAddress);
        console.log('全部授权给 Marketplace:', isApprovedForAll ? '✅' : '❌');
      }
    } catch (error) {
      console.log('❌ 查询失败:', error.message);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkListingStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });








