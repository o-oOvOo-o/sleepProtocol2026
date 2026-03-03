// 测试 Subgraph 部署后的状态
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

async function testDeployment() {
    console.log('🔍 测试 Subgraph 部署状态...\n');

    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `{
                    _meta {
                        block { number hash }
                        deployment
                        hasIndexingErrors
                    }
                    marketStats(id: "1") {
                        totalListings
                        activeListings
                    }
                    marketListings(first: 5, orderBy: listedAt, orderDirection: desc) {
                        id
                        tokenId
                        nftType
                        seller
                        price
                        active
                    }
                }`
            })
        });

        const result = await response.json();

        if (result.errors) {
            console.error('❌ GraphQL 错误:', result.errors);
            return;
        }

        console.log('✅ Subgraph 状态:');
        console.log('');
        console.log('📊 元数据:');
        console.log('  当前区块:', result.data._meta?.block?.number || 'N/A');
        console.log('  区块哈希:', result.data._meta?.block?.hash?.slice(0, 10) + '...' || 'N/A');
        console.log('  部署 ID:', result.data._meta?.deployment?.slice(0, 20) + '...' || 'N/A');
        console.log('  索引错误:', result.data._meta?.hasIndexingErrors ? '❌ 有错误' : '✅ 无错误');
        console.log('');
        console.log('📈 市场统计:');
        if (result.data.marketStats) {
            console.log('  总 Listings:', result.data.marketStats.totalListings);
            console.log('  活跃 Listings:', result.data.marketStats.activeListings);
        } else {
            console.log('  ⚠️  MarketStats 尚未创建（正常，等待第一个事件）');
        }
        console.log('');
        console.log('🛍️  活跃 Listings:');
        if (result.data.marketListings && result.data.marketListings.length > 0) {
            result.data.marketListings.forEach((listing: any, i: number) => {
                console.log(`  ${i + 1}. Token #${listing.tokenId} (${listing.nftType})`);
                console.log(`     卖家: ${listing.seller.slice(0, 10)}...`);
                console.log(`     价格: ${(parseFloat(listing.price) / 1e18).toFixed(4)} OKB`);
                console.log(`     状态: ${listing.active ? '✅ 活跃' : '❌ 已下架'}`);
            });
        } else {
            console.log('  ⚠️  暂无 Listings（等待索引到 NFTListed 事件）');
        }

    } catch (error) {
        console.error('❌ 连接失败:', error);
    }
}

testDeployment();








