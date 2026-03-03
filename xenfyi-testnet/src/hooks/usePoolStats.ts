import { useState, useEffect } from 'react';
import { useReadContracts, usePublicClient } from 'wagmi';
import { formatEther, formatUnits } from 'viem';
import { protocolPoolContract, communityPoolContract, tokenTreasuryContract } from '~/lib/contracts';

export interface PoolStats {
  // 24h Volume (in OKB)
  volume24h: {
    total: bigint;
    protocolPool: bigint;
    communityPool: bigint;
  };
  
  // Buy & Burn Stats
  buyAndBurn: {
    totalBurned: bigint;
    totalOkbSpent: bigint;
    burnCount: number;
    lastBurnAmount: bigint;
    lastBurnTime: number;
  };
  
  // Pool Performance
  fees24h: {
    total: bigint;
    protocolPool: bigint;
    communityPool: bigint;
  };
  
  isLoading: boolean;
  error: any;
}

export function usePoolStats(): PoolStats {
  const [volume24h, setVolume24h] = useState({
    total: 0n,
    protocolPool: 0n,
    communityPool: 0n,
  });
  
  const [buyAndBurn, setBuyAndBurn] = useState({
    totalBurned: 0n,
    totalOkbSpent: 0n,
    burnCount: 0,
    lastBurnAmount: 0n,
    lastBurnTime: 0,
  });
  
  const [fees24h, setFees24h] = useState({
    total: 0n,
    protocolPool: 0n,
    communityPool: 0n,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  
  const publicClient = usePublicClient();

  // Get basic treasury stats
  const { data: treasuryData, isLoading: treasuryLoading } = useReadContracts({
    contracts: [
      // Get treasury balance (for buy & burn calculations)
      {
        ...tokenTreasuryContract(),
        functionName: 'getBalance',
      },
      // Get total revenue collected
      {
        ...tokenTreasuryContract(),
        functionName: 'totalRevenue',
      },
    ],
  });

  // Fetch 24h volume and burn stats from events
  useEffect(() => {
    const fetchStats = async () => {
      if (!publicClient) return;
      
      try {
        setIsLoading(true);
        
        // Calculate 24h ago block (approximately)
        const currentBlock = await publicClient.getBlockNumber();
        const blocksPerDay = 43200n; // Assuming 2 second block time
        const fromBlock = currentBlock - blocksPerDay;
        
        console.log('🔍 Fetching pool stats from block', fromBlock, 'to', currentBlock);
        
        // Fetch swap events from both pools for 24h volume
        const [protocolSwapLogs, communitySwapLogs] = await Promise.all([
          // Protocol Pool (V2) Swap events
          publicClient.getLogs({
            address: protocolPoolContract().address,
            event: {
              type: 'event',
              name: 'Swap',
              inputs: [
                { name: 'sender', type: 'address', indexed: true },
                { name: 'amount0In', type: 'uint256', indexed: false },
                { name: 'amount1In', type: 'uint256', indexed: false },
                { name: 'amount0Out', type: 'uint256', indexed: false },
                { name: 'amount1Out', type: 'uint256', indexed: false },
                { name: 'to', type: 'address', indexed: true },
              ],
            },
            fromBlock,
            toBlock: 'latest',
          }).catch(() => []),
          
          // Community Pool (V4) Swap events
          publicClient.getLogs({
            address: communityPoolContract().address,
            event: {
              type: 'event',
              name: 'SwapV4',
              inputs: [
                { name: 'sender', type: 'address', indexed: true },
                { name: 'recipient', type: 'address', indexed: true },
                { name: 'amount0', type: 'int256', indexed: false },
                { name: 'amount1', type: 'int256', indexed: false },
                { name: 'sqrtPriceX96', type: 'uint160', indexed: false },
                { name: 'liquidity', type: 'uint128', indexed: false },
                { name: 'tick', type: 'int24', indexed: false },
              ],
            },
            fromBlock,
            toBlock: 'latest',
          }).catch(() => []),
        ]);

        // Calculate volume from swap events (in OKB)
        let protocolVolumeOkb = 0n;
        let communityVolumeOkb = 0n;

        console.log('📊 Protocol swap logs:', protocolSwapLogs.length);
        console.log('📊 Community swap logs:', communitySwapLogs.length);

        // Process Protocol Pool swaps
        for (const log of protocolSwapLogs) {
          if (log.args) {
            const { amount0In, amount1In, amount0Out, amount1Out } = log.args as any;
            // Assuming token1 is OKB, calculate OKB volume
            const okbVolume = (amount1In || 0n) + (amount1Out || 0n);
            protocolVolumeOkb += okbVolume;
          }
        }

        // Process Community Pool swaps
        for (const log of communitySwapLogs) {
          if (log.args) {
            const { amount1 } = log.args as any;
            // For V4, amount1 represents OKB amount (can be negative)
            const okbVolume = amount1 < 0 ? -amount1 : amount1;
            communityVolumeOkb += okbVolume;
          }
        }

        setVolume24h({
          protocolPool: protocolVolumeOkb,
          communityPool: communityVolumeOkb,
          total: protocolVolumeOkb + communityVolumeOkb,
        });

        // Fetch burn events from Treasury
        const burnLogs = await publicClient.getLogs({
          address: tokenTreasuryContract().address,
          event: {
            type: 'event',
            name: 'TokensBurned',
            inputs: [
              { name: 'amount', type: 'uint256', indexed: false },
              { name: 'okbSpent', type: 'uint256', indexed: false },
            ],
          },
          fromBlock: 0n, // Get all burn events
          toBlock: 'latest',
        }).catch(() => []);

        console.log('🔥 Burn logs found:', burnLogs.length);

        // Calculate burn stats
        let totalBurned = 0n;
        let totalOkbSpent = 0n;
        let lastBurnAmount = 0n;
        let lastBurnTime = 0;

        for (const log of burnLogs) {
          if (log.args) {
            const { amount, okbSpent } = log.args as any;
            totalBurned += amount || 0n;
            totalOkbSpent += okbSpent || 0n;
            lastBurnAmount = amount || 0n;
            
            // Get block timestamp for last burn
            if (log.blockNumber) {
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
              lastBurnTime = Number(block.timestamp);
            }
          }
        }

        setBuyAndBurn({
          totalBurned,
          totalOkbSpent,
          burnCount: burnLogs.length,
          lastBurnAmount,
          lastBurnTime,
        });

        // Calculate fees (0.3% of volume)
        const protocolFees = protocolVolumeOkb * 3n / 1000n;
        const communityFees = communityVolumeOkb * 3n / 1000n;
        
        setFees24h({
          protocolPool: protocolFees,
          communityPool: communityFees,
          total: protocolFees + communityFees,
        });

        console.log('✅ Pool stats updated:', {
          volume24h: { total: protocolVolumeOkb + communityVolumeOkb },
          burnCount: burnLogs.length,
          totalBurned: totalBurned.toString(),
        });

      } catch (err) {
        console.error('获取池子统计失败:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [publicClient]);

  return {
    volume24h,
    buyAndBurn,
    fees24h,
    isLoading: isLoading || treasuryLoading,
    error,
  };
}

// Utility functions for formatting
export const formatOKBVolume = (value: bigint) => formatEther(value);
export const formatSLEEPINGAmount = (value: bigint) => formatUnits(value, 18);
