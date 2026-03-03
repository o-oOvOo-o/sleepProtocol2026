import hre from "hardhat";
import fs from "fs";

async function main() {
  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);
  const deploymentInfo: any = {};
  let nftMarketplaceAddress = ''; // Initialize with a default value

  // Clear previous deployment info if it exists
  if (fs.existsSync("deployment-info.json")) {
    fs.unlinkSync("deployment-info.json");
  }

  try {
    console.log("\nStep 1: Deploying SleepCoin...");
    const sleepCoin = await hre.ethers.deployContract("SleepCoin", ["0x0000000000000000000000000000000000000000"]); // Placeholder for router, can be set later
    await sleepCoin.waitForDeployment();
    const sleepCoinReceipt = await sleepCoin.deploymentTransaction()?.wait();
    deploymentInfo.SleepCoin = { address: await sleepCoin.getAddress(), blockNumber: sleepCoinReceipt?.blockNumber };
    console.log(`✅ SleepCoin deployed to: ${deploymentInfo.SleepCoin.address}`);

    console.log("\nStep 2: Deploying TreasuryDistributor...");
    const treasuryDistributor = await hre.ethers.deployContract("TreasuryDistributor", [
        "0x11111112542d85b3ef69ae05771c2dccff4fc2d7", // Uniswap V2 Router address for X Layer testnet (checksummed)
        deploymentInfo.SleepCoin.address
    ]);
    await treasuryDistributor.waitForDeployment();
    const treasuryDistributorReceipt = await treasuryDistributor.deploymentTransaction()?.wait();
    deploymentInfo.TreasuryDistributor = { address: await treasuryDistributor.getAddress(), blockNumber: treasuryDistributorReceipt?.blockNumber };
    console.log(`✅ TreasuryDistributor deployed to: ${deploymentInfo.TreasuryDistributor.address}`);

    console.log("\nStep 3: Deploying StakingRewards...");
    const stakingRewards = await hre.ethers.deployContract("StakingRewards", [deploymentInfo.SleepCoin.address]);
    await stakingRewards.waitForDeployment();
    const stakingRewardsReceipt = await stakingRewards.deploymentTransaction()?.wait();
    deploymentInfo.StakingRewards = { address: await stakingRewards.getAddress(), blockNumber: stakingRewardsReceipt?.blockNumber };
    console.log(`✅ StakingRewards deployed to: ${deploymentInfo.StakingRewards.address}`);

    console.log("\nStep 4: Deploying SleepMinter...");
    const sleepMinter = await hre.ethers.deployContract("SleepMinter", [deploymentInfo.SleepCoin.address, deploymentInfo.TreasuryDistributor.address]);
    await sleepMinter.waitForDeployment();
    const sleepMinterReceipt = await sleepMinter.deploymentTransaction()?.wait();
    deploymentInfo.SleepMinter = { address: await sleepMinter.getAddress(), blockNumber: sleepMinterReceipt?.blockNumber };
    console.log(`✅ SleepMinter deployed to: ${deploymentInfo.SleepMinter.address}`);

    
    console.log("\nStep 5: Deploying NFTMarketplace...");
    const nftMarketplace = await hre.ethers.deployContract("NFTMarketplace", [deploymentInfo.SleepMinter.address]);
    await nftMarketplace.waitForDeployment();
    const nftMarketplaceReceipt = await nftMarketplace.deploymentTransaction()?.wait();
    deploymentInfo.NFTMarketplace = { address: await nftMarketplace.getAddress(), blockNumber: nftMarketplaceReceipt?.blockNumber };
    console.log(`✅ NFTMarketplace deployed to: ${deploymentInfo.NFTMarketplace.address}`);
    

    console.log("\nStep 6: Running post-deployment configuration...");
    const sleepCoinContract = await hre.ethers.getContractAt("SleepCoin", deploymentInfo.SleepCoin.address);
    const sleepMinterContract = await hre.ethers.getContractAt("SleepMinter", deploymentInfo.SleepMinter.address);
    const treasuryDistributorContract = await hre.ethers.getContractAt("TreasuryDistributor", deploymentInfo.TreasuryDistributor.address);

    const tx1 = await sleepCoinContract.setMinterContract(deploymentInfo.SleepMinter.address);
    await tx1.wait();
    console.log(`- Configured SleepCoin: Minter role granted to SleepMinter`);

    const tx2 = await sleepMinterContract.setStakingRewardsAddress(deploymentInfo.StakingRewards.address);
    await tx2.wait();
    console.log(`- Configured SleepMinter: StakingRewards address set`);
    
    const tx3 = await treasuryDistributorContract.setWallets(deploymentInfo.StakingRewards.address);
    await tx3.wait();
    console.log(`- Configured TreasuryDistributor: StakingRewardsWallet address set`);

    const tx4 = await treasuryDistributorContract.setMinterAddress(deploymentInfo.SleepMinter.address);
    await tx4.wait();
    console.log(`- Configured TreasuryDistributor: SleepMinter address set`);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exitCode = 1;
    return;
  }

  // Save deployment info to file
  fs.writeFileSync("deployment-info.json", JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🚀 Deployment and configuration complete!");
  console.log("-----------------------------------------");
  console.log("SleepCoin Address:", deploymentInfo.SleepCoin.address);
  console.log("SleepMinter Address:", deploymentInfo.SleepMinter.address);
  console.log("StakingRewards Address:", deploymentInfo.StakingRewards.address);
  console.log("TreasuryDistributor Address:", deploymentInfo.TreasuryDistributor.address);
  console.log("NFTMarketplace Address:", deploymentInfo.NFTMarketplace.address);
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

