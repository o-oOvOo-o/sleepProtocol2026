import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'react-hot-toast';
import { useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { DataCard, CardTitle } from './index';
import { useMintTokens } from '~/hooks/useContractWrite';
import { useSleepContext } from '~/contexts/SleepContext';

interface MintProps {
  isConnected: boolean;
  globalRank: number;
  amplifier: number;
  maxTerm: number;
  timeDecay: number;
  onMintSubmit?: (count: number, term: number) => Promise<void>;
}

export const Mint: React.FC<MintProps> = ({
  isConnected,
  globalRank,
  amplifier,
  maxTerm,
  timeDecay,
  onMintSubmit
}) => {
  const { t } = useTranslation('common');
  
  // 使用 Sleep Context 获取合约常量
  const { maxTermDays, maxMintCount } = useSleepContext();
  
  const [count, setCount] = useState('');
  const [term, setTerm] = useState('');
  const [isMintCardFlipped, setIsMintCardFlipped] = useState(false);
  
  // 使用真实的合约交互 Hook
  const { mint, status, error, reset } = useMintTokens();
  
  // 获取用户余额
  const { data: balance } = useBalance();
  
  const safeMintCount = Number(count) || 0;
  const safeMintTerm = Number(term) || 0;

  // 计算预计奖励
  const calculateReward = () => {
    if (globalRank > 0 && safeMintCount > 0 && safeMintTerm > 0) {
      const baseReward = safeMintCount * safeMintTerm * 1000;
      return Math.floor(baseReward * amplifier * timeDecay);
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!count || !term) {
      toast.error('请填写完整信息');
      return;
    }
    
    const mintCount = Number(count);
    const mintTerm = Number(term);
    
    if (mintCount <= 0 || mintTerm <= 0) {
      toast.error('请输入有效数值');
      return;
    }
    
    // 使用合约常量进行验证
    if (mintCount > maxMintCount) {
      toast.error(`每次铸造数量不能超过 ${maxMintCount} 个`);
      return;
    }
    
    if (mintTerm > maxTermDays) {
      toast.error(`锁定天数不能超过 ${maxTermDays} 天`);
      return;
    }
    
    try {
      // 使用真实的合约交互
      await mint(Number(count), Number(term));
      
      // 成功后的动画效果
      setIsMintCardFlipped(true);
      setTimeout(() => {
        setIsMintCardFlipped(false);
        setCount('');
        setTerm('');
        reset(); // 重置交易状态
      }, 3000);
      
    } catch (error) {
      console.error('Mint error:', error);
      // 错误处理已经在 useMintTokens hook 中处理了
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '600px' }}>
      {!isConnected ? (
        <DataCard style={{ textAlign: 'center', padding: '60px', maxWidth: '500px' }}>
          <CardTitle style={{ fontSize: '24px', marginBottom: '20px' }}>
            钱包连接必需
          </CardTitle>
          <p style={{ margin: '16px 0', fontSize: '18px', lineHeight: '1.5' }}>
            请连接您的钱包以开始铸造 SLEEPING 代币
          </p>
          <p style={{ margin: '16px 0', fontSize: '14px', color: '#666' }}>
            {'>> 请检查右下角并点击闪烁的"Wallet"按钮'}
          </p>
        </DataCard>
      ) : (
        <div style={{ perspective: '1000px', width: '100%', maxWidth: '800px' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.7s',
            transform: isMintCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}>
            {/* 正面 - 铸造表单 */}
            <div style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}>
              <div style={{
                width: '100%',
                height: '500px',
                background: '#85bb65',
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(45, 80, 22, 0.03) 2px, rgba(45, 80, 22, 0.03) 4px)',
                border: '8px double #2d5016',
                position: 'relative',
                padding: '40px',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(45, 80, 22, 0.3)'
              }}>
                {/* 水印 */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '320px',
                  color: 'rgba(45, 80, 22, 0.05)',
                  fontWeight: 'bold',
                  zIndex: 0,
                  userSelect: 'none'
                }}>$</div>
                
                {/* 序列号 */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '30px',
                  fontSize: '12px',
                  color: '#2d5016',
                  fontFamily: 'monospace',
                  letterSpacing: '2px'
                }}>
                  SL {Math.random().toString().slice(2, 10)}
                </div>
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '30px',
                  fontSize: '12px',
                  color: '#2d5016',
                  fontFamily: 'monospace',
                  letterSpacing: '2px'
                }}>
                  SL {Math.random().toString().slice(2, 10)}
                </div>
                
                {/* 顶部文字 */}
                <div style={{
                  textAlign: 'center',
                  color: '#2d5016',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '4px',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  THE UNITED STATES OF AMERICA
                </div>
                <div style={{
                  textAlign: 'center',
                  color: '#2d5016',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  marginBottom: '30px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  THIS NOTE IS LEGAL TENDER FOR SLEEPING MINT
                </div>
                
                {/* 左侧徽章 */}
                <div style={{
                  position: 'absolute',
                  top: '90px',
                  left: '40px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2d5016 0%, #1a3d0f 100%)',
                  border: '3px solid #85bb65',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1
                }}>
                  <div style={{ fontSize: '28px', color: '#85bb65' }}>$</div>
                  <div style={{ fontSize: '8px', color: '#85bb65', marginTop: '-3px' }}>SLEEP</div>
                </div>
                
                {/* 中央表单区域 */}
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  marginLeft: '140px',
                  marginRight: '40px'
                }}>
                  <form onSubmit={handleSubmit}>
                    {/* 数量输入 */}
                    <div style={{ marginBottom: '25px' }}>
                      <label style={{ 
                        display: 'block',
                        color: '#1a3d0f',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '6px',
                        letterSpacing: '1px'
                      }}>
                        MINT COUNT (铸造数量)
                      </label>
                      <input
                        type="number"
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        min="1"
                        max={maxMintCount}
                        placeholder={`1-${maxMintCount}`}
                        style={{
                          width: '100%',
                          fontSize: '36px',
                          fontWeight: 'bold',
                          border: 'none',
                          background: 'transparent',
                          color: '#1a3d0f',
                          outline: 'none',
                          borderBottom: '2px solid #2d5016',
                          paddingBottom: '4px'
                        }}
                      />
                    </div>
                    
                    {/* 天数输入 */}
                    <div style={{ marginBottom: '25px' }}>
                      <label style={{
                        display: 'block',
                        color: '#1a3d0f',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '6px',
                        letterSpacing: '1px'
                      }}>
                        LOCK TERM (锁定天数) - MAX: {maxTerm}
                      </label>
                      <input
                        type="number"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        min="1"
                        max={maxTerm}
                        placeholder={`1-${maxTerm}`}
                        style={{
                          width: '100%',
                          fontSize: '36px',
                          fontWeight: 'bold',
                          border: 'none',
                          background: 'transparent',
                          color: '#1a3d0f',
                          outline: 'none',
                          borderBottom: '2px solid #2d5016',
                          paddingBottom: '4px'
                        }}
                      />
                    </div>
                    
                    {/* 预计奖励显示 */}
                    {(count && term) && (
                      <div style={{
                        background: 'rgba(45, 80, 22, 0.1)',
                        border: '1px solid #2d5016',
                        padding: '12px',
                        marginBottom: '20px',
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontSize: '10px', color: '#2d5016', marginBottom: '4px', letterSpacing: '1px' }}>
                          ESTIMATED REWARD (预计奖励)
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a3d0f' }}>
                          {calculateReward().toLocaleString()} SLEEPING
                        </div>
                        <div style={{ fontSize: '9px', color: '#2d5016', marginTop: '4px' }}>
                          Rank: {globalRank.toLocaleString()} | Amplifier: {amplifier.toFixed(4)} | Decay: {timeDecay.toFixed(4)}
                        </div>
                      </div>
                    )}

                    {/* 铸造费用显示 */}
                    {(count) && (
                      <div style={{
                        background: 'rgba(220, 53, 69, 0.1)',
                        border: '1px solid #dc3545',
                        padding: '12px',
                        marginBottom: '20px',
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontSize: '10px', color: '#dc3545', marginBottom: '4px', letterSpacing: '1px' }}>
                          MINT FEE REQUIRED (铸造费用)
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                          {(Number(count) * 0.01).toFixed(2)} OKB
                        </div>
                        <div style={{ fontSize: '9px', color: '#dc3545', marginTop: '4px' }}>
                          {count} × 0.01 OKB per unit + Gas Fee
                        </div>
                        {balance && (
                          <div style={{ fontSize: '9px', color: '#dc3545', marginTop: '4px', borderTop: '1px solid rgba(220, 53, 69, 0.3)', paddingTop: '4px' }}>
                            当前余额: {Number(formatEther(balance.value)).toFixed(4)} OKB
                            {Number(formatEther(balance.value)) < (Number(count) * 0.01 + 0.001) && (
                              <span style={{ color: '#dc3545', fontWeight: 'bold' }}> - 余额不足！</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 铸造按钮 */}
                    <button
                      type="submit"
                      disabled={!count || !term || status !== 'idle'}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: (!count || !term || status !== 'idle') ? '#666' : '#2d5016',
                        color: '#85bb65',
                        border: '2px solid #1a3d0f',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: (!count || !term || status !== 'idle') ? 'not-allowed' : 'pointer',
                        opacity: (!count || !term || status !== 'idle') ? 0.6 : 1,
                        letterSpacing: '2px',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {status === 'preparing' && 'PREPARING...'}
                      {status === 'pending' && 'CONFIRM IN WALLET...'}
                      {status === 'confirming' && 'CONFIRMING...'}
                      {status === 'success' && 'SUCCESS!'}
                      {status === 'error' && 'ERROR - TRY AGAIN'}
                      {status === 'idle' && (count && term ? 'MINT NOW' : 'ENTER AMOUNT')}
                    </button>
                  </form>
                </div>
                
                {/* 底部签名 */}
                <div style={{
                  position: 'absolute',
                  bottom: '25px',
                  left: '40px',
                  fontSize: '9px',
                  color: '#2d5016'
                }}>
                  <div>TREASURER OF THE UNITED STATES</div>
                  <div style={{ 
                    fontFamily: '"Brush Script MT", cursive',
                    fontSize: '14px',
                    marginTop: '3px'
                  }}>
                    Sleep Protocol
                  </div>
                </div>
                
                <div style={{
                  position: 'absolute',
                  bottom: '25px',
                  right: '40px',
                  textAlign: 'right',
                  fontSize: '9px',
                  color: '#2d5016'
                }}>
                  <div>SERIES 2025</div>
                  <div style={{
                    marginTop: '3px',
                    padding: '3px 8px',
                    background: '#2d5016',
                    color: '#85bb65',
                    fontWeight: 'bold',
                    fontSize: '10px'
                  }}>
                    SLEEPING
                  </div>
                </div>
              </div>
            </div>
            
            {/* 背面 - 成功提示 */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}>
              <div style={{
                width: '100%',
                height: '500px',
                background: 'linear-gradient(135deg, #26A17B 0%, #50AF95 50%, #26A17B 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '8px solid #1d8163',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(38, 161, 123, 0.4)'
              }}>
                <div style={{ fontSize: '80px', color: '#e8f5f1', marginBottom: '20px' }}>✓</div>
                <h2 style={{ 
                  fontSize: '42px', 
                  fontWeight: 'bold', 
                  color: '#e8f5f1', 
                  marginBottom: '16px', 
                  letterSpacing: '3px',
                  textAlign: 'center'
                }}>
                  MINT SUCCESS!
                </h2>
                <p style={{ fontSize: '20px', color: '#d4ede5', textAlign: 'center' }}>
                  {count} × {term} days
                </p>
                <p style={{ fontSize: '16px', color: '#d4ede5', marginTop: '8px', textAlign: 'center' }}>
                  Your SLEEPING tokens are now minting...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};