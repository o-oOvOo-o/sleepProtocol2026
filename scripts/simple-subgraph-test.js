import axios from 'axios';

const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

async function simpleTest() {
  console.log('🔍 Simple Subgraph Connection Test');
  console.log('==========================================');
  
  try {
    console.log('Testing connection to:', SUBGRAPH_URL);
    
    const response = await axios.post(SUBGRAPH_URL, {
      query: '{ _meta { block { number } } }'
    });
    
    console.log('✅ Connection successful!');
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

simpleTest();








