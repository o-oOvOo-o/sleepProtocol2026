const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🏊 Deploying Sleep Protocol Pool System (Simple)...");
  console.log("================================================");

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // --- Load Multi-chain Configuration from chain-configs.json ---
  const chainConfigsPath = path.join(__dirname, "../chain-configs.json");
  const chainConfigs = JSON.parse(fs.readFileSync(chainConfigsPath, "utf8"));
  
  const config = chainConfigs.networks[network];
  if (!config) {
    throw new Error(`Configuration for network '${network}' not found in chain-configs.json`);
  }

  // Load existing deployment info
  const deploymentInfoPath = path.join(__dirname, "../deployment-info.json");
  let deploymentInfo = {};
  
  if (fs.existsSync(deploymentInfoPath)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, "utf8"));
    console.log("Loaded existing deployment info");
  } else {
    console.error("❌ Core contracts not deployed yet. Run deploy.cjs first.");
    process.exit(1);
  }

  try {
    // Get core contract addresses
    const sleepTokenAddress = deploymentInfo.TokenCore?.address;
    const treasuryAddress = deploymentInfo.TokenTreasury?.address;
    
    if (!sleepTokenAddress || !treasuryAddress) {
      throw new Error("Core contracts not found in deployment info");
    }

    const wrappedNativeTokenAddress = config.wrappedNativeToken;
    
    console.log("\n📋 Using addresses:");
    console.log("- SLEEP Token:", sleepTokenAddress);
    console.log("- Treasury:", treasuryAddress);
    console.log(`- Wrapped Native Token (${network}):`, wrappedNativeTokenAddress);

    // 1. Deploy SleepV2Pool (Protocol Pool)
    console.log("\n🏊 Deploying SleepV2Pool (Protocol Pool)...");
    const SleepV2Pool = await hre.ethers.getContractFactory("SleepV2Pool");
    const protocolPool = await SleepV2Pool.deploy();
    await protocolPool.waitForDeployment();
    const protocolPoolAddress = await protocolPool.getAddress();
    console.log("✅ SleepV2Pool deployed to:", protocolPoolAddress);

    // 2. Deploy SleepV4Pool (Community Pool)
    console.log("\n🏊 Deploying SleepV4Pool (Community Pool)...");
    const SleepV4Pool = await hre.ethers.getContractFactory("SleepV4Pool");
    const communityPool = await SleepV4Pool.deploy();
    await communityPool.waitForDeployment();
    const communityPoolAddress = await communityPool.getAddress();
    console.log("✅ SleepV4Pool deployed to:", communityPoolAddress);

    // 3. Deploy SleepRouter
    console.log("\n🔀 Deploying SleepRouter...");
    const SleepRouter = await hre.ethers.getContractFactory("SleepRouter");
    const router = await SleepRouter.deploy(
      sleepTokenAddress,
      wrappedNativeTokenAddress,
      protocolPoolAddress
    );
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log("✅ SleepRouter deployed to:", routerAddress);

    // 4. Initialize pools
    console.log("\n⚙️ Initializing pools...");
    
    // Initialize Protocol Pool (V2)
    await protocolPool.initialize(
      sleepTokenAddress,
      wrappedNativeTokenAddress,
      treasuryAddress
    );
    console.log("✅ Protocol Pool initialized");

    // Initialize Community Pool (V4) - needs sqrtPriceX96
    // For initial price of 1 SLEEPING = 0.000001 OKB, sqrtPriceX96 ≈ 79228162514264337593543950336
    const initialSqrtPriceX96 = "79228162514264337593543950336"; // sqrt(0.000001) * 2^96
    await communityPool.initialize(
      sleepTokenAddress,
      wrappedNativeTokenAddress,
      treasuryAddress,
      initialSqrtPriceX96
    );
    console.log("✅ Community Pool initialized");

    // 5. Set Treasury POL address
    console.log("\n🏦 Setting Treasury POL address...");
    const Treasury = await hre.ethers.getContractAt("TokenTreasury", treasuryAddress);
    await Treasury.setPOLAddress(protocolPoolAddress);
    console.log("✅ Treasury POL address set to Protocol Pool");

    // Save deployment info
    const poolDeploymentInfo = {
      pools: {
        SleepV2Pool: {
          address: protocolPoolAddress,
          blockNumber: await hre.ethers.provider.getBlockNumber()
        },
        SleepV4Pool: {
          address: communityPoolAddress,
          blockNumber: await hre.ethers.provider.getBlockNumber()
        },
        SleepRouter: {
          address: routerAddress,
          blockNumber: await hre.ethers.provider.getBlockNumber()
        }
      }
    };

    // Merge with existing deployment info
    const updatedDeploymentInfo = {
      ...deploymentInfo,
      ...poolDeploymentInfo
    };

    fs.writeFileSync(deploymentInfoPath, JSON.stringify(updatedDeploymentInfo, null, 2));
    console.log("\n✅ Pool deployment completed successfully!");
    console.log("📄 Updated deployment-info.json");

    console.log("\n📋 Deployed Contracts:");
    console.log("- Protocol Pool (V2):", protocolPoolAddress);
    console.log("- Community Pool (V4):", communityPoolAddress);
    console.log("- Router:", routerAddress);

  } catch (error) {
    console.error("❌ Pool deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
