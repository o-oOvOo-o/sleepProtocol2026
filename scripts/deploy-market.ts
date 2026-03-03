import hre from "hardhat";
import fs from "fs";
import path from "path";
import { network, ethers } from "hardhat";
import { NftMarketplace, SleepNftMarketplace, TokenAccessPass, TokenMinter } from "../typechain-types";
import { Signer } from "ethers";
import * as fs from 'fs';

// Function to extract address from the frontend config file
function getSleepMinterAddressFromFrontend(): string {
  const contractsFilePath = path.join(__dirname, "..", "xenfyi-testnet", "src", "lib", "contracts.ts");
  try {
    const content = fs.readFileSync(contractsFilePath, 'utf8');
    const match = content.match(/export const sleepMinterAddress = '([^']+)';/);
    if (match && match[1]) {
      console.log(`- Found SleepMinter address from frontend config: ${match[1]}`);
      return match[1];
    }
    throw new Error("Could not find sleepMinterAddress in frontend config.");
  } catch (error) {
    console.error(`❌ Error reading frontend config: ${contractsFilePath}`);
    throw error;
  }
}

async function main() {
    const { deployer } = await getNamedAccounts();
    const signer: Signer = await ethers.getSigner(deployer);
    console.log("Deploying contracts with the account:", deployer);

    // Read existing deployment information
    const deploymentInfo = JSON.parse(fs.readFileSync(DEPLOYMENT_INFO_FILE, 'utf8'));

    const tokenMinterAddress = deploymentInfo.TokenMinter.address;
    const tokenAccessPassAddress = deploymentInfo.TokenAccessPass.address;
    
    if (!tokenMinterAddress || !tokenAccessPassAddress) {
        throw new Error("TokenMinter or TokenAccessPass address not found in deployment-info.json. Please deploy core contracts first.");
    }
    
    console.log(`Using TokenMinter at: ${tokenMinterAddress}`);
    console.log(`Using TokenAccessPass at: ${tokenAccessPassAddress}`);

    // Deploy the unified marketplace
    const marketplaceFactory = await ethers.getContractFactory("SleepNftMarketplace", signer);
    const marketplace = await marketplaceFactory.deploy();
    await marketplace.deployed();
    const marketplaceReceipt = await marketplace.deployTransaction.wait();
    
    console.log(`🚀 Unified SleepNftMarketplace deployed to: ${marketplace.address} at block ${marketplaceReceipt.blockNumber}`);
    deploymentInfo.SleepNftMarketplace = {
        address: marketplace.address,
        blockNumber: marketplaceReceipt.blockNumber
    };

    // Whitelist the NFT contracts
    console.log("Whitelisting NFT contracts in the new marketplace...");
    const tx1 = await marketplace.addNftContract(tokenMinterAddress);
    await tx1.wait();
    console.log(`   - TokenMinter (${tokenMinterAddress}) whitelisted.`);

    const tx2 = await marketplace.addNftContract(tokenAccessPassAddress);
    await tx2.wait();
    console.log(`   - TokenAccessPass (${tokenAccessPassAddress}) whitelisted.`);


    // Clean up old marketplace entries
    delete deploymentInfo.MinterMarketplace;
    delete deploymentInfo.AccessPassMarketplace;

    fs.writeFileSync(DEPLOYMENT_INFO_FILE, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Deployment info updated in ${DEPLOYMENT_INFO_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
