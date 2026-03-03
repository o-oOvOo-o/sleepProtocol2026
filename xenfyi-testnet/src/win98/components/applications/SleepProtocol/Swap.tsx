import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DataCard, CardTitle, StatRow, StatLabel, StatValue, Win98Label, Win98Button, Win98Input } from './index';
import { useSwapRouter, SwapQuote } from '~/hooks/useSwapRouter';
import { usePoolInfo, formatSLEEPING, formatOKB } from '~/hooks/usePoolInfo';
import { usePoolStats, formatOKBVolume, formatSLEEPINGAmount } from '~/hooks/usePoolStats';
import { useAccount } from 'wagmi';

interface SwapProps {
  isConnected: boolean;
}

export const Swap: React.FC<SwapProps> = ({ isConnected }) => {
  const { address } = useAccount();
  const {
    status,
    error,
    okbBalance,
    sleepingBalance,
    getSwapQuote,
    executeSwap,
    parseOKB,
    parseSLEEPING
  } = useSwapRouter();

  const poolInfo = usePoolInfo();
  const poolStats = usePoolStats();

  const [swapMode, setSwapMode] = useState<'swap' | 'addLiquidity'>('swap');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<'SLEEPING' | 'OKB'>('OKB');
  const [toToken, setToToken] = useState<'SLEEPING' | 'OKB'>('SLEEPING');
  const [swapSlippage, setSwapSlippage] = useState('0.5');
  const [liquidityAmount1, setLiquidityAmount1] = useState('');
  const [liquidityAmount2, setLiquidityAmount2] = useState('');
  const [selectedPool, setSelectedPool] = useState<'protocol' | 'community'>('protocol');
  const [currentQuote, setCurrentQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // 从合约获取税率阶段信息 (简化版 - 可以后续从合约读取)
  const getCurrentTaxPhase = () => {
    // 这里可以后续从合约读取真实的税率阶段
    return { stage: 1, buyTax: 2, sellTax: 5, daysRemaining: 182 };
  };

  const taxPhase = getCurrentTaxPhase();

  // 获取真实的交换报价
  useEffect(() => {
    const fetchQuote = async () => {
      if (!fromAmount || !address || isNaN(Number(fromAmount)) || Number(fromAmount) <= 0) {
        setToAmount('');
        setCurrentQuote(null);
        return;
      }

      setIsLoadingQuote(true);
      try {
        const amountIn = fromToken === 'OKB' ? parseOKB(fromAmount) : parseSLEEPING(fromAmount);
        const tokenInAddress = fromToken === 'OKB' ? 'OKB' : 'SLEEPING';
        const tokenOutAddress = toToken === 'OKB' ? 'OKB' : 'SLEEPING';
        
        const quote = await getSwapQuote(
          tokenInAddress,
          tokenOutAddress,
          amountIn,
          Number(swapSlippage)
        );

        if (quote) {
          setCurrentQuote(quote);
          const formattedOutput = toToken === 'OKB' 
            ? formatOKB(quote.amountOut)
            : formatSLEEPING(quote.amountOut);
          setToAmount(formattedOutput);
        } else {
          setToAmount('');
          setCurrentQuote(null);
        }
      } catch (error) {
        console.error('获取报价失败:', error);
        setToAmount('');
        setCurrentQuote(null);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const debounceTimer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounceTimer);
  }, [fromAmount, fromToken, toToken, swapSlippage, address, getSwapQuote, parseOKB, parseSLEEPING, formatOKB, formatSLEEPING]);

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = async () => {
    if (!isConnected || !address) {
      toast.error('请先连接钱包！');
      return;
    }

    if (!fromAmount || !toAmount || !currentQuote) {
      toast.error('请输入交换金额！');
      return;
    }

    try {
      const amountIn = fromToken === 'OKB' ? parseOKB(fromAmount) : parseSLEEPING(fromAmount);
      const tokenInAddress = fromToken === 'OKB' ? 'OKB' : 'SLEEPING';
      const tokenOutAddress = toToken === 'OKB' ? 'OKB' : 'SLEEPING';
      
      // Calculate deadline (20 minutes from now)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      await executeSwap({
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn,
        amountOutMin: currentQuote.minimumAmountOut,
        to: address,
        deadline
      });

      toast.success('交换请求已发送！');
    } catch (error: any) {
      console.error('交换失败:', error);
      toast.error(error.message || '交换失败');
    }
  };

  const handleAddLiquidity = () => {
    if (!isConnected) {
      toast.error('请先连接钱包！');
      return;
    }
    
    if (selectedPool === 'protocol') {
      toast.error('协议池流动性已锁定，无法添加！');
      return;
    }
    
    toast.success('社区池添加流动性功能即将上线！');
  };

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', padding: '8px' }}>
      {/* 左侧主交易区 */}
      <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Win98 简洁标题 */}
        <DataCard>
          <CardTitle style={{ fontSize: '16px', marginBottom: '8px' }}>
            💱 Token Exchange
          </CardTitle>
          <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
            SLEEPING ⇄ OKB • Stage {taxPhase.stage} Tax
          </p>
        </DataCard>

        {/* Win98 简洁池子选择 */}
        <DataCard>
          <CardTitle style={{ fontSize: '14px', marginBottom: '8px' }}>
            🏦 Pool Selection
          </CardTitle>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Win98Button
              onClick={() => setSelectedPool('protocol')}
              style={{
                flex: 1,
                padding: '8px 12px',
                color: selectedPool === 'protocol' ? 'white' : 'black',
                fontWeight: 'bold',
                fontSize: '11px',
                ...(selectedPool === 'protocol' && {
                  background: '#000080',
                  border: '2px inset #c0c0c0'
                })
              }}
            >
              🔒 Protocol
            </Win98Button>
            <Win98Button
              onClick={() => setSelectedPool('community')}
              style={{
                flex: 1,
                padding: '8px 12px',
                color: selectedPool === 'community' ? 'white' : 'black',
                fontWeight: 'bold',
                fontSize: '11px',
                ...(selectedPool === 'community' && {
                  background: '#000080',
                  border: '2px inset #c0c0c0'
                })
              }}
            >
              🌐 Community
            </Win98Button>
          </div>
        </DataCard>

        {/* Win98 简洁模式切换 */}
        <DataCard>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Win98Button
              onClick={() => setSwapMode('swap')}
              style={{
                flex: 1,
                padding: '10px 16px',
                color: swapMode === 'swap' ? 'white' : 'black',
                fontWeight: 'bold',
                fontSize: '12px',
                ...(swapMode === 'swap' && {
                  background: '#000080',
                  border: '2px inset #c0c0c0'
                })
              }}
            >
              🔄 Swap
            </Win98Button>
            <Win98Button
              onClick={() => setSwapMode('addLiquidity')}
              disabled={selectedPool === 'protocol'}
              style={{
                flex: 1,
                padding: '10px 16px',
                color: swapMode === 'addLiquidity' ? 'white' : 'black',
                fontWeight: 'bold',
                fontSize: '12px',
                opacity: selectedPool === 'protocol' ? 0.5 : 1,
                ...(swapMode === 'addLiquidity' && {
                  background: '#000080',
                  border: '2px inset #c0c0c0'
                })
              }}
            >
              💧 Add Liquidity
            </Win98Button>
          </div>
        </DataCard>

        {/* Win98 简洁税收信息 */}
        <DataCard>
          <CardTitle style={{ fontSize: '14px', marginBottom: '8px' }}>
            📊 Tax Info (Stage {taxPhase.stage}/4)
          </CardTitle>
          <div style={{ 
            background: '#f0f0f0',
            border: '2px inset #c0c0c0',
            padding: '8px',
            fontSize: '12px'
          }}>
            <div><strong>Buy:</strong> {taxPhase.buyTax}% | <strong>Sell:</strong> {taxPhase.sellTax}%</div>
            {taxPhase.daysRemaining > 0 && (
              <div style={{ marginTop: '4px', color: '#008000' }}>
                Next stage in: {taxPhase.daysRemaining} days
              </div>
            )}
          </div>
        </DataCard>

        {/* Win98 主交易卡片 */}
        <DataCard style={{ flex: 1 }}>
          <CardTitle style={{ fontSize: '16px', marginBottom: '16px' }}>
            {swapMode === 'swap' ? '🔄 Token Exchange' : '💧 Liquidity Provision'}
            {swapMode === 'addLiquidity' && selectedPool === 'protocol' && (
              <span style={{ fontSize: '12px', color: '#ff0000', marginLeft: '8px' }}>
                (Protocol Pool Locked)
              </span>
            )}
          </CardTitle>

          {swapMode === 'swap' ? (
            <>
              {/* From Token - Win98 风格 */}
              <div style={{ 
                background: '#f0f0f0',
                border: '2px inset #c0c0c0',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Win98Label style={{ fontSize: '12px', fontWeight: 'bold' }}>From Token</Win98Label>
                  <Win98Label style={{ fontSize: '11px', color: '#666' }}>
                    Balance: {fromToken === 'OKB' 
                      ? formatOKB(okbBalance || BigInt(0)).slice(0, 8)
                      : formatSLEEPING(sleepingBalance || BigInt(0)).slice(0, 8)
                    }
                  </Win98Label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Win98Input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ 
                      flex: 1, 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      padding: '6px'
                    }}
                  />
                  <Win98Button style={{ 
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    minWidth: '80px'
                  }}>
                    {fromToken} ▼
                  </Win98Button>
                </div>
                {fromAmount && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#666' }}>
                    Amount: {fromAmount} {fromToken}
                  </div>
                )}
              </div>

              {/* Win98 风格交换按钮 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                margin: '8px 0'
              }}>
                <Win98Button 
                  onClick={handleSwapDirection}
                  style={{ 
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  ⇅
                </Win98Button>
              </div>

              {/* To Token - Win98 风格 */}
              <div style={{ 
                background: '#f0f0f0',
                border: '2px inset #c0c0c0',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Win98Label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    To Token {isLoadingQuote ? '(Loading...)' : '(After Tax)'}
                  </Win98Label>
                  <Win98Label style={{ fontSize: '11px', color: '#ff0000' }}>
                    {currentQuote ? `Tax: ${formatOKB(currentQuote.taxAmount).slice(0, 6)}` : 'Tax: --'}
                  </Win98Label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Win98Input
                    type="number"
                    value={toAmount}
                    readOnly
                    placeholder="0.00"
                    style={{ 
                      flex: 1, 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      padding: '6px',
                      background: '#e0e0e0'
                    }}
                  />
                  <Win98Button style={{ 
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    minWidth: '80px'
                  }}>
                    {toToken} ▼
                  </Win98Button>
                </div>
                {toAmount && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#666' }}>
                    Amount: {toAmount} {toToken}
                  </div>
                )}
              </div>

              {/* Win98 滑点设置 */}
              <div style={{ 
                background: '#f0f0f0',
                border: '2px inset #c0c0c0',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Slippage Tolerance: {swapSlippage}%
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['0.1', '0.5', '1.0', '2.0'].map(value => (
                    <Win98Button
                      key={value}
                      onClick={() => setSwapSlippage(value)}
                      style={{
                        flex: 1,
                        padding: '4px',
                        fontSize: '11px',
                        color: swapSlippage === value ? 'white' : 'black',
                        ...(swapSlippage === value && {
                          background: '#000080',
                          border: '2px inset #c0c0c0'
                        })
                      }}
                    >
                      {value}%
                    </Win98Button>
                  ))}
                </div>
              </div>

              {/* Win98 交易按钮 */}
              <Win98Button
                onClick={handleSwap}
                disabled={!fromAmount || !toAmount || !isConnected || status === 'pending' || status === 'confirming' || isLoadingQuote}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  ...((!fromAmount || !toAmount || !isConnected || status === 'pending' || status === 'confirming') && {
                    opacity: 0.6,
                    cursor: 'not-allowed'
                  }),
                  ...((fromAmount && toAmount && isConnected && status !== 'pending' && status !== 'confirming') && {
                    background: '#000080',
                    color: 'white'
                  })
                }}
              >
                {!isConnected ? 'Connect Wallet' : 
                 status === 'pending' ? '⏳ Confirming...' :
                 status === 'confirming' ? '⏳ Processing...' :
                 isLoadingQuote ? '💭 Getting Quote...' :
                 currentQuote ? `🔄 SWAP via ${currentQuote.bestPool}` :
                 '🔄 SWAP TOKENS'}
              </Win98Button>

              {/* 交易状态显示 */}
              {(status !== 'idle' || error) && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  background: status === 'error' ? '#ffebee' : status === 'success' ? '#e8f5e8' : '#fff3e0',
                  border: '2px inset #c0c0c0',
                  fontSize: '12px',
                  textAlign: 'center'
                }}>
                  {status === 'success' && '✅ 交换成功！'}
                  {status === 'error' && `❌ ${error}`}
                  {status === 'pending' && '⏳ 等待钱包确认...'}
                  {status === 'confirming' && '⏳ 交易确认中...'}
                </div>
              )}

              {/* 交换信息显示 */}
              {currentQuote && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  background: '#f0f0f0',
                  border: '2px inset #c0c0c0',
                  fontSize: '11px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Best Pool:</span>
                    <span style={{ fontWeight: 'bold', color: '#000080' }}>{currentQuote.bestPool}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Price Impact:</span>
                    <span style={{ color: currentQuote.priceImpact > 5 ? '#ff0000' : '#008000' }}>
                      {currentQuote.priceImpact.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Min Received:</span>
                    <span>{toToken === 'OKB' 
                      ? formatOKB(currentQuote.minimumAmountOut).slice(0, 8)
                      : formatSLEEPING(currentQuote.minimumAmountOut).slice(0, 8)
                    } {toToken}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Win98 添加流动性 */}
              {selectedPool === 'protocol' ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#666',
                  background: '#f0f0f0',
                  border: '2px inset #c0c0c0'
                }}>
                  <div style={{ fontSize: '18px', marginBottom: '12px' }}>🔒</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Protocol Pool Locked</div>
                  <div style={{ fontSize: '14px' }}>Protocol-owned liquidity cannot be modified</div>
                </div>
              ) : (
                <>
                  <div style={{ 
                    background: '#f0f0f0',
                    border: '2px inset #c0c0c0',
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <Win98Label style={{ fontSize: '12px', fontWeight: 'bold' }}>SLEEPING Amount</Win98Label>
                    <Win98Input
                      type="number"
                      value={liquidityAmount1}
                      onChange={(e) => {
                        setLiquidityAmount1(e.target.value);
                        // TODO: 从池子合约获取真实的价格比率来计算对应的OKB数量
                        setLiquidityAmount2('');
                      }}
                      placeholder="0.00"
                      style={{ 
                        width: '100%', 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        padding: '6px'
                      }}
                    />
                  </div>

                  <div style={{ 
                    background: '#f0f0f0',
                    border: '2px inset #c0c0c0',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <Win98Label style={{ fontSize: '12px', fontWeight: 'bold' }}>OKB Amount</Win98Label>
                    <Win98Input
                      type="number"
                      value={liquidityAmount2}
                      readOnly
                      placeholder="0.00"
                      style={{ 
                        width: '100%', 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        padding: '6px',
                        background: '#e0e0e0'
                      }}
                    />
                  </div>

                  <Win98Button
                    onClick={handleAddLiquidity}
                    disabled={!liquidityAmount1 || !liquidityAmount2 || !isConnected}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: (!liquidityAmount1 || !liquidityAmount2 || !isConnected) ? '#c0c0c0' : '#000080',
                      color: (!liquidityAmount1 || !liquidityAmount2 || !isConnected) ? '#666' : 'white',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: (!liquidityAmount1 || !liquidityAmount2 || !isConnected) ? 'not-allowed' : 'pointer',
                      opacity: (!liquidityAmount1 || !liquidityAmount2 || !isConnected) ? 0.6 : 1
                    }}
                  >
                    {!isConnected ? 'Connect Wallet' : '💧 ADD LIQUIDITY'}
                  </Win98Button>
                </>
              )}
            </>
          )}
        </DataCard>
      </div>

      {/* Win98 风格右侧信息面板 */}
      <div style={{ flex: '0 1 300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 流动性池统计 */}
        <DataCard>
          <CardTitle style={{ fontSize: '14px', marginBottom: '12px' }}>
            💧 Pool Stats {(poolInfo.isLoading || poolStats.isLoading) && '(Loading...)'}
          </CardTitle>
          <StatRow>
            <StatLabel>Total SLEEPING</StatLabel>
            <StatValue>
              {poolInfo.isLoading ? '...' : 
                poolInfo.totalLiquidity.sleeping > BigInt(0) 
                  ? formatSLEEPING(poolInfo.totalLiquidity.sleeping).slice(0, 10)
                  : 'No liquidity'
              }
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Total OKB</StatLabel>
            <StatValue>
              {poolInfo.isLoading ? '...' : 
                poolInfo.totalLiquidity.okb > BigInt(0) 
                  ? formatOKB(poolInfo.totalLiquidity.okb).slice(0, 10)
                  : 'No liquidity'
              }
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>24h Volume</StatLabel>
            <StatValue style={{ fontSize: '10px', color: '#008000' }}>
              {poolStats.isLoading ? '...' : 
                poolStats.volume24h.total > BigInt(0) 
                  ? `${formatOKBVolume(poolStats.volume24h.total).slice(0, 8)} OKB`
                  : 'No trades yet'
              }
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>24h Fees</StatLabel>
            <StatValue style={{ fontSize: '10px', color: '#800080' }}>
              {poolStats.isLoading ? '...' : 
                poolStats.fees24h.total > BigInt(0) 
                  ? `${formatOKBVolume(poolStats.fees24h.total).slice(0, 6)} OKB`
                  : 'No fees yet'
              }
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Current Price</StatLabel>
            <StatValue style={{ fontSize: '10px' }}>
              {poolInfo.totalLiquidity.sleeping > BigInt(0) && poolInfo.totalLiquidity.okb > BigInt(0)
                ? `1 SLEEPING = ${(Number(formatOKB(poolInfo.totalLiquidity.okb)) / Number(formatSLEEPING(poolInfo.totalLiquidity.sleeping))).toFixed(8)} OKB`
                : 'Price not set'
              }
            </StatValue>
          </StatRow>
        </DataCard>

        {/* Buy & Burn 统计 */}
        <DataCard>
          <CardTitle style={{ fontSize: '14px', marginBottom: '12px' }}>
            🔥 Buy & Burn Stats {poolStats.isLoading && '(Loading...)'}
          </CardTitle>
          <StatRow>
            <StatLabel>Total Burned</StatLabel>
            <StatValue style={{ color: '#ff0000', fontWeight: 'bold' }}>
              {poolStats.isLoading ? '...' : 
                poolStats.buyAndBurn.totalBurned > BigInt(0) 
                  ? `${formatSLEEPINGAmount(poolStats.buyAndBurn.totalBurned).slice(0, 8)} SLEEPING`
                  : 'No burns yet'
              }
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Burn Count</StatLabel>
            <StatValue>
              {poolStats.isLoading ? '...' : 
                poolStats.buyAndBurn.burnCount > 0 
                  ? poolStats.buyAndBurn.burnCount
                  : 'No burns yet'
              }
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>OKB Spent</StatLabel>
            <StatValue>
              {poolStats.isLoading ? '...' : 
                poolStats.buyAndBurn.totalOkbSpent > BigInt(0) 
                  ? `${formatOKBVolume(poolStats.buyAndBurn.totalOkbSpent).slice(0, 6)} OKB`
                  : 'No burns yet'
              }
            </StatValue>
          </StatRow>
          <StatRow>
            <StatLabel>Last Burn</StatLabel>
            <StatValue style={{ fontSize: '10px' }}>
              {poolStats.isLoading ? '...' : 
                poolStats.buyAndBurn.lastBurnTime > 0 
                  ? new Date(poolStats.buyAndBurn.lastBurnTime * 1000).toLocaleDateString()
                  : 'No burns yet'
              }
            </StatValue>
          </StatRow>
          
          <div style={{ 
            marginTop: '8px', 
            padding: '6px', 
            background: '#f0f0f0', 
            border: '1px inset #c0c0c0',
            fontSize: '11px'
          }}>
            💡 Tax revenue funds automatic buyback & burn
          </div>
        </DataCard>
      </div>
    </div>
  );
};