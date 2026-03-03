#!/usr/bin/env node

/**
 * Test Subgraph Profile Data
 * 测试Profile页面的subgraph数据获取
 */

import axios from 'axios';

const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

// 测试用户地址（从验证脚本中看到的地址）
const TEST_ADDRESS = '0xa59de3821476bf6f1A11a23f01d82d0d4d1fEFE9';

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 执行GraphQL查询
async function executeQuery(name, query, variables = {}) {
  try {
    const response = await axios.post(SUBGRAPH_URL, {
      query: query,
      variables: variables
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.errors) {
      colorLog('red', `❌ Query "${name}" failed:`);
      console.log(response.data.errors);
      return null;
    }

    return response.data.data;
  } catch (error) {
    colorLog('red', `❌ Query "${name}" error: ${error.message}`);
    return null;
  }
}

// 测试用户铸造数据查询
async function testUserMintData() {
  colorLog('blue', '\n🪙 Testing User Mint Data Query...');
  
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

  const result = await executeQuery('UserMintData', query, { 
    userAddress: TEST_ADDRESS.toLowerCase() 
  });

  if (result && result.mintingPositionNFTs) {
    const nfts = result.mintingPositionNFTs;
    colorLog('green', `✅ Found ${nfts.length} minting NFTs for user`);
    
    nfts.forEach((nft, index) => {
      console.log(`   ${index + 1}. Token #${nft.tokenId}`);
      console.log(`      Owner: ${nft.owner}`);
      console.log(`      Term: ${Math.floor(Number(nft.term) / (24 * 60 * 60))} days`);
      console.log(`      Count: ${nft.count}`);
      console.log(`      Rank: ${nft.rank}`);
      console.log(`      Maturity: ${new Date(Number(nft.maturityTs) * 1000).toLocaleString()}`);
      console.log(`      Status: ${nft.isMatured ? '✅ Matured' : '⏳ Pending'} ${nft.isClaimed ? '(Claimed)' : '(Unclaimed)'}`);
      console.log('');
    });
  } else {
    colorLog('yellow', '⚠️  No minting NFTs found for user');
  }
}

// 测试AccessPass NFT查询
async function testAccessPassData() {
  colorLog('blue', '\n🎫 Testing Access Pass Data Query...');
  
  const query = `
    query GetAccessPassData($userAddress: String!) {
      accessPassNFTs(where: { owner: $userAddress }) {
        id
        tokenId
        owner
        totalAmount
        depositCount
        activeDeposits
        totalShares
        claimableRewards
        totalRewardsClaimed
        biggerBenefitLevel
        hasInfiniteStaking
      }
    }
  `;

  const result = await executeQuery('AccessPassData', query, { 
    userAddress: TEST_ADDRESS.toLowerCase() 
  });

  if (result && result.accessPassNFTs) {
    const nfts = result.accessPassNFTs;
    colorLog('green', `✅ Found ${nfts.length} access pass NFTs for user`);
    
    nfts.forEach((nft, index) => {
      console.log(`   ${index + 1}. Token #${nft.tokenId}`);
      console.log(`      Owner: ${nft.owner}`);
      console.log(`      Total Amount: ${Number(nft.totalAmount) / 1e18} SLEEPING`);
      console.log(`      Deposit Count: ${nft.depositCount}`);
      console.log(`      Active Deposits: ${nft.activeDeposits}`);
      console.log(`      Total Shares: ${Number(nft.totalShares) / 1e18}`);
      console.log(`      Claimable Rewards: ${Number(nft.claimableRewards) / 1e18} OKB`);
      console.log(`      Bigger Benefit Level: ${nft.biggerBenefitLevel}%`);
      console.log(`      Has Infinite Staking: ${nft.hasInfiniteStaking ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });
  } else {
    colorLog('yellow', '⚠️  No access pass NFTs found for user');
  }
}

// 测试用户质押数据查询
async function testUserStakeData() {
  colorLog('blue', '\n💰 Testing User Stake Data Query...');
  
  const query = `
    query GetUserStakeData($userAddress: String!) {
      stakingDeposits(where: { accessPass_: { owner: $userAddress } }) {
        id
        amount
        shares
        stakingDays
        maturityTs
        depositedAt
        shareRate
        longerPaysMoreBonus
        biggerBenefitBonus
      }
    }
  `;

  const result = await executeQuery('UserStakeData', query, { 
    userAddress: TEST_ADDRESS.toLowerCase() 
  });

  if (result && result.stakingDeposits) {
    const deposits = result.stakingDeposits;
    colorLog('green', `✅ Found ${deposits.length} staking deposits for user`);
    
    deposits.forEach((deposit, index) => {
      console.log(`   ${index + 1}. Deposit #${deposit.id}`);
      console.log(`      Amount: ${Number(deposit.amount) / 1e18} SLEEPING`);
      console.log(`      Shares: ${Number(deposit.shares) / 1e18}`);
      console.log(`      Staking Days: ${deposit.stakingDays}`);
      console.log(`      Maturity: ${new Date(Number(deposit.maturityTs) * 1000).toLocaleString()}`);
      console.log(`      Deposited At: ${new Date(Number(deposit.depositedAt) * 1000).toLocaleString()}`);
      console.log(`      Share Rate: ${Number(deposit.shareRate) / 1e18}`);
      console.log(`      Longer Pays Bonus: ${deposit.longerPaysMoreBonus}%`);
      console.log(`      Bigger Benefit Bonus: ${deposit.biggerBenefitBonus}%`);
      console.log('');
    });
  } else {
    colorLog('yellow', '⚠️  No staking deposits found for user');
  }
}

// 主测试函数
async function testProfileData() {
  colorLog('cyan', '🔍 Sleep Protocol Profile Data Test');
  colorLog('cyan', '=====================================');
  colorLog('blue', `Testing with user address: ${TEST_ADDRESS}`);

  // 测试subgraph连接
  colorLog('blue', '\n📡 Testing Subgraph Connection...');
  const metaQuery = `
    query {
      _meta {
        block {
          number
          timestamp
        }
      }
    }
  `;

  const metaResult = await executeQuery('Meta', metaQuery);
  if (!metaResult) {
    colorLog('red', '❌ Cannot connect to subgraph');
    colorLog('yellow', '💡 Make sure the subgraph is running on http://localhost:8000');
    process.exit(1);
  }

  colorLog('green', '✅ Subgraph connection successful');
  console.log(`   Current Block: ${metaResult._meta.block.number}`);
  console.log(`   Block Time: ${new Date(Number(metaResult._meta.block.timestamp) * 1000).toLocaleString()}`);

  // 运行所有测试
  await testUserMintData();
  await testAccessPassData();
  await testUserStakeData();

  // 总结
  colorLog('cyan', '\n📋 Test Summary:');
  colorLog('green', '✅ Profile data queries tested');
  colorLog('yellow', '💡 If no data found, try minting some NFTs first');
  colorLog('cyan', '\n🎉 Test completed!');
}

// 运行测试
testProfileData().catch(error => {
  colorLog('red', `❌ Test failed: ${error.message}`);
  process.exit(1);
});
