import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-hot-toast';

// 动画效果
const glow = keyframes`
  0% { box-shadow: 0 0 20px rgba(34, 139, 34, 0.3); }
  50% { box-shadow: 0 0 30px rgba(34, 139, 34, 0.6); }
  100% { box-shadow: 0 0 20px rgba(34, 139, 34, 0.3); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const SwapContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a1a0e 0%, #1a3a1b 25%, #2d692d 50%, #1a3a1b 75%, #0a1a0e 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  padding: 20px;
  position: relative;
  overflow-x: hidden;

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 80%, rgba(34, 139, 34, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(50, 205, 50, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const SwapWrapper = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;
  animation: ${slideIn} 0.8s ease-out;
  padding: 0 20px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    max-width: 600px;
    gap: 24px;
  }
  
  @media (max-width: 768px) {
    padding: 0 16px;
    gap: 16px;
  }
`;

const Header = styled.div`
  background: linear-gradient(135deg, rgba(15, 35, 15, 0.95) 0%, rgba(25, 55, 25, 0.9) 100%);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(34, 139, 34, 0.3);
  border-radius: 24px;
  padding: 24px 32px;
  margin: 0 20px 32px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: ${glow} 3s ease-in-out infinite;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  @media (max-width: 768px) {
    margin: 0 16px 24px 16px;
    padding: 16px 20px;
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
`;

const Title = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MainTitle = styled.h1`
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #228B22 0%, #32CD32 50%, #00FF00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 3px;
  margin: 0;
  text-shadow: 0 0 30px rgba(34, 139, 34, 0.5);
`;

const Subtitle = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  letter-spacing: 1.5px;
  font-weight: 500;
  text-transform: uppercase;
`;

const Badge = styled.div`
  background: linear-gradient(135deg, #228B22 0%, #32CD32 100%);
  padding: 12px 24px;
  border-radius: 50px;
  font-size: 16px;
  color: white;
  font-weight: bold;
  letter-spacing: 1px;
  box-shadow: 0 8px 32px rgba(34, 139, 34, 0.4);
  animation: ${pulse} 2s ease-in-out infinite;
`;

const Card = styled.div`
  background: linear-gradient(145deg, rgba(15, 35, 15, 0.9) 0%, rgba(25, 55, 25, 0.8) 100%);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(34, 139, 34, 0.2);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: rgba(34, 139, 34, 0.4);
    box-shadow: 0 12px 50px rgba(34, 139, 34, 0.2);
    transform: translateY(-2px);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(34, 139, 34, 0.5), transparent);
  }

  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 16px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(120, 119, 198, 0.2);
`;

const CardTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TokenInput = styled.div`
  background: linear-gradient(145deg, rgba(10, 30, 10, 0.8) 0%, rgba(20, 40, 20, 0.6) 100%);
  border: 2px solid rgba(34, 139, 34, 0.2);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: rgba(34, 139, 34, 0.4);
  }

  &:focus-within {
    border-color: rgba(34, 139, 34, 0.6);
    box-shadow: 0 0 20px rgba(34, 139, 34, 0.2);
  }
`;

const TokenInputHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const TokenLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Balance = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #32CD32;
  }
`;

const TokenInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const AmountInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 28px;
  font-weight: 600;
  color: white;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }
`;

const TokenSelector = styled.button`
  background: linear-gradient(135deg, #228B22 0%, #32CD32 100%);
  border: none;
  border-radius: 50px;
  padding: 12px 20px;
  color: white;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: center;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 25px rgba(34, 139, 34, 0.4);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const SwapButton = styled.button`
  position: relative;
  background: linear-gradient(135deg, rgba(15, 35, 15, 0.9) 0%, rgba(25, 55, 25, 0.8) 100%);
  border: 2px solid rgba(34, 139, 34, 0.3);
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: -8px auto;
  z-index: 2;
  animation: ${float} 3s ease-in-out infinite;

  &:hover {
    border-color: rgba(34, 139, 34, 0.6);
    transform: rotate(180deg) scale(1.1);
    box-shadow: 0 8px 25px rgba(34, 139, 34, 0.4);
  }
`;

const ActionButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, #228B22 0%, #32CD32 100%);
  border: none;
  border-radius: 16px;
  padding: 20px;
  color: white;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 24px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover::before {
    left: 100%;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(34, 139, 34, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: rgba(34, 139, 34, 0.3);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }

    &::before {
      display: none;
    }
  }
`;

const InfoCard = styled(Card)`
  height: fit-content;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(120, 119, 198, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
`;

const InfoValue = styled.div`
  color: white;
  font-weight: 600;
  font-size: 14px;
`;

const TaxBadge = styled.div`
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
`;

const SlippageSettings = styled.div`
  background: linear-gradient(145deg, rgba(10, 30, 10, 0.8) 0%, rgba(20, 40, 20, 0.6) 100%);
  border: 2px solid rgba(34, 139, 34, 0.2);
  border-radius: 16px;
  padding: 20px;
  margin-top: 16px;
`;

const SlippageTitle = styled.div`
  color: white;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SlippageButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const SlippageButton = styled.button<{ active: boolean }>`
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #228B22 0%, #32CD32 100%)' 
    : 'rgba(34, 139, 34, 0.2)'};
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active 
      ? 'linear-gradient(135deg, #228B22 0%, #32CD32 100%)' 
      : 'rgba(34, 139, 34, 0.3)'};
  }
`;

const CustomSlippageInput = styled.input`
  background: rgba(34, 139, 34, 0.2);
  border: 1px solid rgba(34, 139, 34, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  font-size: 14px;
  width: 80px;

  &:focus {
    outline: none;
    border-color: #32CD32;
  }
`;

// 新增导航栏样式
const NavBar = styled.div`
  background: linear-gradient(135deg, rgba(15, 35, 15, 0.95) 0%, rgba(25, 55, 25, 0.9) 100%);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(34, 139, 34, 0.3);
  border-radius: 16px;
  padding: 8px;
  margin: 0 auto 32px auto;
  display: flex;
  gap: 8px;
  max-width: 400px;
  width: fit-content;
`;

const NavButton = styled.button<{ active: boolean }>`
  flex: 1;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #228B22 0%, #32CD32 100%)' 
    : 'transparent'};
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;

  &:hover {
    background: ${props => props.active 
      ? 'linear-gradient(135deg, #228B22 0%, #32CD32 100%)' 
      : 'rgba(34, 139, 34, 0.2)'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 14px;
    letter-spacing: 0.5px;
  }
`;

export default function SwapPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'sleeppool' | 'planetpump'>('sleeppool');
  const [swapMode, setSwapMode] = useState<'swap' | 'addLiquidity'>('swap');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<'SLEEPING' | 'OKB'>('OKB');
  const [toToken, setToToken] = useState<'SLEEPING' | 'OKB'>('SLEEPING');
  const [swapSlippage, setSwapSlippage] = useState('0.5');
  const [customSlippage, setCustomSlippage] = useState('');
  const [liquidityAmount1, setLiquidityAmount1] = useState('');
  const [liquidityAmount2, setLiquidityAmount2] = useState('');
  const [selectedPool, setSelectedPool] = useState<'protocol' | 'community'>('protocol');
  const [isConnected, setIsConnected] = useState(false);
  
  // 更新的Mock数据 - 基于合约架构
  const currentPrice = 0.000001; // 1 SLEEPING = 0.000001 OKB
  
  // 双池子架构数据
  const poolData = {
    protocol: { 
      sleeping: 5000000, 
      okb: 5000,
      locked: true,
      type: 'Protocol-Owned Liquidity'
    },
    community: { 
      sleeping: 1000000, 
      okb: 1000,
      locked: false,
      type: 'Community Liquidity'
    }
  };

  const totalLiquidity = {
    sleeping: poolData.protocol.sleeping + poolData.community.sleeping,
    okb: poolData.protocol.okb + poolData.community.okb
  };

  // 基于合约的4阶段税率系统
  const getCurrentTaxPhase = () => {
    // Mock: 假设协议运行了100天
    const daysSinceGenesis = 100;
    
    if (daysSinceGenesis < 182) { // 0-6个月
      return { stage: 1, buyTax: 2, sellTax: 5, daysRemaining: 182 - daysSinceGenesis };
    } else if (daysSinceGenesis < 365) { // 6-12个月
      return { stage: 2, buyTax: 2, sellTax: 4, daysRemaining: 365 - daysSinceGenesis };
    } else if (daysSinceGenesis < 547) { // 12-18个月
      return { stage: 3, buyTax: 1, sellTax: 3, daysRemaining: 547 - daysSinceGenesis };
    } else { // 18个月+
      return { stage: 4, buyTax: 0, sellTax: 0, daysRemaining: 0 };
    }
  };

  const taxPhase = getCurrentTaxPhase();
  const currentTax = fromToken === 'SLEEPING' ? taxPhase.sellTax : taxPhase.buyTax;

  // Buy and Burn 统计数据
  const buyAndBurnStats = {
    totalBurned: 2500000,
    totalOkbSpent: 2500,
    burnCount: 45,
    averageBurnSize: Math.floor(2500000 / 45),
  };

  // AMM价格计算 (简化版)
  const calculateAMMOutput = (inputAmount: number, inputReserve: number, outputReserve: number) => {
    const inputAmountWithFee = inputAmount * 0.997;
    const numerator = inputAmountWithFee * outputReserve;
    const denominator = inputReserve + inputAmountWithFee;
    return numerator / denominator;
  };

  // 计算输出金额
  useEffect(() => {
    if (fromAmount && !isNaN(Number(fromAmount))) {
      const amount = Number(fromAmount);
      let output = 0;
      
      const currentPool = poolData[selectedPool];
      
      if (fromToken === 'SLEEPING') {
        output = calculateAMMOutput(amount, currentPool.sleeping, currentPool.okb);
        output = output * (1 - currentTax / 100);
      } else {
        output = calculateAMMOutput(amount, currentPool.okb, currentPool.sleeping);
        output = output * (1 - currentTax / 100);
      }
      
      setToAmount(output.toFixed(8));
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromToken, toToken, currentTax, selectedPool]);

  const handleSwapDirection = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleSwap = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    const poolType = selectedPool === 'protocol' ? 'Protocol Pool' : 'Community Pool';
    toast.success(`${poolType} Swap coming soon! Tax: ${currentTax}%`);
  };

  const connectWallet = () => {
    setIsConnected(true);
    toast.success('Wallet connected successfully!');
  };

  return (
    <>
      <Head>
        <title>Advanced Swap - Sleep Protocol</title>
        <meta name="description" content="Advanced decentralized exchange for SLEEPING tokens" />
      </Head>
      
      <SwapContainer>
        <Header>
          <Title>
            <MainTitle>SLEEP PROTOCOL</MainTitle>
            <Subtitle>Advanced Decentralized Exchange • Dual Pool AMM</Subtitle>
          </Title>
          <Badge>OKB Network</Badge>
        </Header>

        {/* 导航栏 */}
        <NavBar>
          <NavButton 
            active={activeTab === 'sleeppool'}
            onClick={() => setActiveTab('sleeppool')}
          >
            SleepPool
          </NavButton>
            <NavButton 
              active={activeTab === 'planetpump'} 
              onClick={() => {
                setActiveTab('planetpump');
                window.open('http://localhost:3001', '_blank');
              }}
            >
              行星泵
            </NavButton>
        </NavBar>
        
        <SwapWrapper>
          {/* 主交易区 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  Token Exchange
                </CardTitle>
                <TaxBadge>Stage {taxPhase.stage} • {currentTax}% Tax</TaxBadge>
              </CardHeader>

              {/* Pool Selection */}
              <div style={{ marginBottom: '24px' }}>
                <TokenLabel style={{ marginBottom: '12px' }}>Select Pool</TokenLabel>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <TokenSelector
                    onClick={() => setSelectedPool('protocol')}
                    style={{
                      background: selectedPool === 'protocol' 
                        ? 'linear-gradient(135deg, #228B22 0%, #32CD32 100%)' 
                        : 'rgba(34, 139, 34, 0.2)',
                      flex: 1
                    }}
                  >
                    Protocol Pool
                  </TokenSelector>
                  <TokenSelector
                    onClick={() => setSelectedPool('community')}
                    style={{
                      background: selectedPool === 'community' 
                        ? 'linear-gradient(135deg, #228B22 0%, #32CD32 100%)' 
                        : 'rgba(34, 139, 34, 0.2)',
                      flex: 1
                    }}
                  >
                    Community Pool
                  </TokenSelector>
                </div>
              </div>

              {/* From Token */}
              <TokenInput>
                <TokenInputHeader>
                  <TokenLabel>From</TokenLabel>
                  <Balance>Balance: 0.00</Balance>
                </TokenInputHeader>
                <TokenInputRow>
                  <AmountInput
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <TokenSelector onClick={() => {}}>
                    {fromToken} ▼
                  </TokenSelector>
                </TokenInputRow>
                {fromAmount && (
                  <div style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    ≈ ${(Number(fromAmount) * (fromToken === 'SLEEPING' ? currentPrice : 1)).toFixed(6)} USD
                  </div>
                )}
              </TokenInput>

              {/* Swap Button */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                <SwapButton onClick={handleSwapDirection}>
                  ⇅
                </SwapButton>
              </div>

              {/* To Token */}
              <TokenInput>
                <TokenInputHeader>
                  <TokenLabel>To (After Tax)</TokenLabel>
                  <Balance>Tax: {currentTax}%</Balance>
                </TokenInputHeader>
                <TokenInputRow>
                  <AmountInput
                    type="number"
                    value={toAmount}
                    readOnly
                    placeholder="0.00"
                    style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  />
                  <TokenSelector onClick={() => {}}>
                    {toToken} ▼
                  </TokenSelector>
                </TokenInputRow>
                {toAmount && (
                  <div style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    ≈ ${(Number(toAmount) * (toToken === 'OKB' ? 1 : currentPrice)).toFixed(6)} USD
                  </div>
                )}
              </TokenInput>

              {/* Slippage Settings */}
              <SlippageSettings>
                <SlippageTitle>
                  <span>Slippage Tolerance</span>
                  <span style={{ color: '#7877C6' }}>{customSlippage || swapSlippage}%</span>
                </SlippageTitle>
                <SlippageButtons>
                  {['0.1', '0.5', '1.0', '2.0'].map(value => (
                    <SlippageButton
                      key={value}
                      active={swapSlippage === value && !customSlippage}
                      onClick={() => {
                        setSwapSlippage(value);
                        setCustomSlippage('');
                      }}
                    >
                      {value}%
                    </SlippageButton>
                  ))}
                  <CustomSlippageInput
                    type="number"
                    placeholder="Custom"
                    value={customSlippage}
                    onChange={(e) => setCustomSlippage(e.target.value)}
                    max="50"
                    min="0.1"
                    step="0.1"
                  />
                </SlippageButtons>
              </SlippageSettings>

              {/* Action Button */}
              {!isConnected ? (
                <ActionButton onClick={connectWallet}>
                  Connect Wallet
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleSwap}
                  disabled={!fromAmount || !toAmount}
                >
                  Swap Tokens
                </ActionButton>
              )}
            </Card>
          </div>

          {/* 信息面板 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Pool Statistics */}
            <InfoCard>
              <CardHeader>
                <CardTitle style={{ fontSize: '20px' }}>Pool Statistics</CardTitle>
              </CardHeader>
              <InfoRow>
                <InfoLabel>Total SLEEPING</InfoLabel>
                <InfoValue>{totalLiquidity.sleeping.toLocaleString()}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Total OKB</InfoLabel>
                <InfoValue>{totalLiquidity.okb.toLocaleString()}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Current Price</InfoLabel>
                <InfoValue>1 SLEEPING = {currentPrice} OKB</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>24h Volume</InfoLabel>
                <InfoValue>$45,678</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Total Value Locked</InfoLabel>
                <InfoValue>${((totalLiquidity.sleeping * currentPrice + totalLiquidity.okb)).toLocaleString()}</InfoValue>
              </InfoRow>
            </InfoCard>

            {/* Tax Information */}
            <InfoCard>
              <CardHeader>
                <CardTitle style={{ fontSize: '20px' }}>Tax Information</CardTitle>
              </CardHeader>
              <InfoRow>
                <InfoLabel>Current Stage</InfoLabel>
                <InfoValue>Stage {taxPhase.stage}/4</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Buy Tax</InfoLabel>
                <InfoValue>{taxPhase.buyTax}%</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Sell Tax</InfoLabel>
                <InfoValue>{taxPhase.sellTax}%</InfoValue>
              </InfoRow>
              {taxPhase.daysRemaining > 0 && (
                <InfoRow>
                  <InfoLabel>Next Stage In</InfoLabel>
                  <InfoValue>{taxPhase.daysRemaining} days</InfoValue>
                </InfoRow>
              )}
            </InfoCard>

            {/* Buy & Burn Statistics */}
            <InfoCard>
              <CardHeader>
                <CardTitle style={{ fontSize: '20px' }}>Buy & Burn</CardTitle>
              </CardHeader>
              <InfoRow>
                <InfoLabel>Total Burned</InfoLabel>
                <InfoValue style={{ color: '#FF6B6B' }}>
                  {buyAndBurnStats.totalBurned.toLocaleString()} SLEEPING
                </InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Burn Events</InfoLabel>
                <InfoValue>{buyAndBurnStats.burnCount}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>OKB Spent</InfoLabel>
                <InfoValue>{buyAndBurnStats.totalOkbSpent.toLocaleString()}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Avg Burn Size</InfoLabel>
                <InfoValue>{buyAndBurnStats.averageBurnSize.toLocaleString()}</InfoValue>
              </InfoRow>
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(255, 107, 107, 0.1)', 
                border: '1px solid rgba(255, 107, 107, 0.3)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                {taxPhase.stage === 1 ? '5%' : taxPhase.stage === 2 ? '10%' : taxPhase.stage === 3 ? '15%' : '20%'} of treasury revenue is used for token buyback and burn
              </div>
            </InfoCard>
          </div>
        </SwapWrapper>
      </SwapContainer>
    </>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}