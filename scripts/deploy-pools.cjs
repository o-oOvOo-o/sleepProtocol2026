const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🏊 Deploying Sleep Protocol Pool System...");
  console.log("==========================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

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

  const poolDeploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    pools: {}
  };

  try {
    // Get core contract addresses
    const sleepTokenAddress = deploymentInfo.TokenCore?.address;
    const treasuryAddress = deploymentInfo.TokenTreasury?.address;
    
    if (!sleepTokenAddress || !treasuryAddress) {
      throw new Error("Core contracts not found in deployment info");
    }

    // For testnet, we'll use a mock OKB token address
    const OKB_TOKEN_ADDRESS = "0x3F4B6664338F23d2397c953f2AB4Ce8031663f80"; // Mock OKB on X Layer testnet
    
    console.log("\n📋 Using addresses:");
    console.log("- SLEEP Token:", sleepTokenAddress);
    console.log("- Treasury:", treasuryAddress);
    console.log("- OKB Token:", OKB_TOKEN_ADDRESS);

    // 1. Deploy Pool Factory
    console.log("\n🏭 Deploying SleepPoolFactory...");
    const SleepPoolFactory = await hre.ethers.getContractFactory("SleepPoolFactory");
    const poolFactory = await SleepPoolFactory.deploy(
      sleepTokenAddress,
      OKB_TOKEN_ADDRESS,
      treasuryAddress
    );
    await poolFactory.waitForDeployment();
    const poolFactoryAddress = await poolFactory.getAddress();
    console.log("✅ SleepPoolFactory deployed to:", poolFactoryAddress);

    poolDeploymentInfo.pools.SleepPoolFactory = {
      address: poolFactoryAddress,
      constructorArgs: [sleepTokenAddress, OKB_TOKEN_ADDRESS, treasuryAddress]
    };

    // 2. Create Protocol Pool
    console.log("\n🏊 Creating Protocol Pool...");
    await poolFactory.createProtocolPool();
    const protocolPoolAddress = await poolFactory.protocolOwnedPool();
    console.log("✅ Protocol Pool created at:", protocolPoolAddress);

    poolDeploymentInfo.pools.ProtocolPool = {
      address: protocolPoolAddress,
      type: "SleepV2Pool",
      locked: true
    };

    // 3. Deploy Sleep Router
    console.log("\n🛣️ Deploying SleepRouter...");
    const SleepRouter = await hre.ethers.getContractFactory("SleepRouter");
    const sleepRouter = await SleepRouter.deploy(
      sleepTokenAddress,
      OKB_TOKEN_ADDRESS,
      protocolPoolAddress
    );
    await sleepRouter.waitForDeployment();
    const routerAddress = await sleepRouter.getAddress();
    console.log("✅ SleepRouter deployed to:", routerAddress);

    poolDeploymentInfo.pools.SleepRouter = {
      address: routerAddress,
      constructorArgs: [sleepTokenAddress, OKB_TOKEN_ADDRESS, protocolPoolAddress]
    };

    // 4. Set Router in Factory
    console.log("\n🔗 Configuring Factory...");
    await poolFactory.setRouter(routerAddress);
    console.log("✅ Router set in factory");

    // 5. Create V4 Community Pool
    console.log("\n🏘️ Creating V4 Community Pool...");
    // Calculate initial price: 1 SLEEP = 0.000001 OKB
    // sqrtPriceX96 = sqrt(price) * 2^96
    // For price = 0.000001, sqrtPriceX96 ≈ 79228162514264337593543950336 (simplified)
    const initialSqrtPriceX96 = "79228162514264337593543950336";
    
    await poolFactory.createCommunityPool(initialSqrtPriceX96);
    const communityPoolAddress = await poolFactory.communityPool();
    console.log("✅ V4 Community Pool created at:", communityPoolAddress);

    poolDeploymentInfo.pools.CommunityPool = {
      address: communityPoolAddress,
      type: "SleepV4Pool",
      locked: false,
      initialPrice: initialSqrtPriceX96
    };

    // 7. Initialize Pools
    console.log("\n🚀 Initializing Pool System...");
    await poolFactory.initializePools();
    console.log("✅ Pool system initialized");

    // 8. Configure Router
    console.log("\n⚙️ Configuring Router...");
    await sleepRouter.updatePools(protocolPoolAddress, communityPoolAddress, communityPoolAddress);
    await sleepRouter.setPoolEnabled(true, true); // Enable both pools
    console.log("✅ Router configured");

    // 9. Connect Treasury to Protocol Pool (POL)
    console.log("\n🏦 Connecting Treasury to Protocol Pool...");
    const TokenTreasury = await hre.ethers.getContractFactory("TokenTreasury");
    const tokenTreasury = TokenTreasury.attach(treasuryAddress);
    
    // Set protocol pool as POL address to receive treasury funds
    await tokenTreasury.setPOLAddress(protocolPoolAddress);
    console.log("✅ Treasury POL address set to protocol pool:", protocolPoolAddress);

  } catch (error) {
    console.error("\n❌ Pool deployment failed:", error);
    // Still write the partial info for debugging
    const poolInfoPath = path.join(__dirname, "../pool-deployment-info.json");
    fs.writeFileSync(poolInfoPath, JSON.stringify(poolDeploymentInfo, null, 2));
    process.exit(1);
  }

  // Save pool deployment info
  const poolInfoPath = path.join(__dirname, "../pool-deployment-info.json");
  fs.writeFileSync(poolInfoPath, JSON.stringify(poolDeploymentInfo, null, 2));

  // Update main deployment info
  deploymentInfo.pools = poolDeploymentInfo.pools;
  fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎉 Pool System Deployment Complete!");
  console.log("=====================================");
  console.log("📋 Deployed Contracts:");
  console.log("- Factory:", poolDeploymentInfo.pools.SleepPoolFactory.address);
  console.log("- Protocol Pool (V2):", poolDeploymentInfo.pools.ProtocolPool.address);
  console.log("- Community Pool (V4):", poolDeploymentInfo.pools.CommunityPool.address);
  console.log("- Router:", poolDeploymentInfo.pools.SleepRouter.address);
  console.log("\n📝 Next Steps:");
  console.log("1. Add initial liquidity to protocol pool");
  console.log("2. Update frontend to use router for swaps");
  console.log("3. Integrate with V4 when available");
  console.log("4. Test swap functionality");
  console.log(`\n📄 Pool info saved to ${poolInfoPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
