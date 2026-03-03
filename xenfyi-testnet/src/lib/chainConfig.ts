// 从统一配置文件读取链配置
import chainConfigs from '../../../chain-configs.json';

export interface ChainConfig {
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
  subgraph: {
    network: string;
    startBlock: number;
  };
  logo: string;
  contracts: Record<string, string>;
}

// 获取所有支持的链配置
export function getSupportedChains(): ChainConfig[] {
  return Object.values(chainConfigs.networks) as ChainConfig[];
}

// 根据 chainId 获取链配置
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return getSupportedChains().find(chain => chain.chainId === chainId);
}

// 获取链的 logo
export function getChainLogo(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.logo || "/win98/assets/icons/network_good.png";
}

// 获取链的名称
export function getChainName(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.name || "Unknown Network";
}

// 检查链是否被支持
export function isChainSupported(chainId: number): boolean {
  return getSupportedChains().some(chain => chain.chainId === chainId);
}


