// 导入新的合约 ABI
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
  [1952]: {
    tokenCore: '0x078373C0F834FbB2477066BA4eF4674085d14366',
    tokenMinter: '0x3c36c96E69c6585F7b2d877239989a25f80De68F',
    tokenStaking: '0x1C3dF2b93A8778F5d9D5cd8C9FeC04749021e8b8',
    tokenTreasury: '0x0855BFC02BFD09626a1e353Ee2EE9926E29DAD68',
    tokenAccessPass: '0xa4304C2767b18769b795647e45B9D37c06dc0aEe',
    devSupport: '0x5b11a9b102B61B4B3b9f9D1FD494405C62c7799d',
    sleepNftMarketplace: '0x98680beEaACf49c942f5bfb3B6b4b599CF5e2ac7',
    marketTreasury: '0x0ABf85DA2099E805bb5479d379E7b16121786953',
    sleepPoolFactory: '0x0000000000000000000000000000000000000000',
    protocolPool: '0x36d4afE6b94a65dAe72D92395452Ee28f98B8123',
    communityPool: '0xa3cCA9081E6BD6666d19725383A32D3b272bCEb8',
    sleepRouter: '0x734c3a35608431c8B2377F491a7E67856D94B5c2',
  },
  [11155111]: {
    tokenCore: '0x078373C0F834FbB2477066BA4eF4674085d14366',
    tokenMinter: '0x3c36c96E69c6585F7b2d877239989a25f80De68F',
    tokenStaking: '0x1C3dF2b93A8778F5d9D5cd8C9FeC04749021e8b8',
    tokenTreasury: '0x0855BFC02BFD09626a1e353Ee2EE9926E29DAD68',
    tokenAccessPass: '0xa4304C2767b18769b795647e45B9D37c06dc0aEe',
    devSupport: '0x5b11a9b102B61B4B3b9f9D1FD494405C62c7799d',
    sleepNftMarketplace: '0x98680beEaACf49c942f5bfb3B6b4b599CF5e2ac7',
    marketTreasury: '0x0ABf85DA2099E805bb5479d379E7b16121786953',
    sleepPoolFactory: '0x0000000000000000000000000000000000000000',
    protocolPool: '0x0000000000000000000000000000000000000000',
    communityPool: '0x0000000000000000000000000000000000000000',
    sleepRouter: '0x0000000000000000000000000000000000000000',
  },
};

// --- Helper 函数，用于获取当前链的地址 ---
function getContractAddresses(chain: Chain) {
  const addresses = contractAddresses[chain.id];
  if (!addresses) {
    // Fallback to xLayerTestnet if the chain is not configured
    console.warn(`Unsupported chain: ${chain.id}. Falling back to xLayerTestnet addresses.`);
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
  [1952]: {
    baseUrl: 'https://www.oklink.com/xlayer-test'
  },
  [11155111]: {
    baseUrl: 'https://sepolia.etherscan.io'
  },
};

export const BLOCK_EXPLORER_CONFIG = (chain: Chain = xLayerTestnet) => {
  const explorer = blockExplorers[chain.id] || blockExplorers[xLayerTestnet.id];
  return {
    baseUrl: explorer.baseUrl,
    addressUrl: (address: string) => `${explorer.baseUrl}/address/${address}`,
    txUrl: (txHash: string) => `${explorer.baseUrl}/tx/${txHash}`,
    blockUrl: (blockNumber: number) => `${explorer.baseUrl}/block/${blockNumber}`,
  };
};
