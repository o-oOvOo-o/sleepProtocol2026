import axios from 'axios';

const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

async function testAccessPassQuery() {
  console.log('🔍 Testing AccessPass NFT Query');
  console.log('==========================================\n');

  try {
    // 测试查询所有AccessPass NFTs
    const allAccessPassQuery = `
      query {
        accessPassNFTs(first: 10, orderBy: createdAt, orderDirection: desc) {
          id
          tokenId
          owner
          totalAmount
          depositCount
          activeDeposits
          totalShares
          claimableRewards
          totalRewardsClaimed
          createdAt
          cardLevel
        }
      }
    `;

    console.log('📋 Querying all AccessPass NFTs...');
    const allResult = await axios.post(SUBGRAPH_URL, {
      query: allAccessPassQuery
    });

    if (allResult.data.errors) {
      console.error('❌ Query errors:', allResult.data.errors);
      return;
    }

    const accessPasses = allResult.data.data.accessPassNFTs || [];
    console.log(`✅ Found ${accessPasses.length} AccessPass NFTs:`);
    
    accessPasses.forEach((nft, index) => {
      console.log(`   ${index + 1}. Token #${nft.tokenId}`);
      console.log(`      Owner: ${nft.owner}`);
      console.log(`      Total Amount: ${nft.totalAmount}`);
      console.log(`      Deposits: ${nft.depositCount} (${nft.activeDeposits} active)`);
      console.log(`      Created: ${new Date(parseInt(nft.createdAt) * 1000).toLocaleString()}`);
      console.log(`      Card Level: ${nft.cardLevel}`);
      console.log('');
    });

    // 测试特定用户查询
    const userAddress = '0xa59de3821476bf6f1a11a23f01d82d0d4d1fefe9';
    const userQuery = `
      query GetUserAccessPasses($userAddress: String!) {
        accessPassNFTs(where: { owner: $userAddress }) {
          id
          tokenId
          owner
          totalAmount
          depositCount
          activeDeposits
          totalShares
          claimableRewards
          totalRewardsClaimed
          createdAt
        }
        stakingDeposits(where: { accessPass_: { owner: $userAddress } }) {
          id
          amount
          shares
          stakingDays
          maturityTs
          depositedAt
          shareRate
          longerPaysMoreBonus
          biggerBenefitBonus
        }
      }
    `;

    console.log(`📋 Querying AccessPass NFTs for user: ${userAddress}...`);
    const userResult = await axios.post(SUBGRAPH_URL, {
      query: userQuery,
      variables: { userAddress: userAddress.toLowerCase() }
    });

    if (userResult.data.errors) {
      console.error('❌ User query errors:', userResult.data.errors);
      return;
    }

    const userAccessPasses = userResult.data.data.accessPassNFTs || [];
    const userDeposits = userResult.data.data.stakingDeposits || [];
    
    console.log(`✅ User has ${userAccessPasses.length} AccessPass NFTs and ${userDeposits.length} staking deposits`);
    
    if (userAccessPasses.length > 0) {
      console.log('\n📊 User AccessPass Details:');
      userAccessPasses.forEach((nft, index) => {
        console.log(`   ${index + 1}. Token #${nft.tokenId}`);
        console.log(`      Total Amount: ${nft.totalAmount}`);
        console.log(`      Deposits: ${nft.depositCount} (${nft.activeDeposits} active)`);
        console.log(`      Total Shares: ${nft.totalShares}`);
        console.log(`      Claimable Rewards: ${nft.claimableRewards}`);
        console.log('');
      });
    }

    if (userDeposits.length > 0) {
      console.log('\n💰 User Staking Deposits:');
      userDeposits.forEach((deposit, index) => {
        console.log(`   ${index + 1}. Deposit ID: ${deposit.id}`);
        console.log(`      Amount: ${deposit.amount}`);
        console.log(`      Shares: ${deposit.shares}`);
        console.log(`      Staking Days: ${deposit.stakingDays}`);
        console.log(`      Maturity: ${new Date(parseInt(deposit.maturityTs) * 1000).toLocaleString()}`);
        console.log(`      Deposited: ${new Date(parseInt(deposit.depositedAt) * 1000).toLocaleString()}`);
        console.log(`      Longer Pays More Bonus: ${deposit.longerPaysMoreBonus}%`);
        console.log(`      Bigger Benefit Bonus: ${deposit.biggerBenefitBonus}%`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error testing AccessPass query:', error.message);
  }
}

// 运行测试
testAccessPassQuery().then(() => {
  console.log('🎉 AccessPass query test completed!');
}).catch(console.error);








