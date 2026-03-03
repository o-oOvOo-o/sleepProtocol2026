import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'react-hot-toast';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { readContracts, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { formatUnits, parseEther } from 'viem';
import { config } from '~/lib/client';
import { DataCard, CardTitle, Win98Button, Win98Input, Win98Label, StatRow, StatLabel, StatValue } from './index';
import {
  tokenCoreContract,
  tokenAccessPassContract,
  tokenStakingContract,
} from '~/lib/contracts';
import { useStakingStats } from '~/hooks/useSubgraphData';

// New interface for a single deposit record, matching the contract struct
interface DepositRecord {
  amount: bigint;
  shares: bigint;
  timestamp: bigint;
  stakingDays: bigint;
  biggerBenefit: bigint;
  isInfinite: boolean;
  isActive: boolean;
}

// Re-using NFTData interface from Profile for consistency
interface NFTData {
  id: number;
  type: 'access';
  lockedAmount?: string;
  isPermanentLock?: boolean;
  lockStartTime?: string;
  deposits?: DepositRecord[]; // Array of detailed deposit records for this NFT
}

interface PoolPayout {
  poolIndex: number;
  poolName: string;
  periodDays: number;
  daysRemaining: number;
  nextPayout: number;
}

interface SuperDay {
  title: string;
  emoji: string;
  daysRemaining: number;
  pools?: PoolPayout[];
  poolCount: number;
  description: string;
  progress?: number;
}

const dividendPoolNames = {
  0: "6天循环奖池",
  1: "30天循环奖池",
  2: "90天循环奖池",
  3: "360天循环奖池",
  4: "720天循环奖池",
};

const dividendPoolPeriods = {
  0: "6 天",
  1: "30 天",
  2: "90 天",
  3: "360 天",
  4: "720 天",
};

const dividendPoolColors = {
  0: { bg: '#2d5a27', accent: '#4caf50' }, // 绿色 - 6天
  1: { bg: '#1a237e', accent: '#3f51b5' }, // 蓝色 - 30天  
  2: { bg: '#4a148c', accent: '#9c27b0' }, // 紫色 - 90天
  3: { bg: '#bf360c', accent: '#ff5722' }, // 橙红色 - 360天
  4: { bg: '#3e2723', accent: '#8d6e63' }, // 棕色 - 720天
};


// 计算预计奖励和生效时间的辅助函数（移到组件外部）
const calculatePoolEligibility = (poolIndex: number, nfts: NFTData[], dividendPoolsData: any[], totalShares: bigint) => {
  console.log(`[Pool ${poolIndex}] 开始计算`, { 
    nftsCount: nfts.length, 
    poolData: dividendPoolsData[poolIndex] 
  });

  if (!nfts || nfts.length === 0) {
    console.log(`[Pool ${poolIndex}] 无NFT数据`);
    return {
      hasEligibleShares: false,
      hasWaitingShares: false,
      eligibleReward: BigInt(0),
      expectedReward: BigInt(0),
      earliestActivationTime: null,
      daysUntilActivation: 0
    };
  }

  const periodDays = [6, 30, 90, 360, 720][poolIndex];
  const entryWindowDays = Math.floor(periodDays / 3);
  
  let hasEligibleShares = false;
  let hasWaitingShares = false;
  let totalEligibleShares = BigInt(0);
  let totalWaitingShares = BigInt(0);
  let earliestActivationTime: number | null = null;

  console.log(`[Pool ${poolIndex}] 周期：${periodDays}天，生效窗口：${entryWindowDays}天`);

  // 检查所有 NFT 的存款
  for (const nft of nfts) {
    console.log(`[Pool ${poolIndex}] 检查NFT #${nft.id}`, { deposits: nft.deposits?.length || 0 });
    
    if (nft.deposits) {
      for (const deposit of nft.deposits) {
        if (!deposit.isActive) {
          console.log(`[Pool ${poolIndex}] 存款未激活，跳过`);
          continue;
        }

        const now = Math.floor(Date.now() / 1000);
        const depositTime = Number(deposit.timestamp);
        const timeSinceDeposit = now - depositTime;
        const daysAfterDeposit = Math.floor(timeSinceDeposit / 86400);

        console.log(`[Pool ${poolIndex}] 存款详情`, {
          amount: deposit.amount.toString(),
          shares: deposit.shares.toString(),
          depositTime: new Date(depositTime * 1000).toISOString(),
          daysAfterDeposit,
          entryWindowDays,
          isEligible: daysAfterDeposit >= entryWindowDays
        });

        if (daysAfterDeposit >= entryWindowDays) {
          // 已生效
          hasEligibleShares = true;
          totalEligibleShares += deposit.shares;
          console.log(`[Pool ${poolIndex}] 已生效份额:`, deposit.shares.toString());
        } else {
          // 等待生效
          hasWaitingShares = true;
          totalWaitingShares += deposit.shares;
          
          const activationTime = depositTime + (entryWindowDays * 86400);
          if (earliestActivationTime === null || activationTime < earliestActivationTime) {
            earliestActivationTime = activationTime;
          }
          console.log(`[Pool ${poolIndex}] 等待生效份额:`, deposit.shares.toString(), `${Math.ceil((activationTime - now) / 86400)}天后生效`);
        }
      }
    }
  }

  const daysUntilActivation = earliestActivationTime 
    ? Math.max(0, Math.ceil((earliestActivationTime - Date.now() / 1000) / 86400))
    : 0;

  // 获取当前奖池总奖励和总份额来计算预估收益
  const poolData = dividendPoolsData[poolIndex];
  let eligibleReward = BigInt(0);
  let expectedReward = BigInt(0);

  console.log(`[Pool ${poolIndex}] 计算收益`, {
    totalEligibleShares: totalEligibleShares.toString(),
    totalWaitingShares: totalWaitingShares.toString(),
    poolData: poolData?.status
  });

  if (poolData?.status === 'success' && poolData.result) {
    const [totalRewards] = poolData.result as [bigint, bigint, bigint, bigint];
    console.log(`[Pool ${poolIndex}] 奖池总奖励:`, totalRewards.toString());
    
    if (totalRewards > BigInt(0)) {
      console.log(`[Pool ${poolIndex}] 全网总份额:`, totalShares.toString());
      
      if (totalEligibleShares > BigInt(0)) {
        // 🔧 修正：按合约逻辑精确计算
        // 公式：(用户已生效份额 / 全网总份额) * 奖池总奖励
        if (totalShares > BigInt(0)) {
          eligibleReward = (totalRewards * totalEligibleShares) / totalShares;
        } else {
          // 如果全网总份额为0（不应该发生），给全部奖励
          eligibleReward = totalRewards;
        }
        console.log(`[Pool ${poolIndex}] 已生效收益:`, eligibleReward.toString());
      }
      if (totalWaitingShares > BigInt(0)) {
        // 🔧 修正：按合约逻辑精确计算  
        // 公式：(用户等待份额 / 全网总份额) * 奖池总奖励
        if (totalShares > BigInt(0)) {
          expectedReward = (totalRewards * totalWaitingShares) / totalShares;
        } else {
          // 如果全网总份额为0（不应该发生），给全部奖励
          expectedReward = totalRewards;
        }
        console.log(`[Pool ${poolIndex}] 预期收益:`, expectedReward.toString());
      }
    }
  }

  const result = {
    hasEligibleShares,
    hasWaitingShares,
    eligibleReward,
    expectedReward,
    earliestActivationTime,
    daysUntilActivation
  };

  console.log(`[Pool ${poolIndex}] 最终结果:`, result);
  return result;
};

const DividendPoolStats: React.FC<{userNFTs?: NFTData[]}> = ({ userNFTs = [] }) => {
  const { data: dividendPoolsData, isLoading, isError, error } = useReadContracts({
    contracts: Array.from({ length: 5 }, (_, i) => ({
      ...tokenStakingContract(currentChain),
      functionName: 'dividendPools',
      args: [i], // Corresponds to DividendPeriod enum
    })),
  });

  // 添加获取totalShares的合约调用
  const { data: totalSharesData } = useReadContract({
    ...tokenStakingContract(currentChain),
    functionName: 'totalShares',
  });

  if (isLoading) return <div style={{ textAlign: 'center', color: '#666' }}>加载奖池数据中...</div>;
  if (isError) return <div style={{ textAlign: 'center', color: 'red' }}>加载奖池数据失败: {error?.message}</div>;
  if (!dividendPoolsData) return <div style={{ textAlign: 'center', color: '#666' }}>暂无奖池数据。</div>;

  const calculateProgress = (lastDistribution: bigint, periodDays: bigint) => {
    const now = Math.floor(Date.now() / 1000);
    const periodSeconds = Number(periodDays) * 86400;
    const elapsed = now - Number(lastDistribution);
    const progress = Math.min((elapsed / periodSeconds) * 100, 100);
    return Math.max(progress, 0);
  };

  const calculateNextPayout = (lastDistribution: bigint, periodDays: bigint) => {
    const periodSeconds = Number(periodDays) * 86400;
    const nextPayout = Number(lastDistribution) + periodSeconds;
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.max(Math.ceil((nextPayout - now) / 86400), 0);
    return daysRemaining;
  };

  // 计算超级分红日 - 显示三重、四重和超级分红日
  const calculateSuperDividendDays = () => {
    if (!dividendPoolsData) return [];

    const now = Math.floor(Date.now() / 1000);
    const superDays: SuperDay[] = [];
    
    // 获取每个池子的分红信息
    const poolInfo: Record<number, { lastDistribution: number; periodDays: number }> = {};
    
    dividendPoolsData.forEach((poolResult, index) => {
      if (poolResult.status === 'success' && poolResult.result) {
        const [, lastDistribution, periodDays] = poolResult.result as [bigint, bigint, bigint, bigint];
        poolInfo[index] = {
          lastDistribution: Number(lastDistribution),
          periodDays: Number(periodDays)
        };
      }
    });

    // 三重分红日：6天 + 30天 + 90天池 (每90天发生一次)
    if (poolInfo[2]) { // 90天池存在
      const pool90 = poolInfo[2];
      const nextTripleDay = pool90.lastDistribution + pool90.periodDays * 86400;
      const daysUntilTriple = Math.max(Math.ceil((nextTripleDay - now) / 86400), 0);
      const progressTriple = pool90.periodDays > 0 ? 
        Math.min(((now - pool90.lastDistribution) / (pool90.periodDays * 86400)) * 100, 100) : 0;
      
      superDays.push({
        title: '三重奖池分红',
        emoji: '',
        daysRemaining: daysUntilTriple,
        poolCount: 3,
        description: '6天 + 30天 + 90天奖池同步分红',
        progress: Math.max(progressTriple, 0)
      });
    }

    // 四重分红日：6天 + 30天 + 90天 + 360天池 (每360天发生一次)
    if (poolInfo[3]) { // 360天池存在
      const pool360 = poolInfo[3];
      const nextQuadDay = pool360.lastDistribution + pool360.periodDays * 86400;
      const daysUntilQuad = Math.max(Math.ceil((nextQuadDay - now) / 86400), 0);
      const progressQuad = pool360.periodDays > 0 ? 
        Math.min(((now - pool360.lastDistribution) / (pool360.periodDays * 86400)) * 100, 100) : 0;
      
      superDays.push({
        title: '四重奖池分红',
        emoji: '',
        daysRemaining: daysUntilQuad,
        poolCount: 4,
        description: '6天 + 30天 + 90天 + 360天奖池同步分红',
        progress: Math.max(progressQuad, 0)
      });
    }

    // 超级分红日：全部5个池子 (每720天发生一次)
    if (poolInfo[4]) { // 720天池存在
      const pool720 = poolInfo[4];
      const nextSuperDay = pool720.lastDistribution + pool720.periodDays * 86400;
      const daysUntilSuper = Math.max(Math.ceil((nextSuperDay - now) / 86400), 0);
      const progressSuper = pool720.periodDays > 0 ? 
        Math.min(((now - pool720.lastDistribution) / (pool720.periodDays * 86400)) * 100, 100) : 0;
      
      superDays.push({
        title: '全池同步分红',
        emoji: '',
        daysRemaining: daysUntilSuper,
        poolCount: 5,
        description: '全部5个奖池同步分红事件',
        progress: Math.max(progressSuper, 0)
      });
    }

    return superDays.sort((a, b) => a.daysRemaining - b.daysRemaining);
  };

  const superDividendDays = calculateSuperDividendDays();

  return (
    <div>
      {/* 奖池同步分红事件提醒 */}
      {superDividendDays.length > 0 && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          background: '#c0c0c0',
          border: '2px inset #c0c0c0',
          color: '#000000'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '12px',
            textAlign: 'center',
            background: '#000080',
            color: '#ffffff',
            padding: '4px',
            border: '1px outset #c0c0c0'
          }}>
            奖池同步分红事件
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {superDividendDays.map((superDay, index) => (
              <div key={index} style={{
                background: '#f0f0f0',
                border: '1px inset #c0c0c0',
                padding: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#000080' }}>
                        {superDay.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666666' }}>
                        {superDay.description}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#800000' }}>
                      {superDay.daysRemaining === 0 ? '今日执行' : `${superDay.daysRemaining} 天后`}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666666' }}>
                      {superDay.poolCount}个奖池参与
                    </div>
                  </div>
                </div>
                
                {/* 进度条 */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ 
                    background: '#ffffff', 
                    border: '1px inset #c0c0c0',
                    height: '12px'
                  }}>
                    <div style={{ 
                      background: '#0000ff',
                      height: '100%',
                      width: `${superDay.progress || 0}%`
                    }} />
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    textAlign: 'right', 
                    marginTop: '2px', 
                    color: '#666666'
                  }}>
                    周期进度: {(superDay.progress || 0).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ 
            fontSize: '10px', 
            textAlign: 'center', 
            marginTop: '8px',
            color: '#666666',
            border: '1px inset #c0c0c0',
            padding: '4px',
            background: '#ffffff'
          }}>
            提示：多个奖池同步分红时将产生更高收益，请及时参与质押以获得分红份额。
          </div>
        </div>
      )}

      {/* 原有的奖池卡片区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '12px' }}>
        {dividendPoolsData.map((poolResult, index) => {
        if (poolResult.status !== 'success' || !poolResult.result) {
          return (
            <div key={index} style={{ 
              background: '#f5f5f5', 
              border: '2px inset #c0c0c0', 
              borderRadius: '8px', 
              padding: '16px',
              textAlign: 'center',
              color: 'red'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                {dividendPoolNames[index as keyof typeof dividendPoolNames]}
              </div>
              <div>数据加载错误</div>
            </div>
          );
        }

        // The result is a tuple: [totalRewards, lastDistribution, periodDays, allocationPercent]
        const [totalRewards, lastDistribution, periodDays, allocationPercent] = poolResult.result as [bigint, bigint, bigint, bigint];
        const progress = calculateProgress(lastDistribution, periodDays);
        const daysRemaining = calculateNextPayout(lastDistribution, periodDays);
        const colors = dividendPoolColors[index as keyof typeof dividendPoolColors];
        
        // 计算该奖池的份额生效情况
        const poolEligibility = calculatePoolEligibility(index, userNFTs, dividendPoolsData, totalSharesData as bigint || BigInt(0));

        return (
          <div key={index} style={{ 
            background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`,
            border: '2px outset #c0c0c0',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
            position: 'relative',
            minHeight: '160px'
          }}>
            {/* 标题 */}
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              {dividendPoolNames[index as keyof typeof dividendPoolNames]}
            </div>

            {/* 全局奖池金额 */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>全局奖池金额</div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: colors.accent
              }}>
                {parseFloat(formatUnits(totalRewards, 18)).toFixed(4)}
                <span style={{ fontSize: '12px', marginLeft: '4px' }}>OKB</span>
              </div>
            </div>

            {/* 用户预估收益 */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                {poolEligibility.hasEligibleShares ? '当前可分红' : '预计收益'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {poolEligibility.hasEligibleShares ? (
                  <>
                    {parseFloat(formatUnits(poolEligibility.eligibleReward, 18)).toFixed(4)}
                    <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>OKB</span>
                  </>
                ) : poolEligibility.hasWaitingShares ? (
                  <>
                    {parseFloat(formatUnits(poolEligibility.expectedReward, 18)).toFixed(4)}
                    <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>OKB</span>
                  </>
                ) : (
                  <>
                    暂无质押
                    <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>OKB</span>
                  </>
                )}
              </div>
              
              {/* 生效时间提示 */}
              {poolEligibility.hasWaitingShares && poolEligibility.daysUntilActivation > 0 && (
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px', color: colors.accent }}>
                  生效时间：{poolEligibility.daysUntilActivation} 天后
                </div>
              )}
              
              {poolEligibility.hasEligibleShares && poolEligibility.hasWaitingShares && (
                <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                  + 等待生效：{parseFloat(formatUnits(poolEligibility.expectedReward, 18)).toFixed(4)} OKB
                  <br />
                  ({poolEligibility.daysUntilActivation} 天后生效)
                </div>
              )}
            </div>

            {/* 进度条 */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '4px' }}>周期进度</div>
              <div style={{ 
                background: 'rgba(255,255,255,0.2)', 
                borderRadius: '10px', 
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: colors.accent,
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: '10px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ fontSize: '10px', textAlign: 'right', marginTop: '2px', opacity: 0.8 }}>
                {progress.toFixed(0)}%
              </div>
            </div>

            {/* 倒计时 */}
            <div style={{ 
              position: 'absolute',
              bottom: '12px',
              left: '16px',
              right: '16px',
              fontSize: '11px',
              opacity: 0.9
            }}>
              下次分红: {daysRemaining} 天后
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};


export const Stake: React.FC = () => {
  const { t } = useTranslation('common');
  const { address, isConnected } = useAccount();

  const [accessPassNFTs, setAccessPassNFTs] = useState<NFTData[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [expandedNftId, setExpandedNftId] = useState<number | null>(null); // For accordion view

  // States from Profile.tsx moved here
  const [aggregatedStakeData, setAggregatedStakeData] = useState<{ totalStaked: bigint; totalRewards: bigint; }>({ totalStaked: BigInt(0), totalRewards: BigInt(0) });
  const [isLoadingStaking, setIsLoadingStaking] = useState(false);
  
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedNftForStaking, setSelectedNftForStaking] = useState<NFTData | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeStep, setStakeStep] = useState<'idle' | 'approving' | 'staking'>('idle');
  
  // States for unified deposit modal
  const [stakingDays, setStakingDays] = useState('26');
  const [isInfinite, setIsInfinite] = useState(false);

  // Staking transaction hooks
  const { data: stakeTxHash, writeContract: stake, isPending: isStaking, isSuccess: isStakeSuccess, reset: resetStake } = useWriteContract();
  const { data: withdrawTxHash, writeContract: withdraw, isPending: isWithdrawing, isSuccess: isWithdrawSuccess, reset: resetWithdraw } = useWriteContract();
  const [showWithdrawConfirmModal, setShowWithdrawConfirmModal] = useState(false);
  const [withdrawDetails, setWithdrawDetails] = useState<{
    deposit: DepositRecord;
    index: number;
    status: 'Early' | 'Matured' | 'Late';
    penalty: string;
    receivable: string;
  } | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalMessage, setInfoModalMessage] = useState('');


  const { data: sleepBalance, isLoading: isLoadingSleepBalance, refetch: refetchSleepBalance } = useReadContract({
    ...tokenCoreContract(),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const { data: accessPassBalance, refetch: refetchAccessBalance } = useReadContract({
    ...tokenAccessPassContract(currentChain),
    functionName: 'balanceOf', 
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // Fetch user's Access Pass NFTs
  useEffect(() => {
    const fetchUserAccessPasses = async () => {
      if (!address || !isConnected || !accessPassBalance || Number(accessPassBalance) === 0) {
        setAccessPassNFTs([]);
        return;
      }
      setIsLoadingNFTs(true);
      try {
        const balanceNum = Number(accessPassBalance);
        const tokenIdContracts = Array.from({ length: balanceNum }, (_, i) => ({
          ...tokenAccessPassContract(currentChain),
          functionName: 'tokenOfOwnerByIndex',
          args: [address!, BigInt(i)],
        }));
        const tokenIdsResult = await readContracts(config, { contracts: tokenIdContracts });
        const tokenIds = tokenIdsResult.filter(r => r.status === 'success').map(r => r.result as bigint);

        if (tokenIds.length === 0) {
            setAccessPassNFTs([]);
            setIsLoadingNFTs(false);
            return;
        }
        
        // Prepare contract calls for locking info and deposit details
        const lockingInfoContracts = tokenIds.map(tokenId => ({
          ...tokenAccessPassContract(currentChain),
          functionName: 'getLockingInfo',
          args: [tokenId],
        }));
        
        const depositContracts = tokenIds.map(tokenId => ({
            ...tokenStakingContract(currentChain),
            functionName: 'getNftDeposits',
            args: [tokenId],
        }));

        // Fetch both sets of data in parallel
        const [lockingInfosResult, depositsResult] = await Promise.all([
            readContracts(config, { contracts: lockingInfoContracts }),
            readContracts(config, { contracts: depositContracts })
        ]);

        const nftData = tokenIds.map((tokenId, i) => {
          const lockingInfo = lockingInfosResult[i];
          const depositInfo = depositsResult[i];
          
          if (lockingInfo.status !== 'success' || !lockingInfo.result) return null;
          
          const [totalLocked, permanentlyLocked, startTime] = lockingInfo.result as [bigint, bigint, bigint];
          
          let deposits: DepositRecord[] = [];
          if (depositInfo.status === 'success' && depositInfo.result) {
              // The result is an array of structs. We only care about active ones.
              deposits = (depositInfo.result as any[])
                .filter(d => d.isActive)
                .map(d => ({
                    amount: d.amount,
                    shares: d.shares,
                    timestamp: d.timestamp,
                    stakingDays: d.stakingDays,
                    biggerBenefit: d.biggerBenefit,
                    isInfinite: d.isInfinite,
                    isActive: d.isActive,
                }));
          }

          return {
            id: Number(tokenId),
            type: 'access' as const,
            lockedAmount: formatUnits(totalLocked, 18),
            isPermanentLock: Number(permanentlyLocked) > 0,
            lockStartTime: new Date(Number(startTime) * 1000).toLocaleDateString(),
            deposits: deposits,
          } as NFTData;
        }).filter((nft): nft is NFTData => nft !== null);
        
        setAccessPassNFTs(nftData);
      } catch (error) {
        console.error("Error fetching Access Pass NFTs:", error);
      } finally {
        setIsLoadingNFTs(false);
      }
    };
    fetchUserAccessPasses();
  }, [address, isConnected, accessPassBalance]);

  // Fetch and aggregate staking data when NFTs are loaded
  useEffect(() => {
    const fetchStakingData = async () => {
      if (accessPassNFTs.length === 0) {
        setAggregatedStakeData({ totalStaked: BigInt(0), totalRewards: BigInt(0) });
        return;
      }
      setIsLoadingStaking(true);
      // ... (same logic as in Profile.tsx)
      try {
        const stakingContracts = accessPassNFTs.flatMap(nft => [
          { ...tokenStakingContract(currentChain), functionName: 'getNftStakingSummary', args: [BigInt(nft.id)] },
          { ...tokenStakingContract(currentChain), functionName: 'getClaimableRewards', args: [BigInt(nft.id)] }
        ]);
        const results = await readContracts(config, { contracts: stakingContracts });
        let totalStaked = BigInt(0);
        let totalRewards = BigInt(0);
        for (let i = 0; i < accessPassNFTs.length; i++) {
          const summary = results[i * 2]?.result as [bigint, bigint, bigint, bigint] | undefined;
          const rewards = results[i * 2 + 1]?.result as bigint | undefined;
          if (summary) totalStaked += summary[0];
          if (rewards) totalRewards += rewards;
        }
        setAggregatedStakeData({ totalStaked, totalRewards });
      } catch (error) {
        console.error("Error fetching staking data:", error)
      } finally {
        setIsLoadingStaking(false);
      }
    };
    fetchStakingData();
  }, [accessPassNFTs]);
  
  const refreshAllData = useCallback(() => {
    refetchAccessBalance();
    refetchSleepBalance();
    // Fetching NFTs and Staking data will be triggered by useEffects
    toast.success("数据已刷新!");
  }, [refetchAccessBalance, refetchSleepBalance]);
  
  // Staking transaction logic (moved from Profile.tsx)
  useEffect(() => {
    if (isStakeSuccess) {
      toast.success('🎉 存款成功！', { id: 'stake-process' });
      setTimeout(() => {
        refreshAllData();
        closeModal();
      }, 2000);
    }
  }, [isStakeSuccess, refreshAllData]);

  useEffect(() => {
    if (isWithdrawSuccess) {
      toast.success('🎉 取回成功！');
      setTimeout(() => {
        refreshAllData();
        closeModal();
      }, 2000);
    }
  }, [isWithdrawSuccess, refreshAllData]);

  const handleStake = async () => {
    if (!selectedNftForStaking || !stakeAmount || parseFloat(stakeAmount) <= 0) return;
    const amountInWei = parseEther(stakeAmount);
    if ((sleepBalance as bigint | undefined || BigInt(0)) < amountInWei) {
      toast.error('SLEEP 余额不足！');
      return;
    }

    const days = parseInt(stakingDays, 10);
    if (!isInfinite && (isNaN(days) || days < 26 || days > 1500)) {
      toast.error('质押天数必须在 26 到 1500 天之间。');
      return;
    }
    
    let approvalHash: `0x${string}` | undefined = undefined;

    try {
      // Step 1: Approve
      setStakeStep('approving');
      toast.loading('1/2: 正在请求授权，请在钱包中确认...', { id: 'stake-process' });
      
      approvalHash = await writeContract(config, {
        ...tokenCoreContract(),
        functionName: 'approve',
        args: [tokenStakingContract(currentChain).address, amountInWei], // Correct: Approve the Staking contract
      });
      console.log(`🚀 Approval transaction sent. Hash: ${approvalHash}`);
      
      toast.loading('1/2: 等待授权交易确认...', { id: 'stake-process' });

      // Step 2: Wait for Approval Receipt
      const receipt = await waitForTransactionReceipt(config, { hash: approvalHash });
      console.log('✅ Approval transaction confirmed:', receipt);
      
      // Step 3: Call lockTokens (staking)
      toast.success('1/2: 授权成功！', { id: 'stake-process' });
      handleLockTokens();

    } catch (error) {
      console.error('❌ Staking process failed:', error);
      toast.error('操作失败，请重试。', { id: 'stake-process' });
      setStakeStep('idle');
    }
  };
  
  const handleLockTokens = () => {
    if (!selectedNftForStaking || !stakeAmount) return;
    const amountInWei = parseEther(stakeAmount);
    const tokenId = BigInt(selectedNftForStaking.id);
    const days = isInfinite ? BigInt(0) : BigInt(stakingDays);

    setStakeStep('staking');
    toast.loading('2/2: 正在存入代币并设置质押期...', { id: 'stake-process' });
    stake({
      ...tokenAccessPassContract(currentChain),
      functionName: 'lockTokens',
      args: [tokenId, amountInWei, days, isInfinite],
    });
  };

  const closeModal = () => {
    setShowStakeModal(false);
    setStakeAmount('');
    setStakeStep('idle');
    setStakingDays('26'); // Reset to default
    setIsInfinite(false); // Reset to default
    resetStake();
  };

  const getDepositStatus = (deposit: DepositRecord) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (deposit.isInfinite || deposit.stakingDays === BigInt(0)) {
      return { status: 'Infinite', maturityTime: BigInt(0), graceTime: BigInt(0) };
    }
    const stakingPeriodInSeconds = deposit.stakingDays * BigInt(86400);
    const maturityTime = deposit.timestamp + stakingPeriodInSeconds;
    const graceTime = maturityTime + (BigInt(6) * BigInt(86400)); // 6 days grace period
    const halfwayTime = deposit.timestamp + (stakingPeriodInSeconds / BigInt(2));

    if (now < halfwayTime) return { status: 'Immature', maturityTime, graceTime, halfwayTime };
    if (now < maturityTime) return { status: 'Early', maturityTime, graceTime, halfwayTime };
    if (now <= graceTime) return { status: 'Matured', maturityTime, graceTime, halfwayTime };
    return { status: 'Late', maturityTime, graceTime, halfwayTime };
  };

  const handleWithdrawClick = (deposit: DepositRecord, index: number) => {
    const statusInfo = getDepositStatus(deposit);
    
    if (statusInfo.status === 'Immature') {
        const halfwayDate = new Date(Number(statusInfo.halfwayTime) * 1000).toLocaleDateString();
        const fullMaturityDate = new Date(Number(statusInfo.maturityTime) * 1000).toLocaleDateString();
        const message = (
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: '#000080', borderBottom: '1px solid #c0c0c0', paddingBottom: '8px' }}>取回规则说明</h4>
            <p style={{ margin: '0 0 10px 0' }}>为了保护所有质押者的利益并维持协议的稳定性，取回存款遵循以下规则：</p>
            <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
              <li style={{ marginBottom: '10px' }}>
                <strong>锁定期:</strong> 每笔存款都必须至少锁定其质押期限的 <strong>50%</strong> 时间。
                <br />
                <em style={{ color: '#721c24' }}>您的这笔存款大约在 {halfwayDate} 之后才满足此条件。</em>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>提前取回 (50% ~ 100% 期限内):</strong>
                <br />
                一旦满足锁定期，您可以选择提前取回，但这将产生 <strong>55% 的固定罚金</strong>。您必须一次性取回该笔存款的全部金额。
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>到期取回 ({fullMaturityDate} 之后):</strong>
                <br />
                当存款完全到期后，您可以取回 <strong>100% 的本金，没有任何罚金</strong>。同样，您必须一次性取回该笔存款的全部金额。
              </li>
            </ul>
            <p style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #c0c0c0', fontSize: '11px', color: '#666' }}>
              <strong>为什么有罚金?</strong> 您在承诺质押一个特定期限时，协议会立即给予您基于该期限的 APY 加成 (LongerPaysMore)。提前取回是对该承诺的违背，因此罚金机制是必要的，以确保对所有长期质押者的公平性。
            </p>
          </div>
        );
        setInfoModalMessage(message as any); // Allow JSX element
        setShowInfoModal(true);
    } else {
        initiateWithdrawal(deposit, index);
    }
  };

  const initiateWithdrawal = (deposit: DepositRecord, index: number) => {
    const statusInfo = getDepositStatus(deposit);
    let penalty = "0%";
    let receivable = parseFloat(formatUnits(deposit.amount, 18));

    if (statusInfo.status === 'Early') {
      penalty = "55%";
      receivable = receivable * 0.45;
    } else if (statusInfo.status === 'Late') {
      const secondsOverdue = BigInt(Math.floor(Date.now() / 1000)) - statusInfo.graceTime;
      const daysOverdue = secondsOverdue / BigInt(86400);
      let penaltyPercent = Number(daysOverdue * BigInt(145)); // 1.45% per day in basis points
      if (penaltyPercent > 9600) penaltyPercent = 9600; // Cap at 96%
      
      penalty = `${(penaltyPercent / 100).toFixed(2)}%`;
      receivable = receivable * (1 - penaltyPercent / 10000);
    }
    
    setWithdrawDetails({
      deposit,
      index,
      status: statusInfo.status as 'Early' | 'Matured' | 'Late',
      penalty,
      receivable: receivable.toFixed(6)
    });
    setShowWithdrawConfirmModal(true);
  };

  const confirmWithdrawal = () => {
    if (!withdrawDetails || !selectedNftForStaking) return;

    toast.loading(`正在请求取回存款 #${withdrawDetails.index}...`, { id: 'withdraw-process' });

    withdraw({
        ...tokenAccessPassContract(currentChain),
        functionName: 'deregisterDeposit',
        args: [
            BigInt(selectedNftForStaking.id),
            BigInt(withdrawDetails.index)
        ],
    });
    
    setShowWithdrawConfirmModal(false);
    setWithdrawDetails(null);
  };


  const handleWithdraw = (depositIndex: number) => {
    if (!selectedNftForStaking) return;

    // We pass the exact deposit index to the contract
    toast.loading(`正在请求取回存款 #${depositIndex}...`, { id: 'withdraw-process' });

    withdraw({
        ...tokenAccessPassContract(currentChain),
        functionName: 'deregisterDeposit',
        args: [
            BigInt(selectedNftForStaking.id),
            BigInt(depositIndex)
        ],
    });
  };


  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        {t('sleepProtocol.profile.connectWallet')}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#000080', margin: 0 }}>质押管理</h2>
        <Win98Button onClick={refreshAllData}>🔄 刷新数据</Win98Button>
      </div>

      {/* Staking Pool Stats */}
      <DataCard style={{ marginBottom: '20px' }}>
        <CardTitle>分红奖池总览 (实时)</CardTitle>
        <DividendPoolStats userNFTs={accessPassNFTs} />
      </DataCard>

      {/* Aggregated Staking Info */}
      <DataCard style={{ marginBottom: '20px' }}>
        <CardTitle>我的总质押概览</CardTitle>
        <div style={{ padding: '12px', background: '#f0f0f0', border: '1px inset #c0c0c0' }}>
          {isLoadingStaking ? (
            <div style={{ textAlign: 'center', color: '#666' }}>正在计算总质押数据...</div>
          ) : (
            <>
              <StatRow>
                <StatLabel>总质押额 (所有通行证)</StatLabel>
                <StatValue>{formatUnits(aggregatedStakeData.totalStaked, 18)} SLEEP</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>待领总奖励 (所有通行证)</StatLabel>
                <StatValue>{formatUnits(aggregatedStakeData.totalRewards, 18)} OKB</StatValue>
              </StatRow>
            </>
          )}
        </div>
      </DataCard>

      {/* Individual Access Pass NFTs */}
      <DataCard>
        <CardTitle>我的通行证 (Access Pass)</CardTitle>
        {isLoadingNFTs ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>正在加载您的通行证...</div>
        ) : accessPassNFTs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>您还没有铸造 Access Pass。请先前往 Access Pass 页面铸造。</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '16px' }}>
            {accessPassNFTs.map(nft => {
              const isExpanded = expandedNftId === nft.id;
              return (
              <div key={nft.id} style={{ border: '2px outset #c0c0c0', padding: '0', background: '#fff' }}>
                <div 
                  style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#ddd' : '#f0f0f0' }}
                  onClick={() => setExpandedNftId(isExpanded ? null : nft.id)}
                >
                  <h4 style={{ margin: 0, color: '#4ecdc4' }}>
                    {isExpanded ? '▼' : '►'} Access Pass #{nft.id}
                  </h4>
                  <div style={{ fontSize: '11px', textAlign: 'right' }}>
                    <div>总计: <strong>{nft.lockedAmount} SLEEP</strong></div>
                    <div style={{ color: '#666' }}>{nft.deposits?.length || 0} 笔存款</div>
                  </div>
                </div>

                {/* Expanded View: Deposit Details */}
                {isExpanded && (
                  <div style={{ padding: '12px', borderTop: '2px inset #c0c0c0', background: '#fafafa' }}>
                    {nft.deposits && nft.deposits.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', background: '#c0c0c0' }}>
                            <th style={{ padding: '4px' }}>金额</th>
                            <th style={{ padding: '4px' }}>期限</th>
                            <th style={{ padding: '4px' }}>状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nft.deposits.map((deposit, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ padding: '4px' }}>{formatUnits(deposit.amount, 18)}</td>
                              <td style={{ padding: '4px' }}>{deposit.stakingDays.toString()} 天</td>
                              <td style={{ padding: '4px', fontWeight: 'bold', color: deposit.isInfinite ? '#800080' : '#008000' }}>
                                {deposit.isInfinite ? '无限期' : '进行中'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ color: '#666', textAlign: 'center', padding: '8px' }}>此通行证下无有效存款记录。</div>
                    )}
                    <Win98Button
                      style={{ width: '100%', marginTop: '12px', background: '#4ecdc4', color: 'white' }}
                      onClick={() => { setSelectedNftForStaking(nft); setShowStakeModal(true); }}
                    >
                      管理此通行证的质押
                    </Win98Button>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </DataCard>

      {/* Manage Stake Modal */}
      {showStakeModal && selectedNftForStaking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <DataCard style={{ width: '500px', maxWidth: '90vw', padding: '0' }}>
            <div style={{ background: '#000080', color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>管理 Access Pass #{selectedNftForStaking.id} 质押</span>
              <Win98Button onClick={closeModal} style={{ padding: '4px 8px' }}>✕</Win98Button>
            </div>
            
            <div style={{ padding: '16px' }}>
              {/* Section 1: Deposit New Tokens */}
              <fieldset style={{ border: '1px solid #c0c0c0', padding: '12px', marginBottom: '16px' }}>
                <legend style={{ color: '#000080', fontWeight: 'bold' }}>存入新代币并设置质押期</legend>
                <div style={{ padding: '8px', background: '#f0f0f0', border: '1px inset #c0c0c0', marginBottom: '12px' }}>
                  <StatRow>
                    <StatLabel>可用 SLEEP 余额:</StatLabel>
                    <StatValue>{isLoadingSleepBalance ? '...' : `${formatUnits((sleepBalance as bigint | undefined) || BigInt(0), 18)} SLEEP`}</StatValue>
                  </StatRow>
                </div>
                
                {/* Amount Input */}
                <Win98Label htmlFor="stake-amount">存款金额</Win98Label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', marginBottom: '12px' }}>
                  <Win98Input id="stake-amount" type="number" placeholder="输入数量" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} style={{ flex: 1 }} />
                  <Win98Button onClick={() => setStakeAmount(formatUnits((sleepBalance as bigint | undefined) || BigInt(0), 18))}>最大</Win98Button>
                </div>
                
                {/* Staking Period Input */}
                <Win98Label htmlFor="staking-days">质押天数 (26-1500 天)</Win98Label>
                <Win98Input
                  id="staking-days"
                  type="number"
                  value={stakingDays}
                  onChange={(e) => setStakingDays(e.target.value)}
                  disabled={isInfinite}
                  style={{ width: '100%', marginTop: '4px', marginBottom: '12px' }}
                />

                {/* Infinite Stake Checkbox */}
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id="infinite-stake-checkbox"
                    checked={isInfinite}
                    onChange={(e) => setIsInfinite(e.target.checked)}
                  />
                  <Win98Label htmlFor="infinite-stake-checkbox" style={{ marginLeft: '8px', fontWeight: 'bold', color: '#800080' }}>
                    开启无限期质押 (代币将被销毁以换取永久分红权)
                  </Win98Label>
                </div>

                 <Win98Button
                  style={{ width: '100%', padding: '10px', background: '#008000', color: 'white' }}
                  disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || stakeStep !== 'idle'}
                  onClick={handleStake}
                >
                  {stakeStep === 'idle' && `授权并存入 ${stakeAmount || '...'} SLEEP`}
                  {stakeStep === 'approving' && '1/2: 等待授权...'}
                  {stakeStep === 'staking' && '2/2: 等待存入...'}
                </Win98Button>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                  存款分为两步：1. 授权 2. 存入。请在钱包中依次确认两次交易。
                </div>
              </fieldset>

              {/* Section 2: Manage Existing Deposits */}
              <fieldset style={{ border: '1px solid #c0c0c0', padding: '12px' }}>
                <legend style={{ color: '#000080', fontWeight: 'bold' }}>管理现有存款</legend>
                {selectedNftForStaking.deposits && selectedNftForStaking.deposits.length > 0 ? (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px inset #c0c0c0', padding: '8px', background: '#fff' }}>
                    {selectedNftForStaking.deposits.map((deposit, index) => (
                      <div key={index} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{formatUnits(deposit.amount, 18)} SLEEP</div>
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            期限: {deposit.isInfinite ? '无限期' : `${deposit.stakingDays.toString()} 天`} | 状态: {deposit.isInfinite ? '永久' : '进行中'}
                          </div>
                        </div>
                        <Win98Button 
                          onClick={() => handleWithdrawClick(deposit, index)}
                          disabled={deposit.isInfinite || isWithdrawing}
                          style={{ 
                            fontSize: '10px', 
                            padding: '4px 8px',
                            background: 
                              getDepositStatus(deposit).status === 'Matured' ? '#008000' : 
                              getDepositStatus(deposit).status === 'Early' ? '#ff9500' : 
                              getDepositStatus(deposit).status === 'Late' ? '#c00000' : 
                              '#c0c0c0',
                            color: 'white',
                            cursor: (deposit.isInfinite || isWithdrawing) ? 'not-allowed' : 'pointer',
                          }}
                          title={
                            getDepositStatus(deposit).status === 'Immature' ? `点击查看取回规则` : 
                            getDepositStatus(deposit).status === 'Early' ? '可提前取回 (有惩罚)' :
                            getDepositStatus(deposit).status === 'Matured' ? '已到期，可安全取回' :
                            getDepositStatus(deposit).status === 'Late' ? '已逾期，取回有惩罚' :
                            '取回'
                          }
                        >
                          {isWithdrawing ? '处理中...' : (deposit.isInfinite ? '无法取回' : '取回')}
                        </Win98Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#666', textAlign: 'center', padding: '8px' }}>无现有存款可管理。</div>
                )}
              </fieldset>
            </div>
          </DataCard>
        </div>
      )}

      {/* Information Modal for Immature Stakes */}
      {showInfoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1002 }}>
          <DataCard style={{ width: '500px', maxWidth: '90vw' }}>
            <CardTitle>重要提示</CardTitle>
            <div style={{ padding: '20px', fontSize: '12px', lineHeight: '1.6' }}>
              {infoModalMessage}
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Win98Button onClick={() => setShowInfoModal(false)}>
                  我明白了
                </Win98Button>
              </div>
            </div>
          </DataCard>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {showWithdrawConfirmModal && withdrawDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <DataCard style={{ width: '450px', maxWidth: '90vw' }}>
            <CardTitle>取回存款确认</CardTitle>
            <div style={{ padding: '16px' }}>
              {withdrawDetails.status === 'Early' && (
                <div style={{ background: '#fff3cd', color: '#856404', padding: '12px', border: '1px solid #ffeeba', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>⚠️ 提前取回警告</h4>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    您的存款尚未到期。提前取回将导致 <strong>{withdrawDetails.penalty}</strong> 的罚金。
                  </p>
                </div>
              )}
              {withdrawDetails.status === 'Matured' && (
                <div style={{ background: '#d4edda', color: '#155724', padding: '12px', border: '1px solid #c3e6cb', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>✅ 安全取回</h4>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    您的存款已到期，可以无罚金取回。
                  </p>
                </div>
              )}
               {withdrawDetails.status === 'Late' && (
                <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px', border: '1px solid #f5c6cb', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>⏰ 逾期取回通知</h4>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    您的存款已逾期，取回将产生约 <strong>{withdrawDetails.penalty}</strong> 的罚金。
                  </p>
                </div>
              )}
              
              <StatRow>
                <StatLabel>原始存款:</StatLabel>
                <StatValue>{formatUnits(withdrawDetails.deposit.amount, 18)} SLEEP</StatValue>
              </StatRow>
               <StatRow>
                <StatLabel>罚金:</StatLabel>
                <StatValue>{withdrawDetails.penalty}</StatValue>
              </StatRow>
              <hr style={{ margin: '8px 0', borderColor: '#c0c0c0' }} />
               <StatRow style={{ fontWeight: 'bold', fontSize: '14px' }}>
                <StatLabel>预计可收到:</StatLabel>
                <StatValue>{withdrawDetails.receivable} SLEEP</StatValue>
              </StatRow>

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <Win98Button onClick={() => setShowWithdrawConfirmModal(false)} style={{ flex: 1 }}>取消</Win98Button>
                <Win98Button 
                  onClick={confirmWithdrawal}
                  disabled={isWithdrawing}
                  style={{ flex: 2, background: '#c00000', color: 'white' }}
                >
                  {isWithdrawing ? '处理中...' : '确认取回'}
                </Win98Button>
              </div>
            </div>
          </DataCard>
        </div>
      )}
    </div>
  );
};

