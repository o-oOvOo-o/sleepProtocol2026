import axios from 'axios';

const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

async function checkMarketplaceEvents() {
  console.log('🔍 Checking Marketplace Events and Data');
  console.log('==========================================\n');

  try {
    // 1. 检查marketplace统计数据
    console.log('📊 Checking marketplace stats...');
    const statsQuery = `
      query {
        marketStats(first: 5) {
          id
          totalListings
          activeListings
          totalVolume
          totalSales
          currentFeePercent
          lastUpdated
        }
      }
    `;

    const statsResult = await axios.post(SUBGRAPH_URL, {
      query: statsQuery
    });

    if (statsResult.data.errors) {
      console.error('❌ Stats query errors:', statsResult.data.errors);
    } else {
      const stats = statsResult.data.data.marketStats || [];
      console.log(`✅ Found ${stats.length} marketplace stats entries:`);
      stats.forEach((stat, index) => {
        console.log(`   ${index + 1}. Stats ID: ${stat.id}`);
        console.log(`      Total Listings: ${stat.totalListings}`);
        console.log(`      Active Listings: ${stat.activeListings}`);
        console.log(`      Total Volume: ${stat.totalVolume}`);
        console.log(`      Total Sales: ${stat.totalSales}`);
        console.log(`      Fee Percent: ${stat.currentFeePercent}`);
        console.log(`      Last Updated: ${new Date(parseInt(stat.lastUpdated) * 1000).toLocaleString()}`);
        console.log('');
      });
    }

    // 2. 检查所有marketplace listings（包括非活跃的）
    console.log('📋 Checking all marketplace listings...');
    const allListingsQuery = `
      query {
        marketListings(first: 10, orderBy: listedAt, orderDirection: desc) {
          id
          tokenId
          nftType
          seller
          price
          active
          listedAt
          delistedAt
        }
      }
    `;

    const allListingsResult = await axios.post(SUBGRAPH_URL, {
      query: allListingsQuery
    });

    if (allListingsResult.data.errors) {
      console.error('❌ All listings query errors:', allListingsResult.data.errors);
    } else {
      const listings = allListingsResult.data.data.marketListings || [];
      console.log(`✅ Found ${listings.length} total marketplace listings:`);
      
      if (listings.length > 0) {
        listings.forEach((listing, index) => {
          console.log(`   ${index + 1}. Listing ID: ${listing.id}`);
          console.log(`      Token ID: #${listing.tokenId}`);
          console.log(`      NFT Type: ${listing.nftType}`);
          console.log(`      Seller: ${listing.seller}`);
          console.log(`      Price: ${(Number(listing.price) / 1e18).toFixed(4)} OKB`);
          console.log(`      Active: ${listing.active}`);
          console.log(`      Listed: ${new Date(parseInt(listing.listedAt) * 1000).toLocaleString()}`);
          if (listing.delistedAt) {
            console.log(`      Delisted: ${new Date(parseInt(listing.delistedAt) * 1000).toLocaleString()}`);
          }
          console.log('');
        });
      } else {
        console.log('   No listings found in subgraph');
      }
    }

    // 3. 检查marketplace销售记录
    console.log('💰 Checking marketplace sales...');
    const salesQuery = `
      query {
        marketSales(first: 5, orderBy: timestamp, orderDirection: desc) {
          id
          tokenId
          nftType
          seller
          buyer
          price
          fee
          timestamp
          transactionHash
        }
      }
    `;

    const salesResult = await axios.post(SUBGRAPH_URL, {
      query: salesQuery
    });

    if (salesResult.data.errors) {
      console.error('❌ Sales query errors:', salesResult.data.errors);
    } else {
      const sales = salesResult.data.data.marketSales || [];
      console.log(`✅ Found ${sales.length} marketplace sales:`);
      
      if (sales.length > 0) {
        sales.forEach((sale, index) => {
          console.log(`   ${index + 1}. Sale ID: ${sale.id}`);
          console.log(`      Token ID: #${sale.tokenId}`);
          console.log(`      NFT Type: ${sale.nftType}`);
          console.log(`      Seller: ${sale.seller}`);
          console.log(`      Buyer: ${sale.buyer}`);
          console.log(`      Price: ${(Number(sale.price) / 1e18).toFixed(4)} OKB`);
          console.log(`      Fee: ${(Number(sale.fee) / 1e18).toFixed(4)} OKB`);
          console.log(`      Sold: ${new Date(parseInt(sale.timestamp) * 1000).toLocaleString()}`);
          console.log(`      TX: ${sale.transactionHash}`);
          console.log('');
        });
      } else {
        console.log('   No sales found in subgraph');
      }
    }

    // 4. 检查NFT与marketplace的关联
    console.log('🔗 Checking NFT marketplace associations...');
    const nftMarketQuery = `
      query {
        mintingPositionNFTs(first: 5, where: { marketListing_not: null }) {
          id
          tokenId
          owner
          marketListing {
            id
            price
            active
            listedAt
          }
        }
        accessPassNFTs(first: 5, where: { marketListing_not: null }) {
          id
          tokenId
          owner
          marketListing {
            id
            price
            active
            listedAt
          }
        }
      }
    `;

    const nftMarketResult = await axios.post(SUBGRAPH_URL, {
      query: nftMarketQuery
    });

    if (nftMarketResult.data.errors) {
      console.error('❌ NFT market query errors:', nftMarketResult.data.errors);
    } else {
      const data = nftMarketResult.data.data;
      const mintingNFTs = data.mintingPositionNFTs || [];
      const accessNFTs = data.accessPassNFTs || [];
      
      console.log(`✅ Found ${mintingNFTs.length} minting NFTs with marketplace listings`);
      console.log(`✅ Found ${accessNFTs.length} access pass NFTs with marketplace listings`);
      
      [...mintingNFTs, ...accessNFTs].forEach((nft, index) => {
        if (nft.marketListing) {
          console.log(`   ${index + 1}. NFT #${nft.tokenId} (Owner: ${nft.owner})`);
          console.log(`      Listing ID: ${nft.marketListing.id}`);
          console.log(`      Price: ${(Number(nft.marketListing.price) / 1e18).toFixed(4)} OKB`);
          console.log(`      Active: ${nft.marketListing.active}`);
          console.log(`      Listed: ${new Date(parseInt(nft.marketListing.listedAt) * 1000).toLocaleString()}`);
          console.log('');
        }
      });
    }

  } catch (error) {
    console.error('❌ Error checking marketplace events:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// 运行检查
checkMarketplaceEvents().then(() => {
  console.log('🎉 Marketplace events check completed!');
}).catch(console.error);
