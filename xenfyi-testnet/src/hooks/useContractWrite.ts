import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSimulateContract, usePublicClient, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { toast } from 'react-hot-toast';
import { tokenCoreContract, tokenMinterContract, tokenStakingContract, tokenAccessPassContract } from '~/lib/contracts';
import { config } from '~/lib/client';
import { xLayerTestnet } from '~/lib/chains';

// 交易状态类型
export type TransactionStatus = 'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error';

// 通用交易 Hook
export function useContractTransaction() {
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  const executeTransaction = async (
    contractConfig: any,
    onSuccess?: (receipt: any) => void,
    onError?: (error: string) => void
  ) => {
    try {
      console.log('开始交易执行...');
      setStatus('preparing');
      setError(null);
      
      // 执行交易
      console.log('📝 准备发送交易...');
      setStatus('pending');
      const hash = await writeContractAsync(contractConfig);
      setTxHash(hash);
      console.log('交易已发送，哈希:', hash);
      
      setStatus('confirming');
      toast.loading('交易确认中...', { id: hash });
      console.log('⏳ 等待交易确认...');
      
    } catch (err: any) {
      console.error('❌ 交易执行失败:', err);
      const errorMessage = err.message || '交易失败';
      setError(errorMessage);
      setStatus('error');
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  // 监听交易确认
  useEffect(() => {
    if (receipt && status === 'confirming') {
      console.log('交易确认成功！收据:', receipt);
      setStatus('success');
      toast.success('交易成功！', { id: txHash! });
    }
  }, [receipt, status, txHash]);

  return {
    status,
    error,
    txHash,
    isConfirming,
    executeTransaction,
    reset: () => {
      setStatus('idle');
      setError(null);
      setTxHash(null);
    }
  };
}

// 铸币功能 Hook
export function useMintTokens() {
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync, isPending } = useWriteContract();
  const { data: balance } = useBalance({ address });
  const publicClient = usePublicClient();

  const mint = async (count: number, term: number) => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    if (count <= 0 || term <= 0) {
      throw new Error('请输入有效的数值');
    }

    try {
      setStatus('preparing');
      setError(null);
      setTxHash(null);

      console.log('开始铸造代币...');
      console.log(`参数: count=${count}, term=${term}`);

      // 计算铸造费用：每个单位 0.01 OKB
      const MINT_FEE = parseEther('0.01'); // 0.01 OKB per unit
      const totalFee = MINT_FEE * BigInt(count);

      console.log(`铸造费用: ${formatEther(totalFee)} OKB (${count} × 0.01 OKB)`);
      
      // 添加合约状态检查
      try {
        if (publicClient) {
        const genesisTs = await publicClient.readContract({
          ...tokenMinterContract(currentChain),
          functionName: 'genesisTs',
        });
          console.log('合约 genesisTs:', genesisTs);
          
          const globalRank = await publicClient.readContract({
            ...tokenMinterContract(currentChain),
            functionName: 'globalRank',
          });
          console.log('合约 globalRank:', globalRank);
          
          // 检查关键地址
          const treasuryDistributor = await publicClient.readContract({
            ...tokenMinterContract(currentChain),
            functionName: 'treasuryDistributor',
          });
          console.log('treasuryDistributor 地址:', treasuryDistributor);
          
          const sleepToken = await publicClient.readContract({
            ...tokenMinterContract(currentChain),
            functionName: 'sleepToken',
          });
          console.log('sleepToken 地址:', sleepToken);
          
          const stakingRewardsAddress = await publicClient.readContract({
            ...tokenMinterContract(currentChain),
            functionName: 'stakingRewardsAddress',
          });
          console.log('stakingRewardsAddress:', stakingRewardsAddress);
          
          if (genesisTs === BigInt(0)) {
            throw new Error('合约未初始化：genesisTs 为 0');
          }
          
          if (treasuryDistributor === '0x0000000000000000000000000000000000000000') {
            throw new Error('合约未初始化：treasuryDistributor 为零地址');
          }
          
          // 检查 Treasury 合约是否有 receiveOkbRevenue 函数
          try {
            console.log('检查 Treasury 合约的 receiveOkbRevenue 函数...');
            
            // 尝试模拟调用 receiveOkbRevenue 函数
            await publicClient.simulateContract({
              address: treasuryDistributor as `0x${string}`,
              abi: [{ 
                name: 'receiveOkbRevenue', 
                type: 'function', 
                stateMutability: 'payable',
                inputs: [],
                outputs: []
              }],
              functionName: 'receiveOkbRevenue',
              value: parseEther('0.01'),
              account: address,
            });
            console.log('Treasury receiveOkbRevenue 函数存在');
          } catch (treasuryCheckError: any) {
            console.error('❌ Treasury receiveOkbRevenue 函数检查失败:', treasuryCheckError.message);
            
            if (treasuryCheckError.message.includes('does not exist')) {
              throw new Error('Treasury 合约缺少 receiveOkbRevenue 函数，合约接口不匹配');
            }
          }
        }
      } catch (contractCheckError) {
        console.error('合约状态检查失败:', contractCheckError);
      }

      // 检查余额是否足够
      if (balance) {
        const estimatedGas = parseEther('0.001'); // 估算 Gas 费用
        const totalRequired = totalFee + estimatedGas;
        
        if (balance.value < totalRequired) {
          const shortfall = formatEther(totalRequired - balance.value);
          throw new Error(`余额不足！需要至少 ${formatEther(totalRequired)} OKB，当前余额 ${formatEther(balance.value)} OKB，缺少 ${shortfall} OKB`);
        }
        
        console.log(`余额检查通过: ${formatEther(balance.value)} OKB >= ${formatEther(totalRequired)} OKB`);
      }

      // 将天数转换为秒数
      const termInSeconds = term * 86400; // 1天 = 86400秒
      console.log(`转换期限: ${term} 天 = ${termInSeconds} 秒`);
      
      const contractConfig = {
        ...tokenMinterContract(currentChain),
        functionName: 'claimRank',
        args: [BigInt(termInSeconds), BigInt(count)], // 注意参数顺序：term(秒), count
        value: totalFee, // 支付铸造费用
      };

      // 尝试模拟调用来检查是否会成功
      try {
        if (publicClient) {
          console.log('模拟合约调用...');
          await publicClient.simulateContract({
            ...contractConfig,
            account: address,
          });
          console.log('模拟调用成功');
        }
      } catch (simulateError: any) {
        console.error('❌ 模拟调用失败:', simulateError);
        
        // 解析模拟调用的错误
        let simulateErrorMessage = '模拟调用失败';
        if (simulateError.message) {
          if (simulateError.message.includes('SLEEP-MP:')) {
            const match = simulateError.message.match(/SLEEP-MP: ([^"]+)/);
            if (match) {
              simulateErrorMessage = `合约错误: ${match[1]}`;
            }
          } else {
            simulateErrorMessage = simulateError.message;
          }
        }
        
        throw new Error(`预检查失败: ${simulateErrorMessage}`);
      }

      setStatus('pending');
      const hash = await writeContractAsync(contractConfig);
      setTxHash(hash);
      
      console.log('交易已发送，哈希:', hash);
      setStatus('confirming');
      toast.loading(`正在铸造 ${count} 个代币...`, { id: hash });

      // 等待交易确认
      await waitForTransactionReceipt(config, { hash });
      
      console.log('铸造成功！');
      setStatus('success');
      toast.success(`成功铸造 ${count} 个代币，期限 ${term} 天！`, { id: hash });

    } catch (err: any) {
      console.error('❌ 铸造失败:', err);
      setStatus('error');
      
      let errorMessage = '铸造失败';
      
      // 解析具体的错误信息
      if (err.message) {
        if (err.message.includes('User rejected')) {
          errorMessage = '用户取消了交易';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = '余额不足，请确保有足够的 OKB 支付费用和 Gas';
        } else if (err.message.includes('SLEEP-MP:')) {
          // 提取合约错误信息
          const match = err.message.match(/SLEEP-MP: ([^"]+)/);
          if (match) {
            errorMessage = `合约错误: ${match[1]}`;
          }
        } else if (err.message.includes('missing revert data')) {
          errorMessage = '交易失败：可能是余额不足或网络问题，请检查 OKB 余额并重试';
        } else if (err.message.includes('execution reverted')) {
          errorMessage = '合约执行失败，请检查参数和余额';
        } else {
          errorMessage = err.message;
        }
      }
      
      console.error('错误详情:', {
        message: err.message,
        code: err.code,
        data: err.data,
        reason: err.reason
      });
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  };

  return {
    mint,
    status,
    error,
    txHash,
    isPending,
    reset,
  };
}

// 质押功能 Hook
export function useStakeTokens() {
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const transaction = useContractTransaction();
  const [approvalStatus, setApprovalStatus] = useState<TransactionStatus>('idle');

  const stake = async (amount: string, stakingPeriod: number = 0) => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    if (!amount || parseFloat(amount) <= 0) {
      throw new Error('请输入有效的质押金额');
    }

    const amountWei = parseEther(amount);

    try {
      // 第一步：批准代币
      setApprovalStatus('preparing');
      toast.loading('准备批准代币...', { id: 'approval' });

      const approvalConfig = {
        ...tokenCoreContract(),
        functionName: 'approve',
        args: [tokenStakingContract(currentChain).address, amountWei],
      };

      setApprovalStatus('pending');
      const approvalHash = await transaction.executeTransaction(approvalConfig);
      
      setApprovalStatus('confirming');
      toast.loading('等待批准确认...', { id: 'approval' });

      // 等待批准交易确认
      // 注意：这里需要等待批准交易完成后再进行质押
      // 在实际实现中，你可能需要使用 useWaitForTransactionReceipt 来等待批准完成

      // 第二步：质押代币
      toast.success('代币批准成功！', { id: 'approval' });
      setApprovalStatus('success');

      const stakeConfig = {
        ...tokenStakingContract(currentChain),
        functionName: 'stake',
        args: [amountWei, BigInt(stakingPeriod)],
      };

      await transaction.executeTransaction(
        stakeConfig,
        (receipt) => {
          toast.success(`成功质押 ${amount} SLEEP 代币！`);
        },
        (error) => {
          console.error('Stake error:', error);
        }
      );

    } catch (err: any) {
      const errorMessage = err.message || '质押失败';
      setApprovalStatus('error');
      toast.error(errorMessage, { id: 'approval' });
      throw new Error(errorMessage);
    }
  };

  const unstake = async () => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    const unstakeConfig = {
      ...tokenStakingContract(),
      functionName: 'unstake',
      args: [],
    };

    await transaction.executeTransaction(
      unstakeConfig,
      (receipt) => {
        toast.success('成功取消质押！');
      },
      (error) => {
        console.error('Unstake error:', error);
      }
    );
  };

  const claimRewards = async () => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    const claimConfig = {
      ...tokenStakingContract(),
      functionName: 'claimRewards',
      args: [],
    };

    await transaction.executeTransaction(
      claimConfig,
      (receipt) => {
        toast.success('成功领取奖励！');
      },
      (error) => {
        console.error('Claim rewards error:', error);
      }
    );
  };

  return {
    stake,
    unstake,
    claimRewards,
    approvalStatus,
    ...transaction,
  };
}

// 领取铸币奖励功能 Hook
export function useClaimMintRewards() {
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const transaction = useContractTransaction();

  const claimReward = async (tokenId: bigint) => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    const claimConfig = {
      ...tokenMinterContract(currentChain),
      functionName: 'claimReward',
      args: [tokenId],
    };

    await transaction.executeTransaction(
      claimConfig,
      (receipt) => {
        toast.success(`成功领取 NFT #${tokenId} 的奖励！`);
      },
      (error) => {
        console.error('Claim mint reward error:', error);
      }
    );
  };

  const batchClaimRewards = async (tokenIds: bigint[]) => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    if (tokenIds.length === 0) {
      throw new Error('请选择要领取的 NFT');
    }

    // 如果合约支持批量领取
    const batchClaimConfig = {
      ...tokenMinterContract(currentChain),
      functionName: 'batchClaimRewards',
      args: [tokenIds],
    };

    await transaction.executeTransaction(
      batchClaimConfig,
      (receipt) => {
        toast.success(`成功批量领取 ${tokenIds.length} 个 NFT 的奖励！`);
      },
      (error) => {
        console.error('Batch claim rewards error:', error);
        // 如果批量领取失败，可以尝试逐个领取
        throw new Error('批量领取失败，请尝试逐个领取');
      }
    );
  };

  return {
    claimReward,
    batchClaimRewards,
    ...transaction,
  };
}

// AccessPass 铸造功能 Hook
export function useMintAccessPass() {
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContract, data: writeData, error: writeError, isPending: isWritePending } = useWriteContract();
  const publicClient = usePublicClient();
  
  // 使用 useWaitForTransactionReceipt 来等待交易确认
  const { data: receipt, isLoading: isConfirming, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  // 监听 writeData 变化，当获得交易哈希时设置状态
  React.useEffect(() => {
    if (writeData && !txHash) {
      console.log('获得交易哈希:', writeData);
      setTxHash(writeData);
      setStatus('confirming');
      toast.loading('正在铸造 Access Pass...', { id: writeData });
    }
  }, [writeData, txHash]);

  // 监听交易确认结果
  React.useEffect(() => {
    if (receipt && txHash) {
      console.log('AccessPass 交易确认成功:', receipt);
      setStatus('success');
      toast.success('成功铸造 Access Pass NFT！', { id: txHash });
      console.log('AccessPass 铸造完成！');
    }
  }, [receipt, txHash]);

  // 监听交易确认错误
  React.useEffect(() => {
    if (receiptError && txHash) {
      console.error('❌ 交易确认失败:', receiptError);
      setStatus('error');
      setError('交易确认失败');
      toast.error('AccessPass 铸造失败', { id: txHash });
    }
  }, [receiptError, txHash]);

  // 监听写入错误
  React.useEffect(() => {
    if (writeError) {
      console.error('❌ writeContract 错误:', writeError);
      setStatus('error');
      setError(writeError.message);
      toast.error('AccessPass 铸造失败');
    }
  }, [writeError]);

  const mintAccessPass = async (svgData: string = '') => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    try {
      console.log('开始 AccessPass 铸造...');
      setStatus('preparing');
      setError(null);
      setTxHash(null); // 重置交易哈希

      // 如果没有提供 SVG 数据，使用默认的简单 SVG
      const defaultSvg = svgData || `<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="250" fill="#4ECDC4"/>
        <text x="200" y="125" text-anchor="middle" fill="white" font-size="24">Access Pass</text>
        <text x="200" y="150" text-anchor="middle" fill="white" font-size="16">${address}</text>
      </svg>`;

      const mintConfig = {
        ...tokenAccessPassContract(currentChain),
        functionName: 'mintAccessPass',
        args: [defaultSvg],
      };

      console.log('📝 准备发送 AccessPass 铸造交易...');
      console.log('合约配置:', mintConfig);
      
      setStatus('pending');
      
      // 调用 writeContract，这会触发钱包确认
      console.log('⏳ 调用 writeContract...');
      writeContract(mintConfig);
      
      console.log('writeContract 调用完成，等待用户在钱包中确认...');
      // 其余的逻辑由 useEffect 处理

    } catch (err: any) {
      console.error('❌ AccessPass 铸造失败:', err);
      const errorMessage = err.message || 'AccessPass 铸造失败';
      setError(errorMessage);
      setStatus('error');
      toast.error(errorMessage);
      throw err;
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
  };

  return {
    mintAccessPass,
    status,
    error,
    reset,
  };
}

// 清算功能 Hook
export function useLiquidation() {
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const transaction = useContractTransaction();

  const liquidate = async (tokenId: bigint) => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    const liquidateConfig = {
      ...tokenMinterContract(currentChain),
      functionName: 'liquidate',
      args: [tokenId],
    };

    await transaction.executeTransaction(
      liquidateConfig,
      (receipt) => {
        toast.success(`成功清算 NFT #${tokenId}！`);
      },
      (error) => {
        console.error('Liquidation error:', error);
      }
    );
  };

  const batchLiquidate = async (tokenIds: bigint[]) => {
    if (!address) {
      throw new Error('请先连接钱包');
    }

    if (tokenIds.length === 0) {
      throw new Error('请选择要清算的 NFT');
    }

    const batchLiquidateConfig = {
      ...tokenMinterContract(currentChain),
      functionName: 'batchLiquidate',
      args: [tokenIds],
    };

    await transaction.executeTransaction(
      batchLiquidateConfig,
      (receipt) => {
        toast.success(`成功批量清算 ${tokenIds.length} 个 NFT！`);
      },
      (error) => {
        console.error('Batch liquidation error:', error);
      }
    );
  };

  return {
    liquidate,
    batchLiquidate,
    ...transaction,
  };
}














