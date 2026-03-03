import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying NFTMarketplace contract with the account:", deployer.address);

    const sleepMinterAddress = "0x582255298d8E879123A87711202C5A6D5a2b257E"; // Replace with your deployed SleepMinter address

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const nftMarketplace = await NFTMarketplace.deploy(sleepMinterAddress);
    await nftMarketplace.waitForDeployment();


    const marketplaceAddress = await nftMarketplace.getAddress();
    console.log("NFTMarketplace deployed to:", marketplaceAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
