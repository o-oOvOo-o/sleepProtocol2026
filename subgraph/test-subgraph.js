const axios = require('axios');

// Subgraph GraphQL 端点
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol/testnet';

// 颜色输出函数
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// GraphQL 查询函数
async function querySubgraph(query, variables = {}) {
    try {
        const response = await axios.post(SUBGRAPH_URL, {
            query,
            variables
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors, null, 2)}`);
        }
        
        return response.data.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}\n${JSON.stringify(error.response.data, null, 2)}`);
        }
        throw error;
    }
}

// 测试查询集合
const testQueries = {
    // 1. 测试基本连接和元数据
    healthCheck: {
        name: "健康检查 - 获取 _meta 信息",
        query: `
            query {
                _meta {
                    block {
                        number
                        hash
                    }
                    deployment
                    hasIndexingErrors
                }
            }
        `
    },

    // 2. 测试 TokenMinter 相关数据
    mintingPositions: {
        name: "获取 Minting Position NFTs",
        query: `
            query {
                mintingPositionNFTs(first: 5, orderBy: tokenId, orderDirection: desc) {
                    id
                    tokenId
                    owner
                    mintingAmount
                    stakingPeriod
                    createdAt
                    isActive
                }
            }
        `
    },

    // 3. 测试 TokenStaking 相关数据
    stakingDeposits: {
        name: "获取质押存款记录",
        query: `
            query {
                stakingDeposits(first: 5, orderBy: timestamp, orderDirection: desc) {
                    id
                    user
                    amount
                    shares
                    stakingPeriod
                    timestamp
                    isActive
                }
            }
        `
    },

    // 4. 测试 AccessPass NFT 数据
    accessPassNFTs: {
        name: "获取 Access Pass NFTs",
        query: `
            query {
                accessPassNFTs(first: 5, orderBy: tokenId, orderDirection: desc) {
                    id
                    tokenId
                    owner
                    level
                    createdAt
                    lastUpdated
                }
            }
        `
    },

    // 5. 测试 Treasury 数据
    epochInfo: {
        name: "获取 Epoch 信息",
        query: `
            query {
                epochInfos(first: 3, orderBy: epochNumber, orderDirection: desc) {
                    id
                    epochNumber
                    mode
                    totalRevenue
                    startTime
                    endTime
                    isFinalized
                }
            }
        `
    },

    // 6. 测试市场数据
    marketplaceListings: {
        name: "获取市场列表",
        query: `
            query {
                nftListings(first: 5, orderBy: createdAt, orderDirection: desc) {
                    id
                    tokenId
                    nftType
                    seller
                    price
                    isActive
                    createdAt
                }
            }
        `
    },

    // 7. 测试统计数据
    globalStats: {
        name: "获取全局统计数据",
        query: `
            query {
                globalStats(first: 1) {
                    id
                    totalMintingPositions
                    totalStakingDeposits
                    totalAccessPasses
                    totalValueLocked
                    totalRevenue
                }
            }
        `
    },

    // 8. 测试复杂查询 - 用户相关数据
    userData: {
        name: "获取用户相关数据 (如果有数据)",
        query: `
            query($userAddress: String!) {
                mintingPositionNFTs(where: { owner: $userAddress }) {
                    id
                    tokenId
                    mintingAmount
                }
                stakingDeposits(where: { user: $userAddress, isActive: true }) {
                    id
                    amount
                    stakingPeriod
                }
                accessPassNFTs(where: { owner: $userAddress }) {
                    id
                    tokenId
                    level
                }
            }
        `,
        variables: {
            userAddress: "0x1234567890123456789012345678901234567890" // 示例地址
        }
    }
};

// 主测试函数
async function runTests() {
    log('blue', '🚀 开始测试 Sleep Protocol Subgraph...\n');
    
    let passedTests = 0;
    let totalTests = Object.keys(testQueries).length;
    
    for (const [key, test] of Object.entries(testQueries)) {
        try {
            log('yellow', `📋 测试: ${test.name}`);
            
            const startTime = Date.now();
            const result = await querySubgraph(test.query, test.variables);
            const duration = Date.now() - startTime;
            
            // 检查结果
            if (result && typeof result === 'object') {
                const dataKeys = Object.keys(result);
                const hasData = dataKeys.some(key => {
                    const value = result[key];
                    return Array.isArray(value) ? value.length > 0 : value !== null;
                });
                
                if (hasData) {
                    log('green', `✅ 成功 (${duration}ms) - 找到数据:`);
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    log('yellow', `⚠️  成功 (${duration}ms) - 查询正常但暂无数据:`);
                    console.log(JSON.stringify(result, null, 2));
                }
                passedTests++;
            } else {
                log('red', `❌ 失败 - 无效响应格式`);
                console.log('响应:', result);
            }
            
        } catch (error) {
            log('red', `❌ 失败 - ${error.message}`);
        }
        
        console.log(''); // 空行分隔
    }
    
    // 测试总结
    log('blue', '📊 测试总结:');
    log(passedTests === totalTests ? 'green' : 'yellow', 
        `通过: ${passedTests}/${totalTests} 个测试`);
    
    if (passedTests === totalTests) {
        log('green', '🎉 所有测试通过！Subgraph 运行正常。');
    } else if (passedTests > 0) {
        log('yellow', '⚠️  部分测试通过。Subgraph 基本正常，可能需要等待更多数据索引。');
    } else {
        log('red', '❌ 所有测试失败。请检查 Subgraph 配置和 Graph Node 状态。');
    }
    
    // 提供有用的信息
    console.log('\n📝 有用的信息:');
    console.log(`- GraphQL Playground: http://localhost:8000/subgraphs/name/sleep-protocol/testnet/graphql`);
    console.log(`- 查询端点: ${SUBGRAPH_URL}`);
    console.log(`- Graph Node 管理界面: http://localhost:8020/`);
}

// 检查依赖
async function checkDependencies() {
    try {
        require('axios');
    } catch (error) {
        log('red', '❌ 缺少依赖: axios');
        log('yellow', '请运行: npm install axios');
        process.exit(1);
    }
}

// 运行测试
async function main() {
    await checkDependencies();
    
    log('blue', '🔍 检查 Subgraph 连接...');
    
    try {
        // 首先测试基本连接
        await axios.get('http://localhost:8000');
        log('green', '✅ Graph Node GraphQL 服务器运行正常');
    } catch (error) {
        log('red', '❌ 无法连接到 Graph Node GraphQL 服务器');
        log('yellow', '请确保 Graph Node 正在运行 (docker-compose up)');
        process.exit(1);
    }
    
    await runTests();
}

// 处理未捕获的异常
process.on('unhandledRejection', (error) => {
    log('red', `❌ 未处理的错误: ${error.message}`);
    process.exit(1);
});

// 启动测试
main().catch(error => {
    log('red', `❌ 测试失败: ${error.message}`);
    process.exit(1);
});

