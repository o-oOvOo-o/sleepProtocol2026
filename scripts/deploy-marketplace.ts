import hre from "hardhat";

async function main() {
  const network = hre.network.name;
  console.log(`Deploying NFTMarketplace to ${network}...`);

  // Existing contract addresses (don't change these)
  const sleepCoinAddress = '0x234e78E6E2eFcB42bF84Be478C905770d6BeeC5e';
  const sleepMinterAddress = '0x0900C18f3607Cc7771E103Fa0253Ea136Bf0D2f1';
  const stakingRewardsAddress = '0x201e25B51a2dce780Ce37D64587fBaA59fc308A6';
  const treasuryDistributorAddress = '0x6491954564d435f98B808D1Fb1059836099AF1bE';

  let nftMarketplaceAddress;

  try {
    console.log("\n🏪 Deploying NFTMarketplace...");
    const nftMarketplace = await hre.ethers.deployContract("NFTMarketplace", [
      sleepMinterAddress,  // Sleep NFT contract
      sleepCoinAddress     // SLEEP token contract
    ]);
    await nftMarketplace.waitForDeployment();
    nftMarketplaceAddress = await nftMarketplace.getAddress();
    console.log(`✅ NFTMarketplace deployed to: ${nftMarketplaceAddress}`);

    console.log("\n🎉 Marketplace deployment complete!");
    console.log("-".repeat(60));
    console.log("📋 Contract Addresses Summary:");
    console.log("-".repeat(60));
    console.log(`SleepCoin:           ${sleepCoinAddress} (existing)`);
    console.log(`SleepMinter:         ${sleepMinterAddress} (existing)`);
    console.log(`StakingRewards:      ${stakingRewardsAddress} (existing)`);
    console.log(`TreasuryDistributor: ${treasuryDistributorAddress} (existing)`);
    console.log(`NFTMarketplace:      ${nftMarketplaceAddress} (NEW! 🆕)`);
    console.log("-".repeat(60));
    
    console.log("\n📝 Next Steps:");
    console.log("1. Update frontend contracts.ts with new NFTMarketplace address");
    console.log("2. Update subgraph.yaml with new NFTMarketplace address and startBlock");
    console.log("3. Copy NFTMarketplace ABI to subgraph/abis/");
    console.log("4. Rebuild and redeploy subgraph");
    console.log("5. Test marketplace functionality");

  } catch (error) {
    console.error("\n❌ Marketplace deployment failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
