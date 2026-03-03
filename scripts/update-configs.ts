import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as yaml from "js-yaml";
import fetch from 'node-fetch';

// Get __dirname equivalent - fix Windows path issue
const __dirname = process.platform === 'win32' 
    ? path.dirname(new URL(import.meta.url).pathname.substring(1))
    : path.dirname(new URL(import.meta.url).pathname);

// --- 统一配置文件 ---
const CHAIN_CONFIGS_FILE = path.resolve(__dirname, '..', 'chain-configs.json');

interface ChainConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    blockExplorer: string;
    nativeToken: {
        name: string;
        symbol: string;
        decimals: number;
    };
    wrappedNativeToken: string;
    mintFee: string;
    contracts: Record<string, string>;
}

interface ChainConfigs {
    networks: Record<string, ChainConfig>;
    defaultNetwork: string;
    subgraph: {
        localUrl: string;
        deploymentName: string;
    };
}

// 加载统一配置
function loadChainConfigs(): ChainConfigs {
    if (!fs.existsSync(CHAIN_CONFIGS_FILE)) {
        throw new Error(`Chain configs file not found: ${CHAIN_CONFIGS_FILE}`);
    }
    return JSON.parse(fs.readFileSync(CHAIN_CONFIGS_FILE, 'utf8'));
}

// 保存统一配置
function saveChainConfigs(configs: ChainConfigs) {
    fs.writeFileSync(CHAIN_CONFIGS_FILE, JSON.stringify(configs, null, 2));
}

// 更新部署信息到统一配置
function updateDeploymentInConfigs(deploymentInfo: DeploymentInfo, networkName: string) {
    const configs = loadChainConfigs();
    if (!configs.networks[networkName]) {
        throw new Error(`Network ${networkName} not found in chain configs`);
    }
    
    // 更新合约地址
    for (const [contractName, info] of Object.entries(deploymentInfo)) {
        const contractKey = contractName.charAt(0).toLowerCase() + contractName.slice(1);
        configs.networks[networkName].contracts[contractKey] = info.address;
    }
    
    saveChainConfigs(configs);
    console.log(`✅ Updated chain configs for network: ${networkName}`);
}

// 生成 Hardhat 配置
function generateHardhatConfig() {
    console.log("\n🚀 Generating hardhat.config.cjs from chain configs...");
    const configs = loadChainConfigs();
    
    let networkConfigs = '';
    for (const [networkName, config] of Object.entries(configs.networks)) {
        networkConfigs += `    ${networkName}: {
      url: "${config.rpcUrl}",
      chainId: ${config.chainId},
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },\n`;
    }
    
    const hardhatConfigContent = `require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },
  networks: {
${networkConfigs}  },
  etherscan: {
    apiKey: {
      xlayertest: "abc",
      sepolia: process.env.ETHERSCAN_API_KEY || "abc",
    },
    customChains: [
      {
        network: "xlayertest",
        chainId: 1952,
        urls: {
          apiURL: "https://www.oklink.com/api/explorer/v1/contract/verify/async/compile/xlayer-test",
          browserURL: "https://www.oklink.com/xlayer-test"
        }
      }
    ]
  }
};
`;
    
    fs.writeFileSync('hardhat.config.cjs', hardhatConfigContent);
    console.log("✅ Generated hardhat.config.cjs");
}

// 生成前端合约配置
function generateFrontendContracts() {
    console.log("\n🚀 Generating frontend contracts.ts from chain configs...");
    const configs = loadChainConfigs();
    
    // 生成地址映射
    let addressMappings = '';
    for (const [networkName, config] of Object.entries(configs.networks)) {
        addressMappings += `  [${config.chainId}]: {\n`;
        for (const [contractKey, address] of Object.entries(config.contracts)) {
            addressMappings += `    ${contractKey}: '${address}',\n`;
        }
        addressMappings += `  },\n`;
    }
    
    // 生成区块浏览器配置
    let blockExplorerMappings = '';
    for (const [networkName, config] of Object.entries(configs.networks)) {
        blockExplorerMappings += `  [${config.chainId}]: {\n`;
        blockExplorerMappings += `    baseUrl: '${config.blockExplorer}'\n`;
        blockExplorerMappings += `  },\n`;
    }
    
    const frontendContractsContent = `// 导入新的合约 ABI
import { abi as tokenCoreABI } from '~/abi/TokenCore';
import { abi as tokenMinterABI } from '~/abi/TokenMinter';
import { abi as tokenStakingABI } from '~/abi/TokenStaking';
import { abi as tokenAccessPassABI } from '~/abi/TokenAccessPass';
import { abi as tokenTreasuryABI } from '~/abi/TokenTreasury';
import { abi as sleepNftMarketplaceABI } from '~/abi/SleepNftMarketplace';
import { abi as marketTreasuryABI } from '~/abi/MarketTreasury';

// Pool system ABIs
import { abi as sleepPoolFactoryABI } from '~/abi/SleepPoolFactory';
import { abi as sleepV2PoolABI } from '~/abi/SleepV2Pool';
import { abi as sleepV4PoolABI } from '~/abi/SleepV4Pool';
import { abi as sleepRouterABI } from '~/abi/SleepRouter';

import { Address, Abi } from 'viem';
import { Chain } from 'viem/chains';
import { xLayerTestnet, sepolia } from '~/lib/chains';

// --- 多链地址簿 (自动生成) ---
const contractAddresses: Record<number, Record<string, Address>> = {
${addressMappings}};

// --- Helper 函数，用于获取当前链的地址 ---
function getContractAddresses(chain: Chain) {
  const addresses = contractAddresses[chain.id];
  if (!addresses) {
    // Fallback to xLayerTestnet if the chain is not configured
    console.warn(\`Unsupported chain: \${chain.id}. Falling back to xLayerTestnet addresses.\`);
    return contractAddresses[xLayerTestnet.id];
  }
  return addresses;
}

// --- 合约导出函数 ---

export const tokenCoreContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.tokenCore,
    abi: tokenCoreABI as Abi,
    chain: chain
  };
};

export const tokenMinterContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.tokenMinter,
    abi: tokenMinterABI as Abi,
    chain: chain
  };
};

export const tokenStakingContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.tokenStaking,
    abi: tokenStakingABI as Abi,
    chain: chain
  };
};

export const tokenTreasuryContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.tokenTreasury,
    abi: tokenTreasuryABI as Abi,
    chain: chain
  };
};

export const tokenAccessPassContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.tokenAccessPass,
    abi: tokenAccessPassABI as Abi,
    chain: chain
  };
};

export const sleepNftMarketplaceContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.sleepNftMarketplace,
    abi: sleepNftMarketplaceABI as Abi,
    chain: chain
  };
};

export const marketTreasuryContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.marketTreasury,
    abi: marketTreasuryABI as Abi,
    chain: chain
  };
};

// @deprecated - Legacy marketplace contracts
export const minterMarketplaceContract = (chain: Chain = xLayerTestnet) => {
    const addresses = getContractAddresses(chain);
    return {
        address: addresses.minterMarketplace || addresses.sleepNftMarketplace,
        abi: sleepNftMarketplaceABI as Abi,
        chain: chain
    }
};

export const accessPassMarketplaceContract = (chain: Chain = xLayerTestnet) => {
    const addresses = getContractAddresses(chain);
    return {
        address: addresses.accessPassMarketplace || addresses.sleepNftMarketplace,
        abi: sleepNftMarketplaceABI as Abi,
        chain: chain
    }
};

// Pool system contracts
export const sleepPoolFactoryContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.sleepPoolFactory,
    abi: sleepPoolFactoryABI as Abi,
    chain: chain
  };
};

export const protocolPoolContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.protocolPool,
    abi: sleepV2PoolABI as Abi,
    chain: chain
  };
};

export const communityPoolContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.communityPool,
    abi: sleepV4PoolABI as Abi,
    chain: chain
  };
};

export const sleepRouterContract = (chain: Chain = xLayerTestnet) => {
  const addresses = getContractAddresses(chain);
  return {
    address: addresses.sleepRouter,
    abi: sleepRouterABI as Abi,
    chain: chain
  };
};

// 保持向后兼容的别名
export const sleepCoinContract = tokenCoreContract;
export const sleepMinterContract = tokenMinterContract;
export const stakingRewardsContract = tokenStakingContract;
export const treasuryDistributorContract = tokenTreasuryContract;
export const nftMarketplaceContract = sleepNftMarketplaceContract;

// --- 多链区块浏览器配置 (自动生成) ---
const blockExplorers: Record<number, { baseUrl: string }> = {
${blockExplorerMappings}};

export const BLOCK_EXPLORER_CONFIG = (chain: Chain = xLayerTestnet) => {
  const explorer = blockExplorers[chain.id] || blockExplorers[xLayerTestnet.id];
  return {
    baseUrl: explorer.baseUrl,
    addressUrl: (address: string) => \`\${explorer.baseUrl}/address/\${address}\`,
    txUrl: (txHash: string) => \`\${explorer.baseUrl}/tx/\${txHash}\`,
    blockUrl: (blockNumber: number) => \`\${explorer.baseUrl}/block/\${blockNumber}\`,
  };
};
`;
    
    fs.writeFileSync(FRONTEND_CONTRACTS_FILE, frontendContractsContent);
    console.log("✅ Generated frontend contracts.ts");
}

// 生成多链 Subgraph 配置
function generateSubgraphConfig(networkName?: string) {
    console.log(`\n🚀 Generating multi-chain subgraph.yaml from chain configs...`);
    const configs = loadChainConfigs();
    
    // 如果指定了网络，只为该网络生成配置；否则为所有网络生成配置
    const networksToInclude = networkName ? [networkName] : Object.keys(configs.networks);
    
    console.log(`   - Generating for networks: ${networksToInclude.join(', ')}`);
    
    let dataSources = '';
    
    // 为每个网络生成数据源
    for (const network of networksToInclude) {
        const networkConfig = configs.networks[network];
        if (!networkConfig) {
            console.warn(`   ⚠️  Network ${network} not found in configs, skipping...`);
            continue;
        }
        
        const networkSuffix = networksToInclude.length > 1 ? `_${network}` : '';
        
        dataSources += `  - kind: ethereum
    name: TokenMinter${networkSuffix}
    network: ${networkConfig.subgraph.network}
    source:
      address: '${networkConfig.contracts.tokenMinter}'
      abi: TokenMinter
      startBlock: ${networkConfig.subgraph.startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - MintingPositionNFT
        - ClaimEvent
        - LiquidationStats
        - GlobalStats
      abis:
        - name: TokenMinter
          file: ./abis/TokenMinter.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,indexed uint256)
          handler: handleTransfer
        - event: RewardClaimed(indexed uint256,indexed address,bool,uint256,uint256)
          handler: handleRewardClaimed
        - event: MaturityUpdated(indexed uint256,uint256)
          handler: handleMaturityUpdated
      file: ./src/token-minter.ts
  - kind: ethereum
    name: TokenStaking${networkSuffix}
    network: ${networkConfig.subgraph.network}
    source:
      address: '${networkConfig.contracts.tokenStaking}'
      abi: TokenStaking
      startBlock: ${networkConfig.subgraph.startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - AccessPassNFT
        - StakingDeposit
        - DividendDistribution
        - StakingStats
      abis:
        - name: TokenStaking
          file: ./abis/TokenStaking.json
        - name: TokenAccessPass
          file: ./abis/TokenAccessPass.json
      eventHandlers:
        - event: StakeRegistered(indexed uint256,indexed uint256,uint256,uint256,uint256)
          handler: handleStakeRegistered
        - event: StakeDeregistered(indexed uint256,indexed uint256,uint256,uint256)
          handler: handleStakeDeregistered
        - event: SharesConverted(uint256,uint256,uint256)
          handler: handleSharesConverted
        - event: DividendDistributed(indexed uint8,uint256,uint256)
          handler: handleDividendDistributed
      file: ./src/token-staking.ts
  - kind: ethereum
    name: TokenAccessPass${networkSuffix}
    network: ${networkConfig.subgraph.network}
    source:
      address: '${networkConfig.contracts.tokenAccessPass}'
      abi: TokenAccessPass
      startBlock: ${networkConfig.subgraph.startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - AccessPassNFT
      abis:
        - name: TokenAccessPass
          file: ./abis/TokenAccessPass.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,indexed uint256)
          handler: handleAccessPassTransfer
      file: ./src/token-access-pass.ts
  - kind: ethereum
    name: SleepNftMarketplace${networkSuffix}
    network: ${networkConfig.subgraph.network}
    source:
      address: '${networkConfig.contracts.sleepNftMarketplace}'
      abi: SleepNftMarketplace
      startBlock: ${networkConfig.subgraph.startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - MarketListing
        - MarketSale
        - MarketStats
        - MintingPositionNFT
        - AccessPassNFT
      abis:
        - name: SleepNftMarketplace
          file: ./abis/SleepNftMarketplace.json
      eventHandlers:
        - event: NFTListed(indexed address,indexed uint256,indexed address,uint256)
          handler: handleNFTListed
        - event: NFTSold(indexed address,indexed uint256,indexed address,address,uint256,uint256)
          handler: handleNFTSold
        - event: NFTDelisted(indexed address,indexed uint256,indexed address)
          handler: handleNFTDelisted
        - event: MarketplaceFeeUpdated(uint256,uint256)
          handler: handleMarketplaceFeeUpdated
        - event: TreasuryUpdated(indexed address,indexed address)
          handler: handleTreasuryUpdated
      file: ./src/nft-marketplace.ts
  - kind: ethereum
    name: TokenTreasury${networkSuffix}
    network: ${networkConfig.subgraph.network}
    source:
      address: '${networkConfig.contracts.tokenTreasury}'
      abi: TokenTreasury
      startBlock: ${networkConfig.subgraph.startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - EpochInfo
        - FeeDistribution
        - TreasuryStats
      abis:
        - name: TokenTreasury
          file: ./abis/TokenTreasury.json
      eventHandlers:
        - event: EpochFinalized(indexed uint256,uint256,uint8,uint8,uint8)
          handler: handleEpochFinalized
        - event: RevenueDistributed(indexed uint256,uint256,uint256)
          handler: handleRevenueDistributed
        - event: POLAddressUpdated(indexed address)
          handler: handlePOLAddressUpdated
      file: ./src/token-treasury.ts
`;
    }
    
    const subgraphContent = `specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
${dataSources}`;
    
    fs.writeFileSync(SUBGRAPH_YAML_FILE, subgraphContent);
    console.log(`✅ Generated multi-chain subgraph.yaml for networks: ${networksToInclude.join(', ')}`);
}

// --- Types ---
interface DeploymentInfo {
    [contractName: string]: {
        address: string;
        blockNumber: number;
    };
}

// --- Network & Chain ID Handling ---
// A simple way to get the network argument from the command line
function getNetwork(): string | null {
    const networkArg = process.argv.find(arg => arg.startsWith('--network='));
    if (networkArg) {
        return networkArg.split('=')[1];
    }
    // Fallback for `npx hardhat run ... --network <name>`
    const networkFlagIndex = process.argv.indexOf('--network');
    if (networkFlagIndex !== -1 && process.argv.length > networkFlagIndex + 1) {
        return process.argv[networkFlagIndex + 1];
    }
    return null;
}

// 交互式网络选择
async function selectNetwork(): Promise<string> {
    const configs = loadChainConfigs();
    const networks = Object.keys(configs.networks);
    
    console.log("\n🌐 Select target network:");
    console.log("-".repeat(30));
    
    networks.forEach((network, index) => {
        const config = configs.networks[network];
        const isDefault = network === configs.defaultNetwork;
        console.log(`${index + 1}. ${config.name} (${network})${isDefault ? ' [DEFAULT]' : ''}`);
    });
    
    console.log("-".repeat(30));
    
    while (true) {
        const choice = await question(`Enter your choice (1-${networks.length}): `);
        const index = parseInt(choice.trim()) - 1;
        
        if (index >= 0 && index < networks.length) {
            const selectedNetwork = networks[index];
            console.log(`✅ Selected network: ${configs.networks[selectedNetwork].name} (${selectedNetwork})`);
            return selectedNetwork;
        } else {
            console.log("❌ Invalid choice. Please try again.");
        }
    }
}

// 从统一配置生成网络映射
function getNetworkToChainIdMap(): Record<string, number> {
    const configs = loadChainConfigs();
    const mapping: Record<string, number> = {};
    for (const [networkName, config] of Object.entries(configs.networks)) {
        mapping[networkName] = config.chainId;
    }
    return mapping;
}

// --- Configuration ---
const FRONTEND_CONTRACTS_FILE = "xenfyi-testnet/src/lib/contracts.ts";
const SUBGRAPH_YAML_FILE = "subgraph/subgraph.yaml";
const FRONTEND_ABI_PATH = "xenfyi-testnet/src/abi";
const SUBGRAPH_ABI_PATH = "subgraph/abis";
const ARTIFACTS_PATH = "artifacts/contracts";
const DEPLOYMENT_INFO_FILE = "deployment-info.json";

const DOCKER_DIR = path.resolve(__dirname, '..', 'graph-node', 'docker');
const FRONTEND_DIR = path.resolve(__dirname, '..', 'xenfyi-testnet');
const FRONTEND_PORT = 3000;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function executeCommand(command: string, options: { ignoreErrors?: boolean; cwd?: string } = {}) {
    try {
        console.log(`\nExecuting: ${command}`);
        const execOptions: any = { 
            stdio: "inherit",
            shell: process.platform === 'win32' ? 'powershell.exe' : true
        };
        if (options.cwd) {
            execOptions.cwd = options.cwd;
        }
        execSync(command, execOptions);
    } catch (error) {
        console.error(`\n❌ Error executing command: ${command}`);
        console.error(error);
        if (!options.ignoreErrors) {
        process.exit(1);
        }
    }
}

async function checkDockerRunning(): Promise<boolean> {
    try {
        execSync('docker --version', { stdio: 'pipe' });
        execSync('docker info', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

async function startDockerDesktop() {
    console.log("🐳 Starting Docker Desktop...");
    try {
        if (process.platform === 'win32') {
            execSync('Start-Process "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"', { 
                stdio: 'pipe',
                shell: 'powershell.exe'
            });
        } else {
            execSync('open -a Docker', { stdio: 'pipe' });
        }
        
        // Wait for Docker to start
        let attempts = 0;
        while (attempts < 30) {
            if (await checkDockerRunning()) {
                console.log("✅ Docker Desktop is running");
                return;
            }
            console.log(`   - Waiting for Docker Desktop to start... (${attempts + 1}/30)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        }
        throw new Error("Docker Desktop failed to start in time");
    } catch (error) {
        console.error("❌ Failed to start Docker Desktop:", error);
        throw error;
    }
}

function executeDockerCommand(command: string) {
    try {
        console.log(`\nExecuting in ${DOCKER_DIR}: docker-compose ${command}`);
        const execOptions: any = { 
            stdio: "inherit", 
            cwd: DOCKER_DIR,
            shell: process.platform === 'win32' ? 'powershell.exe' : true
        };
        execSync(`docker-compose ${command}`, execOptions);
    } catch (error) {
        console.error(`\n❌ Error executing docker-compose command: ${command}`);
        throw error; // Re-throw to handle properly
    }
}

async function restartSubgraphEnvironment() {
    console.log("\n🐳 Restarting local subgraph environment for a clean state...");
    
    // Check if Docker is running
    if (!(await checkDockerRunning())) {
        console.log("🐳 Docker is not running, starting Docker Desktop...");
        await startDockerDesktop();
    }

    try {
    executeDockerCommand("down");
        
        // Kill any processes using port 5432
        try {
            if (process.platform === 'win32') {
                const netstatOutput = execSync('netstat -ano | findstr :5432', { encoding: 'utf8', stdio: 'pipe' });
                if (netstatOutput.trim()) {
                    const lines = netstatOutput.trim().split('\n');
                    for (const line of lines) {
                        const parts = line.trim().split(/\s+/);
                        const pid = parts[parts.length - 1];
                        if (pid && pid !== '0') {
                            console.log(`   - Killing process ${pid} using port 5432`);
                            execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore errors if no process is using the port
        }

    executeDockerCommand("up -d");

    console.log("   - Waiting for services to initialize...");
        await new Promise(resolve => setTimeout(resolve, 20000)); // 20 seconds wait

    let attempts = 0;
    let isReady = false;
        while (!isReady && attempts < 15) {
        try {
                // Check if graph-node is responding
            const response = await fetch('http://127.0.0.1:8000');
            isReady = true;
            console.log("   - ✅ Subgraph environment is ready.");
        } catch (e: any) {
                if (e.code === 'ECONNREFUSED' || e.message.includes('ECONNREFUSED')) {
                    console.log(`   - Attempt ${attempts + 1}/15: Services not yet ready, retrying in 5s...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                attempts++;
            } else {
                 // Other errors (like 404) mean the server is running.
                isReady = true;
                console.log("   - ✅ Subgraph environment is responding.");
            }
        }
    }

    if (!isReady) {
        console.error("❌ Subgraph environment failed to start in time. Please check Docker.");
            throw new Error("Subgraph environment startup timeout");
        }
    } catch (error) {
        console.error("❌ Failed to restart subgraph environment:", error);
        throw error;
    }
}

function updateAbis() {
    console.log("\n🚀 Step 4: Updating contract ABIs for frontend and subgraph...");
    if (!fs.existsSync(FRONTEND_ABI_PATH)) fs.mkdirSync(FRONTEND_ABI_PATH, { recursive: true });
    if (!fs.existsSync(SUBGRAPH_ABI_PATH)) fs.mkdirSync(SUBGRAPH_ABI_PATH, { recursive: true });

    const contracts = fs.readdirSync(ARTIFACTS_PATH)
        .filter(dir => fs.statSync(path.join(ARTIFACTS_PATH, dir)).isDirectory());

    for (const contractDir of contracts) {
        // We only care about .sol directories
        if (!contractDir.endsWith(".sol")) continue;

        const contractName = path.basename(contractDir, '.sol');
        const artifactFile = path.join(ARTIFACTS_PATH, contractDir, `${contractName}.json`);

        if (fs.existsSync(artifactFile)) {
            const artifact = JSON.parse(fs.readFileSync(artifactFile, 'utf8'));
            const abi = artifact.abi;

            // Update subgraph ABI (keeps original name for clarity there)
            fs.writeFileSync(path.join(SUBGRAPH_ABI_PATH, `${contractName}.json`), JSON.stringify(abi, null, 2));

            // Update frontend ABI - USE THE OLD, COMPATIBLE FORMAT
            const tsAbiContent = `export const abi = ${JSON.stringify(abi, null, 2)} as const;\n`;
            // Use the original contract name for the file, matching the old manual style
            fs.writeFileSync(path.join(FRONTEND_ABI_PATH, `${contractName}.ts`), tsAbiContent);
            console.log(`   - Updated ${contractName} ABI.`);
        }
    }

    // Handle pool contracts in subdirectories
    const poolsPath = path.join(ARTIFACTS_PATH, 'pools');
    if (fs.existsSync(poolsPath)) {
        console.log("   - Processing pool contracts...");
        const poolContracts = ['SleepPoolFactory', 'SleepV2Pool', 'SleepV4Pool', 'SleepRouter', 'BuyAndBurnEngine', 'SleepV4TaxHook'];
        
        for (const contractName of poolContracts) {
            const artifactFile = path.join(poolsPath, `${contractName}.sol`, `${contractName}.json`);
            
            if (fs.existsSync(artifactFile)) {
                const artifact = JSON.parse(fs.readFileSync(artifactFile, 'utf8'));
                const abi = artifact.abi;

                // Update subgraph ABI
                fs.writeFileSync(path.join(SUBGRAPH_ABI_PATH, `${contractName}.json`), JSON.stringify(abi, null, 2));

                // Update frontend ABI
                const tsAbiContent = `export const abi = ${JSON.stringify(abi, null, 2)} as const;\n`;
                fs.writeFileSync(path.join(FRONTEND_ABI_PATH, `${contractName}.ts`), tsAbiContent);
                console.log(`   - Updated ${contractName} ABI (from pools).`);
            }
        }
    }

    console.log("✅ ABIs updated.");
}

function updateFrontendAddresses(deploymentInfo: DeploymentInfo, chainId: number) {
    console.log(`\n🚀 Step 3: Intelligently updating frontend contract addresses for chainId ${chainId}...`);
    let content = fs.readFileSync(FRONTEND_CONTRACTS_FILE, 'utf8');
    
    // This is a simplified but robust way to update the addresses without a full AST parser.
    // It relies on the structure we've created.
    const regex = new RegExp(`(\\[${chainId}\\]: \\{[\\s\\S]*?\\})`);
    const match = content.match(regex);

    if (!match) {
        console.error(`❌ Could not find address block for chainId ${chainId} in ${FRONTEND_CONTRACTS_FILE}`);
        // As a fallback, maybe we should add it? For now, we'll error out.
        throw new Error(`Chain ID block ${chainId} not found in frontend config.`);
    }

    let chainBlock = match[1];
    let updated = false;

    const contractNameMapping: { [key: string]: string } = {
        'TokenCore': 'tokenCore',
        'TokenMinter': 'tokenMinter', 
        'TokenStaking': 'tokenStaking',
        'TokenTreasury': 'tokenTreasury',
        'TokenAccessPass': 'tokenAccessPass',
        'SleepNftMarketplace': 'sleepNftMarketplace',
        'MarketTreasury': 'marketTreasury',
        'DevSupport': 'devSupport',
        'SleepPoolFactory': 'sleepPoolFactory',
        'ProtocolPool': 'protocolPool',
        'CommunityPool': 'communityPool',
        'SleepRouter': 'sleepRouter'
    };

    for (const contractName in deploymentInfo) {
        const addressKey = contractNameMapping[contractName];
        if (!addressKey) continue;
        
        const newAddress = deploymentInfo[contractName].address;
        const addressRegex = new RegExp(`(${addressKey}:\\s*['"])([^'"]+)(['"])`);
        
        const addressMatch = chainBlock.match(addressRegex);
        if (addressMatch && addressMatch[2] !== newAddress) {
            chainBlock = chainBlock.replace(addressRegex, `$1${newAddress}$3`);
            console.log(`   - Updated ${addressKey} for chain ${chainId}: ${addressMatch[2]} -> ${newAddress}`);
            updated = true;
        } else if (!addressMatch) {
            console.warn(`   - ⚠️ Could not find key '${addressKey}' in the address block for chain ${chainId}.`);
        }
    }

    if (updated) {
        content = content.replace(regex, chainBlock);
        fs.writeFileSync(FRONTEND_CONTRACTS_FILE, content);
        console.log(`✅ Frontend addresses updated for chainId ${chainId}.`);
    } else {
        console.log(`✅ All frontend addresses for chainId ${chainId} were already up-to-date.`);
    }
}

function updateSubgraphConfig(deploymentInfo: DeploymentInfo) {
    console.log("\n🚀 Step 4: Updating subgraph address and startBlock...");
    const subgraphYaml: any = yaml.load(fs.readFileSync(SUBGRAPH_YAML_FILE, 'utf8'));
    let updated = false;

    for (const dataSource of subgraphYaml.dataSources) {
        // Handle the new unified marketplace
        if (dataSource.name === 'MinterMarketplace' || dataSource.name === 'AccessPassMarketplace') {
            // This is a temporary measure during transition.
            // Ideally, the YAML should be cleaned up to have only one marketplace datasource.
            if (deploymentInfo['SleepNftMarketplace']) {
                const newAddress = deploymentInfo['SleepNftMarketplace'].address;
                const newStartBlock = deploymentInfo['SleepNftMarketplace'].blockNumber;

                dataSource.name = 'SleepNftMarketplace'; // Rename it
                dataSource.source.address = newAddress;
                dataSource.source.startBlock = newStartBlock;
                updated = true;
                console.log(`   - ✅ Migrated and updated ${dataSource.name} to new unified marketplace address.`);
            }
        } else if (deploymentInfo[dataSource.name]) {
            const newAddress = deploymentInfo[dataSource.name].address;
            const newStartBlock = deploymentInfo[dataSource.name].blockNumber;

            if (dataSource.source.address !== newAddress) {
                dataSource.source.address = newAddress;
                updated = true;
            }
            if (dataSource.source.startBlock !== newStartBlock) {
                dataSource.source.startBlock = newStartBlock;
                updated = true;
            }
        }
    }

    if (updated) {
        fs.writeFileSync(SUBGRAPH_YAML_FILE, yaml.dump(subgraphYaml, { indent: 2, lineWidth: -1, noRefs: true }));
        console.log("✅ Subgraph config updated.");
    } else {
        console.log("✅ Subgraph config already up-to-date.");
    }
}

function updateSubgraphMappingAddresses(deploymentInfo: DeploymentInfo) {
    console.log("\n🚀 Step 4.5: Updating hardcoded addresses in subgraph mappings...");
    const mappingFile = path.resolve(__dirname, '..', 'subgraph', 'src', 'nft-marketplace.ts');
    
    if (!fs.existsSync(mappingFile)) {
        console.log("   - ⚠️  nft-marketplace.ts not found, skipping...");
        return;
    }
    
    let content = fs.readFileSync(mappingFile, 'utf8');
    let updated = false;
    
    // Update TokenMinter address
    if (deploymentInfo['TokenMinter']) {
        const newMinterAddress = deploymentInfo['TokenMinter'].address.toLowerCase();
        // Match the hardcoded address pattern in the mapping file
        const minterRegex = /const tokenMinterAddress = ["']0x[a-fA-F0-9]{40}["']/g;
        const matches = content.match(minterRegex);
        
        if (matches && matches.length > 0) {
            const newLine = `const tokenMinterAddress = "${newMinterAddress}"`;
            content = content.replace(minterRegex, newLine);
            console.log(`   - Updated tokenMinterAddress to: ${newMinterAddress}`);
            updated = true;
        }
    }
    
    // Update TokenAccessPass address
    if (deploymentInfo['TokenAccessPass']) {
        const newAccessPassAddress = deploymentInfo['TokenAccessPass'].address.toLowerCase();
        const accessPassRegex = /const tokenAccessPassAddress = ["']0x[a-fA-F0-9]{40}["']/g;
        const matches = content.match(accessPassRegex);
        
        if (matches && matches.length > 0) {
            const newLine = `const tokenAccessPassAddress = "${newAccessPassAddress}"`;
            content = content.replace(accessPassRegex, newLine);
            console.log(`   - Updated tokenAccessPassAddress to: ${newAccessPassAddress}`);
            updated = true;
        }
    }
    
    if (updated) {
        fs.writeFileSync(mappingFile, content, 'utf8');
        console.log("✅ Subgraph mapping addresses updated.");
    } else {
        console.log("✅ Subgraph mapping addresses already up-to-date.");
    }
}

async function redeploySubgraph() {
    console.log("\n🚀 Step 5: Redeploying the subgraph...");

    const subgraphDir = path.resolve(__dirname, '..', 'subgraph');

    try {
        // Step 0: Remove old subgraph(s) to ensure clean deployment
        console.log("   - Removing old subgraph(s)...");
        const subgraphName = 'sleep-protocol'; // Must match frontend SUBGRAPH_URL
        
        try {
            // Try to remove the old subgraph with correct name
            executeCommand(`npx graph remove --node http://127.0.0.1:8020/ ${subgraphName}`, { 
                cwd: subgraphDir,
                ignoreErrors: true 
            });
            console.log(`   ✅ Old subgraph '${subgraphName}' removed successfully.`);
        } catch (error: any) {
            console.log("   - No old subgraph to remove (or remove failed, continuing anyway...)");
        }

        // Also try old naming convention
        try {
            executeCommand('npx graph remove --node http://127.0.0.1:8020/ sleep-protocol-subgraph', { 
                cwd: subgraphDir,
                ignoreErrors: true 
            });
        } catch (error: any) {
            // Ignore
        }

        // Wait a moment for Graph Node to clean up
        console.log("   - Waiting for Graph Node to clean up...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify removal by checking if subgraph still exists
        try {
            const checkResponse = await fetch(`http://127.0.0.1:8000/subgraphs/name/${subgraphName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: '{ _meta { block { number } } }' })
            });
            const checkResult = await checkResponse.json();
            if (!checkResult.errors || !checkResult.errors.some((e: any) => e.message.includes('does not exist'))) {
                console.log("   ⚠️  Old subgraph may still be running, but continuing with deployment...");
            } else {
                console.log("   ✅ Confirmed old subgraph removed.");
            }
        } catch (e) {
            console.log("   ✅ Old subgraph removed (or Graph Node not responding).");
        }

        // Step 1: Generate code
        console.log("   - Generating subgraph code...");
        executeCommand('npx graph codegen', { cwd: subgraphDir });

        // Step 2: Build
        console.log("   - Building subgraph...");
        executeCommand('npx graph build', { cwd: subgraphDir });

        // Step 3: Create subgraph (should now work since we removed the old one)
        console.log(`   - Creating fresh subgraph '${subgraphName}'...`);
        try {
            executeCommand(`npx graph create --node http://127.0.0.1:8020/ ${subgraphName}`, { 
                cwd: subgraphDir,
                ignoreErrors: false 
            });
            console.log("   ✅ Subgraph created successfully.");
        } catch (error: any) {
            if (error.toString().includes("already exists")) {
                console.log("   - Subgraph already exists (remove may have failed), continuing...");
            } else {
                throw error;
            }
        }

        // Step 4: Deploy with version label and retry logic
        console.log("   - Deploying subgraph...");
        let deployAttempts = 0;
        const maxDeployAttempts = 3;
        
        // Generate version label with timestamp to ensure Graph Node recognizes it as new deployment
        const versionLabel = `v${Date.now()}`;
        console.log(`   - Using version label: ${versionLabel}`);
        
        while (deployAttempts < maxDeployAttempts) {
            try {
                // Deploy with version label and version-label flag to avoid interactive prompt
                const deployCommand = `npx graph deploy --node http://127.0.0.1:8020/ --ipfs http://127.0.0.1:5001 --version-label ${versionLabel} ${subgraphName}`;
                
                executeCommand(deployCommand, { cwd: subgraphDir });
                console.log("✅ Subgraph deployed successfully.");
                break;
            } catch (error: any) {
                deployAttempts++;
                if (deployAttempts >= maxDeployAttempts) {
                    console.error(`❌ Failed to deploy subgraph after ${maxDeployAttempts} attempts`);
                    throw error;
                }
                console.log(`   - Deploy attempt ${deployAttempts} failed, retrying in 10s...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        // Step 5: Verify deployment and check sync status
        console.log("   - Verifying subgraph deployment and sync status...");
        let verifyAttempts = 0;
        let isIndexing = false;
        
        while (verifyAttempts < 15) {
            try {
                const response = await fetch(`http://127.0.0.1:8000/subgraphs/name/${subgraphName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: '{ _meta { block { number } hasIndexingErrors } }' })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data._meta) {
                        const blockNumber = data.data._meta.block?.number;
                        const hasErrors = data.data._meta.hasIndexingErrors;
                        
                        console.log(`   ✅ Subgraph is responding! Current block: ${blockNumber || 'N/A'}, Has errors: ${hasErrors}`);
                        
                        if (blockNumber && blockNumber > 0) {
                            isIndexing = true;
                            console.log(`   ✅ Subgraph is actively indexing blocks.`);
                            break;
                        } else {
                            console.log(`   - Subgraph deployed but not yet started indexing...`);
                        }
                    }
                } else {
                    const errorData = await response.json();
                    if (errorData.errors && errorData.errors.some((e: any) => e.message.includes('does not exist'))) {
                        console.log(`   - Subgraph '${subgraphName}' not found yet, waiting...`);
                    }
                }
            } catch (e) {
                // Continue trying
            }
            
            verifyAttempts++;
            if (verifyAttempts >= 15) {
                if (isIndexing) {
                    console.log("✅ Subgraph is indexing.");
                } else {
                    console.log("⚠️  Subgraph deployed but indexing status unclear. Check Graph Node logs if issues persist.");
                }
                break;
            }
            
            console.log(`   - Verification attempt ${verifyAttempts}/15, retrying in 3s...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

    } catch (error) {
        console.error("❌ Failed to redeploy subgraph:", error);
        throw error;
    }
}


async function main() {
    console.clear();
    console.log("📜 Sleep Protocol - Automation Hub");
    console.log("-".repeat(40));
    console.log("1. Deploy ALL contracts (Core + Pools + Router) & Restart Subgraph");
    console.log("2. Deploy CORE contracts & Restart Subgraph");
    console.log("3. Deploy MARKETPLACE contract & Restart Subgraph");
    console.log("4. Update Configs & Restart Subgraph (skip contract deployment)");
    console.log("5. ONLY Restart Subgraph (no config updates)");
    console.log("6. Start Frontend Development Server (yarn dev)");
    console.log("7. Deploy Pool System (SleepRouter + Pools)");
    console.log("8. ONLY Update ABIs (Frontend & Subgraph)");
    console.log("9. Generate ALL Configs from chain-configs.json (Hardhat + Frontend + Subgraph)");
    console.log("-".repeat(40));
    
    const choice = await question("Enter your choice: ");
    let network = getNetwork(); // Get network from CLI args

    let deploymentScriptName = "";
    let skipDeployment = false;
    let subgraphOnly = false;
    let startFrontend = false;
    let abiOnly = false;
    let configsOnly = false;
    let needsNetworkSelection = false;

    switch (choice.trim()) {
        case "1":
            deploymentScriptName = "scripts/deploy.cjs";
            needsNetworkSelection = true;
            break;
        case "2":
            deploymentScriptName = "scripts/deploy-core.ts";
            needsNetworkSelection = true;
            break;
        case "3":
            deploymentScriptName = "scripts/deploy-market.ts";
            needsNetworkSelection = true;
            break;
        case "4":
            skipDeployment = true;
            break;
        case "5":
            skipDeployment = true;
            subgraphOnly = true;
            break;
        case "6":
            startFrontend = true;
            break;
        case "7":
            deploymentScriptName = "scripts/deploy-pools-simple.cjs";
            needsNetworkSelection = true;
            break;
        case "8":
            abiOnly = true;
            break;
        case "9":
            configsOnly = true;
            break;
        default:
            console.error("Invalid choice. Exiting.");
            rl.close();
            process.exit(1);
    }

    // 如果需要部署合约但没有指定网络，则弹出网络选择菜单
    if (needsNetworkSelection && !network) {
        network = await selectNetwork();
    }

    try {
        if (startFrontend) {
            // --- Option 6: Start Frontend Development Server ---
            console.log("\n🚀 Starting Frontend Development Server...");
            startFrontendServer();
            return; // Exit after starting frontend
        } else if (abiOnly) {
            // --- Option 8: ONLY Update ABIs ---
            console.log("\n🚀 ONLY updating ABIs for Frontend and Subgraph...");
            
            // --- Step 1: Update ABIs ---
            updateAbis();
            
            console.log("\n🎉 ABI update complete!");
            console.log("📋 Updated ABIs for:");
            console.log("- All core contracts (TokenCore, TokenMinter, etc.)");
            console.log("- All pool contracts (SleepRouter, SleepV2Pool, SleepV4Pool, etc.)");
            console.log("- Frontend TypeScript files in xenfyi-testnet/src/abi/");
            console.log("- Subgraph JSON files in subgraph/abis/");
            
        } else if (configsOnly) {
            // --- Option 9: Generate ALL Configs ---
            console.log("\n🚀 Generating ALL configurations from chain-configs.json...");
            
            // --- Step 1: Generate Hardhat Config ---
            generateHardhatConfig();
            
            // --- Step 2: Generate Frontend Contracts ---
            generateFrontendContracts();
            
            // --- Step 3: Generate Subgraph Config ---
            const targetNetwork = network || 'xlayertest';
            generateSubgraphConfig(targetNetwork);
            
            console.log("\n🎉 Configuration generation complete!");
            console.log("📋 Generated configurations:");
            console.log("- hardhat.config.cjs (network configurations)");
            console.log("- xenfyi-testnet/src/lib/contracts.ts (frontend contract addresses)");
            console.log(`- subgraph/subgraph.yaml (for network: ${targetNetwork})`);
            console.log("- All configurations are now synchronized with chain-configs.json");
            
        } else if (subgraphOnly) {
            // --- Option 5: ONLY Restart Subgraph ---
            console.log("\n🚀 ONLY restarting Subgraph environment and redeploying...");
            
            // --- Step 1: Restart Subgraph Environment ---
            await restartSubgraphEnvironment();
            
            // --- Step 2: Redeploy Subgraph ---
            await redeploySubgraph();
            
            console.log("\n🎉 Subgraph-only restart complete!");
        } else {
            // --- Standard flow for options 1-4 ---

    // --- Step 1: Deploy Contracts (or skip) ---
    if (skipDeployment) {
        console.log("\n🚀 Step 1: SKIPPING contract deployment...");
        if (!fs.existsSync(DEPLOYMENT_INFO_FILE)) {
            console.error(`\n❌ Error: '${DEPLOYMENT_INFO_FILE}' not found. Cannot skip deployment.`);
            process.exit(1);
        }
    } else {
        console.log(`\n🚀 Step 1: Deploying contracts using '${deploymentScriptName}'...`);
                // Pass network to hardhat command
                const targetNetwork = network || 'xlayertest'; // Default to xlayertest if not specified
                console.log(`   - Targeting network: ${targetNetwork}`);
                executeCommand(`npx hardhat run ${deploymentScriptName} --network ${targetNetwork}`);
                console.log("✅ Core contracts deployment complete.");
                
                // For option 1 (full deployment), also deploy pool system
                if (deploymentScriptName === "scripts/deploy.cjs") {
                    console.log(`\n🚀 Step 1b: Deploying Pool System (SleepRouter + Pools)...`);
                    executeCommand(`npx hardhat run scripts/deploy-pools-simple.cjs --network ${targetNetwork}`);
                    console.log("✅ Pool system deployment complete.");
                }
            }
            
            // Determine chainId for updates
            const deployedNetwork = network || 'xlayertest'; // The network we actually deployed to
            const networkToChainId = getNetworkToChainIdMap();
            const chainId = networkToChainId[deployedNetwork];
            if (!chainId) {
                throw new Error(`Unknown network: ${deployedNetwork}. Please add it to the chain-configs.json file.`);
    }
    
    // --- Step 2: Restart Subgraph Environment ---
    await restartSubgraphEnvironment();

    // --- Step 3: Parse deployment info ---
    console.log("\n🚀 Step 2: Parsing new contract addresses and block numbers...");
    const deploymentInfo: DeploymentInfo = JSON.parse(fs.readFileSync(DEPLOYMENT_INFO_FILE, 'utf8'));
    for (const contractName in deploymentInfo) {
        console.log(`   - Found ${contractName}: ${deploymentInfo[contractName].address} at block ${deploymentInfo[contractName].blockNumber}`);
    }
     console.log("✅ Parsing complete.");

            // --- Step 4: Update Chain Configs ---
            updateDeploymentInConfigs(deploymentInfo, deployedNetwork);
            
            // --- Step 5: Generate Configurations ---
            generateHardhatConfig();
            generateFrontendContracts();
            
            // --- Step 6: Update ABIs ---
            updateAbis();
            
            // --- Step 6.5: Update Subgraph Mapping Addresses ---
            updateSubgraphMappingAddresses(deploymentInfo);
    
    // --- Step 7: Redeploy Subgraph ---
            await redeploySubgraph();

            // --- Step 8: Post-Deployment Checks ---
            await runPostDeploymentChecks();
        }

    rl.close();
    console.log("\n🎉🎉🎉 Fully automated deployment and configuration update complete! 🎉🎉🎉");
        
    } catch (error) {
        console.error("\n❌ Deployment process failed:", error);
        rl.close();
        process.exit(1);
    }
}

main().catch(console.error);


// --- Post-Deployment Check Functions ---

const SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/sleep-protocol'; // Must match frontend and deployment

async function querySubgraph(query: string) {
    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.errors) {
            // It's common for fields to be null during initial sync, so we don't treat that as a hard error.
            if (result.errors.some((e: any) => e.message.includes("Cannot return null for non-nullable field"))) {
                 console.log(`   - ⏳ Subgraph is syncing, some fields are not yet available.`);
                 return result.data || {};
            }
            throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
        }
        return result.data;
    } catch (error: any) {
        // Handle cases where the subgraph isn't immediately available
        if (error.code === 'ECONNREFUSED') {
            return null;
        }
        console.error(`\n❌ Subgraph query failed: ${error.message}`);
        return null;
    }
}

async function runPostDeploymentChecks() {
    console.log("\n\n🚀 Step 6: Running Post-Deployment Checks...");
    console.log(`   - Waiting for subgraph to be available at ${SUBGRAPH_URL}`);
    
    let isSynced = false;
    let attempts = 0;
    
    while (!isSynced && attempts < 30) { // Timeout after ~2.5 minutes
        const metaQuery = `query { _meta { block { number } } }`;
        const metaData = await querySubgraph(metaQuery);

        if (metaData && metaData._meta) {
            const blockNumber = metaData._meta.block.number;
            console.log(`   - ✅ Subgraph is available. Current synced block: ${blockNumber}`);
            isSynced = true; // For now, we'll just check if it's available. Real sync check is more complex.
        } else {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
            attempts++;
        }
    }

    if (!isSynced) {
        console.error("\n❌ Timed out waiting for subgraph to become available.");
        return;
    }

    console.log("\n\n📊 Fetching Key Frontend Statistics...");

    // 1. Liquidation Stats
    const liquidationStatsQuery = `query { liquidationStats(id: "1") { totalLiquidatedNfts totalLiquidatorRewards totalStakingRewards } }`;
    const liqData = await querySubgraph(liquidationStatsQuery);
    console.log("\n--- Liquidation Stats ---");
    if (liqData && liqData.liquidationStats) {
        console.log(`   - Total NFTs Liquidated: ${liqData.liquidationStats.totalLiquidatedNfts}`);
        console.log(`   - Total Rewards to Liquidators: ${liqData.liquidationStats.totalLiquidatorRewards}`);
        console.log(`   - Total Rewards to Stakers: ${liqData.liquidationStats.totalStakingRewards}`);
    } else {
        console.log("   - No liquidation stats found yet.");
    }

    // 2. Market Stats
    const marketStatsQuery = `query { marketStats(id: "1") { totalListings activeListings totalVolume marketplaceFeePercent } }`;
    const marketData = await querySubgraph(marketStatsQuery);
    console.log("\n--- Marketplace Stats ---");
    if (marketData && marketData.marketStats) {
        console.log(`   - Total Listings: ${marketData.marketStats.totalListings}`);
        console.log(`   - Active Listings: ${marketData.marketStats.activeListings}`);
        console.log(`   - Total Volume: ${marketData.marketStats.totalVolume}`);
        console.log(`   - Fee Percent: ${marketData.marketStats.marketplaceFeePercent / 100}%`);
    } else {
        console.log("   - No marketplace stats found yet.");
    }

    // 3. Liquidatable NFTs
    const liquidatableQuery = `query { sleepNftPositions(where: { isLiquidated: false, maturityTs_lt: "${Math.floor(Date.now() / 1000)}" }) { id } }`;
    const liquidatableData = await querySubgraph(liquidatableQuery);
    console.log("\n--- Asset Status ---");
    if (liquidatableData && liquidatableData.sleepNftPositions) {
        console.log(`   - Liquidatable (abandoned) NFTs found: ${liquidatableData.sleepNftPositions.length}`);
    } else {
        console.log("   - Could not fetch liquidatable NFT count.");
    }
}
function startFrontendServer() {
    console.log("\n🚀 Starting Frontend Development Server...");
    console.log("📁 Changing directory to: xenfyi-testnet");
    console.log("🔧 Running command: yarn dev");
    console.log("🌐 Frontend will be available at: http://localhost:3000");
    console.log("⏹️  Press Ctrl+C to stop the server");
    console.log("-".repeat(50));
    
    try {
        // Change to frontend directory and start development server
        const frontendPath = path.join(__dirname, '..', 'xenfyi-testnet');
        
        if (!fs.existsSync(frontendPath)) {
            console.error(`❌ Frontend directory not found: ${frontendPath}`);
            process.exit(1);
        }
        
        // Use spawn to run the command in the background and keep it running
        const child = spawn('yarn', ['dev'], {
            cwd: frontendPath,
            stdio: 'inherit',
            shell: true
        });
        
        child.on('error', (error) => {
            console.error(`❌ Failed to start frontend server: ${error.message}`);
            process.exit(1);
        });
        
        child.on('close', (code) => {
            console.log(`\n🛑 Frontend server stopped with code ${code}`);
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping frontend server...');
            child.kill('SIGINT');
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log('\n🛑 Stopping frontend server...');
            child.kill('SIGTERM');
            process.exit(0);
        });
        
    } catch (error) {
        console.error(`❌ Error starting frontend server: ${error}`);
        process.exit(1);
    }
}

