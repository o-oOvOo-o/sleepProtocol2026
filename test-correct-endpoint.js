async function testCorrectEndpoint() {
  const correctUrl = 'http://127.0.0.1:8000/subgraphs/id/QmQoAWiVYaXJBX6dptoJgkX6YGtPm8zGyjmk3VY2FuR8nx';
  
  console.log('=== 使用正确端点测试 Subgraph 数据 ===');
  
  try {
    // 1. 查询所有 NFT 位置
    console.log('\n1. 查询所有 NFT 位置:');
    const allNftsQuery = {
      query: `{
        sleepNftPositions(first: 10, orderBy: tokenId) {
          id
          tokenId
          owner
          maturityTs
          term
          rank
          count
        }
        _meta {
          block {
            number
          }
        }
      }`
    };
    
    const response1 = await fetch(correctUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allNftsQuery)
    });
    
    const data1 = await response1.json();
    console.log('所有 NFTs:', JSON.stringify(data1, null, 2));
    
    // 2. 查询当前时间之前成熟的 NFT
    console.log('\n2. 查询已成熟的 NFTs:');
    const now = Math.floor(Date.now() / 1000);
    console.log('当前时间戳:', now);
    
    const maturedQuery = {
      query: `{
        sleepNftPositions(
          where: { maturityTs_lt: "${now}" }
          first: 10
          orderBy: maturityTs
        ) {
          id
          tokenId
          owner
          maturityTs
          term
          rank
          count
        }
      }`
    };
    
    const response2 = await fetch(correctUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(maturedQuery)
    });
    
    const data2 = await response2.json();
    console.log('已成熟 NFTs:', JSON.stringify(data2, null, 2));
    
    // 3. 查询清算条件的 NFT (20天前成熟)
    console.log('\n3. 查询可清算的 NFTs (20天前成熟):');
    const liquidationTimestamp = now - (20 * 86400);
    console.log('清算时间戳 (20天前):', liquidationTimestamp);
    console.log('清算时间:', new Date(liquidationTimestamp * 1000).toLocaleString());
    
    const liquidatableQuery = {
      query: `
        query GetLiquidatableNfts($liquidationTimestamp: String!, $first: Int!, $skip: Int!) {
          sleepNftPositions(
            where: {
              maturityTs_lte: $liquidationTimestamp,
              claimEvent: null
            },
            orderBy: maturityTs,
            orderDirection: asc,
            first: $first,
            skip: $skip
          ) {
            id
            tokenId
            owner
            term
            maturityTs
            rank
            amplifier
            count
          }
          _meta {
            block {
              number
            }
          }
        }
      `,
      variables: {
        liquidationTimestamp: liquidationTimestamp.toString(),
        first: 15,
        skip: 0
      }
    };
    
    const response3 = await fetch(correctUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(liquidatableQuery)
    });
    
    const data3 = await response3.json();
    console.log('可清算 NFTs:', JSON.stringify(data3, null, 2));
    
    // 4. 如果有数据，分析时间
    if (data1.data && data1.data.sleepNftPositions.length > 0) {
      console.log('\n4. 分析 NFT 时间:');
      data1.data.sleepNftPositions.forEach(nft => {
        const maturityDate = new Date(parseInt(nft.maturityTs) * 1000);
        const daysSinceMaturity = (now - parseInt(nft.maturityTs)) / 86400;
        console.log(`NFT #${nft.tokenId}:`);
        console.log(`  成熟时间: ${maturityDate.toLocaleString()}`);
        console.log(`  成熟天数: ${daysSinceMaturity.toFixed(1)} 天`);
        console.log(`  是否可清算: ${daysSinceMaturity >= 20 ? '是' : '否'}`);
      });
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testCorrectEndpoint();
