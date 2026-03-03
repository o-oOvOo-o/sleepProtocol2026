// 检查 Graph Node 同步状态的详细脚本
const http = require('http');

const SUBGRAPH_URL = 'localhost';
const SUBGRAPH_PORT = 8000;
const SUBGRAPH_PATH = '/subgraphs/name/sleep-protocol/testnet';
const ADMIN_PORT = 8020;

// HTTP 请求函数
function makeRequest(port, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUBGRAPH_URL,
            port: port,
            path: path,
            method: data ? 'POST' : 'GET',
            headers: data ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            } : {}
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (error) {
                    resolve(responseData); // 返回原始文本
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// 颜色输出
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查同步状态
async function checkSyncStatus() {
    log('blue', '🔍 Sleep Protocol Subgraph 同步状态检查');
    console.log('');
    
    try {
        // 1. 检查 Subgraph 元数据
        log('yellow', '📋 步骤 1: 检查 Subgraph 元数据...');
        const metaQuery = {
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
        };
        
        const metaResult = await makeRequest(SUBGRAPH_PORT, SUBGRAPH_PATH, metaQuery);
        
        if (metaResult.data && metaResult.data._meta) {
            const meta = metaResult.data._meta;
            log('green', '✅ Subgraph 元数据获取成功:');
            console.log(`   📊 当前索引区块: ${meta.block.number}`);
            console.log(`   🔗 区块哈希: ${meta.block.hash}`);
            console.log(`   📦 部署ID: ${meta.deployment}`);
            console.log(`   ⚠️  索引错误: ${meta.hasIndexingErrors ? '是' : '否'}`);
            
            // 检查是否已经索引到合约部署区块
            const currentBlock = parseInt(meta.block.number);
            const contractBlocks = {
                'TokenMinter': 10910922,
                'TokenStaking': 10910911,
                'TokenAccessPass': 10910900,
                'TokenTreasury': 10910935,
                'MinterMarketplace': 10910946,
                'AccessPassMarketplace': 10910958
            };
            
            console.log('');
            log('cyan', '📈 合约部署区块 vs 当前索引区块:');
            let allSynced = true;
            for (const [contract, deployBlock] of Object.entries(contractBlocks)) {
                const synced = currentBlock >= deployBlock;
                if (!synced) allSynced = false;
                log(synced ? 'green' : 'yellow', 
                    `   ${synced ? '✅' : '⏳'} ${contract}: ${deployBlock} ${synced ? '(已索引)' : '(等待索引)'}`);
            }
            
            if (allSynced) {
                log('green', '\n🎉 所有合约区块都已被索引！');
            } else {
                log('yellow', '\n⏳ Graph Node 还在同步中，请稍等...');
            }
        }
        
        console.log('');
        
        // 2. 尝试获取管理信息
        log('yellow', '📋 步骤 2: 检查 Graph Node 管理状态...');
        try {
            const adminResult = await makeRequest(ADMIN_PORT, '/');
            log('green', '✅ Graph Node 管理接口可访问');
        } catch (error) {
            log('yellow', '⚠️  Graph Node 管理接口不可访问');
        }
        
        console.log('');
        
        // 3. 检查具体的合约事件
        log('yellow', '📋 步骤 3: 检查合约事件索引状态...');
        
        // 检查是否有任何事件被索引
        const eventQueries = [
            {
                name: 'Transfer 事件 (TokenMinter)',
                query: `
                    query {
                        mintingPositionNFTs(first: 1, orderBy: tokenId, orderDirection: desc) {
                            id
                            tokenId
                            owner
                        }
                    }
                `
            },
            {
                name: 'AccessPass Transfer 事件',
                query: `
                    query {
                        accessPassNFTs(first: 1, orderBy: tokenId, orderDirection: desc) {
                            id
                            tokenId
                            owner
                        }
                    }
                `
            }
        ];
        
        for (const eventQuery of eventQueries) {
            try {
                const result = await makeRequest(SUBGRAPH_PORT, SUBGRAPH_PATH, { query: eventQuery.query });
                if (result.data) {
                    const dataKeys = Object.keys(result.data);
                    const hasData = dataKeys.some(key => {
                        const value = result.data[key];
                        return Array.isArray(value) && value.length > 0;
                    });
                    
                    log(hasData ? 'green' : 'yellow', 
                        `   ${hasData ? '✅' : '⚠️ '} ${eventQuery.name}: ${hasData ? '有数据' : '暂无数据'}`);
                    
                    if (hasData) {
                        console.log(`      数据示例: ${JSON.stringify(result.data, null, 6)}`);
                    }
                } else {
                    log('red', `   ❌ ${eventQuery.name}: 查询失败`);
                }
            } catch (error) {
                log('red', `   ❌ ${eventQuery.name}: ${error.message}`);
            }
        }
        
        console.log('');
        
        // 4. 提供建议
        log('blue', '💡 建议和下一步:');
        console.log('   1. 如果所有合约区块都已索引但仍无数据，可能需要进行合约交互');
        console.log('   2. 可以尝试调用合约的铸币或质押功能来生成事件');
        console.log('   3. 检查合约地址是否正确部署在 X Layer testnet');
        console.log('   4. 等待几分钟让 Graph Node 完全同步');
        
        console.log('');
        log('blue', '🔗 有用链接:');
        console.log(`   - GraphQL Playground: http://localhost:8000/subgraphs/name/sleep-protocol/testnet/graphql`);
        console.log(`   - Graph Node 管理: http://localhost:8020/`);
        console.log(`   - 合约部署信息: deployment-info.json`);
        
    } catch (error) {
        log('red', `❌ 检查失败: ${error.message}`);
    }
}

// 运行检查
checkSyncStatus().catch(error => {
    log('red', `❌ 未处理的错误: ${error.message}`);
    process.exit(1);
});

