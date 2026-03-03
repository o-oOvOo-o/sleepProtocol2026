import React from 'react';
import { useTranslation } from 'next-i18next';
import { DataCard, CardTitle, StatRow, StatLabel, StatValue } from './index';
import { useUserMintData, useUserStakeData, useProtocolStats } from '~/hooks/useSubgraphData';

interface DashboardProps {
  isConnected: boolean;
  address?: string;
  sleepBalance: any;
  userStakeData: any;
  globalRank: number;
  amplifier: number;
  maxTerm: number;
  timeDecay: number;
  safeFormatBalance: (balance: any, decimals?: number) => string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  isConnected,
  address,
  sleepBalance,
  userStakeData,
  globalRank,
  amplifier,
  maxTerm,
  timeDecay,
  safeFormatBalance
}) => {
  const { t } = useTranslation('common');
  
  // 从 Subgraph 获取真实数据
  const { data: subgraphMintData, loading: mintLoading } = useUserMintData();
  const { data: subgraphStakeData, loading: stakeLoading } = useUserStakeData();
  const { data: protocolStats, loading: statsLoading } = useProtocolStats();
  
  // 使用 Subgraph 数据，如果可用的话
  const displayMintData = subgraphMintData || null;
  const displayStakeData = subgraphStakeData || userStakeData;

  return (
    <div>
      <h2 style={{ color: '#000080', marginBottom: '16px' }}>{t('sleepProtocol.nav.dashboard')}</h2>
      
      {!isConnected ? (
        <DataCard style={{ textAlign: 'center' }}>
          <CardTitle>{t('sleepProtocol.common.walletRequired')}</CardTitle>
          <p style={{ margin: '12px 0' }}>{t('sleepProtocol.dashboard.connectDescription')}</p>
          <p style={{ margin: '12px 0', fontSize: '14px', color: '#666' }}>
            { '>>' } {t('sleepProtocol.common.checkBottomRight')}
          </p>
        </DataCard>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <DataCard>
              <CardTitle>{t('sleepProtocol.dashboard.overview')}</CardTitle>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.address')}</StatLabel>
                <StatValue>{address?.slice(0, 6)}...{address?.slice(-4)}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.balance')}</StatLabel>
                <StatValue>{safeFormatBalance(sleepBalance)} SLEEP</StatValue>
              </StatRow>
            </DataCard>

            <DataCard>
              <CardTitle>{t('sleepProtocol.dashboard.minting')}</CardTitle>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.totalMints')}</StatLabel>
                <StatValue>
                  {mintLoading ? t('sleepProtocol.common.loading') : (displayMintData?.totalMints || 0)}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.activeMints')}</StatLabel>
                <StatValue>
                  {mintLoading ? t('sleepProtocol.common.loading') : (displayMintData?.activeMints || 0)}
                </StatValue>
              </StatRow>
              {displayMintData?.maturedMints > 0 && (
                <StatRow>
                  <StatLabel>可领取铸币</StatLabel>
                  <StatValue style={{ color: '#ff6b6b' }}>{displayMintData.maturedMints}</StatValue>
                </StatRow>
              )}
            </DataCard>

            <DataCard>
              <CardTitle>{t('sleepProtocol.dashboard.staking')}</CardTitle>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.totalStaked')}</StatLabel>
                <StatValue>
                  {stakeLoading ? t('sleepProtocol.common.loading') : 
                    (displayStakeData ? safeFormatBalance({ value: BigInt(displayStakeData.totalStaked || '0') }) : '0')} SLEEP
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>活跃质押数</StatLabel>
                <StatValue>
                  {stakeLoading ? t('sleepProtocol.common.loading') : (displayStakeData?.activeDeposits || 0)}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.rewards')}</StatLabel>
                <StatValue>{userStakeData ? safeFormatBalance(userStakeData.userRewards) : '0'} OKB</StatValue>
              </StatRow>
            </DataCard>
          </div>

          <DataCard>
            <CardTitle>{t('sleepProtocol.dashboard.protocol')}</CardTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.globalRank')}</StatLabel>
                <StatValue>{globalRank > 0 ? globalRank.toLocaleString() : t('sleepProtocol.common.loading')}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.amplifier')}</StatLabel>
                <StatValue>{amplifier ? amplifier.toFixed(4) : '0.0000'}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.maxTerm')}</StatLabel>
                <StatValue>{maxTerm || 0} {t('sleepProtocol.common.days')}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.timeDecay')}</StatLabel>
                <StatValue>{timeDecay ? timeDecay.toFixed(4) : '0.0000'}</StatValue>
              </StatRow>
            </div>
          </DataCard>

          {/* 协议统计数据 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <DataCard>
              <CardTitle style={{ color: '#26A17B' }}>🏦 协议统计</CardTitle>
              <StatRow>
                <StatLabel>总铸币数量</StatLabel>
                <StatValue>
                  {statsLoading ? t('sleepProtocol.common.loading') : 
                    (protocolStats?.globalStats?.totalMinted ? 
                      Number(protocolStats.globalStats.totalMinted).toLocaleString() : '0')}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>总质押数量</StatLabel>
                <StatValue>
                  {statsLoading ? t('sleepProtocol.common.loading') : 
                    (protocolStats?.globalStats?.totalStaked ? 
                      safeFormatBalance({ value: BigInt(protocolStats.globalStats.totalStaked) }) + ' SLEEP' : '0 SLEEP')}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>总收入</StatLabel>
                <StatValue>
                  {statsLoading ? t('sleepProtocol.common.loading') : 
                    (protocolStats?.treasuryStats?.totalRevenue ? 
                      safeFormatBalance({ value: BigInt(protocolStats.treasuryStats.totalRevenue) }) + ' OKB' : '0 OKB')}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>当前纪元</StatLabel>
                <StatValue>
                  {statsLoading ? t('sleepProtocol.common.loading') : 
                    (protocolStats?.treasuryStats?.currentEpoch || '0')}
                </StatValue>
              </StatRow>
            </DataCard>

            <DataCard>
              <CardTitle style={{ color: '#ff6b6b' }}>🔥 市场统计</CardTitle>
              <StatRow>
                <StatLabel>总交易量</StatLabel>
                <StatValue>
                  {statsLoading ? t('sleepProtocol.common.loading') : 
                    (protocolStats?.marketStats?.totalVolume ? 
                      safeFormatBalance({ value: BigInt(protocolStats.marketStats.totalVolume) }) + ' OKB' : '0 OKB')}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>总销售数</StatLabel>
                <StatValue>
                  {statsLoading ? t('sleepProtocol.common.loading') : 
                    (protocolStats?.marketStats?.totalSales || '0')}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>铸币NFT挂单</StatLabel>
                <StatValue>
                  {statsLoading ? t('sleepProtocol.common.loading') : 
                    (protocolStats?.marketStats?.mintingNFTListings || '0')}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>通行证挂单</StatLabel>
                <StatValue>
                  {statsLoading ? t('sleepProtocol.common.loading') : 
                    (protocolStats?.marketStats?.accessPassListings || '0')}
                </StatValue>
              </StatRow>
            </DataCard>
          </div>

          {/* 协议信息卡片 */}
          <DataCard style={{ marginTop: '16px' }}>
            <CardTitle style={{ color: '#ffc107' }}>📊 协议信息</CardTitle>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(0, 128, 128, 0.1) 0%, rgba(0, 29, 20, 0.8) 100%)',
              border: '2px solid #008080',
              padding: '16px',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#008080', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                Sleep Protocol 正在运行
              </div>
              <div style={{ color: '#9FD8C7', fontSize: '14px', lineHeight: '1.5' }}>
                {statsLoading ? '加载中...' : 
                  `全局排名: ${protocolStats?.globalStats?.globalRank || '0'} | 
                   总铸币: ${protocolStats?.globalStats?.totalMinted ? Number(protocolStats.globalStats.totalMinted).toLocaleString() : '0'}`
                }
              </div>
            </div>
          </DataCard>
        </>
      )}
    </div>
  );
};

