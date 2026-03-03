import fetch from 'node-fetch';

const SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/sleep-protocol-subgraph';

const SCHEMA_QUERY = `
  query {
    __schema {
      queryType {
        fields {
          name
          type {
            name
            kind
          }
        }
      }
    }
  }
`;

async function checkSchema() {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SCHEMA_QUERY }),
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return;
    }
    
    console.log('Available Query Fields:');
    result.data.__schema.queryType.fields.forEach(field => {
      console.log(`- ${field.name}: ${field.type.name || field.type.kind}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
