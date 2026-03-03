import { useReadContracts } from 'wagmi';
import { sleepPoolFactoryContract, protocolPoolContract, communityPoolContract, tokenCoreContract } from '~/lib/contracts';
import { formatEther, formatUnits } from 'viem';

export interface PoolInfo {
  protocolPool: {
    address: string;
    sleepingBalance: bigint;
    okbBalance: bigint;
    isLocked: boolean;
    type: string;
  };
  communityPool: {
    address: string;
    sleepingBalance: bigint;
    okbBalance: bigint;
    isLocked: boolean;
    type: string;
  };
  totalLiquidity: {
    sleeping: bigint;
    okb: bigint;
  };
  isLoading: boolean;
  error: any;
}

export function usePoolInfo(): PoolInfo {
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      // Get protocol pool balances
      {
        ...tokenCoreContract(),
        functionName: 'balanceOf',
        args: [protocolPoolContract().address],
      },
      {
        address: protocolPoolContract().address,
        abi: [{ "inputs": [], "name": "getBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }],
        functionName: 'getBalance',
      },
      // Get community pool balances
      {
        ...tokenCoreContract(),
        functionName: 'balanceOf',
        args: [communityPoolContract().address],
      },
      {
        address: communityPoolContract().address,
        abi: [{ "inputs": [], "name": "getBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }],
        functionName: 'getBalance',
      },
    ],
  });

  if (isLoading || !data) {
    return {
      protocolPool: {
        address: protocolPoolContract().address,
        sleepingBalance: 0n,
        okbBalance: 0n,
        isLocked: true,
        type: 'Protocol-Owned Liquidity',
      },
      communityPool: {
        address: communityPoolContract().address,
        sleepingBalance: 0n,
        okbBalance: 0n,
        isLocked: false,
        type: 'Community Liquidity',
      },
      totalLiquidity: {
        sleeping: 0n,
        okb: 0n,
      },
      isLoading: true,
      error: null,
    };
  }

  const [
    protocolSleepingBalance,
    protocolOkbBalance,
    communitySleepingBalance,
    communityOkbBalance,
  ] = data;

  const protocolSleeping = protocolSleepingBalance?.result || 0n;
  const protocolOkb = protocolOkbBalance?.result || 0n;
  const communitySleeping = communitySleepingBalance?.result || 0n;
  const communityOkb = communityOkbBalance?.result || 0n;

  console.log('💧 Pool balances:', {
    protocolSleeping: protocolSleeping.toString(),
    protocolOkb: protocolOkb.toString(),
    communitySleeping: communitySleeping.toString(),
    communityOkb: communityOkb.toString(),
  });

  return {
    protocolPool: {
      address: protocolPoolContract().address,
      sleepingBalance: protocolSleeping,
      okbBalance: protocolOkb,
      isLocked: true,
      type: 'Protocol-Owned Liquidity',
    },
    communityPool: {
      address: communityPoolContract().address,
      sleepingBalance: communitySleeping,
      okbBalance: communityOkb,
      isLocked: false,
      type: 'Community Liquidity',
    },
    totalLiquidity: {
      sleeping: protocolSleeping + communitySleeping,
      okb: protocolOkb + communityOkb,
    },
    isLoading: false,
    error,
  };
}

// Utility functions for formatting
export const formatSLEEPING = (value: bigint) => formatUnits(value, 18);
export const formatOKB = (value: bigint) => formatEther(value);
