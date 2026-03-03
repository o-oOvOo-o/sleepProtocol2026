const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`Deploying to ${network}...`);
  console.log("Deploying contracts with the account:", deployer.address);

  // --- Multi-chain Configuration ---
  const networkConfigs = {
    xlayertest: {
      mintFee: hre.ethers.parseEther("0.01"),
      wrappedNativeToken: "0x58393e19A20169dF067e424203B7652701254005", // WOKB on X Layer Testnet
    },
    sepolia: {
      mintFee: hre.ethers.parseEther("0.01"),
      wrappedNativeToken: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH on Sepolia
    }
  };

  const config = networkConfigs[network];
  if (!config) {
    throw new Error(`Configuration for network '${network}' not found.`);
  }
  console.log("Using configuration:", config);
  
  const deploymentInfo = {};

  // Clear previous deployment info if it exists
  const deploymentInfoPath = "deployment-info.json";
  if (fs.existsSync(deploymentInfoPath)) {
    fs.unlinkSync(deploymentInfoPath);
  }

  try {
    // 1. Deploy TokenCore
    console.log("\nStep 1: Deploying TokenCore...");
    const tokenCore = await hre.ethers.deployContract("TokenCore");
    await tokenCore.waitForDeployment();
    const tokenCoreTx = tokenCore.deploymentTransaction();
    const tokenCoreReceipt = await tokenCoreTx.wait();
    const tokenCoreAddress = await tokenCore.getAddress();
    deploymentInfo.TokenCore = { address: tokenCoreAddress, blockNumber: tokenCoreReceipt.blockNumber };
    console.log(`✅ TokenCore deployed to: ${tokenCoreAddress}`);

    // 2. Deploy TokenAccessPass
    console.log("\nStep 2: Deploying TokenAccessPass...");
    const TokenAccessPass = await hre.ethers.getContractFactory("TokenAccessPass");
    const tokenAccessPass = await TokenAccessPass.deploy();
    await tokenAccessPass.waitForDeployment();
    const tokenAccessPassTx = tokenAccessPass.deploymentTransaction();
    const tokenAccessPassReceipt = await tokenAccessPassTx.wait();
    const tokenAccessPassAddress = await tokenAccessPass.getAddress();
    deploymentInfo.TokenAccessPass = { address: tokenAccessPassAddress, blockNumber: tokenAccessPassReceipt.blockNumber };
    console.log(`✅ TokenAccessPass deployed to: ${tokenAccessPassAddress}`);

    // 3. Deploy TokenStaking (formerly StakingRewards)
    console.log("\nStep 3: Deploying TokenStaking...");
    const TokenStaking = await hre.ethers.getContractFactory("TokenStaking");
    const tokenStaking = await TokenStaking.deploy(tokenCoreAddress);
    await tokenStaking.waitForDeployment();
    const tokenStakingTx = tokenStaking.deploymentTransaction();
    const tokenStakingReceipt = await tokenStakingTx.wait();
    const tokenStakingAddress = await tokenStaking.getAddress();
    deploymentInfo.TokenStaking = { address: tokenStakingAddress, blockNumber: tokenStakingReceipt.blockNumber };
    console.log(`✅ TokenStaking deployed to: ${tokenStakingAddress}`);

    // 4. Deploy TokenMinter (formerly SleepMinter)
    // We deploy with a placeholder treasury address (deployer's address) and update it later.
    console.log("\nStep 4: Deploying TokenMinter...");
    const TokenMinter = await hre.ethers.getContractFactory("TokenMinter");
    const tokenMinter = await TokenMinter.deploy(tokenCoreAddress, deployer.address, config.mintFee);
    await tokenMinter.waitForDeployment();
    const tokenMinterTx = tokenMinter.deploymentTransaction();
    const tokenMinterReceipt = await tokenMinterTx.wait();
    const tokenMinterAddress = await tokenMinter.getAddress();
    deploymentInfo.TokenMinter = { address: tokenMinterAddress, blockNumber: tokenMinterReceipt.blockNumber };
    console.log(`✅ TokenMinter deployed to: ${tokenMinterAddress}`);

    // 5. Deploy TokenTreasury (formerly TreasuryDistributor)
    console.log("\nStep 5: Deploying TokenTreasury...");
    const TokenTreasury = await hre.ethers.getContractFactory("TokenTreasury");
    const polAddressPlaceholder = deployer.address; // This should be replaced with the actual POL address in a real scenario
    const tokenTreasury = await TokenTreasury.deploy(
      tokenCoreAddress,
      tokenMinterAddress,
      tokenStakingAddress,
      polAddressPlaceholder
    );
    await tokenTreasury.waitForDeployment();
    const tokenTreasuryTx = tokenTreasury.deploymentTransaction();
    const tokenTreasuryReceipt = await tokenTreasuryTx.wait();
    const tokenTreasuryAddress = await tokenTreasury.getAddress();
    deploymentInfo.TokenTreasury = { address: tokenTreasuryAddress, blockNumber: tokenTreasuryReceipt.blockNumber };
    console.log(`✅ TokenTreasury deployed to: ${tokenTreasuryAddress}`);

    // 6. Deploy MarketTreasury
    console.log("\nStep 6: Deploying MarketTreasury...");
    const MarketTreasury = await hre.ethers.getContractFactory("MarketTreasury");
    const marketTreasury = await MarketTreasury.deploy();
    await marketTreasury.waitForDeployment();
    const marketTreasuryTx = marketTreasury.deploymentTransaction();
    const marketTreasuryReceipt = await marketTreasuryTx.wait();
    const marketTreasuryAddress = await marketTreasury.getAddress();
    deploymentInfo.MarketTreasury = { address: marketTreasuryAddress, blockNumber: marketTreasuryReceipt.blockNumber };
    console.log(`✅ MarketTreasury deployed to: ${marketTreasuryAddress}`);

    // 7. Deploy Unified SleepNftMarketplace (replaces MinterMarketplace and AccessPassMarketplace)
    console.log("\nStep 7: Deploying Unified SleepNftMarketplace...");
    const SleepNftMarketplace = await hre.ethers.getContractFactory("SleepNftMarketplace");
    const sleepNftMarketplace = await SleepNftMarketplace.deploy();
    await sleepNftMarketplace.waitForDeployment();
    const sleepNftMarketplaceTx = sleepNftMarketplace.deploymentTransaction();
    const sleepNftMarketplaceReceipt = await sleepNftMarketplaceTx.wait();
    const sleepNftMarketplaceAddress = await sleepNftMarketplace.getAddress();
    deploymentInfo.SleepNftMarketplace = { address: sleepNftMarketplaceAddress, blockNumber: sleepNftMarketplaceReceipt.blockNumber };
    console.log(`✅ SleepNftMarketplace deployed to: ${sleepNftMarketplaceAddress}`);

    // 7.1. Whitelist NFT contracts in the unified marketplace
    console.log("\nStep 7.1: Whitelisting NFT contracts in SleepNftMarketplace...");
    await sleepNftMarketplace.addNftContract(tokenMinterAddress);
    console.log(`- ✅ TokenMinter (${tokenMinterAddress}) whitelisted`);
    await sleepNftMarketplace.addNftContract(tokenAccessPassAddress);
    console.log(`- ✅ TokenAccessPass (${tokenAccessPassAddress}) whitelisted`);
    
    // 7.2. Set Treasury address in SleepNftMarketplace
    console.log("\nStep 7.2: Setting Treasury address in SleepNftMarketplace...");
    await sleepNftMarketplace.setTreasury(marketTreasuryAddress);
    console.log(`- ✅ Treasury set to: ${marketTreasuryAddress}`);

    // 8. Deploy DevSupport
    console.log("\nStep 8: Deploying DevSupport...");
    const devSupport = await hre.ethers.deployContract("DevSupport");
    await devSupport.waitForDeployment();
    const devSupportTx = devSupport.deploymentTransaction();
    const devSupportReceipt = await devSupportTx.wait();
    const devSupportAddress = await devSupport.getAddress();
    deploymentInfo.DevSupport = { address: devSupportAddress, blockNumber: devSupportReceipt.blockNumber };
    console.log(`✅ DevSupport deployed to: ${devSupportAddress}`);

    // --- Post-deployment configuration ---
    console.log("\n🚀 Running post-deployment configuration...");

    console.log("Configuring TokenCore...");
    await tokenCore.setMinterContract(tokenMinterAddress);
    console.log("- Minter role granted to TokenMinter");

    console.log("Configuring TokenAccessPass...");
    await tokenAccessPass.setAddresses(tokenStakingAddress, tokenCoreAddress);
    console.log("- Set Staking and TokenCore addresses");
    await tokenAccessPass.setDevSupportContract(devSupportAddress);
    console.log("- Set DevSupport contract address");

    console.log("Configuring TokenStaking...");
    const tokenStakingContract = await hre.ethers.getContractAt("TokenStaking", tokenStakingAddress);
    await tokenStakingContract.setAccessPassContract(tokenAccessPassAddress);
    console.log("- Set AccessPass contract address");
    await tokenStakingContract.setTokenMinterContract(tokenMinterAddress);
    console.log("- Set TokenMinter contract address for admin time functions");
    await tokenStakingContract.setTreasuryContract(tokenTreasuryAddress);
    console.log("- Set Treasury contract address for receiving rewards");

    console.log("Configuring TokenMinter...");
    const tokenMinterContract = await hre.ethers.getContractAt("TokenMinter", tokenMinterAddress);
    await tokenMinterContract.setStakingRewardsAddress(tokenStakingAddress);
    console.log("- Set StakingRewards address to TokenStaking");
    await tokenMinterContract.setTreasuryDistributor(tokenTreasuryAddress);
    console.log("- Set Treasury address to TokenTreasury");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    // Still write the partial info for debugging
    fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
    process.exit(1);
    return;
  }

  // Save deployment info to file
  fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎉 Deployment and configuration complete!");
  console.log("-----------------------------------------");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("-----------------------------------------");
  console.log(`Deployment info saved to ${deploymentInfoPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
