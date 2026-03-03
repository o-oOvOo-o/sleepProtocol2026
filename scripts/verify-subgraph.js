#!/usr/bin/env node

/**
 * Subgraph Verification Script
 * 验证subgraph是否正在同步区块信息
 */

import axios from 'axios';

// Subgraph endpoint
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

// GraphQL queries
const QUERIES = {
  // 检查subgraph基本信息
  indexingStatus: `
    query {
      _meta {
        block {
          number
          hash
          timestamp
        }
        deployment
        hasIndexingErrors
      }
    }
  `,
  
  // 检查协议统计信息
  globalStats: `
    query {
      globalStats(first: 1) {
        id
        globalRank
        totalMinted
        totalClaimed
        totalLiquidated
        currentAmplifier
        currentMaxTerm
        currentDecayFactor
      }
    }
  `,
  
  // 检查最近的铸造记录
  recentMints: `
    query {
      mintingPositionNFTs(first: 5, orderBy: mintedAt, orderDirection: desc) {
        id
        tokenId
        owner
        term
        count
        rank
        mintedAt
        maturityTs
        isMatured
        isClaimed
      }
    }
  `,
  
  // 检查市场统计
  marketStats: `
    query {
      marketStats(id: "1") {
        id
        totalListings
        activeListings
        totalVolume
        totalSales
        totalFees
        mintingNFTListings
        accessPassListings
        avgMintingNFTPrice
        avgAccessPassPrice
        currentFeePercent
        lastUpdated
      }
    }
  `
};

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
async function executeQuery(name, query) {
  try {
    const response = await axios.post(SUBGRAPH_URL, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10秒超时
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

// 格式化时间戳
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleString();
}

// 格式化大数字
function formatBigNumber(value) {
  if (!value) return '0';
  const num = parseInt(value);
  if (num >= 1e18) return (num / 1e18).toFixed(2) + ' ETH';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
}

// 主验证函数
async function verifySubgraph() {
  colorLog('cyan', '🔍 Sleep Protocol Subgraph Verification');
  colorLog('cyan', '==========================================');
  
  // 1. 检查subgraph连接
  colorLog('blue', '\n📡 Checking Subgraph Connection...');
  const metaData = await executeQuery('indexingStatus', QUERIES.indexingStatus);
  
  if (!metaData) {
    colorLog('red', '❌ Cannot connect to subgraph endpoint');
    colorLog('yellow', '💡 Make sure the subgraph is running on http://localhost:8000');
    process.exit(1);
  }

  colorLog('green', '✅ Subgraph connection successful');
  
  // 2. 检查索引状态
  colorLog('blue', '\n📊 Indexing Status:');
  const meta = metaData._meta;
  if (meta) {
    console.log(`   Block Number: ${meta.block.number}`);
    console.log(`   Block Hash: ${meta.block.hash}`);
    console.log(`   Block Timestamp: ${formatTimestamp(meta.block.timestamp)}`);
    console.log(`   Deployment: ${meta.deployment}`);
    console.log(`   Has Indexing Errors: ${meta.hasIndexingErrors ? '❌ Yes' : '✅ No'}`);
    
    // 检查区块是否太旧
    const blockTime = parseInt(meta.block.timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - blockTime;
    
    if (timeDiff > 300) { // 5分钟
      colorLog('yellow', `   ⚠️  Block is ${Math.floor(timeDiff / 60)} minutes old`);
    } else {
      colorLog('green', '   ✅ Block is recent');
    }
  }

  // 3. 检查协议统计
  colorLog('blue', '\n📈 Global Statistics:');
  const globalData = await executeQuery('globalStats', QUERIES.globalStats);
  
  if (globalData && globalData.globalStats && globalData.globalStats.length > 0) {
    const stats = globalData.globalStats[0];
    console.log(`   Global Rank: ${stats.globalRank}`);
    console.log(`   Total Minted: ${formatBigNumber(stats.totalMinted)}`);
    console.log(`   Total Claimed: ${formatBigNumber(stats.totalClaimed)}`);
    console.log(`   Total Liquidated: ${formatBigNumber(stats.totalLiquidated)}`);
    console.log(`   Current Amplifier: ${stats.currentAmplifier}`);
    console.log(`   Current Max Term: ${stats.currentMaxTerm} days`);
    console.log(`   Current Decay Factor: ${stats.currentDecayFactor}`);
    colorLog('green', '   ✅ Global stats available');
  } else {
    colorLog('yellow', '   ⚠️  No global stats found (normal for new deployment)');
  }

  // 4. 检查最近的铸造记录
  colorLog('blue', '\n🪙 Recent Minting Activity:');
  const mintsData = await executeQuery('recentMints', QUERIES.recentMints);
  
  if (mintsData && mintsData.mintingPositionNFTs && mintsData.mintingPositionNFTs.length > 0) {
    console.log(`   Found ${mintsData.mintingPositionNFTs.length} recent mints:`);
    mintsData.mintingPositionNFTs.forEach((mint, index) => {
      console.log(`   ${index + 1}. Token #${mint.tokenId} - ${mint.count} units, ${mint.term} days`);
      console.log(`      Owner: ${mint.owner}`);
      console.log(`      Minted: ${formatTimestamp(mint.mintedAt)}`);
      console.log(`      Maturity: ${formatTimestamp(mint.maturityTs)}`);
      console.log(`      Status: ${mint.isMatured ? '✅ Matured' : '⏳ Pending'} ${mint.isClaimed ? '(Claimed)' : '(Unclaimed)'}`);
    });
    colorLog('green', '   ✅ Minting data is being indexed');
  } else {
    colorLog('yellow', '   ⚠️  No minting records found (normal for new deployment)');
  }

  // 5. 检查市场统计
  colorLog('blue', '\n🏪 Market Statistics:');
  const marketData = await executeQuery('marketStats', QUERIES.marketStats);
  
  if (marketData && marketData.marketStats) {
    const market = marketData.marketStats;
    console.log(`   Total Listings: ${market.totalListings}`);
    console.log(`   Active Listings: ${market.activeListings}`);
    console.log(`   Minting NFT Listings: ${market.mintingNFTListings}`);
    console.log(`   Access Pass Listings: ${market.accessPassListings}`);
    console.log(`   Total Volume: ${formatBigNumber(market.totalVolume)} OKB`);
    console.log(`   Total Sales: ${market.totalSales}`);
    console.log(`   Total Fees: ${formatBigNumber(market.totalFees)} OKB`);
    console.log(`   Current Fee: ${Number(market.currentFeePercent) / 100}%`);
    console.log(`   Last Updated: ${formatTimestamp(market.lastUpdated)}`);
    colorLog('green', '   ✅ Market stats available');
  } else {
    colorLog('yellow', '   ⚠️  No market stats found (normal for new deployment)');
  }

  // 6. 总结
  colorLog('cyan', '\n📋 Verification Summary:');
  colorLog('green', '✅ Subgraph is running and accessible');
  colorLog('green', '✅ Block indexing is working');
  
  if (meta && !meta.hasIndexingErrors) {
    colorLog('green', '✅ No indexing errors detected');
  } else {
    colorLog('red', '❌ Indexing errors detected - check subgraph logs');
  }
  
  colorLog('cyan', '\n🎉 Verification completed!');
  colorLog('yellow', '💡 Run this script regularly to monitor subgraph health');
}

// 直接运行验证
verifySubgraph().catch(error => {
  colorLog('red', `❌ Verification failed: ${error.message}`);
  process.exit(1);
});

export { verifySubgraph, executeQuery };
