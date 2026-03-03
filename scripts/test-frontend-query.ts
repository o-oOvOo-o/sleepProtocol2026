// 模拟前端查询，测试是否能获取到用户的 Listings
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';
const USER_ADDRESS = '0xa59de3821476BF6f1A11a23f01d82D0D4D1fEFE9'; // 从之前的测试中获取

async function testFrontendQuery() {
    console.log('🔍 模拟前端查询...\n');
    console.log('用户地址:', USER_ADDRESS);
    console.log('');

    try {
        // 1. 查询用户的 Listings (模拟 useUserListings hook)
        console.log('📋 查询用户的活跃 Listings...');
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    query GetUserListings($userAddress: String!) {
                        marketListings(where: { seller: $userAddress, active: true }) {
                            id
                            tokenId
                            nftType
                            seller
                            price
                            active
                            listedAt
                        }
                    }
                `,
                variables: { userAddress: USER_ADDRESS.toLowerCase() }
            })
        });

        const result = await response.json();

        if (result.errors) {
            console.error('❌ 查询失败:', result.errors);
            return;
        }

        const listings = result.data.marketListings || [];
        console.log(`✅ 找到 ${listings.length} 个活跃 Listings:\n`);

        listings.forEach((listing: any, i: number) => {
            console.log(`${i + 1}. Token #${listing.tokenId} (${listing.nftType})`);
            console.log(`   ID: ${listing.id}`);
            console.log(`   价格: ${(parseFloat(listing.price) / 1e18).toFixed(4)} OKB`);
            console.log(`   卖家: ${listing.seller}`);
            console.log(`   上架时间: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
            console.log('');
        });

        // 2. 验证前端逻辑
        console.log('🧪 验证前端 getNFTListingStatus 逻辑...\n');
        
        const testTokenId = 1;
        const testNftType = 'mint';
        const nftTypeMapping: any = {
            'mint': 'MINTING_POSITION',
            'access': 'ACCESS_PASS'
        };

        const foundListing = listings.find((listing: any) => 
            listing.tokenId === testTokenId.toString() && 
            listing.nftType === nftTypeMapping[testNftType] &&
            listing.active
        );

        if (foundListing) {
            console.log('✅ Mint Card #1 的 Listing 状态:');
            console.log('   isListed: true');
            console.log('   listingPrice:', (parseFloat(foundListing.price) / 1e18).toFixed(4), 'OKB');
            console.log('   listingId:', foundListing.id);
            console.log('');
            console.log('✅ 前端应该能正确显示 "🏪 已上架" 标签！');
        } else {
            console.log('❌ 没有找到 Mint Card #1 的 Listing');
        }

    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

testFrontendQuery();








