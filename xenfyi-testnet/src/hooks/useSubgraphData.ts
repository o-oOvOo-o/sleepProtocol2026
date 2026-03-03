import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

// Subgraph GraphQL 端点
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/sleep-protocol';

// GraphQL 查询函数
async function querySubgraph(query: string, variables: Record<string, any> = {}) {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Subgraph query error:', error);
    throw error;
  }
}

// 用户铸币数据接口
export interface SubgraphUserMintData {
  totalMints: number;
  activeMints: number;
  maturedMints: number;
  mintingNFTs: Array<{
    id: string;
    tokenId: string;
    owner: string;
    term: string;
    maturityTs: string;
    rank: string;
    amplifier: string;
    count: string;
    isMatured: boolean;
    isClaimed: boolean;
    mintedAt: string;
  }>;
  claimEvents: Array<{
    id: string;
    tokenId: string;
    rewardAmount: string;
    penaltyAmount: string;
    claimedAt: string;
  }>;
}

// 用户质押数据接口
export interface SubgraphUserStakeData {
  totalStaked: string;
  activeDeposits: number;
  accessPassNFTs?: Array<{
    id: string;
    tokenId: string;
    owner: string;
    totalAmount: string;
    depositCount: number;
    activeDeposits: number;
    totalShares: string;
    claimableRewards: string;
    totalRewardsClaimed: string;
    createdAt: string;
  }>;
  stakingDeposits: Array<{
    id: string;
    amount: string;
    shares: string;
    stakingDays: string;
    maturityTs: string;
    depositedAt: string;
    shareRate: string;
    longerPaysMoreBonus: number;
    biggerBenefitBonus: number;
  }>;
  dividendDistributions: Array<{
    id: string;
    amount: string;
    period: string;
    distributedAt: string;
  }>;
}

// 协议统计数据接口
export interface SubgraphProtocolStats {
  globalStats: {
    id: string;
    globalRank: string;
    totalMinted: string;
    totalClaimed: string;
    totalLiquidated: string;
    totalStaked: string;
  } | null;
  treasuryStats: {
    id: string;
    totalRevenue: string;
    totalDistributed: string;
    currentEpoch: string;
  } | null;
  marketStats: {
    id: string;
    totalVolume: string;
    totalSales: string;
    mintingNFTListings: string;
    accessPassListings: string;
    avgMintingNFTPrice: string;
    avgAccessPassPrice: string;
  } | null;
}

// 市场数据接口
export interface SubgraphMarketData {
  activeListings: Array<{
    id: string;
    tokenId: string;
    nftType: string;
    seller: string;
    price: string;
    listedAt: string;
  }>;
  recentSales: Array<{
    id: string;
    tokenId: string;
    nftType: string;
    seller: string;
    buyer: string;
    price: string;
    timestamp: string;
  }>;
}

// 用户铸币数据 Hook
export function useUserMintData() {
  const { address } = useAccount();
  const [data, setData] = useState<SubgraphUserMintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!address) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const query = `
        query GetUserMintData($userAddress: String!) {
          mintingPositionNFTs(where: { owner: $userAddress }) {
            id
            tokenId
            owner
            term
            maturityTs
            rank
            amplifier
            count
            isMatured
            isClaimed
            mintedAt
          }
          claimEvents(where: { originalOwner: $userAddress }) {
            id
            tokenId
            rewardAmount
            penaltyAmount
            claimedAt
          }
        }
      `;

      const result = await querySubgraph(query, { userAddress: address.toLowerCase() });
      
      const mintingNFTs = result.mintingPositionNFTs || [];
      const claimEvents = result.claimEvents || [];
      
      const totalMints = mintingNFTs.length;
      const activeMints = mintingNFTs.filter((nft: any) => !nft.isClaimed).length;
      const maturedMints = mintingNFTs.filter((nft: any) => nft.isMatured && !nft.isClaimed).length;

      setData({
        totalMints,
        activeMints,
        maturedMints,
        mintingNFTs,
        claimEvents,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [address]);

  return { data, loading, error, refetch: fetchData };
}

// 用户质押数据 Hook
export function useUserStakeData() {
  const { address } = useAccount();
  const [data, setData] = useState<SubgraphUserStakeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!address) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const query = `
        query GetUserStakeData($userAddress: String!) {
          accessPassNFTs(where: { owner: $userAddress }) {
            id
            tokenId
            owner
            totalAmount
            depositCount
            activeDeposits
            totalShares
            claimableRewards
            totalRewardsClaimed
            createdAt
          }
          stakingDeposits(where: { accessPass_: { owner: $userAddress } }) {
            id
            amount
            shares
            stakingDays
            maturityTs
            depositedAt
            shareRate
            longerPaysMoreBonus
            biggerBenefitBonus
          }
        }
      `;

      const result = await querySubgraph(query, { userAddress: address.toLowerCase() });
      
      const accessPassNFTs = result.accessPassNFTs || [];
      const stakingDeposits = result.stakingDeposits || [];
      
      // 计算总质押金额（从AccessPass NFTs）
      const totalStaked = accessPassNFTs
        .reduce((sum: bigint, nft: any) => sum + BigInt(nft.totalAmount), 0n)
        .toString();
      
      const activeDeposits = stakingDeposits.length;

      setData({
        totalStaked,
        activeDeposits,
        accessPassNFTs,
        stakingDeposits,
        dividendDistributions: [], // 暂时为空，等后续实现
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [address]);

  return { data, loading, error, refetch: fetchData };
}

// 协议统计数据 Hook
export function useProtocolStats() {
  const [data, setData] = useState<SubgraphProtocolStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const query = `
        query GetProtocolStats {
          globalStats(first: 1) {
            id
            globalRank
            totalMinted
            totalClaimed
            totalLiquidated
            totalStaked
          }
          treasuryStats(first: 1) {
            id
            totalRevenue
            totalDistributed
            currentEpoch
          }
          marketStats(first: 1) {
            id
            totalVolume
            totalSales
            mintingNFTListings
            accessPassListings
            avgMintingNFTPrice
            avgAccessPassPrice
          }
        }
      `;

      const result = await querySubgraph(query);
      
      setData({
        globalStats: result.globalStats?.[0] || null,
        treasuryStats: result.treasuryStats?.[0] || null,
        marketStats: result.marketStats?.[0] || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // 每30秒刷新一次协议统计数据
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
}

// Staking Stats 数据接口
export interface SubgraphStakingStats {
  id: string;
  totalAccessPasses: string;
  totalStakedAmount: string;
  totalActiveDeposits: number;
  totalShares: string;
  totalDividendsDistributed: string;
  currentShareRate: string;
  lastUpdated: string;
}

// 质押池统计数据 Hook
export function useStakingStats() {
  const [data, setData] = useState<SubgraphStakingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const query = `
        query GetStakingStats {
          stakingStats(id: "1") {
            id
            totalAccessPasses
            totalStakedAmount
            totalActiveDeposits
            totalShares
            totalDividendsDistributed
            currentShareRate
            lastUpdated
          }
        }
      `;

      const result = await querySubgraph(query);
      
      if (result && result.stakingStats) {
        setData(result.stakingStats);
      } else {
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // 每30秒刷新一次
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
}

// 市场数据 Hook
export function useMarketData() {
  const [data, setData] = useState<SubgraphMarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const query = `
        query GetMarketData {
          marketListings(where: { active: true }, first: 20, orderBy: listedAt, orderDirection: desc) {
            id
            tokenId
            nftType
            seller
            price
            listedAt
          }
          marketSales(first: 10, orderBy: timestamp, orderDirection: desc) {
            id
            tokenId
            nftType
            seller
            buyer
            price
            timestamp
          }
        }
      `;

      const result = await querySubgraph(query);
      
      setData({
        activeListings: result.marketListings || [],
        recentSales: result.marketSales || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // 每15秒刷新一次市场数据
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
}

// 用户NFT listing状态 Hook
export function useUserListings() {
  const { address } = useAccount();
  const [data, setData] = useState<Array<{
    id: string;
    tokenId: string;
    nftType: 'MINTING_POSITION' | 'ACCESS_PASS';
    seller: string;
    price: string;
    active: boolean;
    listedAt: string;
  }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!address) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const query = `
        query GetUserListings($userAddress: String!) {
          marketListings(where: { seller: $userAddress, active: true }) {
            id
            tokenId
            nftType
            seller
            price
            active
            listedAt
          }
        }
      `;

      const result = await querySubgraph(query, { userAddress: address.toLowerCase() });
      
      setData(result.marketListings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [address]);

  return { data, loading, error, refetch: fetchData };
}
