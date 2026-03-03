const hre = require('hardhat');
const fs = require('fs');

const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));

// Marketplace ABI - 只需要事件
const marketplaceAbi = [
  'event NFTListed(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 price)',
  'event NFTSold(address indexed nftContract, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price, uint256 fee)',
  'event NFTDelisted(address indexed nftContract, uint256 indexed tokenId, address indexed seller)'
];

async function checkMarketplaceEvents() {
  console.log('🔍 检查链上 Marketplace 事件...\n');

  const provider = hre.ethers.provider;
  const marketplaceAddress = deploymentInfo.SleepNftMarketplace.address;
  const startBlock = deploymentInfo.SleepNftMarketplace.blockNumber;

  console.log('Marketplace 地址:', marketplaceAddress);
  console.log('部署区块:', startBlock);

  const currentBlock = await provider.getBlockNumber();
  console.log('当前区块:', currentBlock);
  
  // 限制查询范围为最近 1000 个区块
  const queryStartBlock = Math.max(startBlock, currentBlock - 1000);
  console.log('查询起始区块:', queryStartBlock);
  console.log('查询区块范围:', currentBlock - queryStartBlock, '个区块');
  console.log('');

  const marketplace = new hre.ethers.Contract(marketplaceAddress, marketplaceAbi, provider);

  try {
    // 查询 NFTListed 事件
    console.log('📋 查询 NFTListed 事件（最近 1000 个区块）...');
    const listedFilter = marketplace.filters.NFTListed();
    const listedEvents = await marketplace.queryFilter(listedFilter, queryStartBlock, currentBlock);

    console.log(`找到 ${listedEvents.length} 个 NFTListed 事件:\n`);

    listedEvents.forEach((event, index) => {
      console.log(`事件 #${index + 1}:`);
      console.log('  区块:', event.blockNumber);
      console.log('  交易哈希:', event.transactionHash);
      console.log('  NFT 合约:', event.args?.nftContract);
      console.log('  Token ID:', event.args?.tokenId?.toString());
      console.log('  卖家:', event.args?.seller);
      console.log('  价格:', hre.ethers.formatEther(event.args?.price || 0), 'OKB');
      console.log('');
    });

    if (listedEvents.length === 0) {
      console.log('❌ 没有找到任何 NFTListed 事件！');
      console.log('这不正常，因为您说您已经成功上架了 NFT。');
      console.log('');
      console.log('可能原因:');
      console.log('1. 上架交易可能失败了（请检查区块浏览器）');
      console.log('2. 连接的是不同的网络');
      console.log('3. Marketplace 合约地址不正确');
    }

    // 查询 NFTDelisted 事件
    console.log('📋 查询 NFTDelisted 事件...');
    const delistedFilter = marketplace.filters.NFTDelisted();
    const delistedEvents = await marketplace.queryFilter(delistedFilter, queryStartBlock, currentBlock);
    console.log(`找到 ${delistedEvents.length} 个 NFTDelisted 事件\n`);

    // 查询 NFTSold 事件
    console.log('📋 查询 NFTSold 事件...');
    const soldFilter = marketplace.filters.NFTSold();
    const soldEvents = await marketplace.queryFilter(soldFilter, queryStartBlock, currentBlock);
    console.log(`找到 ${soldEvents.length} 个 NFTSold 事件\n`);

    // 总结
    console.log('📊 总结:');
    console.log(`  NFTListed 事件: ${listedEvents.length}`);
    console.log(`  NFTDelisted 事件: ${delistedEvents.length}`);
    console.log(`  NFTSold 事件: ${soldEvents.length}`);
    console.log('');

    if (listedEvents.length > 0) {
      console.log('✅ 链上有事件，但 Subgraph 没有索引到。');
      console.log('');
      console.log('🔧 解决方案:');
      console.log('1. 检查 subgraph/src/nft-marketplace.ts 中的日志');
      console.log('2. 检查 TokenMinter 和 TokenAccessPass 地址是否匹配');
      console.log('3. 尝试重新部署 Subgraph');
      console.log('');
      console.log('运行以下命令重新部署 Subgraph:');
      console.log('  cd subgraph');
      console.log('  npm run codegen');
      console.log('  npm run build');
      console.log('  npm run deploy-local');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

checkMarketplaceEvents()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

