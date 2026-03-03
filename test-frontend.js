async function testFrontend() {
  try {
    console.log('=== 测试前端服务器 ===');
    
    // Test 1: Check if frontend is running
    const frontendResponse = await fetch('http://localhost:3000');
    console.log('前端服务器状态:', frontendResponse.status);
    
    // Test 2: Check if liquidate page exists
    const liquidateResponse = await fetch('http://localhost:3000/liquidate');
    console.log('清算页面状态:', liquidateResponse.status);
    
    // Test 3: Test the GraphQL query that the frontend will use
    console.log('\n=== 测试前端使用的 GraphQL 查询 ===');
    const now = Math.floor(Date.now() / 1000);
    const liquidationTimestamp = now - (20 * 86400); // 20 days ago
    
    const query = {
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

    console.log('GraphQL 查询:', JSON.stringify(query, null, 2));
    
    const graphqlResponse = await fetch('http://127.0.0.1:8020/subgraphs/id/QmQoAWiVYaXJBX6dptoJgkX6YGtPm8zGyjmk3VY2FuR8nx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query)
    });

    console.log('GraphQL 响应状态:', graphqlResponse.status);
    const graphqlData = await graphqlResponse.text();
    console.log('GraphQL 响应:', graphqlData);

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testFrontend();
