// import Layout from '~/components/Layout';
// import Meta from '~/components/Meta';
// import CardContainer from '~/components/containers/CardContainer';
// import ConnectWalletInfo from '~/components/ConnectWalletInfo';
import { useState, useMemo, useEffect } from 'react';
import { NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useAccount } from 'wagmi';
import { useForm, SubmitHandler } from 'react-hook-form';
import toast from 'react-hot-toast';
// import {
//   TicketIcon,
//   Cog6ToothIcon,
//   PaintBrushIcon,
//   SparklesIcon,
//   ArrowPathIcon,
//   SunIcon,
//   MoonIcon,
//   ComputerDesktopIcon,
//   CurrencyDollarIcon,
//   EyeIcon,
//   EyeSlashIcon,
//   UserGroupIcon
// } from '@heroicons/react/24/outline';
// import { SleepAccessPassABI, DevSupportABI } from '~/lib/contracts';
// import Container from '~/components/containers/Container';

// --- Mock Components, Icons, and ABI for Frontend-First Development ---
const MockIcon = () => <span className="w-6 h-6 inline-block bg-gray-500 rounded-sm"></span>;
const TicketIcon = MockIcon;
const Cog6ToothIcon = MockIcon;
const PaintBrushIcon = MockIcon;
const SparklesIcon = MockIcon;
const ArrowPathIcon = MockIcon;
const SunIcon = MockIcon;
const MoonIcon = MockIcon;
const ComputerDesktopIcon = MockIcon;
const CurrencyDollarIcon = MockIcon;
const EyeIcon = MockIcon;
const EyeSlashIcon = MockIcon;
const UserGroupIcon = MockIcon;

const Layout = ({ children }: { children: React.ReactNode }) => <div className="bg-gray-900 text-white min-h-screen">{children}</div>;
const Meta = () => <></>;
const Container = ({ children }: { children: React.ReactNode }) => <div className="max-w-7xl mx-auto px-4">{children}</div>;
const CardContainer = ({ children }: { children: React.ReactNode }) => <div className="bg-gray-800 p-6 rounded-lg shadow-lg">{children}</div>;
const ConnectWalletInfo = () => <div className="text-center py-4 bg-blue-500 text-white rounded-lg">Connect Wallet Area</div>;
const SleepAccessPassABI = [] as const;
const DevSupportABI = [] as const;


// 设计参数的类型定义
interface AccessPassDesign {
  // 背景层
  bgColor1: string;
  bgColor2: string;
  bgGradientDirection: number; // 0: L->R, 1: T->B, 2: diagonal
  patternType: number; // 0: None, 1: Stars, 2: Dots, 3: Grid, 4: Waves
  patternColor: string;
  patternOpacity: number; // 0-100
  
  // 内容层 - 头像设计器
  avatarFaceType: number; // 0-3: 脸型
  avatarEyeType: number; // 0-6: 眼睛类型
  avatarMouthType: number; // 0-5: 嘴巴类型
  avatarHairType: number; // 0-4: 发型
  avatarSkinColor: string; // 肤色
  avatarAccessory: number; // 0-4: 配饰（眼罩、帽子等）
  fontChoice: number; // 0: Sans-serif, 1: Serif, 2: Monospace
  textColor: string;

  // 徽章层
  badgeType: number; // 0: None, 1: Rocket, 2: Diamond, 3: Moon, 4: Lightning
  badgePosition: number; // 0: TL, 1: TR, 2: BL, 3: BR
  badgeColor: string;
}

// Helper function to format large numbers for SVG display
const formatAmountForSvg = (amount: number, decimals: number): string => {
  if (amount === 0) return "0.00";
  const scaledAmount = amount; // Assuming amount is already a normal number, not a BigInt
  const integerPart = Math.floor(scaledAmount);
  const fractionalPart = Math.round((scaledAmount - integerPart) * 100);
  return `${integerPart}.${fractionalPart < 10 ? '0' : ''}${fractionalPart}`;
};

const calculateContributionPercent = (userAmount: number, totalAmount: number): string => {
  if (totalAmount === 0 || userAmount === 0) return "0.00";
  const percentage = (userAmount / totalAmount) * 100;
  return percentage.toFixed(2);
};


// 生成 Access Pass SVG 的函数
const generateAccessPassSvg = (
  design: AccessPassDesign, 
  userAddress: string = "0x1234...abcd", 
  devSupportAmount: number = 0,
  stakedSleep: number = 0,
  claimableOkb: number = 0,
  claimableSleep: number = 0,
  totalSupport: number = 0
): string => {
  const gradientDirections = [
    { x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
    { x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
    { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }
  ];

  const fonts = ["sans-serif", "serif", "monospace"];
  const badges = ["", "🚀", "💎", "🌙", "⚡️"];
  const badgePositions = [
    { x: 30, y: 40 }, { x: 350, y: 40 }, { x: 30, y: 210 }, { x: 350, y: 210 }
  ];

  // 头像生成器
  const generateAvatar = (d: AccessPassDesign) => {
    // 新的复古/像素风格脸型
    const faceTypes = [
      // "颜文字" 风格圆脸
      `<path d="M30,55 C30,30 80,30 80,55 C80,80 30,80 30,55 Z" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="2"/>`,
      // 像素风格方脸
      `<rect x="30" y="30" width="50" height="50" rx="4" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="2"/>`,
      // 豆子脸
      `<path d="M40,30 C20,50 30,90 55,80 C80,70 70,30 50,30 C45,30 42,30 40,30 Z" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="2"/>`,
      // 吐司面包脸
      `<path d="M30,40 C30,30 40,25 55,25 C70,25 80,30 80,40 V75 C80,80 75,85 70,85 H40 C35,85 30,80 30,75 Z" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="2"/>`
    ];

    // 新的表情符号/像素风格眼睛
    const eyeTypes = [
      // 正常 `.`
      `<circle cx="48" cy="50" r="2" fill="#333"/><circle cx="62" cy="50" r="2" fill="#333"/>`,
      // 闭眼 `>` `<`
      `<path d="M45,50 L50,45 L50,55 Z" fill="#333"/><path d="M65,50 L60,45 L60,55 Z" fill="#333"/>`,
      // 像素眼
      `<rect x="45" y="47" width="6" height="6" fill="#333"/><rect x="59" y="47" width="6" height="6" fill="#333"/>`,
      // T_T
      `<path d="M45,47 L51,47 M48,47 L48,55 M59,47 L65,47 M62,47 L62,55" stroke="#333" stroke-width="2" fill="none"/>`,
      // ^_^
      `<path d="M45,52 Q48,47 51,52" stroke="#333" stroke-width="2" fill="none"/><path d="M59,52 Q62,47 65,52" stroke="#333" stroke-width="2" fill="none"/>`,
      // x_x
      `<path d="M45,47 L51,53 M51,47 L45,53 M59,47 L65,53 M65,47 L59,53" stroke="#333" stroke-width="2.5" fill="none"/>`,
      // O_O
      `<circle cx="48" cy="50" r="4" fill="none" stroke="#333" stroke-width="2"/><circle cx="62" cy="50" r="4" fill="none" stroke="#333" stroke-width="2"/>`
    ];

    // 新的表情符号嘴巴
    const mouthTypes = [
      // :)
      `<path d="M48,65 Q55,72 62,65" stroke="#333" stroke-width="2" fill="none"/>`,
      // :3
      `<path d="M50,65 Q52,62 55,65 Q58,62 60,65" stroke="#333" stroke-width="2" fill="none"/>`,
      // :O
      `<ellipse cx="55" cy="67" rx="5" ry="3" fill="none" stroke="#333" stroke-width="2"/>`,
      // :|
      `<line x1="48" y1="67" x2="62" y2="67" stroke="#333" stroke-width="2"/>`,
      // :D
      `<path d="M48,63 Q55,75 62,63 Z" fill="#333"/>`,
      // w
      `<path d="M48,63 L52,68 L55,63 L58,68 L62,63" stroke="#333" stroke-width="2" fill="none"/>`
    ];

    const hairTypes = [
      "", // 无发型/光头
      // 扫把头
      `<path d="M30,40 L40,20 L55,25 L70,20 L80,40" stroke="#333" stroke-width="2" fill="#333" />`,
      // 碗盖头
      `<path d="M25,50 C25,30 85,30 85,50" fill="#333" />`,
      // 爆炸头
      `<circle cx="55" cy="45" r="30" fill="#333" /><circle cx="55" cy="45" r="25" fill="${d.avatarSkinColor}" />`,
      // 飘逸长发
      `<path d="M25,40 C10,60 25,90 40,80 L70,80 C85,90 100,60 85,40" fill="#333" />`
    ];

    // 新的复古/像素风格配饰
    const accessories = [
      "", // 无
      // 像素墨镜
      `<rect x="40" y="45" width="30" height="10" fill="#222" rx="2"/><rect x="42" y="47" width="26" height="2" fill="#555"/>`,
      // 睡帽 (重新设计)
      `<path d="M50,30 C40,20 70,20 60,30 L70,40 L40,40 Z" fill="#4a90e2"/><circle cx="70" cy="40" r="4" fill="white"/>`,
      // 天使光环 (重新设计)
      `<ellipse cx="55" cy="28" rx="20" ry="5" fill="none" stroke="#ffd700" stroke-width="2.5" />`,
      // Zzz 符号 (SVG绘制)
      `<g transform="translate(75, 30)" stroke="#333" stroke-width="2.5" fill="none">
        <path d="M0,0 L8,0 L0,8 L8,8" />
        <path d="M2,12 L10,12 L2,20 L10,20" />
      </g>`
    ];

    const face = faceTypes[d.avatarFaceType] || faceTypes[0];
    const eyes = eyeTypes[d.avatarEyeType] || eyeTypes[0];
    const mouth = mouthTypes[d.avatarMouthType] || mouthTypes[0];
    const hair = hairTypes[d.avatarHairType] || "";
    const accessory = accessories[d.avatarAccessory] || "";

    return `<g transform="translate(30, 80)"><rect x="0" y="0" width="110" height="110" rx="55" fill="white" opacity="0.9"/>${hair}${face}${eyes}${mouth}${accessory}</g>`;
  };

  const gradientDir = gradientDirections[design.bgGradientDirection] || gradientDirections[0];
  const selectedFont = fonts[design.fontChoice] || fonts[0];
  const selectedBadge = badges[design.badgeType] || "";
  const badgePos = badgePositions[design.badgePosition] || badgePositions[0];

  const generatePattern = (d: AccessPassDesign) => {
    if (d.patternType === 0) return "";
    const opacity = d.patternOpacity / 100;
    
    switch (d.patternType) {
      case 1:
        return `<g opacity="${opacity}"><text x="80" y="80" font-size="20" fill="${d.patternColor}">✦</text><text x="300" y="120" font-size="16" fill="${d.patternColor}">✦</text></g>`;
      case 2:
        return `<g opacity="${opacity}"><circle cx="100" cy="70" r="8" fill="${d.patternColor}" /><circle cx="200" cy="90" r="6" fill="${d.patternColor}" /></g>`;
      case 3:
        return `<g opacity="${opacity}" stroke="${d.patternColor}" stroke-width="1" fill="none"><line x1="100" y1="50" x2="100" y2="200" /><line x1="200" y1="50" x2="200" y2="200" /></g>`;
      case 4:
        return `<g opacity="${opacity}" stroke="${d.patternColor}" stroke-width="2" fill="none"><path d="M 50 120 Q 100 100 150 120 T 250 120" /></g>`;
      default:
        return "";
    }
  };

  // 构建基础 SVG
  let svgContent = `<svg width="400" height="250" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="background" x1="${gradientDir.x1}" y1="${gradientDir.y1}" x2="${gradientDir.x2}" y2="${gradientDir.y2}">
        <stop offset="0%" stop-color="${design.bgColor1}" />
        <stop offset="100%" stop-color="${design.bgColor2}" />
      </linearGradient>`;
      
  // 添加扫光效果渐变
  svgContent += `
    <linearGradient id="shineGradient" x1="-50%" y1="-50%" x2="150%" y2="150%" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="rgba(255,255,255,0)" />
      <stop offset="40%" stop-color="rgba(255,255,255,0)" />
      <stop offset="50%" stop-color="rgba(255,255,255,0.6)" />
      <stop offset="60%" stop-color="rgba(255,255,255,0)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      <animateTransform
        attributeName="gradientTransform"
        attributeType="XML"
        type="translate"
        values="-200,-200;600,600;-200,-200"
        dur="4s"
        repeatCount="indefinite"
        begin="0s"
      />
    </linearGradient>`;
  
  // 根据支持金额添加不同的光环渐变
  if (devSupportAmount > 0) {
    let gradientColors = { start: '#FFD700', mid: '#FFA500', end: '#FFD700', name: 'goldGradient' };
    
    if (devSupportAmount >= 0.7) {
      // 钻石级 (0.7-1.0 OKB) - 彩虹光环
      gradientColors = { start: '#FF6B6B', mid: '#4ECDC4', end: '#45B7D1', name: 'diamondGradient' };
    } else if (devSupportAmount >= 0.4) {
      // 白金级 (0.4-0.6 OKB) - 银白光环
      gradientColors = { start: '#E8E8E8', mid: '#C0C0C0', end: '#F5F5F5', name: 'platinumGradient' };
    }
    // 黄金级 (0.1-0.3 OKB) - 保持金色光环
    
    svgContent += `
      <linearGradient id="${gradientColors.name}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${gradientColors.start}" />
        <stop offset="50%" stop-color="${gradientColors.mid}" />
        <stop offset="100%" stop-color="${gradientColors.end}" />
      </linearGradient>`;
  }
  
  svgContent += `
      <style>
        .brand { font: bold 14px sans-serif; fill: white; opacity: 0.8; text-anchor: end; }
        .main-address { font: bold 16px monospace; fill: white; }
        .label { font: normal 11px sans-serif; fill: white; opacity: 0.7; }
        .value { font: bold 14px sans-serif; fill: white; }
        .value-small { font: bold 12px sans-serif; fill: white; }
        .badge { font-size: 24px; }
        .dev-support { font: bold 12px sans-serif; fill: gold; text-shadow: 0 0 5px #000; }
        .shine-overlay { 
          animation: shine 3s ease-in-out infinite;
        }
        @keyframes shine {
          0% { opacity: 0; }
          50% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        .card-glow {
          filter: drop-shadow(0 0 10px rgba(255,255,255,0.3));
          animation: glow 2s ease-in-out infinite alternate;
        }
        @keyframes glow {
          from { filter: drop-shadow(0 0 5px rgba(255,255,255,0.2)); }
          to { filter: drop-shadow(0 0 15px rgba(255,255,255,0.5)); }
        }
      </style>
    </defs>
    <rect width="400" height="250" rx="20" fill="url(#background)" />
    ${generatePattern(design)}
    <text x="380" y="30" class="brand">SLEEP PROTOCOL ACCESS PASS</text>
    ${generateAvatar(design)}
    <text x="170" y="115" class="main-address">${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}</text>
    <text x="170" y="135" class="label">Access Pass Holder</text>
    
    <!-- Staking & Reward Data -->
    <g transform="translate(170, 155)">
        <text class="label">Staked SLEEP:</text>
        <text y="15" class="value">${formatAmountForSvg(stakedSleep, 18)}</text>
        <text y="35" class="label">Claimable Reward:</text>
        <text y="50" class="value-small">${formatAmountForSvg(claimableOkb, 18)} OKB</text>
        <text y="65" class="value-small">${formatAmountForSvg(claimableSleep, 18)} SLEEP</text>
    </g>
    
    ${devSupportAmount > 0 ? `
      <!-- Halo Effect -->
      <circle cx="85" cy="135" r="60" fill="none" stroke="url(#goldGradient)" stroke-width="4" opacity="0.8" />
      <circle cx="85" cy="135" r="65" fill="none" stroke="url(#goldGradient)" stroke-width="2" opacity="0.6" />
      
      <!-- Honor Text -->
      <g transform="translate(390, 155)">
        <text class="label" text-anchor="end">Total Support:</text>
        <text y="15" class="value" text-anchor="end">${formatAmountForSvg(totalSupport, 18)} OKB</text>
        <text y="35" class="label" text-anchor="end">Your Share:</text>
        <text y="50" class="value" text-anchor="end">${calculateContributionPercent(devSupportAmount, totalSupport)}%</text>
      </g>

      <text x="85" y="210" text-anchor="middle" class="dev-support">⭐ Dev Supported ⭐</text>
    ` : ''}

    ${selectedBadge ? `<text x="${badgePos.x}" y="${badgePos.y}" class="badge" fill="${design.badgeColor}">${selectedBadge}</text>` : ''}`;
    
    // 根据支持金额添加不同的光环效果
  if (devSupportAmount > 0) {
    let gradientName = 'goldGradient';
    let tierText = 'Gold Supporter';
    let tierIcon = '🥇';
    
    if (devSupportAmount >= 0.7) {
      gradientName = 'diamondGradient';
      tierText = 'Diamond Supporter';
      tierIcon = '💎';
    } else if (devSupportAmount >= 0.4) {
      gradientName = 'platinumGradient';
      tierText = 'Platinum Supporter';
      tierIcon = '🥈';
    }
    
    svgContent += `
    <circle cx="85" cy="135" r="60" fill="none" stroke="url(#${gradientName})" stroke-width="4" opacity="0.8" />
    <circle cx="85" cy="135" r="65" fill="none" stroke="url(#${gradientName})" stroke-width="2" opacity="0.6" />
    <text x="85" y="210" text-anchor="middle" class="dev-support">${tierIcon} ${tierText} ${tierIcon}</text>`;
  }
  
  svgContent += `
    <text x="30" y="230" class="label">Valid for all Sleep Protocol services</text>
    
    <!-- 扫光效果 - 移动的光带 -->
    <defs>
      <mask id="cardMask">
        <rect x="0" y="0" width="400" height="250" rx="20" fill="white" />
      </mask>
    </defs>
    
    <g mask="url(#cardMask)">
      <rect x="-200" y="-400" width="30" height="1000" fill="rgba(255,255,255,0.7)" pointer-events="none" transform="rotate(45 200 125)">
        <animateTransform
          attributeName="transform"
          type="translate"
          values="-600,-400; 600,400; -600,-400"
          dur="3s"
          repeatCount="indefinite"
          begin="0s"
          additive="sum"
        />
      </rect>
    </g>
    
    <!-- 备用脉动效果，如果扫光不工作 -->
    <rect x="0" y="0" width="400" height="250" rx="20" fill="rgba(255,255,255,0.05)" pointer-events="none">
      <animate
        attributeName="opacity"
        values="0.05; 0.2; 0.05"
        dur="2s"
        repeatCount="indefinite"
      />
    </rect>
  </svg>`;
  
  return svgContent;
};

const AccessPassPage: NextPage = () => {
  const { address } = useAccount();
  const [showMintModal, setShowMintModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // --- Design State ---
  const [design, setDesign] = useState<AccessPassDesign>({
    bgColor1: '#3D5AFE',
    bgColor2: '#2979FF',
    bgGradientDirection: 0,
    patternType: 1,
    patternColor: '#FFFFFF',
    patternOpacity: 20,
    avatarFaceType: 0,
    avatarEyeType: 0,
    avatarMouthType: 0,
    avatarHairType: 1, // 默认发型
    avatarSkinColor: '#FFDBAC',
    avatarAccessory: 1,
    fontChoice: 0,
    textColor: '#FFFFFF',
    badgeType: 3,
    badgePosition: 1,
    badgeColor: '#FFD700',
  });

  // --- Preview Data State ---
  const [previewDevSupportAmount, setPreviewDevSupportAmount] = useState(0);
  const [previewStakedSleep, setPreviewStakedSleep] = useState(12345.67);
  const [previewClaimableOkb, setPreviewClaimableOkb] = useState(88.88);
  const [previewClaimableSleep, setPreviewClaimableSleep] = useState(123456.78);
  const [previewTotalSupport, setPreviewTotalSupport] = useState(1234.56);

  const [previewSvg, setPreviewSvg] = useState('');

  // Mint Modal State
  const [devSupportTier, setDevSupportTier] = useState<'none' | 'gold' | 'platinum' | 'diamond'>('none');
  const [devSupportAmount, setDevSupportAmount] = useState(0.5);

  useEffect(() => {
    const svg = generateAccessPassSvg(
      design, 
      address ?? "0x000...000", 
      previewDevSupportAmount,
      previewStakedSleep,
      previewClaimableOkb,
      previewClaimableSleep,
      previewTotalSupport
    );
    setPreviewSvg(svg);
  }, [design, address, previewDevSupportAmount, previewStakedSleep, previewClaimableOkb, previewClaimableSleep, previewTotalSupport]);

  return (
    <Layout>
      <Meta />
      <Container>
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              🎫 Sleep Protocol Access Pass
            </h1>
            <p className="text-xl text-base-content/80 max-w-2xl mx-auto">
              Design your unique, on-chain identity card. Your gateway to the Sleep Protocol ecosystem.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左侧：说明区域 */}
          <div className="space-y-6">
            <CardContainer>
              <div className="space-y-4">
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>
                    <strong>100% Free Forever</strong> - No fees, just gas costs for minting.
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-white">What You Get:</h3>
                  <ul className="space-y-2 text-white/90">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      Access to mint Sleep NFTs
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      Ability to stake SLEEP tokens
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      Fully customizable on-chain identity
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      Your design stored permanently on blockchain
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-white">Design Features:</h3>
                  <ul className="space-y-2 text-white/90">
                    <li className="flex items-center gap-2">
                      <span className="text-blue-400">•</span>
                      Custom background colors and gradients
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-400">•</span>
                      Animated background patterns
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-400">•</span>
                      Procedural avatar generator
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-400">•</span>
                      Choose from exclusive badge collection
                    </li>
                  </ul>
                </div>

                {/* Dev Support 说明合并到这里 */}
                <div className="divider my-6"></div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">
                    Dev Support - 支持开发团队
                  </h3>
                  <div className="space-y-3 text-sm text-white/90">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <div>
                        <strong>额外费用:</strong> 可选择支付额外费用来支持链上无限公司开发团队
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <div>
                        <strong>专属标识:</strong> 您的 Access Pass 头像将拥有金色光环和 "⭐ Dev Supported ⭐" 特殊标识
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <div>
                        <strong>未来权益:</strong> 有可能获得我们公司其他产品的支持
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400">•</span>
                      <div>
                        <strong>协议独立:</strong> 完全不影响 Sleep Protocol 的任何权益，协议保持完全去中心化
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-info/10 border-l-4 border-info">
                    <div className="text-xs text-white/80">
                      <strong>重要说明：</strong> Dev Support 完全可选，不会影响 Sleep Protocol 的去中心化特性。
                      这些权益仅与链上无限公司的后续产品相关，与 Sleep Protocol 的治理和权益完全分离。
                      <strong>解释权完全归项目方所有。</strong>
                    </div>
                  </div>
                </div>
              </div>
            </CardContainer>
          </div>

          {/* 中间：预览区域 */}
          <div className="space-y-6">
            <CardContainer>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  🖼️ Live Preview
                </h2>
              </div>
              <div className="flex justify-center p-6 bg-gradient-to-br from-base-300 to-base-200 rounded-xl sticky top-20">
                <div 
                  className="transform scale-110 transition-transform duration-300 hover:scale-125 cursor-pointer"
                  dangerouslySetInnerHTML={{ __html: previewSvg }} 
                />
              </div>
              <div className="text-center mt-6 space-y-4">
                <div className="form-control">
                  <label className="label justify-center">
                    <span className="label-text font-medium text-sm">Preview Dev Support Tier</span>
                  </label>
                  <select 
                    value={previewDevSupportAmount}
                    onChange={(e) => setPreviewDevSupportAmount(parseFloat(e.target.value))}
                    className="select select-bordered select-sm w-full max-w-xs mx-auto"
                  >
                    <option value={0}>No Support</option>
                    <option value={0.2}>🥇 Gold (0.1-0.3 OKB)</option>
                    <option value={0.5}>🥈 Platinum (0.4-0.6 OKB)</option>
                    <option value={0.8}>💎 Diamond (0.7-1.0 OKB)</option>
                  </select>
                </div>
                <div className="flex justify-center">
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const randomColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
                      const skinColors = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFB3BA', '#BAFFC9', '#BAE1FF'];
                      const randomColor1 = randomColors[Math.floor(Math.random() * randomColors.length)];
                      const randomColor2 = randomColors[Math.floor(Math.random() * randomColors.length)];
                      
                      setDesign(prev => ({
                        ...prev,
                        bgColor1: randomColor1,
                        bgColor2: randomColor2,
                        bgGradientDirection: Math.floor(Math.random() * 3),
                        patternType: Math.floor(Math.random() * 5),
                        patternColor: randomColors[Math.floor(Math.random() * randomColors.length)],
                        patternOpacity: 10 + Math.floor(Math.random() * 40),
                        avatarFaceType: Math.floor(Math.random() * 4),
                        avatarEyeType: Math.floor(Math.random() * 7),
                        avatarMouthType: Math.floor(Math.random() * 6),
                        avatarHairType: Math.floor(Math.random() * 5),
                        avatarSkinColor: skinColors[Math.floor(Math.random() * skinColors.length)],
                        avatarAccessory: Math.floor(Math.random() * 5),
                        badgeType: Math.floor(Math.random() * 5),
                        badgePosition: Math.floor(Math.random() * 4),
                        badgeColor: randomColors[Math.floor(Math.random() * randomColors.length)],
                      }));
                    }}
                  >
                    🎲 Random Design
                  </button>
                </div>
                <p className="text-sm text-base-content/60">
                  🔍 Hover to zoom • Your unique on-chain identity
                </p>
              </div>
            </CardContainer>

            {/* Mint Button */}
            <div className="py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Ready to Create Your Access Pass?</h3>
              <p className="text-gray-600 mb-4 text-sm max-w-sm mx-auto">
                Your unique design is ready. Choose your support tier and mint your on-chain identity.
              </p>
              <button 
                className="btn btn-primary btn-lg px-6"
                onClick={() => setShowMintModal(true)}
              >
                Mint Your Access Pass
              </button>
            </div>
          </div>

          {/* 右侧：设计控件区域 */}
          <div className="space-y-6">
            <CardContainer>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">🎨 Design Studio</h2>
                <p className="text-sm text-base-content/60 mt-1">Customize your Access Pass</p>
              </div>
              
              <div className="space-y-5">
                {/* 快速操作按钮 */}
                <div className="flex gap-2">
                  <button 
                    className="btn btn-outline btn-sm flex-1"
                    onClick={() => {
                      const randomColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
                      const skinColors = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFB3BA', '#BAFFC9', '#BAE1FF'];
                      const randomColor1 = randomColors[Math.floor(Math.random() * randomColors.length)];
                      const randomColor2 = randomColors[Math.floor(Math.random() * randomColors.length)];
                      
                      setDesign(prev => ({
                        ...prev,
                        bgColor1: randomColor1,
                        bgColor2: randomColor2,
                        bgGradientDirection: Math.floor(Math.random() * 3),
                        patternType: Math.floor(Math.random() * 5),
                        patternColor: randomColors[Math.floor(Math.random() * randomColors.length)],
                        patternOpacity: 10 + Math.floor(Math.random() * 40),
                        avatarFaceType: Math.floor(Math.random() * 4),
                        avatarEyeType: Math.floor(Math.random() * 7),
                        avatarMouthType: Math.floor(Math.random() * 6),
                        avatarHairType: Math.floor(Math.random() * 5),
                        avatarSkinColor: skinColors[Math.floor(Math.random() * skinColors.length)],
                        avatarAccessory: Math.floor(Math.random() * 5),
                        badgeType: Math.floor(Math.random() * 5),
                        badgePosition: Math.floor(Math.random() * 4),
                        badgeColor: randomColors[Math.floor(Math.random() * randomColors.length)],
                      }));
                    }}
                  >
                    🎲 Random
                  </button>
                  <button 
                    className="btn btn-primary btn-sm flex-1"
                    onClick={() => setShowMintModal(true)}
                  >
                    🎫 Mint Pass
                  </button>
                </div>

                {/* 背景层控件 */}
                <div className="collapse collapse-arrow bg-base-200/50 rounded-lg">
                  <input type="checkbox" defaultChecked />
                  <div className="collapse-title text-base font-medium">
                    🎨 Background Layer
                  </div>
                  <div className="collapse-content space-y-4 pt-2">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text">Color 1</span>
                      </label>
                      <input
                        type="color"
                        value={design.bgColor1}
                        onChange={(e) => setDesign(prev => ({ ...prev, bgColor1: e.target.value }))}
                        className="w-full h-12 rounded-lg border border-base-content/20 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text">Color 2</span>
                      </label>
                      <input
                        type="color"
                        value={design.bgColor2}
                        onChange={(e) => setDesign(prev => ({ ...prev, bgColor2: e.target.value }))}
                        className="w-full h-12 rounded-lg border border-base-content/20 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Gradient Direction</span>
                    </label>
                    <select 
                      value={design.bgGradientDirection}
                      onChange={(e) => setDesign(prev => ({ ...prev, bgGradientDirection: parseInt(e.target.value) }))}
                      className="select select-bordered w-full"
                    >
                      <option value={0}>Left → Right</option>
                      <option value={1}>Top → Bottom</option>
                      <option value={2}>Diagonal ↘</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Background Pattern</span>
                    </label>
                    <select 
                      value={design.patternType}
                      onChange={(e) => setDesign(prev => ({ ...prev, patternType: parseInt(e.target.value) }))}
                      className="select select-bordered w-full"
                    >
                      <option value={0}>None</option>
                      <option value={1}>✦ Stars</option>
                      <option value={2}>● Dots</option>
                      <option value={3}>▦ Grid</option>
                      <option value={4}>〜 Waves</option>
                    </select>
                  </div>

                  {design.patternType > 0 && (
                    <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-base-content/20">
                      <div>
                        <label className="label">
                          <span className="label-text">Pattern Color</span>
                        </label>
                        <input
                          type="color"
                          value={design.patternColor}
                          onChange={(e) => setDesign(prev => ({ ...prev, patternColor: e.target.value }))}
                          className="w-full h-10 rounded-lg border border-base-content/20 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="label">
                          <span className="label-text">Opacity: {design.patternOpacity}%</span>
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="80"
                          value={design.patternOpacity}
                          onChange={(e) => setDesign(prev => ({ ...prev, patternOpacity: parseInt(e.target.value) }))}
                          className="range range-primary"
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </div>

                {/* 头像层控件 */}
                <div className="collapse collapse-arrow bg-base-200/50 rounded-lg">
                  <input type="checkbox" />
                  <div className="collapse-title text-base font-medium">
                    👤 Avatar Designer
                  </div>
                  <div className="collapse-content space-y-4 pt-2">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text">Face Type</span>
                      </label>
                      <select 
                        value={design.avatarFaceType}
                        onChange={(e) => setDesign(prev => ({ ...prev, avatarFaceType: parseInt(e.target.value) }))}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value={0}>😊 Emoticon</option>
                        <option value={1}>🔳 Pixel</option>
                        <option value={2}>🥔 Bean</option>
                        <option value={3}>🍞 Toast</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text">Eyes</span>
                      </label>
                      <select 
                        value={design.avatarEyeType}
                        onChange={(e) => setDesign(prev => ({ ...prev, avatarEyeType: parseInt(e.target.value) }))}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value={0}>. . (Normal)</option>
                        <option value={1}>{'> < (Closed)'}</option>
                        <option value={2}>■ ■ (Pixel)</option>
                        <option value={3}>T T (Crying)</option>
                        <option value={4}>^ ^ (Happy)</option>
                        <option value={5}>x x (Dizzy)</option>
                        <option value={6}>O O (Surprised)</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text">Mouth</span>
                      </label>
                      <select 
                        value={design.avatarMouthType}
                        onChange={(e) => setDesign(prev => ({ ...prev, avatarMouthType: parseInt(e.target.value) }))}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value={0}>:)</option>
                        <option value={1}>:3</option>
                        <option value={2}>:O</option>
                        <option value={3}>:| (Neutral)</option>
                        <option value={4}>:D</option>
                        <option value={5}>w</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text">Hair Style</span>
                      </label>
                      <select 
                        value={design.avatarHairType}
                        onChange={(e) => setDesign(prev => ({ ...prev, avatarHairType: parseInt(e.target.value) }))}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value={0}>🧑‍🦲 Bald</option>
                        <option value={1}>🔥 Spiky</option>
                        <option value={2}>🥣 Bowl Cut</option>
                        <option value={3}> Afro</option>
                        <option value={4}>🌬️ Long</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text">Skin Color</span>
                      </label>
                      <select 
                        value={design.avatarSkinColor}
                        onChange={(e) => setDesign(prev => ({ ...prev, avatarSkinColor: e.target.value }))}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value="#FFDBAC">🏻 Light</option>
                        <option value="#F1C27D">🏼 Medium Light</option>
                        <option value="#E0AC69">🏽 Medium</option>
                        <option value="#C68642">🏾 Medium Dark</option>
                        <option value="#8D5524">🏿 Dark</option>
                        <option value="#FFB3BA">🌸 Pink</option>
                        <option value="#BAFFC9">💚 Green</option>
                        <option value="#BAE1FF">💙 Blue</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Sleep Accessory</span>
                    </label>
                    <select 
                      value={design.avatarAccessory}
                      onChange={(e) => setDesign(prev => ({ ...prev, avatarAccessory: parseInt(e.target.value) }))}
                      className="select select-bordered w-full"
                    >
                      <option value={0}>None</option>
                      <option value={1}>🕶️ Pixel Shades</option>
                      <option value={2}>🧢 Sleepy Cap</option>
                      <option value={3}>✨ Angel Halo</option>
                      <option value={4}>💤 Zzz Icon</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Font Style</span>
                    </label>
                    <select 
                      value={design.fontChoice}
                      onChange={(e) => setDesign(prev => ({ ...prev, fontChoice: parseInt(e.target.value) }))}
                      className="select select-bordered w-full"
                    >
                      <option value={0}>Sans-serif (Clean & Modern)</option>
                      <option value={1}>Serif (Classic & Elegant)</option>
                      <option value={2}>Monospace (Tech & Code)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Text Color</span>
                    </label>
                    <input
                      type="color"
                      value={design.textColor}
                      onChange={(e) => setDesign(prev => ({ ...prev, textColor: e.target.value }))}
                      className="w-full h-12 rounded-lg border border-base-content/20 cursor-pointer"
                    />
                  </div>
                  </div>
                </div>

                {/* 徽章层控件 */}
                <div className="collapse collapse-arrow bg-base-200/50 rounded-lg">
                  <input type="checkbox" />
                  <div className="collapse-title text-base font-medium">
                    🏆 Badge Layer
                  </div>
                  <div className="collapse-content space-y-4 pt-2">
                  
                  <div>
                    <label className="label">
                      <span className="label-text">Badge Type</span>
                    </label>
                    <select 
                      value={design.badgeType}
                      onChange={(e) => setDesign(prev => ({ ...prev, badgeType: parseInt(e.target.value) }))}
                      className="select select-bordered w-full"
                    >
                      <option value={0}>None</option>
                      <option value={1}>🚀 Rocket (Explorer)</option>
                      <option value={2}>💎 Diamond (Holder)</option>
                      <option value={3}>🌙 Moon (Dreamer)</option>
                      <option value={4}>⚡️ Lightning (Fast)</option>
                    </select>
                  </div>

                  {design.badgeType > 0 && (
                    <div className="space-y-4 pl-4 border-l-2 border-base-content/20">
                      <div>
                        <label className="label">
                          <span className="label-text">Badge Position</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="cursor-pointer flex items-center gap-2">
                            <input
                              type="radio"
                              name="badgePosition"
                              value={0}
                              checked={design.badgePosition === 0}
                              onChange={(e) => setDesign(prev => ({ ...prev, badgePosition: parseInt(e.target.value) }))}
                              className="radio radio-primary radio-sm"
                            />
                            <span className="text-sm">↖ Top Left</span>
                          </label>
                          <label className="cursor-pointer flex items-center gap-2">
                            <input
                              type="radio"
                              name="badgePosition"
                              value={1}
                              checked={design.badgePosition === 1}
                              onChange={(e) => setDesign(prev => ({ ...prev, badgePosition: parseInt(e.target.value) }))}
                              className="radio radio-primary radio-sm"
                            />
                            <span className="text-sm">↗ Top Right</span>
                          </label>
                          <label className="cursor-pointer flex items-center gap-2">
                            <input
                              type="radio"
                              name="badgePosition"
                              value={2}
                              checked={design.badgePosition === 2}
                              onChange={(e) => setDesign(prev => ({ ...prev, badgePosition: parseInt(e.target.value) }))}
                              className="radio radio-primary radio-sm"
                            />
                            <span className="text-sm">↙ Bottom Left</span>
                          </label>
                          <label className="cursor-pointer flex items-center gap-2">
                            <input
                              type="radio"
                              name="badgePosition"
                              value={3}
                              checked={design.badgePosition === 3}
                              onChange={(e) => setDesign(prev => ({ ...prev, badgePosition: parseInt(e.target.value) }))}
                              className="radio radio-primary radio-sm"
                            />
                            <span className="text-sm">↘ Bottom Right</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="label">
                          <span className="label-text">Badge Color</span>
                        </label>
                        <input
                          type="color"
                          value={design.badgeColor}
                          onChange={(e) => setDesign(prev => ({ ...prev, badgeColor: e.target.value }))}
                          className="w-full h-10 rounded-lg border border-base-content/20 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </div>

                {/* Data Preview Controls */}
                <div className="collapse collapse-plus bg-base-200">
                  <input type="checkbox" /> 
                  <div className="collapse-title text-md font-medium">
                    📊 Data Preview Controls
                  </div>
                  <div className="collapse-content">
                    <p className="text-xs text-base-content/60 mb-4">These values are for preview purposes only and will not affect the actual mint.</p>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Your Support Amount (OKB)</span></label>
                      <input 
                        type="number" 
                        value={previewDevSupportAmount} 
                        onChange={(e) => setPreviewDevSupportAmount(parseFloat(e.target.value) || 0)} 
                        className="input input-bordered w-full"
                        step="0.1"
                        min="0"
                      />
                    </div>
                     <div className="form-control">
                      <label className="label"><span className="label-text">Staked SLEEP</span></label>
                      <input 
                        type="number" 
                        value={previewStakedSleep} 
                        onChange={(e) => setPreviewStakedSleep(parseFloat(e.target.value) || 0)} 
                        className="input input-bordered w-full"
                      />
                    </div>
                     <div className="form-control">
                      <label className="label"><span className="label-text">Claimable OKB</span></label>
                      <input 
                        type="number" 
                        value={previewClaimableOkb} 
                        onChange={(e) => setPreviewClaimableOkb(parseFloat(e.target.value) || 0)} 
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Claimable SLEEP</span></label>
                      <input 
                        type="number" 
                        value={previewClaimableSleep} 
                        onChange={(e) => setPreviewClaimableSleep(parseFloat(e.target.value) || 0)} 
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">Total Support Raised (OKB)</span></label>
                      <input 
                        type="number" 
                        value={previewTotalSupport} 
                        onChange={(e) => setPreviewTotalSupport(parseFloat(e.target.value) || 0)} 
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </CardContainer>
          </div>

        </div>
        
        </div>
      </Container>
      
      {/* Mint Modal */}
      {showMintModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-2xl mb-6 text-center">
              🎫 Mint Your Access Pass
            </h3>
            
            {/* Preview */}
            <div className="flex justify-center mb-6 p-4 bg-base-200 rounded-xl">
            <div 
              className="transform scale-75"
              dangerouslySetInnerHTML={{ __html: generateAccessPassSvg(design, "0x1234...abcd", devSupportAmount, previewStakedSleep, previewClaimableOkb, previewClaimableSleep, previewTotalSupport) }} 
            />
            </div>
            
            {/* Dev Support Option */}
            <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 mb-6">
              <div className="card-body p-4">
                <h4 className="font-bold text-amber-800 mb-3">🚀 Dev Support - Choose Your Tier</h4>
                <div className="grid grid-cols-1 gap-3">
                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="devSupport" 
                      value={0}
                      checked={devSupportAmount === 0}
                      onChange={() => setDevSupportAmount(0)}
                      className="radio radio-warning mr-3"
                    />
                    <span className="text-sm">No Support - Standard Access Pass</span>
                  </label>
                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="devSupport" 
                      value={0.2}
                      checked={devSupportAmount > 0 && devSupportAmount < 0.4}
                      onChange={() => setDevSupportAmount(0.2)}
                      className="radio radio-warning mr-3"
                    />
                    <span className="text-sm">🥇 <strong>Gold Tier (0.1-0.3 OKB)</strong> - Golden halo</span>
                  </label>
                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="devSupport" 
                      value={0.5}
                      checked={devSupportAmount >= 0.4 && devSupportAmount < 0.7}
                      onChange={() => setDevSupportAmount(0.5)}
                      className="radio radio-warning mr-3"
                    />
                    <span className="text-sm">🥈 <strong>Platinum Tier (0.4-0.6 OKB)</strong> - Silver halo</span>
                  </label>
                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="devSupport" 
                      value={0.8}
                      checked={devSupportAmount >= 0.7}
                      onChange={() => setDevSupportAmount(0.8)}
                      className="radio radio-warning mr-3"
                    />
                    <span className="text-sm">💎 <strong>Diamond Tier (0.7-1.0 OKB)</strong> - Rainbow halo</span>
                  </label>
                </div>
                {devSupportAmount > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.05"
                        value={devSupportAmount}
                        onChange={(e) => setDevSupportAmount(parseFloat(e.target.value))}
                        className="range range-warning flex-1"
                      />
                      <span className="font-bold text-amber-800 min-w-[4rem]">{devSupportAmount.toFixed(2)} OKB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Cost Summary */}
            <div className="stats stats-horizontal shadow mb-6">
              <div className="stat">
                <div className="stat-title">Access Pass</div>
                <div className="stat-value text-success">FREE</div>
                <div className="stat-desc">0 OKB</div>
              </div>
              <div className="stat">
                <div className="stat-title">Dev Support</div>
                <div className="stat-value text-warning">
                  {devSupportAmount > 0 ? `+${devSupportAmount.toFixed(2)} OKB` : 'OFF'}
                </div>
                <div className="stat-desc">
                  {devSupportAmount >= 0.7 ? '💎 Diamond' : 
                   devSupportAmount >= 0.4 ? '🥈 Platinum' :
                   devSupportAmount > 0 ? '🥇 Gold' : 'None'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Total Cost</div>
                <div className="stat-value text-primary">
                  {devSupportAmount > 0 ? `${devSupportAmount.toFixed(2)} OKB` : 'FREE'}
                </div>
                <div className="stat-desc">+ Gas Fee</div>
              </div>
            </div>
            
            {/* Important Notice */}
            <div className="alert alert-info mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h3 className="font-bold">重要说明</h3>
                <div className="text-xs">
                  • Access Pass 完全免费，仅需支付 Gas 费用<br/>
                  • Dev Support 完全可选，不影响 Sleep Protocol 功能<br/>
                  • 您的设计将永久存储在区块链上
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="modal-action">
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowMintModal(false)}
              >
                取消
              </button>
              <button 
                className="btn btn-primary"
                disabled
              >
                🎫 Mint Access Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export const getStaticProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});

export default AccessPassPage;
