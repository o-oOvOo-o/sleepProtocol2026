import hre from "hardhat";
import fs from "fs";

async function main() {
  const network = hre.network.name;
  console.log(`Deploying CORE contracts to ${network}...`);
  const deploymentInfo: any = {};

  if (fs.existsSync("deployment-info.json")) {
    fs.unlinkSync("deployment-info.json");
  }

  try {
    const sleepCoin = await hre.ethers.deployContract("SleepCoin", ["0x0000000000000000000000000000000000000000"]);
    await sleepCoin.waitForDeployment();
    const sleepCoinReceipt = await sleepCoin.deploymentTransaction()?.wait();
    deploymentInfo.SleepCoin = { address: await sleepCoin.getAddress(), blockNumber: sleepCoinReceipt?.blockNumber };
    console.log(`✅ SleepCoin deployed to: ${deploymentInfo.SleepCoin.address}`);

    const treasuryDistributor = await hre.ethers.deployContract("TreasuryDistributor", [
        "0x11111112542d85b3ef69ae05771c2dccff4fc2d7",
        deploymentInfo.SleepCoin.address
    ]);
    await treasuryDistributor.waitForDeployment();
    const treasuryDistributorReceipt = await treasuryDistributor.deploymentTransaction()?.wait();
    deploymentInfo.TreasuryDistributor = { address: await treasuryDistributor.getAddress(), blockNumber: treasuryDistributorReceipt?.blockNumber };
    console.log(`✅ TreasuryDistributor deployed to: ${deploymentInfo.TreasuryDistributor.address}`);

    const stakingRewards = await hre.ethers.deployContract("StakingRewards", [deploymentInfo.SleepCoin.address]);
    await stakingRewards.waitForDeployment();
    const stakingRewardsReceipt = await stakingRewards.deploymentTransaction()?.wait();
    deploymentInfo.StakingRewards = { address: await stakingRewards.getAddress(), blockNumber: stakingRewardsReceipt?.blockNumber };
    console.log(`✅ StakingRewards deployed to: ${deploymentInfo.StakingRewards.address}`);

    const sleepMinter = await hre.ethers.deployContract("SleepMinter", [deploymentInfo.SleepCoin.address, deploymentInfo.TreasuryDistributor.address]);
    await sleepMinter.waitForDeployment();
    const sleepMinterReceipt = await sleepMinter.deploymentTransaction()?.wait();
    deploymentInfo.SleepMinter = { address: await sleepMinter.getAddress(), blockNumber: sleepMinterReceipt?.blockNumber };
    console.log(`✅ SleepMinter deployed to: ${deploymentInfo.SleepMinter.address}`);

    console.log("\nRunning post-deployment configuration for CORE contracts...");
    const sleepCoinContract = await hre.ethers.getContractAt("SleepCoin", deploymentInfo.SleepCoin.address);
    const sleepMinterContract = await hre.ethers.getContractAt("SleepMinter", deploymentInfo.SleepMinter.address);
    const treasuryDistributorContract = await hre.ethers.getContractAt("TreasuryDistributor", deploymentInfo.TreasuryDistributor.address);

    await (await sleepCoinContract.setMinterContract(deploymentInfo.SleepMinter.address)).wait();
    console.log(`- Configured SleepCoin: Minter role granted to SleepMinter`);

    await (await sleepMinterContract.setStakingRewardsAddress(deploymentInfo.StakingRewards.address)).wait();
    console.log(`- Configured SleepMinter: StakingRewards address set`);
    
    await (await treasuryDistributorContract.setWallets(deploymentInfo.StakingRewards.address)).wait();
    console.log(`- Configured TreasuryDistributor: StakingRewardsWallet address set`);

    await (await treasuryDistributorContract.setMinterAddress(deploymentInfo.SleepMinter.address)).wait();
    console.log(`- Configured TreasuryDistributor: SleepMinter address set`);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync("deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n🚀 CORE contract deployment and configuration complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
