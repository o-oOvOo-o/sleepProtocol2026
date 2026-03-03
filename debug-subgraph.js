async function debugSubgraph() {
  try {
    const subgraphUrl = 'http://127.0.0.1:8020/subgraphs/id/QmQoAWiVYaXJBX6dptoJgkX6YGtPm8zGyjmk3VY2FuR8nx';
    
    console.log('=== 1. 测试基本 GraphQL 连接 ===');
    
    // Test 1: Simple meta query
    const metaQuery = {
      query: `{ _meta { block { number timestamp } } }`
    };
    
    const metaResponse = await fetch(subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaQuery)
    });
    
    console.log('Meta 查询状态:', metaResponse.status);
    const metaData = await metaResponse.text();
    console.log('Meta 响应:', metaData);
    
    console.log('\n=== 2. 查询所有 NFT 位置 ===');
    
    // Test 2: Get all NFT positions
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
      }`
    };
    
    const allNftsResponse = await fetch(subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allNftsQuery)
    });
    
    console.log('所有 NFTs 查询状态:', allNftsResponse.status);
    const allNftsData = await allNftsResponse.text();
    console.log('所有 NFTs 响应:', allNftsData);
    
    console.log('\n=== 3. 查询过期的 NFTs (不限时间) ===');
    
    // Test 3: Get any NFTs with old maturity
    const expiredQuery = {
      query: `{
        sleepNftPositions(
          where: { maturityTs_lt: "${Math.floor(Date.now() / 1000)}" }
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
    
    const expiredResponse = await fetch(subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expiredQuery)
    });
    
    console.log('过期 NFTs 查询状态:', expiredResponse.status);
    const expiredData = await expiredResponse.text();
    console.log('过期 NFTs 响应:', expiredData);
    
    console.log('\n=== 4. 检查当前时间和清算条件 ===');
    const now = Math.floor(Date.now() / 1000);
    const liquidationTimestamp = now - (20 * 86400); // 20 days ago
    console.log('当前时间戳:', now);
    console.log('清算时间戳 (20天前):', liquidationTimestamp);
    console.log('清算时间:', new Date(liquidationTimestamp * 1000).toLocaleString());
    
  } catch (error) {
    console.error('调试失败:', error.message);
  }
}

debugSubgraph();
