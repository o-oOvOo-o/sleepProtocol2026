import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'react-hot-toast';
import { DataCard, CardTitle, StatRow, StatLabel, StatValue, Win98Label, Win98Button, Win98Input } from './index';
import { Swap } from './Swap';
import { NFTMarket } from './NFTMarket';

// 🚀 真实合约数据获取函数 - 我们的独家优势！
const fetchRealNFTListings = async (): Promise<MarketListing[]> => {
  // TODO: 实现真实的合约调用
  
  // === 第一步：获取所有在售的 NFTs ===
  // 1. 调用 TokenMarketplace.getAllListings() 获取所有在售 NFT
  // 2. 分离 Mint Card NFTs 和 Access Pass NFTs (储蓄卡)
  
  // === 第二步：对于每个 Access Pass NFT，获取详细信息 ===
  // 🎯 基础信息
  // - TokenAccessPass.tokenURI(tokenId) 获取 metadata 和 SVG 设计
  // - TokenAccessPass.ownerOf(tokenId) 获取当前持有者
  
  // 🎯 质押详细信息（我们的杀手锏！）
  // - TokenStaking.getNftStakingSummary(tokenId) 获取总览
  // - TokenStaking.getNftDeposits(tokenId) 获取6笔存款详情
  // - TokenStaking.getClaimableRewards(tokenId) 获取可领取奖励
  
  // 🎯 每笔存款的详细分析
  // for (let i = 0; i < 6; i++) {
  //   const deposit = deposits[i];
  //   if (deposit.isActive) {
  //     // 计算到期时间和过期状态
  //     const maturityTime = deposit.timestamp + (deposit.stakingDays * 86400);
  //     const now = Date.now() / 1000;
  //     const isMatured = now >= maturityTime;
  //     const isOverdue = now > (maturityTime + (6 * 86400)); // 6天宽限期
  //     const overdueDays = isOverdue ? Math.floor((now - maturityTime - (6 * 86400)) / 86400) : 0;
  //     
  //     // 计算当前惩罚百分比
  //     const penaltyPercent = calculatePenaltyPercent(overdueDays);
  //     
  //     // 计算总 APY
  //     const baseAPY = 100; // 基础 APY
  //     const longerPaysMoreBonus = calculateLongerPaysMoreBonus(deposit.stakingDays);
  //     const totalAPY = baseAPY + longerPaysMoreBonus + deposit.biggerBenefit;
  //   }
  // }
  
  // 🎯 Dev Support 信息
  // - TokenDevSupport.checkDevSupportAmount(tokenId)
  // - TokenDevSupport.totalSupportReceived()
  // - 计算贡献占比和等级
  
  // 🎯 分红池参与情况
  // - TokenStaking.isDepositEligibleForPeriod(tokenId, depositIndex, period)
  // - 检查每笔存款在各个分红池的参与资格
  
  // 🎯 风险评估
  // - 分析每笔存款的清算风险
  // - 计算面临的总惩罚金额
  // - 预测下次惩罚增加时间
  
  throw new Error('fetchRealNFTListings not implemented yet - 但现在我们知道要获取什么数据了！');
};

// 生成储蓄卡预览 SVG
// 注意：design 参数应该从真实的 NFT metadata 中获取
// 这些参数对应 AccessPass.tsx 中用户设计的实际值：
// - bgColor1, bgColor2, bgGradientDirection: 背景渐变设计
// - avatarType, avatarSkinColor: 头像设计
// - badgeType: 徽章选择
// - countryCode: 国家选择
// - patternType, patternColor: 图案装饰
const generateSavingsCardPreview = (design: any, tokenId: string, stakingInfo: any, rank: number): JSX.Element => {
  const gradientDirections = [
    { x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
    { x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
    { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }
  ];

  const badges = ["", "🚀", "💎", "🌙", "⚡️"];
  const selectedBadge = badges[design.badgeType] || "";

  const avatarTypes = [
    `<circle cx="25" cy="25" r="15" fill="${design.avatarSkinColor}" stroke="#333" stroke-width="1"/>
     <circle cx="20" cy="20" r="2" fill="#000"/><circle cx="30" cy="20" r="2" fill="#000"/>
     <ellipse cx="25" cy="30" rx="3" ry="2" fill="#000"/>`,
    `<ellipse cx="25" cy="25" rx="15" ry="18" fill="${design.avatarSkinColor}" stroke="#333" stroke-width="1"/>
     <ellipse cx="20" cy="20" rx="2" ry="1" fill="#000"/><ellipse cx="30" cy="20" rx="2" ry="1" fill="#000"/>
     <path d="M20,30 Q25,33 30,30" stroke="#000" stroke-width="1" fill="none"/>`,
    `<rect x="10" y="10" width="30" height="30" rx="5" fill="${design.avatarSkinColor}" stroke="#333" stroke-width="1"/>
     <rect x="18" y="18" width="3" height="3" fill="#000"/><rect x="28" y="18" width="3" height="3" fill="#000"/>
     <rect x="22" y="28" width="6" height="2" fill="#000"/>`
  ];

  const patterns = [
    "",
    `<circle cx="50" cy="50" r="20" fill="none" stroke="${design.patternColor}" stroke-width="2" opacity="0.3"/>
     <circle cx="150" cy="80" r="15" fill="none" stroke="${design.patternColor}" stroke-width="2" opacity="0.3"/>`,
    `<rect x="30" y="30" width="20" height="20" fill="none" stroke="${design.patternColor}" stroke-width="1" opacity="0.3"/>
     <rect x="120" y="60" width="15" height="15" fill="none" stroke="${design.patternColor}" stroke-width="1" opacity="0.3"/>`,
    `<path d="M20,20 Q50,10 80,20 Q110,30 140,20" stroke="${design.patternColor}" stroke-width="2" fill="none" opacity="0.3"/>
     <path d="M20,60 Q50,50 80,60 Q110,70 140,60" stroke="${design.patternColor}" stroke-width="2" fill="none" opacity="0.3"/>`
  ];

  return (
    <svg width="360" height="225" viewBox="0 0 400 250" style={{ border: '2px solid #ccc', borderRadius: '8px', maxWidth: '100%' }}>
      <defs>
        <linearGradient 
          id={`cardGradient-${tokenId}`}
          x1={gradientDirections[design.bgGradientDirection].x1}
          y1={gradientDirections[design.bgGradientDirection].y1}
          x2={gradientDirections[design.bgGradientDirection].x2}
          y2={gradientDirections[design.bgGradientDirection].y2}
        >
          <stop offset="0%" stopColor={design.bgColor1} />
          <stop offset="100%" stopColor={design.bgColor2} />
        </linearGradient>
        
        <style>{`
          .card-title { font: bold 12px 'MS Sans Serif'; fill: #000080; }
          .card-subtitle { font: normal 10px 'MS Sans Serif'; fill: #000080; }
          .card-holder { font: bold 8px 'MS Sans Serif'; fill: #000080; }
          .card-address { font: normal 7px 'MS Sans Serif'; fill: #000080; }
          .card-label { font: normal 7px 'MS Sans Serif'; fill: #000080; }
          .card-value { font: bold 8px 'MS Sans Serif'; fill: #000080; }
        `}
        </style>
      </defs>
      
      {/* 储蓄卡背景 */}
      <rect width="400" height="250" rx="12" fill={`url(#cardGradient-${tokenId})`} stroke="#404040" strokeWidth="2" />
      <rect x="3" y="3" width="394" height="244" rx="9" fill="none" stroke="#ffffff" strokeWidth="1" />
      <rect x="2" y="2" width="396" height="246" rx="10" fill="none" stroke="#e0e0e0" strokeWidth="1" />
      <rect x="0" y="25" width="400" height="12" fill="#000000" />
      <rect x="2" y="27" width="396" height="8" fill="#333333" />
      
      {/* 图案 */}
      <g dangerouslySetInnerHTML={{ __html: patterns[design.patternType] || "" }} />
      
      {/* Logo区域 */}
      <text x="15" y="55" className="card-title">SLEEP PROTOCOL</text>
      <text x="15" y="70" className="card-subtitle">储蓄卡 SAVINGS CARD</text>
      
      {/* 头像区域 */}
      <g transform="translate(15, 85)">
        <g dangerouslySetInnerHTML={{ __html: avatarTypes[design.avatarType] || avatarTypes[0] }} />
      </g>
      
      {/* 徽章 */}
      {selectedBadge && (
        <text x="320" y="70" style={{ fontSize: '24px' }}>{selectedBadge}</text>
      )}
      
      {/* 卡号 */}
      <text x="15" y="160" className="card-holder">CARD NO.</text>
      <text x="15" y="175" className="card-value" style={{ fontSize: '12px' }}>#{tokenId}</text>
      
      {/* 质押信息 */}
      <text x="15" y="200" className="card-label">TOTAL STAKED</text>
      <text x="15" y="215" className="card-value" style={{ fontSize: '10px' }}>
        {stakingInfo.totalStaked.toLocaleString()} SLEEPING
      </text>
      
      {/* 永久锁定信息 */}
      {stakingInfo.permanentLocked > 0 && (
        <>
          <text x="15" y="235" className="card-label">PERMANENT LOCKED</text>
          <text x="15" y="250" className="card-value" style={{ fontSize: '10px', fill: '#ff6b35' }}>
            ♾️ {stakingInfo.permanentLocked.toLocaleString()} SLEEPING
          </text>
        </>
      )}
      
      {/* Dev Support 信息 */}
      {stakingInfo.devSupport?.isDevSupporter && (
        <>
          <text x="250" y="180" className="card-label">DEV SUPPORT</text>
          <text x="250" y="195" className="card-value" style={{ fontSize: '9px' }}>
            {stakingInfo.devSupport.supportAmount.toLocaleString()} / {stakingInfo.devSupport.totalSupportPool.toLocaleString()}
          </text>
          <text x="250" y="210" className="card-value" style={{ fontSize: '8px', fill: '#26A17B' }}>
            ({stakingInfo.devSupport.contributionPercent.toFixed(1)}%)
          </text>
        </>
      )}
      
      {/* 右侧其他信息 */}
      <text x="250" y={stakingInfo.devSupport?.isDevSupporter ? "230" : "180"} className="card-label">RANK</text>
      <text x="250" y={stakingInfo.devSupport?.isDevSupporter ? "245" : "195"} className="card-value" style={{ fontSize: '9px' }}>
        GLOBAL #{rank}
      </text>
      
      {/* 国旗区域 */}
      <rect x="320" y="200" width="60" height="40" fill="#f0f0f0" stroke="#333" strokeWidth="1" rx="4" />
      <text x="350" y="225" style={{ font: 'bold 16px MS Sans Serif', fill: '#000080', textAnchor: 'middle' }}>
        {design.countryCode}
      </text>
      
      {/* 底部装饰线 */}
      <rect x="15" y="245" width="370" height="2" fill="#000080" opacity="0.3" />
    </svg>
  );
};

interface MarketListing {
  id: string;
  tokenId: string;
  seller: string;
  price: string;
  nftType: 'mint-card' | 'savings-card';
  nft: {
    count: number;
    term: number;
    rank: number;
    // 储蓄卡特有属性
    design?: {
      bgColor1: string;
      bgColor2: string;
      bgGradientDirection: number;
      avatarType: number;
      avatarSkinColor: string;
      badgeType: number;
      countryCode: string;
      patternType: number;
      patternColor: string;
    };
    // 🚀 完整的储蓄卡质押信息（我们的独家优势！）
    stakingInfo?: {
      // === 基础质押信息 ===
      totalStaked: number;        // 总质押数量
      totalShares: number;        // 总分红权
      permanentLocked: number;    // 永久锁定数量
      depositCount: number;       // 存款笔数 (1-6)
      maxBiggerBenefit: number;   // 最高 BiggerBenefit 等级 (0-6%)
      
      // === 详细存款记录 (我们的杀手锏！) ===
      deposits: Array<{
        depositIndex: number;     // 存款索引 (0-5)
        amount: number;          // 存款金额
        shares: number;          // 分红权
        timestamp: number;       // 存款时间戳
        stakingDays: number;     // 质押天数
        biggerBenefit: number;   // APY 加成等级
        isInfinite: boolean;     // 是否无限质押
        isActive: boolean;       // 是否活跃
        
        // === 奖励和状态信息 ===
        claimableRewards: number; // 可领取奖励 (不受惩罚影响)
        maturityTime: number;     // 到期时间
        daysUntilMaturity: number; // 距离到期天数
        isMatured: boolean;       // 是否已到期
        isOverdue: boolean;       // 是否过期
        overduedays: number;      // 过期天数
        
        // === 本金取回惩罚 (战略选择) ===
        penaltyPercent: number;   // 本金取回惩罚百分比
        recoverableAmount: number; // 可取回的本金数量 (扣除惩罚后)
        penaltyAmount: number;    // 惩罚的本金数量
        
        // === 收益分析 ===
        totalAPY: number;         // 总 APY (基础 + BiggerBenefit + LongerPaysMore)
        baseAPY: number;          // 基础 APY
        longerPaysMoreBonus: number; // 时长加成
        estimatedTotalReward: number; // 预估总奖励
      }>;
      
      // === Dev Support 信息 ===
      devSupport?: {
        isDevSupporter: boolean;    // 是否为 Dev Supporter
        supportAmount: number;      // 支持金额
        totalSupportPool: number;   // 总支持池
        contributionPercent: number; // 贡献占比
        supportTier: number;        // 支持等级
      };
      
      // === 分红池参与情况 ===
      dividendEligibility: {
        sixDayPool: boolean;      // 是否参与6天池
        thirtyDayPool: boolean;   // 是否参与30天池
        ninetyDayPool: boolean;   // 是否参与90天池
        threeSixtyDayPool: boolean; // 是否参与360天池
        sevenTwentyDayPool: boolean; // 是否参与720天池
      };
      
      // === 风险评估 ===
      riskAssessment: {
        liquidationRisk: 'none' | 'low' | 'medium' | 'high'; // 本金清算风险
        nextPenaltyIncrease: number; // 下次惩罚增加时间
        totalPenaltyAtRisk: number;  // 面临的总本金惩罚金额
        totalRecoverableAmount: number; // 总可取回本金数量
        totalRewardsAtRisk: number;  // 🎯 奖励风险 (永远为0！)
      };
    };
  };
}

interface MarketProps {
  isConnected: boolean;
  onPurchaseNFT?: (listing: MarketListing) => Promise<void>;
}

export const Market: React.FC<MarketProps> = ({
  isConnected,
  onPurchaseNFT
}) => {
  const { t } = useTranslation('common');
  
  // 标签页状态 - 添加nftmarket到原有的swap标签中
  const [swapTab, setSwapTab] = useState<'sleeppool' | 'nftmarket' | 'planetpump'>('sleeppool');
  
  // NFT Market 状态
  const [marketListings, setMarketListings] = useState<MarketListing[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [purchasingTokenId, setPurchasingTokenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price' | 'rank'>('newest');
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [termFilter, setTermFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [nftCategory, setNftCategory] = useState<'all' | 'mint-card' | 'savings-card'>('all');


  // Swap InfoRow 组件
  const InfoRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      padding: '8px 0', 
      fontSize: '14px', 
      borderBottom: '1px dotted #26A17B',
      background: highlight ? 'rgba(38, 161, 123, 0.1)' : 'transparent'
    }}>
      <span style={{ color: '#9FD8C7' }}>{label}:</span>
      <span style={{ color: highlight ? '#26A17B' : '#50AF95', fontWeight: 'bold' }}>{value}</span>
    </div>
  );

  // 双池子架构数据 - 使用真实数据
  const poolData = {
    protocol: { 
      sleeping: 0, // 刚部署的合约，无流动性
      okb: 0,
      locked: true,
      type: 'Protocol-Owned Liquidity'
    },
    community: { 
      sleeping: 0, // 刚部署的合约，无流动性
      okb: 0,
      locked: false,
      type: 'Community Liquidity'
    }
  };

  const totalLiquidity = {
    sleeping: poolData.protocol.sleeping + poolData.community.sleeping,
    okb: poolData.protocol.okb + poolData.community.okb
  };

  // 当前价格 - 基于真实流动性计算
  const currentPrice = totalLiquidity.sleeping > 0 && totalLiquidity.okb > 0 
    ? totalLiquidity.okb / totalLiquidity.sleeping 
    : 0; // 无流动性时价格为0

  // 基于合约的4阶段税率系统
  const getCurrentTaxPhase = () => {
    // TODO: 从合约获取真实的genesis时间
    // 目前返回默认值，因为合约刚部署
    const daysSinceGenesis = 0; // 刚部署的合约
    
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

  // Buy and Burn 统计数据 - 使用真实数据
  const buyAndBurnStats = {
    totalBurned: 0, // 刚部署的合约，无销毁记录
    totalOkbSpent: 0, // 花费的OKB数量
    burnCount: 0, // 销毁次数
    lastBurnAmount: 0, // 最后一次销毁数量
    averageBurnSize: 0, // 平均销毁规模
  };

  // AMM价格计算 (简化版)
  const calculateAMMOutput = (inputAmount: number, inputReserve: number, outputReserve: number) => {
    // x * y = k 恒定乘积公式
    // 加入0.3%的交易费用
    const inputAmountWithFee = inputAmount * 0.997;
    const numerator = inputAmountWithFee * outputReserve;
    const denominator = inputReserve + inputAmountWithFee;
    return numerator / denominator;
  };

  // NFT Market 数据获取
  const fetchMarketListings = async () => {
    setMarketLoading(true);
    setMarketError(null);
    
    try {
      // TODO: 替换为真实的合约调用
      // const realListings = await fetchRealNFTListings();
      
      // 模拟 API 调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 🚀 临时模拟数据 - 展示我们的独家优势！
      const mockListings: MarketListing[] = [
        // Mint Cards
        {
          id: '1',
          tokenId: '1001',
          seller: '0x1234...5678',
          price: '0.5',
          nftType: 'mint-card',
          nft: { count: 100, term: 365, rank: 1500 }
        },
        {
          id: '2',
          tokenId: '1002',
          seller: '0xabcd...efgh',
          price: '1.2',
          nftType: 'mint-card',
          nft: { count: 250, term: 180, rank: 800 }
        },
        {
          id: '3',
          tokenId: '1003',
          seller: '0x9876...5432',
          price: '0.8',
          nftType: 'mint-card',
          nft: { count: 150, term: 270, rank: 1200 }
        },
        // 储蓄卡 - 用户自定义设计
        {
          id: '4',
          tokenId: '2001',
          seller: '0x4567...8901',
          price: '2.5',
          nftType: 'savings-card',
          nft: {
            count: 5000,
            term: 0,
            rank: 25,
            design: {
              bgColor1: '#FFD700',
              bgColor2: '#FFA500',
              bgGradientDirection: 0,
              avatarType: 0,
              avatarSkinColor: '#FFDBAC',
              badgeType: 2,
              countryCode: 'US',
              patternType: 1,
              patternColor: '#FFFFFF'
            },
            stakingInfo: {
              // === 基础质押信息 ===
              totalStaked: 125000,
              totalShares: 130000,
              permanentLocked: 50000,
              depositCount: 3,
              maxBiggerBenefit: 5, // 5% APY 加成
              
              // === 详细存款记录 (我们的杀手锏！) ===
              deposits: [
                {
                  depositIndex: 0,
                  amount: 50000,
                  shares: 52000,
                  timestamp: 1704067200, // 2024-01-01
                  stakingDays: 365,
                  biggerBenefit: 4,
                  isInfinite: false,
                  isActive: true,
                  claimableRewards: 2500,
                  maturityTime: 1735689600, // 2025-01-01
                  daysUntilMaturity: 45,
                  isMatured: false,
                  isOverdue: false,
                  overduedays: 0,
                  
                  // === 本金取回惩罚 (战略选择) ===
                  penaltyPercent: 0, // 未过期，无惩罚
                  recoverableAmount: 50000, // 全额可取回
                  penaltyAmount: 0, // 无惩罚
                  
                  totalAPY: 312, // 100% + 206% + 6%
                  baseAPY: 100,
                  longerPaysMoreBonus: 206,
                  estimatedTotalReward: 15600
                },
                {
                  depositIndex: 1,
                  amount: 25000,
                  shares: 26000,
                  timestamp: 1706745600, // 2024-02-01
                  stakingDays: 180,
                  biggerBenefit: 5,
                  isInfinite: false,
                  isActive: true,
                  claimableRewards: 4200, // 🎯 奖励不受惩罚影响！
                  maturityTime: 1722297600, // 2024-08-01
                  daysUntilMaturity: -90, // 已过期
                  isMatured: true,
                  isOverdue: true,
                  overduedays: 84, // 过期84天
                  
                  // === 本金取回惩罚 (战略选择) ===
                  penaltyPercent: 78, // 🚨 只惩罚本金取回！
                  recoverableAmount: 5500, // 25000 * (100% - 78%) = 5500 SLEEP
                  penaltyAmount: 19500, // 25000 * 78% = 19500 SLEEP 被惩罚
                  
                  totalAPY: 229,
                  baseAPY: 100,
                  longerPaysMoreBonus: 124,
                  estimatedTotalReward: 5725 // 总奖励预估不变
                },
                {
                  depositIndex: 2,
                  amount: 50000,
                  shares: 52000,
                  timestamp: 1709424000, // 2024-03-01
                  stakingDays: 1500, // 无限质押
                  biggerBenefit: 5,
                  isInfinite: true,
                  isActive: true,
                  claimableRewards: 5200,
                  maturityTime: 0, // 无限质押无到期
                  daysUntilMaturity: -1,
                  isMatured: false,
                  isOverdue: false,
                  overduedays: 0,
                  
                  // === 本金取回惩罚 (战略选择) ===
                  penaltyPercent: 0, // 无限质押，无惩罚
                  recoverableAmount: 50000, // 全额可取回
                  penaltyAmount: 0, // 无惩罚
                  
                  totalAPY: 472, // 100% + 366% + 6%
                  baseAPY: 100,
                  longerPaysMoreBonus: 366, // 无限模式奖励
                  estimatedTotalReward: 23600
                }
              ],
              
              // === Dev Support 信息 ===
              devSupport: {
                isDevSupporter: true,
                supportAmount: 25000,
                totalSupportPool: 200000,
                contributionPercent: 12.5,
                supportTier: 3
              },
              
              // === 分红池参与情况 ===
              dividendEligibility: {
                sixDayPool: true,
                thirtyDayPool: true,
                ninetyDayPool: true,
                threeSixtyDayPool: true,
                sevenTwentyDayPool: false // 第二笔存款错过了720天池
              },
              
              // === 风险评估 ===
              riskAssessment: {
                liquidationRisk: 'medium', // 第二笔存款本金风险较高
                nextPenaltyIncrease: 1735689600, // 下次惩罚增加时间
                totalPenaltyAtRisk: 19500, // 第二笔存款本金面临的惩罚
                totalRecoverableAmount: 105500, // 总可取回本金 (50000 + 5500 + 50000)
                totalRewardsAtRisk: 0 // 🎯 奖励永远不会被惩罚！
              }
            }
          }
        },
        {
          id: '5',
          tokenId: '2002',
          seller: '0x5678...9012',
          price: '1.8',
          nftType: 'savings-card',
          nft: {
            count: 3000,
            term: 0,
            rank: 156,
            design: {
              bgColor1: '#0066CC',
              bgColor2: '#003366',
              bgGradientDirection: 1,
              avatarType: 2,
              avatarSkinColor: '#C0C0C0',
              badgeType: 1,
              countryCode: 'JP',
              patternType: 2,
              patternColor: '#00CCFF'
            },
            stakingInfo: {
              totalStaked: 75000,
              totalShares: 78000,
              permanentLocked: 0,
              depositCount: 2,
              maxBiggerBenefit: 3,
              deposits: [],
              devSupport: {
                isDevSupporter: false,
                supportAmount: 0,
                totalSupportPool: 200000,
                contributionPercent: 0,
                supportTier: 0
              },
              dividendEligibility: {
                sixDayPool: true,
                thirtyDayPool: true,
                ninetyDayPool: false,
                threeSixtyDayPool: false,
                sevenTwentyDayPool: false
              },
              riskAssessment: {
                liquidationRisk: 'none',
                nextPenaltyIncrease: 0,
                totalPenaltyAtRisk: 0,
                totalRecoverableAmount: 75000,
                totalRewardsAtRisk: 0
              }
            }
          }
        },
        {
          id: '6',
          tokenId: '2003',
          seller: '0x6789...0123',
          price: '3.2',
          nftType: 'savings-card',
          nft: {
            count: 8000,
            term: 0,
            rank: 8,
            design: {
              bgColor1: '#FF1493',
              bgColor2: '#9400D3',
              bgGradientDirection: 2,
              avatarType: 1,
              avatarSkinColor: '#FFDBAC',
              badgeType: 4,
              countryCode: 'CN',
              patternType: 3,
              patternColor: '#FFD700'
            },
            stakingInfo: {
              totalStaked: 500000,
              totalShares: 520000,
              permanentLocked: 300000,
              depositCount: 6,
              maxBiggerBenefit: 6,
              deposits: [],
              devSupport: {
                isDevSupporter: true,
                supportAmount: 150000,
                totalSupportPool: 1000000,
                contributionPercent: 15.0,
                supportTier: 5
              },
              dividendEligibility: {
                sixDayPool: true,
                thirtyDayPool: true,
                ninetyDayPool: true,
                threeSixtyDayPool: true,
                sevenTwentyDayPool: true
              },
              riskAssessment: {
                liquidationRisk: 'low',
                nextPenaltyIncrease: 0,
                totalPenaltyAtRisk: 0,
                totalRecoverableAmount: 500000,
                totalRewardsAtRisk: 0
              }
            }
          }
        }
      ];
      
      setMarketListings(mockListings);
    } catch (error) {
      setMarketError('获取市场数据失败');
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    if (swapTab === 'nftmarket') {
      fetchMarketListings();
    }
  }, [swapTab]);


  const handlePurchase = async (listing: MarketListing) => {
    if (!isConnected) {
      toast.error('请先连接钱包！');
      return;
    }

    setPurchasingTokenId(listing.tokenId);
    
    try {
      if (onPurchaseNFT) {
        await onPurchaseNFT(listing);
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success(`成功购买 NFT #${listing.tokenId}！`);
        setMarketListings(prev => prev.filter(item => item.id !== listing.id));
      }
    } catch (error) {
      toast.error('购买失败');
    } finally {
      setPurchasingTokenId(null);
    }
  };


  const renderNFTMarket = () => (
    <div>
      {!isConnected ? (
        <DataCard style={{ textAlign: 'center' }}>
          <CardTitle>钱包连接必需</CardTitle>
          <p style={{ margin: '12px 0' }}>请连接您的钱包以查看和购买 NFT</p>
        </DataCard>
      ) : (
        <>
          {/* 筛选控件 */}
          <DataCard style={{ marginBottom: '16px' }}>
            <CardTitle>🔍 筛选和排序</CardTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <Win98Label>NFT 类型</Win98Label>
                <select 
                  value={nftCategory}
                  onChange={(e) => setNftCategory(e.target.value as any)}
                  style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontWeight: 'bold' }}
                >
                  <option value="all">🎯 全部 NFT</option>
                  <option value="mint-card">💰 Mint Card</option>
                  <option value="savings-card">💳 储蓄卡</option>
                </select>
              </div>
              <div>
                <Win98Label>排序方式</Win98Label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0' }}
                >
                  <option value="newest">最新上架</option>
                  <option value="price">价格排序</option>
                  <option value="rank">排名排序</option>
                </select>
              </div>
              <div>
                <Win98Label>价格筛选</Win98Label>
                <select 
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as any)}
                  style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0' }}
                >
                  <option value="all">全部价格</option>
                  <option value="low">低价 (&lt;0.5 OKB)</option>
                  <option value="mid">中价 (0.5-1.5 OKB)</option>
                  <option value="high">高价 (&gt;1.5 OKB)</option>
                </select>
              </div>
              <div>
                <Win98Label>期限筛选</Win98Label>
                <select 
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value as any)}
                  style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0' }}
                >
                  <option value="all">全部期限</option>
                  <option value="short">短期 (&lt;180天)</option>
                  <option value="medium">中期 (180-300天)</option>
                  <option value="long">长期 (&gt;300天)</option>
                </select>
              </div>
            </div>
          </DataCard>

          {/* NFT 列表 */}
          {marketLoading ? (
            <DataCard style={{ textAlign: 'center', padding: '40px' }}>
              <p>加载中...</p>
            </DataCard>
          ) : marketError ? (
            <DataCard style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'red' }}>{marketError}</p>
              <Win98Button onClick={fetchMarketListings} style={{ marginTop: '12px' }}>
                重试
              </Win98Button>
            </DataCard>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
              {marketListings
                .filter(listing => nftCategory === 'all' || listing.nftType === nftCategory)
                .map((listing) => (
                <DataCard key={listing.id} style={{ 
                  border: listing.nftType === 'savings-card' ? '3px solid #000080' : '2px inset #c0c0c0',
                  background: listing.nftType === 'savings-card' ? '#f0f8ff' : '#c0c0c0',
                  minHeight: listing.nftType === 'savings-card' ? '400px' : 'auto'
                }}>
                  <CardTitle style={{ 
                    color: listing.nftType === 'savings-card' ? '#000080' : '#000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: listing.nftType === 'savings-card' ? '16px' : '8px'
                  }}>
                    {listing.nftType === 'mint-card' ? '💰' : '💳'} 
                    {listing.nftType === 'mint-card' ? 'Mint Card' : '储蓄卡'} #{listing.tokenId}
                  </CardTitle>
                  
                  {/* 储蓄卡完整预览 */}
                  {listing.nftType === 'savings-card' && listing.nft.design && listing.nft.stakingInfo ? (
                    <div style={{ marginBottom: '16px' }}>
                      {generateSavingsCardPreview(listing.nft.design, listing.tokenId, listing.nft.stakingInfo, listing.nft.rank)}
                    </div>
                  ) : null}
                  
                  <div style={{ marginBottom: '12px' }}>
                    <StatRow>
                      <StatLabel>卖家</StatLabel>
                      <StatValue>{listing.seller}</StatValue>
                    </StatRow>
                    <StatRow>
                      <StatLabel>价格</StatLabel>
                      <StatValue style={{ fontWeight: 'bold', color: '#008000', fontSize: '16px' }}>{listing.price} OKB</StatValue>
                    </StatRow>
                    
                    {listing.nftType === 'mint-card' ? (
                      <>
                        <StatRow>
                          <StatLabel>铸造数量</StatLabel>
                          <StatValue>{listing.nft.count}</StatValue>
                        </StatRow>
                        <StatRow>
                          <StatLabel>锁定天数</StatLabel>
                          <StatValue>{listing.nft.term} 天</StatValue>
                        </StatRow>
                        <StatRow>
                          <StatLabel>全局排名</StatLabel>
                          <StatValue>#{listing.nft.rank}</StatValue>
                        </StatRow>
                      </>
                    ) : (
                      <>
                        <StatRow>
                          <StatLabel>总质押数量</StatLabel>
                          <StatValue>{listing.nft.stakingInfo?.totalStaked.toLocaleString() || '0'} SLEEPING</StatValue>
                        </StatRow>
                        
                        {listing.nft.stakingInfo?.permanentLocked && listing.nft.stakingInfo.permanentLocked > 0 && (
                          <StatRow>
                            <StatLabel>永久锁定</StatLabel>
                            <StatValue style={{ color: '#ff6b35', fontWeight: 'bold' }}>
                              ♾️ {listing.nft.stakingInfo.permanentLocked.toLocaleString()} SLEEPING
                            </StatValue>
                          </StatRow>
                        )}
                        
                        {listing.nft.stakingInfo?.devSupport?.isDevSupporter && (
                          <>
                            <StatRow>
                              <StatLabel>Dev Support 贡献</StatLabel>
                              <StatValue style={{ color: '#26A17B' }}>
                                {listing.nft.stakingInfo.devSupport.supportAmount.toLocaleString()} / {listing.nft.stakingInfo.devSupport.totalSupportPool.toLocaleString()}
                              </StatValue>
                            </StatRow>
                            <StatRow>
                              <StatLabel>贡献占比</StatLabel>
                              <StatValue style={{ color: '#26A17B', fontWeight: 'bold' }}>
                                {listing.nft.stakingInfo.devSupport.contributionPercent.toFixed(1)}%
                              </StatValue>
                            </StatRow>
                          </>
                        )}
                        
                        <StatRow>
                          <StatLabel>全局排名</StatLabel>
                          <StatValue>#{listing.nft.rank}</StatValue>
                        </StatRow>
                        
                        {/* 质押信息区域 */}
                        <div style={{ 
                          background: 'rgba(0, 0, 128, 0.1)', 
                          border: '1px dashed #000080', 
                          padding: '8px', 
                          margin: '8px 0',
                          borderRadius: '4px'
                        }}>
                          <div style={{ fontSize: '11px', color: '#000080', fontWeight: 'bold', marginBottom: '4px' }}>
                            💳 储蓄卡质押信息
                          </div>
                          <div style={{ fontSize: '10px', color: '#666' }}>
                            • 国家/地区: {listing.nft.design?.countryCode || 'N/A'}<br/>
                            • 创建时间: {new Date().toLocaleDateString()}<br/>
                            • 状态: {listing.nft.stakingInfo?.permanentLocked ? '部分永久锁定' : '正常质押'}<br/>
                            • 类型: {listing.nft.stakingInfo?.devSupport?.isDevSupporter ? 'Dev Supporter' : '普通储蓄卡'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <Win98Button
                    onClick={() => handlePurchase(listing)}
                    disabled={purchasingTokenId === listing.tokenId}
                    style={{ 
                      width: '100%', 
                      background: listing.nftType === 'savings-card' ? '#000080' : '#008000',
                      color: 'white',
                      opacity: purchasingTokenId === listing.tokenId ? 0.6 : 1,
                      fontWeight: 'bold'
                    }}
                  >
                    {purchasingTokenId === listing.tokenId ? '购买中...' : 
                     `💳 购买 ${listing.nftType === 'mint-card' ? 'Mint Card' : '储蓄卡'}`}
                  </Win98Button>
                </DataCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderSwap = () => (
    <Swap isConnected={isConnected} />
  );


  // 行星泵渲染函数
  const renderPlanetPump = () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '400px',
      textAlign: 'center'
    }}>
      <div style={{ 
        fontSize: '48px', 
        marginBottom: '20px',
        animation: 'float 3s ease-in-out infinite'
      }}>
        🪐
      </div>
      <div style={{ 
        fontSize: '24px', 
        fontWeight: 'bold', 
        marginBottom: '12px',
        color: '#FF4500'
      }}>
        行星泵 SWAP
      </div>
      <div style={{ 
        fontSize: '16px', 
        color: '#666', 
        marginBottom: '20px'
      }}>
        Revolutionary Planetary Pump Mechanism
      </div>
      <div style={{ 
        background: '#FF4500', 
        color: 'white', 
        padding: '8px 16px', 
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '16px'
      }}>
        开发中 • Coming Soon
      </div>
      <div style={{ 
        maxWidth: '400px', 
        fontSize: '14px', 
        lineHeight: '1.6',
        color: '#666'
      }}>
        行星泵Swap是Sleep Protocol即将推出的革命性交易机制，
        模拟行星引力泵送的物理现象，创造前所未有的流动性聚合体验。
      </div>
    </div>
  );

  return (
    <div>
      {/* Win98 风格标签页 */}
      <div style={{ marginBottom: '0' }}>
        <div style={{ 
          display: 'flex',
          position: 'relative',
          zIndex: 1
        }}>
          <div
            onClick={() => setSwapTab('sleeppool')}
            style={{
              padding: '8px 20px',
              background: swapTab === 'sleeppool' ? '#c0c0c0' : '#a0a0a0',
              border: swapTab === 'sleeppool' ? '2px outset #c0c0c0' : '2px outset #a0a0a0',
              borderBottom: swapTab === 'sleeppool' ? '2px solid #c0c0c0' : '2px inset #a0a0a0',
              marginRight: '2px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              color: swapTab === 'sleeppool' ? '#000' : '#666',
              position: 'relative',
              top: swapTab === 'sleeppool' ? '0' : '2px',
              zIndex: swapTab === 'sleeppool' ? 2 : 1,
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px'
            }}
          >
            SleepPool
          </div>
          <div
            onClick={() => setSwapTab('nftmarket')}
            style={{
              padding: '8px 20px',
              background: swapTab === 'nftmarket' ? '#c0c0c0' : '#a0a0a0',
              border: swapTab === 'nftmarket' ? '2px outset #c0c0c0' : '2px outset #a0a0a0',
              borderBottom: swapTab === 'nftmarket' ? '2px solid #c0c0c0' : '2px inset #a0a0a0',
              marginRight: '2px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              color: swapTab === 'nftmarket' ? '#000' : '#666',
              position: 'relative',
              top: swapTab === 'nftmarket' ? '0' : '2px',
              zIndex: swapTab === 'nftmarket' ? 2 : 1,
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px'
            }}
          >
            🏪 NFT市场
          </div>
          <div
            onClick={() => setSwapTab('planetpump')}
            style={{
              padding: '8px 20px',
              background: swapTab === 'planetpump' ? '#c0c0c0' : '#a0a0a0',
              border: swapTab === 'planetpump' ? '2px outset #c0c0c0' : '2px outset #a0a0a0',
              borderBottom: swapTab === 'planetpump' ? '2px solid #c0c0c0' : '2px inset #a0a0a0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              color: swapTab === 'planetpump' ? '#000' : '#666',
              position: 'relative',
              top: swapTab === 'planetpump' ? '0' : '2px',
              zIndex: swapTab === 'planetpump' ? 2 : 1,
              borderTopLeftRadius: '4px',
              borderTopRightRadius: '4px'
            }}
          >
            行星泵
          </div>
        </div>
      </div>

      {/* 内容区域 - Win98 风格 */}
      <div style={{ 
        minHeight: '500px',
        background: '#c0c0c0',
        border: '2px inset #c0c0c0',
        padding: '16px',
        marginTop: '-2px',
        position: 'relative',
        zIndex: 0
      }}>
        {swapTab === 'sleeppool' ? renderSwap() : 
         swapTab === 'nftmarket' ? <NFTMarket isConnected={isConnected} /> : 
         renderPlanetPump()}
      </div>
    </div>
  );
};