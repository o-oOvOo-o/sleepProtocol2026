import { mainnet } from "@wagmi/chains";
import { Address, formatUnits } from "viem";
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  Chain,
  useAccount,
  useBalance,
  useReadContract,
  useReadContracts,
  useFeeData,
} from "wagmi";

import { tokenCoreContract, tokenMinterContract, tokenStakingContract } from "~/lib/contracts";

// --- TYPE DEFINITIONS ---
export interface Formatted {
  gasPrice: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export interface FeeData {
  formatted: Formatted;
  gasPrice: bigint;
  lastBaseFeePerGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export interface Token {
  address: Address;
  decimals: number;
  name: string;
  symbol: string;
  totalSupply: { value: bigint; formatted: string };
}

export interface Balance {
  decimals: number;
  formatted: string;
  symbol: string;
  value: bigint;
}

export interface StakeEntry {
  amount: bigint;
  timestamp: bigint;
}

export interface UserStakeData {
  totalStake: bigint;
  effectiveStake: bigint;
  pendingStake: bigint;
  stakeEntries: StakeEntry[];
  isVeteran: boolean;
  firstEffectiveTimestamp: bigint;
  userRewards: bigint;
  userSleepRewards: bigint;
}

export interface UserMintData {
  totalMints: number;
  activeMints: number;
  maturedMints: number;
  totalMintedAmount: bigint;
  totalClaimedAmount: bigint;
  mintingNFTs: Array<{
    tokenId: bigint;
    term: bigint;
    maturityTs: bigint;
    rank: bigint;
    amplifier: bigint;
    count: bigint;
    isMatured: boolean;
    isClaimed: boolean;
  }>;
}

interface ISleepContext {
  setChainOverride: (_chain: Chain) => void;
  currentChain: Chain;
  feeData?: FeeData;
  sleepBalance?: Balance;
  globalRank: number;
  totalStaked: bigint;
  rewardPool: bigint;
  sleepRewardPool: bigint; // Added for SLEEP rewards from liquidation
  genesisTs: number;
  token?: Token;
  userStakeData?: UserStakeData;
  // 合约常量
  maxTermDays: number;
  maxMintCount: number;
  refetchBalance: () => void;
  refetchUserData: () => void;
  refetchGlobals: () => void;
}

export const SleepContext = createContext<ISleepContext | null>(null);

export const SleepProvider = ({ children }: any) => {
  const [chainOverride, setChainOverride] = useState<Chain | undefined>();
  const [sleepBalance, setSleepBalance] = useState<Balance | undefined>();
  const [globalRank, setGlobalRank] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0n);
  const [rewardPool, setRewardPool] = useState(0n);
  const [sleepRewardPool, setSleepRewardPool] = useState(0n); // Added state
  const [genesisTs, setGenesisTs] = useState(0);
  const [token, setToken] = useState<Token | undefined>();
  const [userStakeData, setUserStakeData] = useState<UserStakeData | undefined>();
  // 合约常量状态
  const [maxTermDays, setMaxTermDays] = useState(49); // 默认49天（合约初始值）
  const [maxMintCount, setMaxMintCount] = useState(100); // 默认100个

  const { address, chain: networkChain } = useAccount();

  const chain = chainOverride ?? networkChain ?? mainnet;

  // 监听网络切换，强制刷新所有数据
  useEffect(() => {
    console.log('🔄 网络切换检测到，当前链:', chain?.id, chain?.name);
    // 当网络切换时，强制刷新所有数据
    if (address) {
      refetchBalance();
      refetchGlobals();
      refetchUserData();
    }
  }, [chain?.id, address]);

  // --- Balance Fetching ---
  const { data: balanceData, refetch: refetchBalance, status: balanceStatus } = useBalance({
    address: address,
    token: tokenCoreContract(chain).address,
    query: { cacheTime: 0 }
  });

  useEffect(() => {
    if (balanceStatus === 'success' && balanceData) {
      setSleepBalance(balanceData);
    } else {
      setSleepBalance(undefined);
    }
  }, [balanceData, balanceStatus]);

  // --- Global Protocol Data Fetching ---
  const { data: contractData, refetch: refetchGlobals } = useReadContracts({
    contracts: [
      { ...tokenMinterContract(chain), functionName: "globalRank" },
      { ...tokenMinterContract(chain), functionName: "genesisTs" },
      { ...tokenStakingContract(chain), functionName: "totalStaked" },
      { ...tokenStakingContract(chain), functionName: "rewardPool" },
      { 
        ...tokenCoreContract(chain), 
        functionName: "balanceOf",
        args: [tokenStakingContract(chain).address],
      },
      // 添加合约常量
      { ...tokenMinterContract(chain), functionName: "MAX_TERM_DAYS" },
    ],
  });

  // 计算当前最大天数的函数（基于合约逻辑）
  const calculateMaxTerm = (genesisTimestamp: number): number => {
    if (genesisTimestamp === 0) return 49; // 默认值
    
    const SECONDS_IN_DAY = 86400;
    const daysSinceGenesis = Math.floor((Date.now() / 1000 - genesisTimestamp) / SECONDS_IN_DAY);
    
    let maxTermDays = 49; // Base term
    
    if (daysSinceGenesis < 365) {
      // Phase 1 (Year 1): Every 49 days increases max term by 7 days
      const increases = Math.floor(daysSinceGenesis / 49);
      maxTermDays += increases * 7;
    } else if (daysSinceGenesis < 730) {
      // Phase 2 (Year 2): Every 49 days increases by 14 days
      const phase1Growth = 7 * 7; // 49 days from phase 1
      const daysInPhase2 = daysSinceGenesis - 365;
      const phase2Increases = Math.floor(daysInPhase2 / 49);
      maxTermDays += phase1Growth + (phase2Increases * 14);
    } else if (daysSinceGenesis < 1095) {
      // Phase 3 (Year 3): Every 49 days increases by 28 days
      const phase1Growth = 7 * 7;   // 49 days
      const phase2Growth = 7 * 14;  // 98 days
      const daysInPhase3 = daysSinceGenesis - 730;
      const phase3Increases = Math.floor(daysInPhase3 / 49);
      maxTermDays += phase1Growth + phase2Growth + (phase3Increases * 28);
    } else if (daysSinceGenesis < 1460) {
      // Phase 4 (Year 4): Every 49 days increases by 56 days
      const phase1Growth = 7 * 7;   // 49 days
      const phase2Growth = 7 * 14;  // 98 days
      const phase3Growth = 7 * 28;  // 196 days
      const daysInPhase4 = daysSinceGenesis - 1095;
      const phase4Increases = Math.floor(daysInPhase4 / 49);
      maxTermDays += phase1Growth + phase2Growth + phase3Growth + (phase4Increases * 56);
    } else if (daysSinceGenesis < 1825) {
      // Phase 5 (Year 5): Every 49 days increases by 112 days
      const phase1Growth = 7 * 7;   // 49 days
      const phase2Growth = 7 * 14;  // 98 days
      const phase3Growth = 7 * 28;  // 196 days
      const phase4Growth = 7 * 56;  // 392 days
      const daysInPhase5 = daysSinceGenesis - 1460;
      const phase5Increases = Math.floor(daysInPhase5 / 49);
      maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + (phase5Increases * 112);
    } else if (daysSinceGenesis < 2190) {
      // Phase 6 (Year 6): Every 49 days increases by 224 days
      const phase1Growth = 7 * 7;   // 49 days
      const phase2Growth = 7 * 14;  // 98 days
      const phase3Growth = 7 * 28;  // 196 days
      const phase4Growth = 7 * 56;  // 392 days
      const phase5Growth = 7 * 112; // 784 days
      const daysInPhase6 = daysSinceGenesis - 1825;
      const phase6Increases = Math.floor(daysInPhase6 / 49);
      maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + phase5Growth + (phase6Increases * 224);
    } else if (daysSinceGenesis < 2555) {
      // Phase 7 (Year 7): Every 49 days increases by 448 days
      const phase1Growth = 7 * 7;   // 49 days
      const phase2Growth = 7 * 14;  // 98 days
      const phase3Growth = 7 * 28;  // 196 days
      const phase4Growth = 7 * 56;  // 392 days
      const phase5Growth = 7 * 112; // 784 days
      const phase6Growth = 7 * 224; // 1568 days
      const daysInPhase7 = daysSinceGenesis - 2190;
      const phase7Increases = Math.floor(daysInPhase7 / 49);
      maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + phase5Growth + phase6Growth + (phase7Increases * 448);
    } else {
      // Phase 8 (Year 8+): Every 49 days increases by 896 days
      const phase1Growth = 7 * 7;   // 49 days
      const phase2Growth = 7 * 14;  // 98 days
      const phase3Growth = 7 * 28;  // 196 days
      const phase4Growth = 7 * 56;  // 392 days
      const phase5Growth = 7 * 112; // 784 days
      const phase6Growth = 7 * 224; // 1568 days
      const phase7Growth = 7 * 448; // 3136 days
      const daysInPhase8 = daysSinceGenesis - 2555;
      const phase8Increases = Math.floor(daysInPhase8 / 49);
      maxTermDays += phase1Growth + phase2Growth + phase3Growth + phase4Growth + phase5Growth + phase6Growth + phase7Growth + (phase8Increases * 896);
    }
    
    // Cap at MAX_TERM_DAYS (3650)
    return Math.min(maxTermDays, 3650);
  };

  useEffect(() => {
    if (contractData) {
      const currentGenesisTs = Number(contractData[1]?.result ?? 0);
      
      setGlobalRank(Number(contractData[0]?.result ?? 0));
      setGenesisTs(currentGenesisTs);
      setTotalStaked(BigInt(contractData[2]?.result?.toString() ?? '0'));
      setRewardPool(BigInt(contractData[3]?.result?.toString() ?? '0'));
      setSleepRewardPool(BigInt(contractData[4]?.result?.toString() ?? '0')); // Set state for SLEEP reward pool
      
      // 计算当前最大天数
      const currentMaxTerm = calculateMaxTerm(currentGenesisTs);
      setMaxTermDays(currentMaxTerm);
      
      console.log('🔢 当前最大铸造天数:', currentMaxTerm);
    }
  }, [contractData]);

  // --- User-Specific Staking Data Fetching ---
  const { data: userData, refetch: refetchUserData } = useReadContracts({
    contracts: [
      {
        ...tokenStakingContract(chain),
        functionName: 'getStakeEntries',
        args: [address as Address],
      },
      {
        ...tokenStakingContract(chain),
        functionName: 'userRewards',
        args: [address as Address],
      },
      {
        ...tokenStakingContract(chain),
        functionName: 'userSleepRewards',
        args: [address as Address],
      },
      {
        ...tokenStakingContract(chain),
        functionName: 'totalUserStake',
        args: [address as Address],
      }
    ],
    query: {
      enabled: !!address,
      cacheTime: 0,
    },
  });

  // --- Derived State Calculation for Staking ---
  const processedUserStakeData = useMemo((): UserStakeData | undefined => {
    if (
      !userData ||
      userData[0]?.status !== 'success' ||
      userData[1]?.status !== 'success' ||
      userData[2]?.status !== 'success' ||
      userData[3]?.status !== 'success'
    ) {
      return undefined;
    }

    // The result from useReadContracts for a struct array is already in the correct object format.
    const stakeEntries = userData[0].result as StakeEntry[];
    const userRewards = userData[1].result as bigint;
    const userSleepRewards = userData[2].result as bigint;
    const totalStake = userData[3].result as bigint;

    let effectiveStake = 0n;
    let pendingStake = 0n;
    let firstEffectiveTimestamp = 0n;
    const now = BigInt(Math.floor(Date.now() / 1000));
    const EFFECTIVE_STAKE_SECONDS = 7n * 86400n; // 7 days in seconds as BigInt

    for (const entry of stakeEntries) {
      if (now >= entry.timestamp + EFFECTIVE_STAKE_SECONDS) {
        effectiveStake += entry.amount;
        if (firstEffectiveTimestamp === 0n) {
          firstEffectiveTimestamp = entry.timestamp;
        }
      } else {
        pendingStake += entry.amount;
      }
    }

    const VETERAN_STATUS_SECONDS = 30n * 86400n; // 30 days
    const isVeteran = firstEffectiveTimestamp > 0n && (now >= firstEffectiveTimestamp + VETERAN_STATUS_SECONDS);

    return {
      totalStake,
      effectiveStake,
      pendingStake,
      stakeEntries,
      isVeteran,
      firstEffectiveTimestamp,
      userRewards,
      userSleepRewards
    };
  }, [userData]);
  
  useEffect(() => {
    setUserStakeData(processedUserStakeData);
  }, [processedUserStakeData]);

  // 注意：用户铸币数据现在从 Subgraph 获取，不再从合约直接获取
  // 使用 useUserMintData hook 来获取这些数据

  // --- Other Data (Fee, Token Info) ---
  const { data: feeDataHook } = useFeeData({ formatUnits: "gwei" });
  const { data: tokenData } = useReadContract({
    ...tokenCoreContract(chain),
    functionName: "totalSupply",
    chainId: chain?.id,
  });

  useEffect(() => {
    if (tokenData) {
      // Assuming tokenData is of a compatible type. Adjust as necessary.
      // This part might need refinement based on actual return type of useReadContract for totalSupply
    }
  }, [chain, tokenData]);

  return (
    <SleepContext.Provider
      value={{
        setChainOverride,
        currentChain: chain,
        feeData: feeDataHook,
        sleepBalance,
        globalRank,
        totalStaked,
        rewardPool,
        sleepRewardPool, // Export new value
        genesisTs,
        token,
        userStakeData: userStakeData,
        // 合约常量
        maxTermDays,
        maxMintCount,
        refetchBalance,
        refetchUserData: refetchUserData as () => void,
        refetchGlobals: refetchGlobals as () => void,
      }}
    >
      {children}
    </SleepContext.Provider>
  );
};

export const useSleepContext = () => {
  const context = useContext(SleepContext);
  if (!context) {
    throw new Error('useSleepContext must be used within a SleepProvider');
  }
  return context;
};
