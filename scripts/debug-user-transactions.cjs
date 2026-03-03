const axios = require('axios');

async function checkUserTransactions() {
  console.log('🔍 Checking User Transaction History');
  console.log('==========================================');
  
  const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
  const minterMarketplace = '0xCa91577aBA1edF3907f9B00AA8b672AC31897183';
  const accessPassMarketplace = '0xe3c2Ca648baAAE7300CAFed5FC39DCD95D524CD1';
  
  // 检查用户是否对marketplace有授权
  console.log('🔐 Checking NFT approvals...');
  console.log(`User: ${userAddress}`);
  console.log(`Minter Marketplace: ${minterMarketplace}`);
  console.log(`Access Pass Marketplace: ${accessPassMarketplace}`);
  console.log('');
  
  // 提示用户检查的事项
  console.log('📋 请在钱包或区块浏览器中检查以下事项：');
  console.log('');
  console.log('1. 🔍 检查最近的交易记录：');
  console.log('   - 查看是否有对marketplace合约的交易');
  console.log('   - 检查交易状态是否为"成功"还是"失败"');
  console.log('');
  console.log('2. 💰 检查上架价格格式：');
  console.log('   - 确保价格是正确的数字格式');
  console.log('   - 例如：1.5 OKB 应该输入为 1.5');
  console.log('');
  console.log('3. 🔐 检查NFT授权状态：');
  console.log('   - TokenMinter NFT是否已授权给marketplace');
  console.log('   - AccessPass NFT是否已授权给marketplace');
  console.log('');
  console.log('4. 📝 检查合约调用参数：');
  console.log('   - listNFT函数的tokenId参数');
  console.log('   - listNFT函数的price参数（应该是wei单位）');
  console.log('');
  
  // 显示合约地址供用户验证
  console.log('📍 合约地址验证：');
  console.log(`   TokenMinter: 0xa8910c4bf3FE5E50C1dA9b15229ab8Ca56c894D0`);
  console.log(`   AccessPass: 0x1695B4162CAEA1a59A324C1906D6c8B123BF0B7b`);
  console.log(`   Minter Marketplace: ${minterMarketplace}`);
  console.log(`   Access Pass Marketplace: ${accessPassMarketplace}`);
  console.log('');
  
  console.log('🤔 可能的问题：');
  console.log('   1. 交易失败但前端没有正确显示错误');
  console.log('   2. 价格转换问题（前端可能没有正确转换为wei）');
  console.log('   3. 授权检查逻辑问题');
  console.log('   4. Gas费不足导致交易失败');
  console.log('');
  
  console.log('🔧 建议的调试步骤：');
  console.log('   1. 在浏览器开发者工具中查看console日志');
  console.log('   2. 检查钱包中的交易历史');
  console.log('   3. 在区块浏览器中查看具体的交易详情');
  console.log('   4. 尝试重新上架一个NFT，观察完整流程');
}

checkUserTransactions().then(() => {
  console.log('\n🎉 User transaction check completed!');
  console.log('💡 请分享您看到的交易状态和任何错误信息');
}).catch(console.error);








