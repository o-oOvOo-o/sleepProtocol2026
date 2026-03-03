const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 开始更新市场手续费...");

  // --- 配置 ---
  const newFeeBasisPoints = 200; // 200 基点 = 2%
  // -------------

  // 1. 获取部署者（owner）账户
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 使用账户: ${deployer.address} 来发送交易`);

  // 2. 读取已部署的市场合约地址
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const marketplaceAddress = deploymentInfo.contracts.SleepNftMarketplace;
  if (!marketplaceAddress) {
    console.error("❌ 未能在 deployment-info.json 中找到 SleepNftMarketplace 地址");
    process.exit(1);
  }
  console.log(`🏪 市场合约地址: ${marketplaceAddress}`);

  // 3. 获取合约实例
  const marketplace = await hre.ethers.getContractAt("SleepNftMarketplace", marketplaceAddress);

  // 4. 读取当前手续费
  const currentFee = await marketplace.marketplaceFeePercent();
  console.log(`📈 当前手续费: ${currentFee.toString()} 基点 (${Number(currentFee) / 100}%)`);

  if (currentFee.toString() === newFeeBasisPoints.toString()) {
    console.log("✅ 手续费已经是目标值，无需更改。");
    return;
  }

  // 5. 设置新的手续费
  console.log(`\n⚙️ 正在将手续费更新为 ${newFeeBasisPoints} 基点 (${newFeeBasisPoints / 100}%) ...`);
  const tx = await marketplace.setMarketplaceFee(newFeeBasisPoints);

  console.log(` tx hash: ${tx.hash}`);
  console.log("⏳ 等待交易确认...");

  await tx.wait();

  // 6. 再次读取手续费以确认更改
  const updatedFee = await marketplace.marketplaceFeePercent();
  console.log(`\n✅ 交易已确认!`);
  console.log(`🎉 新的手续费: ${updatedFee.toString()} 基点 (${Number(updatedFee) / 100}%)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });







