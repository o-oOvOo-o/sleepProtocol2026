import React from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'react-hot-toast';
import { DataCard, CardTitle, Win98Button } from './index';
import { ensureArray } from './utils';

interface LiquidateProps {
  isConnected: boolean;
}

export const Liquidate: React.FC<LiquidateProps> = ({ isConnected }) => {
  const { t } = useTranslation('common');

  const handleRefresh = () => {
    toast.success(t('sleepProtocol.liquidate.actions.refreshToast'));
  };

  const handleHistory = () => {
    toast.success(t('sleepProtocol.liquidate.actions.historyToast'));
  };

  return (
    <div>
      <h2 style={{ color: '#000080', marginBottom: '16px' }}>{t('sleepProtocol.liquidate.title')}</h2>
      
      {!isConnected ? (
        <DataCard style={{ textAlign: 'center' }}>
          <CardTitle>Connect Wallet Required</CardTitle>
          <p style={{ margin: '12px 0' }}>To play the liquidation game, please connect your wallet.</p>
          <p style={{ margin: '12px 0', fontSize: '14px', color: '#666' }}>
            Check the bottom right corner and click the flashing "Wallet" button
          </p>
        </DataCard>
      ) : (
        <>
          {/* 清算游戏概述 */}
          <DataCard style={{ marginBottom: '16px' }}>
            <CardTitle>{t('sleepProtocol.liquidate.overview.title')}</CardTitle>
            <div style={{ background: '#f0f0f0', padding: '12px', border: '1px inset #c0c0c0', fontSize: '16px', lineHeight: '1.4' }}>
              {ensureArray<string>(t('sleepProtocol.liquidate.overview.points', { returnObjects: true }) as string[]).map((line, idx) => (
                <p key={idx} style={{ margin: '8px 0' }} dangerouslySetInnerHTML={{ __html: line }} />
              ))}
            </div>
          </DataCard>

          {/* 游戏规则说明 */}
          <DataCard style={{ marginBottom: '16px' }}>
            <CardTitle>🎮 游戏规则</CardTitle>
            <div style={{ background: '#f8f8f8', padding: '12px', border: '1px inset #c0c0c0' }}>
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#000080', margin: '0 0 8px 0' }}>清算机制：</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                  <li>用户超过100天未领取奖励将面临清算风险</li>
                  <li>任何人都可以发起清算，获得5%的清算奖励</li>
                  <li>被清算用户失去95%的质押奖励</li>
                  <li>清算奖励立即发放给清算发起者</li>
                </ul>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#008000', margin: '0 0 8px 0' }}>奖励分配：</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                  <li>清算发起者：获得被清算金额的5%</li>
                  <li>协议金库：获得被清算金额的45%</li>
                  <li>质押奖励池：获得被清算金额的50%</li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: '#800080', margin: '0 0 8px 0' }}>风险提醒：</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                  <li>定期领取奖励可避免被清算</li>
                  <li>清算是不可逆的操作</li>
                  <li>建议设置提醒定期检查账户状态</li>
                </ul>
              </div>
            </div>
          </DataCard>
          
          {/* 可清算列表 */}
          <DataCard style={{ marginBottom: '16px' }}>
            <CardTitle>{t('sleepProtocol.liquidate.listings.title')}</CardTitle>
            <div style={{ padding: '12px', border: '1px inset #c0c0c0', background: '#f8f8f8', marginBottom: '12px' }}>
              <p style={{ textAlign: 'center', margin: '20px 0', color: '#666' }}>{t('sleepProtocol.liquidate.listings.searching')}</p>
              <div style={{ textAlign: 'center' }}>
                <small style={{ color: '#666' }}>{t('sleepProtocol.liquidate.listings.hint')}</small>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <Win98Button 
                onClick={handleRefresh}
                style={{ fontSize: '10px' }}
              >
                {t('sleepProtocol.liquidate.actions.refresh')}
              </Win98Button>
              <Win98Button 
                onClick={handleHistory}
                style={{ fontSize: '10px' }}
              >
                📋 {t('sleepProtocol.liquidate.actions.history')}
              </Win98Button>
            </div>
          </DataCard>

          {/* 统计信息 */}
          <DataCard>
            <CardTitle>📊 清算统计</CardTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#f8f8f8', border: '1px inset #c0c0c0' }}>
                <div style={{ fontSize: '24px', color: '#ff6b6b', fontWeight: 'bold' }}>0</div>
                <div style={{ fontSize: '10px', color: '#666' }}>可清算账户</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '12px', background: '#f8f8f8', border: '1px inset #c0c0c0' }}>
                <div style={{ fontSize: '24px', color: '#51cf66', fontWeight: 'bold' }}>0</div>
                <div style={{ fontSize: '10px', color: '#666' }}>今日清算</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '12px', background: '#f8f8f8', border: '1px inset #c0c0c0' }}>
                <div style={{ fontSize: '24px', color: '#339af0', fontWeight: 'bold' }}>0.00</div>
                <div style={{ fontSize: '10px', color: '#666' }}>清算奖励 (OKB)</div>
              </div>
              
              <div style={{ textAlign: 'center', padding: '12px', background: '#f8f8f8', border: '1px inset #c0c0c0' }}>
                <div style={{ fontSize: '24px', color: '#845ef7', fontWeight: 'bold' }}>5%</div>
                <div style={{ fontSize: '10px', color: '#666' }}>清算奖励率</div>
              </div>
            </div>
          </DataCard>

          {/* 操作提示 */}
          <DataCard style={{ marginTop: '16px' }}>
            <CardTitle>💡 操作提示</CardTitle>
            <div style={{ background: '#fff3cd', padding: '12px', border: '1px solid #ffeaa7', fontSize: '14px' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#856404' }}>
                如何参与清算游戏：
              </p>
              <ol style={{ margin: '0', paddingLeft: '20px', color: '#856404' }}>
                <li>定期检查可清算列表</li>
                <li>选择超过100天未领取奖励的账户</li>
                <li>点击"清算"按钮发起清算</li>
                <li>确认交易并等待执行</li>
                <li>获得5%的清算奖励</li>
              </ol>
            </div>
          </DataCard>
        </>
      )}
    </div>
  );
};
