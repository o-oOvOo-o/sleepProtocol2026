import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { StatRow, StatLabel, StatValue, Win98Button } from './index';

interface LitepaperProps {}

export const Litepaper: React.FC<LitepaperProps> = () => {
  const { t } = useTranslation('common');
  const [currentSection, setCurrentSection] = useState('ethos');

  const litepaperSections = [
    { 
      key: 'ethos', 
      titleKey: 'sleepProtocol.litepaper.ethos.title',
      icon: '■'
    },
    { 
      key: 'tokenomics', 
      titleKey: 'sleepProtocol.litepaper.tokenomics.title',
      icon: '♦'
    },
    { 
      key: 'mint-fee', 
      titleKey: 'sleepProtocol.litepaper.mintFee.title',
      icon: '▲',
      isSub: true 
    },
    { 
      key: 'dynamic-term', 
      titleKey: 'sleepProtocol.litepaper.dynamicTerm.title',
      icon: '▼',
      isSub: true 
    },
    { 
      key: 'population-pressure', 
      titleKey: 'sleepProtocol.litepaper.populationPressure.title',
      icon: '◄',
      isSub: true 
    },
    { 
      key: 'time-decay', 
      titleKey: 'sleepProtocol.litepaper.timeDecay.title',
      icon: '►',
      isSub: true 
    },
    { 
      key: 'tax', 
      titleKey: 'sleepProtocol.litepaper.tax.title',
      icon: '♠',
      isSub: true 
    },
    { 
      key: 'fee-distribution', 
      titleKey: 'sleepProtocol.litepaper.feeDistribution.title',
      icon: '♣',
      isSub: true 
    },
    { 
      key: 'staking', 
      titleKey: 'sleepProtocol.litepaper.staking.title',
      icon: '♥'
    },
    { 
      key: 'nft', 
      titleKey: 'sleepProtocol.litepaper.nft.title',
      icon: '♪'
    },
    { 
      key: 'roadmap', 
      titleKey: 'sleepProtocol.litepaper.roadmap.title',
      icon: '☆'
    }
  ];

  const renderLitepaperContent = () => {
    switch (currentSection) {
      case 'ethos':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              {t('sleepProtocol.litepaper.ethos.title')}
            </h3>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.ethos.p1')}
            </p>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.ethos.p2')}
            </p>
            <div style={{ marginLeft: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.ethos.pillar1')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>
                  {t('sleepProtocol.litepaper.ethos.pillar1Text')}
                </p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.ethos.pillar2')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>
                  {t('sleepProtocol.litepaper.ethos.pillar2Text')}
                </p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.ethos.pillar3')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>
                  {t('sleepProtocol.litepaper.ethos.pillar3Text')}
                </p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.ethos.pillar4')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>
                  {t('sleepProtocol.litepaper.ethos.pillar4Text')}
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'tokenomics':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              {t('sleepProtocol.litepaper.tokenomics.title')}
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.tokenomics.intro')}
            </p>
            <div style={{ background: '#f0f0f0', padding: '16px', border: '2px inset #c0c0c0', marginBottom: '16px' }}>
              <h4 style={{ color: '#000080', marginBottom: '12px' }}>{t('sleepProtocol.litepaper.tokenomics.keyMetrics')}</h4>
              <StatRow>
                <StatLabel>{t('sleepProtocol.litepaper.tokenomics.totalSupply')}:</StatLabel>
                <StatValue>10,000,000,000,000 SLEEP</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.litepaper.tokenomics.mintingMechanism')}:</StatLabel>
                <StatValue>Dynamic based on rank & time</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.litepaper.tokenomics.stakingRewards')}:</StatLabel>
                <StatValue>OKB + SLEEP dual rewards</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.litepaper.tokenomics.feeStructure')}:</StatLabel>
                <StatValue>0.01 OKB per mint</StatValue>
              </StatRow>
            </div>
          </div>
        );
      
      case 'mint-fee':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              {t('sleepProtocol.litepaper.mintFee.title')}
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.mintFee.content')}
            </p>
            <div style={{ background: '#fff3cd', padding: '12px', border: '2px inset #c0c0c0', borderLeft: '4px solid #ffc107' }}>
              <strong>{t('sleepProtocol.litepaper.mintFee.tip')}</strong>
            </div>
          </div>
        );
      
      case 'dynamic-term':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              {t('sleepProtocol.litepaper.dynamicTerm.title')}
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.dynamicTerm.content')}
            </p>
            <div style={{ background: '#d1ecf1', padding: '12px', border: '2px inset #c0c0c0', borderLeft: '4px solid #17a2b8' }}>
              <strong>{t('sleepProtocol.litepaper.dynamicTerm.timeline')}</strong>
            </div>
          </div>
        );
      
      case 'population-pressure':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              {t('sleepProtocol.litepaper.populationPressure.title')}
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.populationPressure.content')}
            </p>
            <div style={{ background: '#f8d7da', padding: '12px', border: '2px inset #c0c0c0', borderLeft: '4px solid #dc3545' }}>
              <strong>{t('sleepProtocol.litepaper.populationPressure.important')}</strong>
            </div>
          </div>
        );
      
      case 'time-decay':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              {t('sleepProtocol.litepaper.timeDecay.title')}
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.timeDecay.content')}
            </p>
            <div style={{ background: '#d4edda', padding: '12px', border: '2px inset #c0c0c0', borderLeft: '4px solid #28a745' }}>
              <strong>{t('sleepProtocol.litepaper.timeDecay.result')}</strong>
            </div>
          </div>
        );
      
      case 'tax':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              {t('sleepProtocol.litepaper.tax.title')}
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.tax.content')}
            </p>
            <div style={{ marginLeft: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.tax.phase1')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{t('sleepProtocol.litepaper.tax.phase1Tax')}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.tax.phase2')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{t('sleepProtocol.litepaper.tax.phase2Tax')}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.tax.phase3')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{t('sleepProtocol.litepaper.tax.phase3Tax')}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.tax.phase4')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{t('sleepProtocol.litepaper.tax.phase4Tax')}</p>
              </div>
            </div>
          </div>
        );
      
      case 'fee-distribution':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              {t('sleepProtocol.litepaper.feeDistribution.title')}
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              {t('sleepProtocol.litepaper.feeDistribution.content')}
            </p>
            <div style={{ marginLeft: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.feeDistribution.beforeRank')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{t('sleepProtocol.litepaper.feeDistribution.beforeRankText')}</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#000080' }}>{t('sleepProtocol.litepaper.feeDistribution.afterRank')}</strong>
                <p style={{ marginTop: '4px', lineHeight: '1.6' }}>{t('sleepProtocol.litepaper.feeDistribution.afterRankText')}</p>
              </div>
            </div>
          </div>
        );

      case 'staking':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              质押机制
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              Sleep Protocol 采用创新的双代币质押奖励机制，用户可以质押 SLEEP 代币获得 OKB 和 SLEEP 双重奖励。
            </p>
            <div style={{ background: '#e8f4fd', padding: '16px', border: '2px inset #c0c0c0', marginBottom: '16px' }}>
              <h4 style={{ color: '#000080', marginBottom: '12px' }}>质押特性</h4>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                <li>多周期奖励池：6天、30天、90天、360天、720天</li>
                <li>LongerPaysMore 加成：最高 +206% APY（1500天）</li>
                <li>BiggerBenefit 机制：大额质押额外 +6% APY</li>
                <li>Access Pass NFT：每张卡最多6个质押记录</li>
                <li>强制清算机制：100天未领取面临清算风险</li>
              </ul>
            </div>
          </div>
        );

      case 'nft':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              NFT 系统
            </h3>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
              Sleep Protocol 基于 ERC-6551 Token Bound Accounts 技术，为每个 NFT 创建独立的智能合约钱包。
            </p>
            <div style={{ background: '#f0f8e8', padding: '16px', border: '2px inset #c0c0c0', marginBottom: '16px' }}>
              <h4 style={{ color: '#000080', marginBottom: '12px' }}>NFT 特性</h4>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                <li>Minting Position NFT：铸造记录 NFT 化</li>
                <li>Access Pass NFT：质押凭证，支持自定义设计</li>
                <li>Dynamic SVG：实时显示余额和奖励数据</li>
                <li>Token Bound Account：每个 NFT 拥有独立钱包地址</li>
                <li>可交易性：支持在二级市场自由交易</li>
              </ul>
            </div>
          </div>
        );

      case 'roadmap':
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>
              发展路线图
            </h3>
            <div style={{ marginLeft: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#000080' }}>Phase 1: 核心功能 (Q4 2024)</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>SLEEP 代币铸造机制</li>
                  <li>基础质押功能</li>
                  <li>Access Pass NFT 系统</li>
                  <li>Web3 钱包集成</li>
                </ul>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#000080' }}>Phase 2: 高级功能 (Q1 2025)</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>多周期奖励池</li>
                  <li>清算游戏机制</li>
                  <li>NFT 市场交易</li>
                  <li>移动端应用</li>
                </ul>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#000080' }}>Phase 3: 生态扩展 (Q2 2025)</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>跨链桥接</li>
                  <li>DeFi 协议集成</li>
                  <li>治理代币发布</li>
                  <li>社区 DAO 建设</li>
                </ul>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#000080' }}>Phase 4: 全球化 (Q3-Q4 2025)</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>多语言支持</li>
                  <li>全球市场推广</li>
                  <li>机构合作伙伴</li>
                  <li>Layer 2 部署</li>
                </ul>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div>
            <h3 style={{ color: '#000080', marginBottom: '16px' }}>Welcome to Sleep Protocol Litepaper!</h3>
            <p>Please select a section from the table of contents to begin reading.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: '16px' }}>
      {/* Left Sidebar - Table of Contents */}
      <div style={{ 
        width: '300px', 
        background: '#c0c0c0', 
        border: '2px inset #c0c0c0', 
        padding: '16px',
        height: 'fit-content',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        <h3 style={{ 
          color: '#000080', 
          marginBottom: '16px', 
          borderBottom: '2px solid #808080', 
          paddingBottom: '8px'
        }}>
          {t('sleepProtocol.litepaper.tableOfContents')}
        </h3>
        
        <div>
          {litepaperSections.map((section) => (
            <Win98Button
              key={section.key}
              style={{
                width: '100%',
                textAlign: 'left',
                marginBottom: '4px',
                padding: section.isSub ? '6px 6px 6px 24px' : '8px 12px',
                fontSize: section.isSub ? '14px' : '16px',
                background: currentSection === section.key ? '#000080' : '#c0c0c0',
                color: currentSection === section.key ? 'white' : 'black',
                border: currentSection === section.key ? '2px inset #c0c0c0' : '2px outset #c0c0c0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => setCurrentSection(section.key)}
            >
              <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{section.icon}</span>
              <span style={{ flex: 1, fontSize: section.isSub ? '13px' : '14px' }}>
                {t(section.titleKey)}
              </span>
            </Win98Button>
          ))}
        </div>
      </div>

      {/* Right Content Area */}
      <div style={{ 
        flex: 1,
        background: 'white',
        border: '2px inset #c0c0c0',
        padding: '24px',
        height: 'fit-content',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        {renderLitepaperContent()}
      </div>
    </div>
  );
};
