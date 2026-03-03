async function testEndpoints() {
  const endpoints = [
    'http://127.0.0.1:8000/subgraphs/id/QmQoAWiVYaXJBX6dptoJgkX6YGtPm8zGyjmk3VY2FuR8nx',
    'http://127.0.0.1:8020/subgraphs/id/QmQoAWiVYaXJBX6dptoJgkX6YGtPm8zGyjmk3VY2FuR8nx', 
    'http://127.0.0.1:8000/subgraphs/name/xen/v1.2.0',
    'http://127.0.0.1:8020/subgraphs/name/xen/v1.2.0'
  ];

  const simpleQuery = {
    query: `{ _meta { block { number } } }`
  };

  console.log('=== 测试不同的 GraphQL 端点 ===');
  
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    console.log(`\n${i + 1}. 测试端点: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simpleQuery)
      });
      
      console.log(`   状态: ${response.status}`);
      const data = await response.text();
      console.log(`   响应: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
      
      // 如果响应是有效的 JSON 且不是错误，尝试解析
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.data && !jsonData.errors) {
          console.log(`   ✅ 这个端点工作正常!`);
          return endpoint;
        }
      } catch (e) {
        // 不是有效 JSON，继续测试下一个
      }
      
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
    }
  }
  
  console.log('\n=== 测试 Graph Node 状态端点 ===');
  
  const statusEndpoints = [
    'http://127.0.0.1:8030/graphql',
    'http://127.0.0.1:8040/graphql'
  ];
  
  for (const endpoint of statusEndpoints) {
    console.log(`\n测试状态端点: ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ indexingStatuses { subgraph node health } }`
        })
      });
      
      console.log(`状态: ${response.status}`);
      const data = await response.text();
      console.log(`响应: ${data}`);
    } catch (error) {
      console.log(`错误: ${error.message}`);
    }
  }
}

testEndpoints();
