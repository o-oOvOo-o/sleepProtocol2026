// 快速测试脚本 - 无需额外依赖
const http = require('http');

const SUBGRAPH_URL = 'localhost';
const SUBGRAPH_PORT = 8000;
const SUBGRAPH_PATH = '/subgraphs/name/sleep-protocol/testnet';

// 简单的 HTTP POST 请求函数
function makeRequest(data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: SUBGRAPH_URL,
            port: SUBGRAPH_PORT,
            path: SUBGRAPH_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
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
                    reject(new Error(`解析响应失败: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// 颜色输出
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

// 快速测试
async function quickTest() {
    log('blue', '🚀 Sleep Protocol Subgraph 快速测试');
    console.log('');
    
    try {
        // 测试 1: 基本连接和元数据
        log('yellow', '📋 测试 1: 检查 Subgraph 状态...');
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
        
        const metaResult = await makeRequest(metaQuery);
        
        if (metaResult.errors) {
            log('red', `❌ GraphQL 错误: ${JSON.stringify(metaResult.errors, null, 2)}`);
            return;
        }
        
        if (metaResult.data && metaResult.data._meta) {
            const meta = metaResult.data._meta;
            log('green', '✅ Subgraph 连接成功!');
            console.log(`   📊 当前区块: ${meta.block.number}`);
            console.log(`   🔗 区块哈希: ${meta.block.hash}`);
            console.log(`   📦 部署ID: ${meta.deployment}`);
            console.log(`   ⚠️  索引错误: ${meta.hasIndexingErrors ? '是' : '否'}`);
        } else {
            log('red', '❌ 无效的元数据响应');
            return;
        }
        
        console.log('');
        
        // 测试 2: 检查是否有数据
        log('yellow', '📋 测试 2: 检查数据可用性...');
        const dataQuery = {
            query: `
                query {
                    mintingPositionNFTs(first: 1) { id }
                    stakingDeposits(first: 1) { id }
                    accessPassNFTs(first: 1) { id }
                    epochInfos(first: 1) { id }
                    marketListings(first: 1) { id }
                    claimEvents(first: 1) { id }
                }
            `
        };
        
        const dataResult = await makeRequest(dataQuery);
        
        if (dataResult.errors) {
            log('red', `❌ 数据查询错误: ${JSON.stringify(dataResult.errors, null, 2)}`);
            return;
        }
        
        if (dataResult.data) {
            const data = dataResult.data;
            const entities = [
                { name: 'MintingPositionNFTs', data: data.mintingPositionNFTs },
                { name: 'StakingDeposits', data: data.stakingDeposits },
                { name: 'AccessPassNFTs', data: data.accessPassNFTs },
                { name: 'EpochInfos', data: data.epochInfos },
                { name: 'MarketListings', data: data.marketListings },
                { name: 'ClaimEvents', data: data.claimEvents }
            ];
            
            let hasAnyData = false;
            entities.forEach(entity => {
                const hasData = entity.data && entity.data.length > 0;
                if (hasData) hasAnyData = true;
                
                log(hasData ? 'green' : 'yellow', 
                    `   ${hasData ? '✅' : '⚠️ '} ${entity.name}: ${hasData ? entity.data.length + ' 条记录' : '暂无数据'}`);
            });
            
            console.log('');
            
            if (hasAnyData) {
                log('green', '🎉 测试完成! Subgraph 正常工作且包含数据。');
            } else {
                log('yellow', '⚠️  测试完成! Subgraph 正常工作，但暂无数据。');
                log('blue', '💡 这可能是因为:');
                console.log('   - 合约还未部署或交互');
                console.log('   - Graph Node 还在同步区块链数据');
                console.log('   - 起始区块配置可能需要调整');
            }
        }
        
        console.log('');
        log('blue', '📝 有用的链接:');
        console.log(`   - GraphQL Playground: http://localhost:8000/subgraphs/name/sleep-protocol/testnet/graphql`);
        console.log(`   - 查询端点: http://localhost:8000/subgraphs/name/sleep-protocol/testnet`);
        console.log(`   - Graph Node 状态: http://localhost:8020/`);
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            log('red', '❌ 连接被拒绝');
            log('yellow', '请确保 Graph Node 正在运行:');
            console.log('   cd subgraph');
            console.log('   docker-compose up');
        } else {
            log('red', `❌ 测试失败: ${error.message}`);
        }
    }
}

// 运行快速测试
quickTest().catch(error => {
    log('red', `❌ 未处理的错误: ${error.message}`);
    process.exit(1);
});














