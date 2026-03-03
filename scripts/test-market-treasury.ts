// 测试市场金库数据计算
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

async function testMarketTreasury() {
    console.log('💰 测试市场金库数据...\n');

    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `{
                    marketListings(where: { active: true }) {
                        id
                        tokenId
                        nftType
                        price
                    }
                    marketSales(orderBy: timestamp, orderDirection: desc) {
                        id
                        tokenId
                        nftType
                        price
                        seller
                        buyer
                        timestamp
                    }
                    marketStats(id: "1") {
                        totalListings
                        activeListings
                        totalSales
                        totalVolume
                    }
                }`
            })
        });

        const result = await response.json();

        if (result.errors) {
            console.error('❌ 查询失败:', result.errors);
            return;
        }

        const { marketListings, marketSales, marketStats } = result.data;

        // 计算总交易量
        const totalVolume = marketSales.reduce((sum: number, sale: any) => {
            return sum + Number(sale.price);
        }, 0);

        // 计算累计手续费（假设 0.5% 费率）
        const feePercent = 50; // 0.5% = 50 basis points
        const totalFees = marketSales.reduce((sum: number, sale: any) => {
            const salePrice = Number(sale.price);
            const fee = (salePrice * feePercent) / 10000;
            return sum + fee;
        }, 0);

        console.log('📊 市场统计:\n');
        
        console.log('✅ 活跃挂单:', marketListings.length);
        console.log('   - Mint Card:', marketListings.filter((l: any) => l.nftType === 'MINTING_POSITION').length);
        console.log('   - Access Pass:', marketListings.filter((l: any) => l.nftType === 'ACCESS_PASS').length);
        console.log('');
        
        console.log('✅ 历史交易:', marketSales.length, '笔');
        console.log('');
        
        console.log('✅ 总交易量:', (totalVolume / 1e18).toFixed(4), 'OKB');
        console.log('');
        
        console.log('✅ 累计手续费收入:', (totalFees / 1e18).toFixed(6), 'OKB');
        console.log('   手续费率:', feePercent / 100, '%');
        console.log('');

        if (marketStats) {
            console.log('✅ MarketStats 实体:');
            console.log('   总挂单:', marketStats.totalListings);
            console.log('   活跃挂单:', marketStats.activeListings);
            console.log('   总销售:', marketStats.totalSales);
            console.log('   总交易量:', (Number(marketStats.totalVolume) / 1e18).toFixed(4), 'OKB');
            console.log('');
        }

        if (marketSales.length > 0) {
            console.log('📋 最近 3 笔交易:\n');
            marketSales.slice(0, 3).forEach((sale: any, i: number) => {
                console.log(`${i + 1}. Token #${sale.tokenId} (${sale.nftType})`);
                console.log(`   价格: ${(Number(sale.price) / 1e18).toFixed(4)} OKB`);
                console.log(`   卖家: ${sale.seller.slice(0, 10)}...`);
                console.log(`   买家: ${sale.buyer.slice(0, 10)}...`);
                console.log(`   时间: ${new Date(Number(sale.timestamp) * 1000).toLocaleString()}`);
                console.log('');
            });
        }

        // 计算预期收益
        if (marketListings.length > 0) {
            const totalListedValue = marketListings.reduce((sum: number, listing: any) => {
                return sum + Number(listing.price);
            }, 0);
            
            const potentialFees = (totalListedValue * feePercent) / 10000;
            
            console.log('💡 潜在收益（如果所有挂单都成交）:');
            console.log('   挂单总价值:', (totalListedValue / 1e18).toFixed(4), 'OKB');
            console.log('   预期手续费:', (potentialFees / 1e18).toFixed(6), 'OKB');
        }

    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

testMarketTreasury();








