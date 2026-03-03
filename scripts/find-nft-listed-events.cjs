const hre = require('hardhat');
const fs = require('fs');

const deploymentInfo = JSON.parse(fs.readFileSync('./deployment-info.json', 'utf8'));

async function findNFTListedEvents() {
  console.log('🔍 搜索所有 NFTListed 事件...\n');

  const provider = hre.ethers.provider;
  const marketplaceAddress = deploymentInfo.SleepNftMarketplace.address;
  const startBlock = deploymentInfo.SleepNftMarketplace.blockNumber;
  const currentBlock = await provider.getBlockNumber();

  console.log('Marketplace 地址:', marketplaceAddress);
  console.log('Subgraph 起始区块:', startBlock);
  console.log('当前区块:', currentBlock);
  console.log('需要搜索的区块范围:', currentBlock - startBlock, '个区块');
  console.log('');

  // 由于 RPC 限制每次只能查询 1000 个区块，我们需要分批查询
  const batchSize = 1000;
  let totalEvents = [];

  const marketplaceAbi = [
    'event NFTListed(address indexed nftContract, uint256 indexed tokenId, address indexed seller, uint256 price)'
  ];

  const marketplace = new hre.ethers.Contract(marketplaceAddress, marketplaceAbi, provider);
  const listedFilter = marketplace.filters.NFTListed();

  console.log('📋 开始分批查询事件...\n');

  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += batchSize) {
    const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
    
    try {
      console.log(`  查询区块 ${fromBlock} 到 ${toBlock}...`);
      const events = await marketplace.queryFilter(listedFilter, fromBlock, toBlock);
      
      if (events.length > 0) {
        console.log(`    ✅ 找到 ${events.length} 个事件！`);
        totalEvents = totalEvents.concat(events);
      }
    } catch (error) {
      console.log(`    ❌ 查询失败:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 总共找到 ${totalEvents.length} 个 NFTListed 事件\n`);

  if (totalEvents.length === 0) {
    console.log('❌ 没有找到任何 NFTListed 事件！');
    console.log('');
    console.log('可能的原因:');
    console.log('1. 上架交易实际上失败了（revert）');
    console.log('2. 调用的是错误的合约');
    console.log('3. 交易调用的不是 listNFT 函数');
    console.log('');
    console.log('💡 请检查:');
    console.log('  - 区块浏览器中的交易状态');
    console.log('  - 交易是否有 "NFTListed" 事件日志');
    console.log('  - 交易调用的合约地址是否是:', marketplaceAddress);
  } else {
    totalEvents.forEach((event, index) => {
      console.log(`事件 #${index + 1}:`);
      console.log('  区块号:', event.blockNumber);
      console.log('  交易哈希:', event.transactionHash);
      console.log('  NFT 合约:', event.args?.nftContract);
      console.log('  Token ID:', event.args?.tokenId?.toString());
      console.log('  卖家:', event.args?.seller);
      console.log('  价格:', hre.ethers.formatEther(event.args?.price || 0), 'OKB');
      console.log('');
    });

    console.log('✅ 结论: 链上有 NFTListed 事件！');
    console.log('');
    console.log('🔧 Subgraph 问题排查:');
    console.log('1. 事件在区块', totalEvents[0].blockNumber, '，在 startBlock', startBlock, '之后 ✅');
    console.log('2. 检查 Subgraph 是否已同步到这些区块');
    console.log('3. 检查 Subgraph 日志中是否有错误');
    console.log('4. 可能需要重新部署 Subgraph');
  }
}

findNFTListedEvents()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });








