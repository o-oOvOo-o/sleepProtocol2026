import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { parseEther, formatEther, formatUnits } from 'viem';
import { sleepRouterContract, tokenCoreContract } from '~/lib/contracts';

export interface SwapQuote {
  amountOut: bigint;
  taxAmount: bigint;
  bestPool: string;
  priceImpact: number;
  minimumAmountOut: bigint;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMin: bigint;
  to: string;
  deadline: bigint;
}

export function useSwapRouter() {
  const { address } = useAccount();
  const [status, setStatus] = useState<'idle' | 'preparing' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { 
    data: txHash, 
    writeContract, 
    error: writeError,
    isPending: isWritePending 
  } = useWriteContract();

  const { 
    data: receipt, 
    isLoading: isConfirming, 
    error: receiptError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Get user's OKB balance
  const { data: okbBalance } = useBalance({
    address: address,
  });

  // Get user's SLEEPING balance
  const { data: sleepingBalance } = useReadContract({
    ...tokenCoreContract(),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Get swap quote from router
  const getSwapQuote = async (
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    slippageTolerance: number = 0.5
  ): Promise<SwapQuote | null> => {
    if (!address || amountIn === 0n) return null;

    try {
      // Call router's getBestQuote function
      const result = await sleepRouterContract().read.getBestQuote([
        tokenIn === 'OKB' ? '0x0000000000000000000000000000000000000000' : tokenCoreContract().address,
        tokenOut === 'OKB' ? '0x0000000000000000000000000000000000000000' : tokenCoreContract().address,
        amountIn,
        address
      ]);

      if (result && Array.isArray(result) && result.length >= 3) {
        const [amountOut, taxAmount, bestPoolAddress] = result;
        
        // Calculate price impact (simplified)
        const priceImpact = Number((amountIn - amountOut) * 10000n / amountIn) / 100;
        
        // Calculate minimum amount out with slippage
        const minimumAmountOut = amountOut * BigInt(Math.floor((100 - slippageTolerance) * 100)) / 10000n;
        
        // Determine pool name
        let bestPool = 'Unknown Pool';
        if (bestPoolAddress) {
          // You could add logic here to determine if it's Protocol or Community pool
          bestPool = 'Best Available Pool';
        }

        return {
          amountOut: amountOut as bigint,
          taxAmount: taxAmount as bigint,
          bestPool,
          priceImpact,
          minimumAmountOut,
        };
      }

      return null;
    } catch (error) {
      console.error('获取交换报价失败:', error);
      
      // Return null instead of mock data - let UI handle the error state
      return null;
    }
  };

  // Execute swap through router
  const executeSwap = async (params: SwapParams) => {
    if (!address) {
      setError('请先连接钱包');
      return;
    }

    try {
      setStatus('preparing');
      setError(null);

      // Check balance
      const isOKBInput = params.tokenIn.toLowerCase().includes('okb');
      const userBalance = isOKBInput ? okbBalance?.value : sleepingBalance;
      
      if (!userBalance || userBalance < params.amountIn) {
        throw new Error('余额不足');
      }

      setStatus('pending');

      // Call router's swapExactTokensForTokens function
      await writeContract({
        ...sleepRouterContract(),
        functionName: 'swapExactTokensForTokens',
        args: [
          params.amountIn,
          params.amountOutMin,
          params.tokenIn,
          params.tokenOut,
          params.to,
          params.deadline
        ],
        value: isOKBInput ? params.amountIn : 0n,
      });

    } catch (error: any) {
      console.error('交换失败:', error);
      setStatus('error');
      
      if (error.message?.includes('User rejected')) {
        setError('用户取消交易');
      } else if (error.message?.includes('insufficient funds')) {
        setError('余额不足');
      } else {
        setError(error.message || '交换失败');
      }
    }
  };

  // Update status based on transaction state
  useEffect(() => {
    if (isWritePending) {
      setStatus('pending');
    } else if (isConfirming) {
      setStatus('confirming');
    } else if (receipt) {
      setStatus('success');
      setError(null);
    } else if (writeError || receiptError) {
      setStatus('error');
      setError(writeError?.message || receiptError?.message || '交易失败');
    }
  }, [isWritePending, isConfirming, receipt, writeError, receiptError]);

  // Reset status after success/error
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return {
    // State
    status,
    error,
    txHash,
    receipt,
    
    // Balances
    okbBalance: okbBalance?.value || 0n,
    sleepingBalance: sleepingBalance || 0n,
    
    // Functions
    getSwapQuote,
    executeSwap,
    
    // Utilities
    formatOKB: (value: bigint) => formatEther(value),
    formatSLEEPING: (value: bigint) => formatUnits(value, 18),
    parseOKB: (value: string) => parseEther(value),
    parseSLEEPING: (value: string) => parseEther(value),
  };
}
