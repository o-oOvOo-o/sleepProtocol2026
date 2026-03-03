import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { useSleepContext } from '~/contexts/SleepContext';
import { useAccount, useWriteContract, useFeeData, useBlock, useReadContracts, useConnect, useDisconnect } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { formatUnits, parseUnits } from 'viem';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '~/lib/client';
import { sleepMinterContract, stakingRewardsContract, sleepCoinContract, nftMarketplaceContract, tokenMinterContract, tokenAccessPassContract } from '~/lib/contracts';
import { xLayerTestnet } from '~/lib/chains';
import { 
  calculateMintReward,
  calculateRewardAmplifier,
  calculateTimeDecayFactor,
} from '~/lib/reward-calculator';
import { timedelta, UTC_TIME } from '~/lib/helpers';
import { StakeDashboard } from '~/components/stake/StakeDashboard';
import { UnstakedDashboard } from '~/components/stake/UnstakedDashboard';
import { ConnectWalletInfo } from '~/components/stake/ConnectWalletInfo';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Win98ButtonStyled } from '../../styles/win98sm.styles';

// 安全的BigInt转换辅助函数
const safeBigIntConversion = (value: any): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    return BigInt(Math.floor(value));
  }
  if (typeof value === 'string') {
    // 检查是否为纯数字字符串
    const numStr = value.replace(/[^\d]/g, '');
    return numStr ? BigInt(numStr) : BigInt(0);
  }
  // 对于对象类型，尝试访问常见属性
  if (value && typeof value === 'object') {
    if ('value' in value && value.value !== undefined) {
      return safeBigIntConversion(value.value);
    }
    if ('_hex' in value && typeof value._hex === 'string') {
      try {
        return BigInt(value._hex);
      } catch (error) {
        console.warn('Failed to convert hex value to BigInt:', value._hex);
        return BigInt(0);
      }
    }
  }
  // 默认返回0，避免转换错误
  return BigInt(0);
};

// 安全的余额格式化函数
const safeFormatBalance = (balance: any, decimals: number = 18): string => {
  try {
    if (!balance) return '0';
    
    // 如果有value属性，优先使用
    if (balance.value !== undefined) {
      return formatUnits(safeBigIntConversion(balance.value), decimals);
    }
    
    // 如果余额本身就是BigInt或数字
    if (typeof balance === 'bigint' || typeof balance === 'number') {
      return formatUnits(safeBigIntConversion(balance), decimals);
    }
    
    // 如果是字符串数字
    if (typeof balance === 'string' && /^\d+$/.test(balance)) {
      return formatUnits(BigInt(balance), decimals);
    }
    
    // 对于复杂对象，尝试从常见属性中提取
    const bigIntValue = safeBigIntConversion(balance);
    return formatUnits(bigIntValue, decimals);
  } catch (error) {
    console.warn('Balance formatting error:', error, 'Input:', balance);
    return '0';
  }
};

// Win98 Style Components
const AppContainer = styled.div`
  width: 1200px;  /* 800px * 1.5 */
  height: 900px;  /* 600px * 1.5 */
  background: #c0c0c0;
  display: flex;
  flex-direction: column;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 16px;  /* 正文字体 = "identify overdue mints" 大小 */
  min-width: 1200px;
  min-height: 900px;
`;

const MenuBar = styled.div`
  background: #c0c0c0;
  border-bottom: 1px solid #808080;
  padding: 2px;
  display: flex;
`;

const MenuButton = styled(Win98ButtonStyled)<{ active?: boolean }>`
  padding: 8px 20px;  /* 保持较大的padding */
  margin: 3px;
  font-size: 16px;  /* 保持较大的字体 */
  background: ${props => props.active ? '#000080' : undefined};
  color: ${props => props.active ? 'white' : 'black'};
  
  ${props => props.active && `
    border: 2px inset #c0c0c0 !important;
  `}
  
  &:hover {
    background: ${props => props.active ? '#000080' : '#dfdfdf'};
  }
`;

const StatusBar = styled.div`
  background: #c0c0c0;
  border-top: 1px solid #808080;
  padding: 8px 16px;  /* 进一步增大padding */
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;  /* 正文字体 = "identify overdue mints" 大小 */
  min-height: 32px;  /* 增大高度 */
  gap: 20px;  /* 增大间距 */
`;

const MainContent = styled.div`
  flex: 1;
  background: white;
  border: 2px inset #c0c0c0;
  margin: 6px;
  padding: 16px;  /* 增大padding */
  overflow: auto;
  
  /* Win98 scrollbar styling */
  ::-webkit-scrollbar {
    width: 16px;
    height: 16px;
  }
  
  ::-webkit-scrollbar-track {
    background: #c0c0c0;
    border: 1px inset #c0c0c0;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #c0c0c0;
    border: 1px outset #c0c0c0;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #dfdfdf;
  }
`;

const WalletSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DataCard = styled.div`
  background: #c0c0c0;
  border: 2px inset #c0c0c0;
  padding: 16px;  /* 增大padding */
  margin: 12px 0;  /* 增大margin */
`;

const CardTitle = styled.h3`
  margin: 0 0 12px 0;  /* 增大margin */
  font-weight: bold;
  color: #000080;
  font-size: 20px;  /* 标题字体 = "Liquidation Overview" 大小 */
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 6px 0;  /* 增大margin */
  padding: 4px 0;  /* 增大padding */
`;

const StatLabel = styled.span`
  font-weight: normal;
  font-size: 16px;  /* 正文字体 = "identify overdue mints" 大小 */
`;

const StatValue = styled.span`
  font-weight: bold;
  color: #000080;
  font-size: 16px;  /* 正文字体 = "identify overdue mints" 大小 */
`;

const Win98Button = styled(Win98ButtonStyled)<{ disabled?: boolean }>`
  padding: 8px 20px;  /* 保持较大的padding */
  font-size: 16px;  /* 保持较大的字体 */
  opacity: ${props => props.disabled ? 0.6 : 1};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  
  &:disabled {
    color: #808080;
    pointer-events: none;
  }
`;

const Win98Input = styled.input`
  background: white;
  border: 2px inset #c0c0c0;
  padding: 6px 12px;  /* 进一步增大padding */
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 16px;  /* 正文字体 = "identify overdue mints" 大小 */
  
  &:focus {
    outline: 1px dotted #000;
    outline-offset: -2px;
  }
`;

const Win98Label = styled.label`
  font-weight: bold;
  font-size: 16px;  /* 正文字体 = "identify overdue mints" 大小 */
  margin-bottom: 6px;  /* 增大margin */
  display: block;
`;

const ErrorText = styled.span`
  color: red;
  font-size: 16px;  /* 正文字体 = "identify overdue mints" 大小 */
`;

// Language Switcher Component
const LanguageSwitcher = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;  /* 增大间距 */
  font-size: 16px;  /* 正文字体 = "identify overdue mints" 大小 */
`;

const LanguageButton = styled(Win98ButtonStyled)<{ active?: boolean }>`
  padding: 4px 10px;  /* 保持较小的padding */
  font-size: 14px;  /* 保持较小的字体 */
  min-width: 45px;  /* 保持最小宽度 */
  background: ${props => props.active ? '#000080' : undefined};
  color: ${props => props.active ? 'white' : 'black'};
  
  ${props => props.active && `
    border: 2px inset #c0c0c0 !important;
  `}
  
  &:hover {
    background: ${props => props.active ? '#000080' : '#dfdfdf'};
  }
`;

// Form interfaces
interface MintForm {
  count: number;
  term: number;
}

interface StakeForm {
  amount: number;
}

// 元素位置和缩放接口
interface ElementTransform {
  x: number;
  y: number;
  scale: number;
}

// 可拖拽元素变换状态
interface ElementTransforms {
  avatar: ElementTransform;
  logo: ElementTransform;
  chip: ElementTransform;
  cardholderInfo: ElementTransform;
  accountBalance: ElementTransform;
  claimableInfo: ElementTransform;
  devSupport: ElementTransform;
  devSupportInfo: ElementTransform; // Dev Support附加信息
  badge: ElementTransform;
  bottomText: ElementTransform; // 底部验证条文字
  countryFlag: ElementTransform; // 国旗位置
}

// Access Pass Design interface (完全复制网页版)
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
  
  // 国家层
  countryCode: string; // 国家代码: CN, US, JP, UK, DE, FR, CA, AU, KR, IN, etc.
  showCountryFlag: boolean; // 是否显示国旗
}

// Helper function to format large numbers for SVG display
const formatAmountForSvg = (amount: number, decimals: number): string => {
  if (amount === 0) return "0.00";
  const scaledAmount = amount;
  const integerPart = Math.floor(scaledAmount);
  const fractionalPart = Math.round((scaledAmount - integerPart) * 100);
  return `${integerPart}.${fractionalPart < 10 ? '0' : ''}${fractionalPart}`;
};

const calculateContributionPercent = (userAmount: number, totalAmount: number): string => {
  if (totalAmount === 0 || userAmount === 0) return "0.00";
  const percentage = (userAmount / totalAmount) * 100;
  return percentage.toFixed(2);
};

// 生成 Win98 风格 Access Pass SVG 的函数
const generateWin98AccessPassSvg = (
  design: AccessPassDesign, 
  userAddress: string = "0x1234...abcd", 
  devSupportAmount: number = 0,
  stakedSleep: number = 0,
  claimableOkb: number = 0,
  claimableSleep: number = 0,
  totalSupport: number = 0,
  customTransforms?: ElementTransforms,
  t?: any
): string => {
  const gradientDirections = [
    { x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
    { x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
    { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }
  ];

  const fonts = ["sans-serif", "serif", "monospace"];
  const badges = ["", "🚀", "💎", "🌙", "⚡️"];
  
  // 国旗映射 - 真实国旗图片 (运行重命名脚本后将使用简化文件名)
  const countryFlags = {
    AU: "/images/Countries/AU.png", // 澳大利亚
    BR: "/images/Countries/BR.png", // 巴西 
    CA: "/images/Countries/CA.png", // 加拿大
    CN: "/images/Countries/CN.png", // 中国
    FR: "/images/Countries/FR.png", // 法国
    DE: "/images/Countries/DE.png", // 德国
    IN: "/images/Countries/IN.png", // 印度
    IT: "/images/Countries/IT.png", // 意大利
    JP: "/images/Countries/JP.png", // 日本
    MX: "/images/Countries/MX.png", // 墨西哥
    NL: "/images/Countries/NL.png", // 荷兰
    NO: "/images/Countries/NO.png", // 挪威
    RU: "/images/Countries/RU.png", // 俄罗斯
    SG: "/images/Countries/SG.png", // 新加坡
    KR: "/images/Countries/KR.png", // 韩国
    ES: "/images/Countries/ES.png", // 西班牙
    SE: "/images/Countries/SE.png", // 瑞典
    CH: "/images/Countries/CH.png", // 瑞士
    UK: "/images/Countries/UK.png", // 英国
    US: "/images/Countries/US.png"  // 美国
  };
  
  const countryNames = {
    AU: "Australia", BR: "Brazil", CA: "Canada", CN: "China", FR: "France",
    DE: "Germany", IN: "India", IT: "Italy", JP: "Japan", MX: "Mexico",
    NL: "Netherlands", NO: "Norway", RU: "Russia", SG: "Singapore", KR: "South Korea",
    ES: "Spain", SE: "Sweden", CH: "Switzerland", UK: "United Kingdom", US: "United States"
  };

  // 头像生成器 - 银行卡专用小尺寸
  const generateAvatar = (d: AccessPassDesign) => {
    const faceTypes = [
      `<circle cx="25" cy="25" r="18" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="1.5"/>`,
      `<rect x="7" y="7" width="36" height="36" rx="3" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="1.5"/>`,
      `<path d="M15,7 C5,20 10,45 25,40 C40,35 35,7 25,7 C22,7 18,7 15,7 Z" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="1.5"/>`,
      `<path d="M7,20 C7,12 12,7 25,7 C38,7 43,12 43,20 V35 C43,40 38,43 33,43 H17 C12,43 7,40 7,35 Z" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="1.5"/>`
    ];

    const eyeTypes = [
      `<circle cx="20" cy="22" r="1.5" fill="#333"/><circle cx="30" cy="22" r="1.5" fill="#333"/>`,
      `<path d="M18,22 L21,19 L21,25 Z" fill="#333"/><path d="M32,22 L29,19 L29,25 Z" fill="#333"/>`,
      `<rect x="18" y="20" width="4" height="4" fill="#333"/><rect x="28" y="20" width="4" height="4" fill="#333"/>`,
      `<path d="M18,20 L22,20 M20,20 L20,25 M28,20 L32,20 M30,20 L30,25" stroke="#333" stroke-width="1.2" fill="none"/>`,
      `<path d="M18,24 Q20,20 22,24" stroke="#333" stroke-width="1.2" fill="none"/><path d="M28,24 Q30,20 32,24" stroke="#333" stroke-width="1.2" fill="none"/>`,
      `<path d="M18,20 L22,24 M22,20 L18,24 M28,20 L32,24 M32,20 L28,24" stroke="#333" stroke-width="1.5" fill="none"/>`,
      `<circle cx="20" cy="22" r="3" fill="none" stroke="#333" stroke-width="1.2"/><circle cx="30" cy="22" r="3" fill="none" stroke="#333" stroke-width="1.2"/>`
    ];

    const mouthTypes = [
      `<path d="M22,30 Q25,34 28,30" stroke="#333" stroke-width="1.2" fill="none"/>`,
      `<path d="M23,30 Q24,28 25,30 Q26,28 27,30" stroke="#333" stroke-width="1.2" fill="none"/>`,
      `<ellipse cx="25" cy="32" rx="3" ry="2" fill="none" stroke="#333" stroke-width="1.2"/>`,
      `<line x1="23" y1="31" x2="27" y2="31" stroke="#333" stroke-width="1.2"/>`,
      `<path d="M22,28 Q25,35 28,28 Z" fill="#333"/>`,
      `<path d="M22,28 L24,32 L25,28 L26,32 L28,28" stroke="#333" stroke-width="1.2" fill="none"/>`
    ];

    const hairTypes = [
      "",
      `<path d="M12,15 L17,8 L25,10 L33,8 L38,15" stroke="#8B4513" stroke-width="1.5" fill="#8B4513" />`,
      `<path d="M7,22 C7,15 43,15 43,22" fill="#8B4513" />`,
      `<circle cx="25" cy="18" r="12" fill="#8B4513" /><circle cx="25" cy="18" r="10" fill="${d.avatarSkinColor}" />`,
      `<path d="M7,15 C2,25 7,40 17,35 L33,35 C43,40 48,25 43,15" fill="#8B4513" />`
    ];

    const accessories = [
      "",
      `<rect x="16" y="20" width="18" height="6" fill="#222" rx="1"/><rect x="17" y="21" width="16" height="1" fill="#555"/>`,
      `<path d="M20,12 C15,8 35,8 30,12 L35,18 L15,18 Z" fill="#4a90e2"/><circle cx="35" cy="18" r="2" fill="white"/>`,
      `<ellipse cx="25" cy="8" rx="12" ry="3" fill="none" stroke="#ffd700" stroke-width="1.5" />`,
      `<g transform="translate(35, 12)" stroke="#333" stroke-width="1.5" fill="none">
        <path d="M0,0 L4,0 L0,4 L4,4" />
        <path d="M1,6 L5,6 L1,10 L5,10" />
      </g>`
    ];

    const face = faceTypes[d.avatarFaceType] || faceTypes[0];
    const eyes = eyeTypes[d.avatarEyeType] || eyeTypes[0];
    const mouth = mouthTypes[d.avatarMouthType] || mouthTypes[0];
    const hair = hairTypes[d.avatarHairType] || "";
    const accessory = accessories[d.avatarAccessory] || "";

    return `<rect x="0" y="0" width="50" height="50" rx="25" fill="rgba(255,255,255,0.85)" stroke="#ccc" stroke-width="1"/>${hair}${face}${eyes}${mouth}${accessory}`;
  };

  const gradientDir = gradientDirections[design.bgGradientDirection] || gradientDirections[0];
  const selectedFont = fonts[design.fontChoice] || fonts[0];
  const selectedBadge = badges[design.badgeType] || "";
  const selectedFlag = design.showCountryFlag ? countryFlags[design.countryCode as keyof typeof countryFlags] || "" : "";
  const selectedCountryName = design.showCountryFlag ? countryNames[design.countryCode as keyof typeof countryNames] || "" : "";

  // 使用自定义变换或默认变换
  const transforms = customTransforms || {
    avatar: { x: 320, y: 50, scale: 1.0 },
    logo: { x: 25, y: 45, scale: 1.0 },
    chip: { x: 25, y: 85, scale: 1.0 },
    cardholderInfo: { x: 25, y: 115, scale: 1.0 },
    accountBalance: { x: 220, y: 115, scale: 1.0 },
    claimableInfo: { x: 25, y: 170, scale: 1.0 },
    devSupport: { x: 270, y: 200, scale: 1.0 },
    devSupportInfo: { x: 25, y: 200, scale: 1.0 },
    badge: { x: 320, y: 35, scale: 1.0 },
    bottomText: { x: 20, y: 235, scale: 1.0 },
    countryFlag: { x: 300, y: 190, scale: 1.0 }
  };

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

  // 构建Win98风格SVG（包含经典UI元素）
  let svgContent = `<svg width="400" height="250" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Win98风格背景渐变 -->
      <linearGradient id="win98Background" x1="${gradientDir.x1}" y1="${gradientDir.y1}" x2="${gradientDir.x2}" y2="${gradientDir.y2}">
        <stop offset="0%" stop-color="${design.bgColor1}" />
        <stop offset="100%" stop-color="${design.bgColor2}" />
      </linearGradient>
      
      <!-- Win98经典边框图案 -->
      <pattern id="win98Border" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="#c0c0c0"/>
        <rect width="2" height="2" fill="#ffffff"/>
        <rect x="2" y="2" width="2" height="2" fill="#808080"/>
      </pattern>
      
      <!-- Win98 3D按钮效果 -->
      <linearGradient id="win98Button" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="50%" stop-color="#c0c0c0" />
        <stop offset="100%" stop-color="#808080" />
      </linearGradient>
      
      <!-- Win98扫光效果（更像素化） -->
      <linearGradient id="win98Shine" x1="-50%" y1="-50%" x2="150%" y2="150%" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color="rgba(255,255,255,0)" />
        <stop offset="45%" stop-color="rgba(255,255,255,0)" />
        <stop offset="50%" stop-color="rgba(192,192,192,0.8)" />
        <stop offset="55%" stop-color="rgba(255,255,255,0)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        <animateTransform
          attributeName="gradientTransform"
          attributeType="XML"
          type="translate"
          values="-200,-200;600,600;-200,-200"
          dur="5s"
          repeatCount="indefinite"
          begin="0s"
        />
      </linearGradient>`;
      
  if (devSupportAmount > 0) {
    let gradientColors = { start: '#FFD700', mid: '#FFA500', end: '#FFD700', name: 'goldGradient' };
    
    if (devSupportAmount >= 0.7) {
      gradientColors = { start: '#FF6B6B', mid: '#4ECDC4', end: '#45B7D1', name: 'diamondGradient' };
    } else if (devSupportAmount >= 0.4) {
      gradientColors = { start: '#E8E8E8', mid: '#C0C0C0', end: '#F5F5F5', name: 'platinumGradient' };
    }
    
    svgContent += `
      <linearGradient id="${gradientColors.name}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${gradientColors.start}" />
        <stop offset="50%" stop-color="${gradientColors.mid}" />
        <stop offset="100%" stop-color="${gradientColors.end}" />
      </linearGradient>`;
  }
  
  svgContent += `
      <style>
        .card-title { font: bold 14px 'MS Sans Serif', monospace; fill: #000080; text-anchor: start; }
        .card-subtitle { font: normal 12px 'MS Sans Serif', monospace; fill: #000080; text-anchor: start; }
        .card-holder { font: bold 10px 'Courier New', monospace; fill: #000; text-anchor: start; }
        .card-address { font: bold 11px 'Courier New', monospace; fill: #000; text-anchor: start; }
        .card-label { font: normal 9px 'MS Sans Serif', sans-serif; fill: #000; text-anchor: start; }
        .card-value { font: bold 10px 'MS Sans Serif', sans-serif; fill: #000080; text-anchor: start; }
        .card-badge { font-size: 18px; text-anchor: middle; }
        .card-support { font: bold 8px 'MS Sans Serif', sans-serif; fill: white; text-anchor: middle; }
        .card-bottom { font: normal 8px 'MS Sans Serif', sans-serif; fill: #666; text-anchor: start; }
      </style>
    </defs>
    
    <!-- 专业银行卡背景设计 -->
    <rect width="400" height="250" rx="12" fill="url(#win98Background)" stroke="#404040" stroke-width="2" />
    
    <!-- 银行卡 3D 立体边框 -->
    <rect x="3" y="3" width="394" height="244" rx="9" fill="none" stroke="#ffffff" stroke-width="1" />
    <rect x="2" y="2" width="396" height="246" rx="10" fill="none" stroke="#e0e0e0" stroke-width="1" />
    
    <!-- 顶部磁条区域 -->
    <rect x="0" y="25" width="400" height="12" fill="#000000" />
    <rect x="2" y="27" width="396" height="8" fill="#333333" />
    
    ${generatePattern(design)}
    
    <!-- 左上角品牌logo区域 -->
    <g transform="translate(${transforms.logo.x}, ${transforms.logo.y}) scale(${transforms.logo.scale})">
      <text x="0" y="15" class="card-title">SLEEP PROTOCOL</text>
      <text x="0" y="30" class="card-subtitle">ACCESS PASS</text>
    </g>
    
    <!-- 银行卡芯片 - 标准位置 -->
    <g transform="translate(${transforms.chip.x}, ${transforms.chip.y}) scale(${transforms.chip.scale})">
      <rect x="0" y="0" width="32" height="24" rx="4" fill="#ffd700" stroke="#b8860b" stroke-width="1" />
      <rect x="2" y="2" width="28" height="20" rx="2" fill="#ffc107" />
      <!-- 芯片触点 -->
      <rect x="4" y="5" width="6" height="4" rx="1" fill="#b8860b" />
      <rect x="11" y="5" width="6" height="4" rx="1" fill="#b8860b" />
      <rect x="18" y="5" width="6" height="4" rx="1" fill="#b8860b" />
      <rect x="4" y="10" width="6" height="4" rx="1" fill="#b8860b" />
      <rect x="11" y="10" width="6" height="4" rx="1" fill="#b8860b" />
      <rect x="18" y="10" width="6" height="4" rx="1" fill="#b8860b" />
      <rect x="4" y="15" width="6" height="4" rx="1" fill="#b8860b" />
      <rect x="11" y="15" width="6" height="4" rx="1" fill="#b8860b" />
      <rect x="18" y="15" width="6" height="4" rx="1" fill="#b8860b" />
    </g>
    
    <!-- 右上角头像区域 - 重新定位 -->
    <g transform="translate(${transforms.avatar.x}, ${transforms.avatar.y}) scale(${transforms.avatar.scale})">
        ${generateAvatar(design)}
    </g>
    
    <!-- 中部持卡人信息区域 -->
    <g transform="translate(${transforms.cardholderInfo.x}, ${transforms.cardholderInfo.y}) scale(${transforms.cardholderInfo.scale})">
      <text x="0" y="15" class="card-holder">CARDHOLDER</text>
      <text x="0" y="30" class="card-address">${userAddress.substring(0, 8)}...${userAddress.substring(userAddress.length - 6)}</text>
    </g>
    
    <!-- 右侧账户余额区域 -->
    <g transform="translate(${transforms.accountBalance.x}, ${transforms.accountBalance.y}) scale(${transforms.accountBalance.scale})">
      <text x="0" y="15" class="card-label">${t ? t('sleepProtocol.nft.labels.stakedSleep') : 'STAKED SLEEP'}</text>
      <text x="0" y="30" class="card-value">${formatAmountForSvg(stakedSleep, 18)}</text>
    </g>
    
    <!-- 底部账户信息区域 -->
    <g transform="translate(${transforms.claimableInfo.x}, ${transforms.claimableInfo.y}) scale(${transforms.claimableInfo.scale})">
        <text x="0" y="0" class="card-label">${t ? t('sleepProtocol.nft.labels.claimableOkb') : 'CLAIMABLE OKB'}</text>
        <text x="0" y="15" class="card-value">${formatAmountForSvg(claimableOkb, 18)}</text>
        <text x="120" y="0" class="card-label">${t ? t('sleepProtocol.nft.labels.claimableSleep') : 'CLAIMABLE SLEEP'}</text>
        <text x="120" y="15" class="card-value">${formatAmountForSvg(claimableSleep, 18)}</text>
    </g>`;
    
  if (devSupportAmount > 0) {
    let gradientName = 'goldGradient';
    let tierText = 'Gold Supporter';
    let tierIcon = 'GOLD';
    
    if (devSupportAmount >= 0.7) {
      gradientName = 'diamondGradient';
      tierText = 'Diamond Supporter';
      tierIcon = 'DIAMOND';
    } else if (devSupportAmount >= 0.4) {
      gradientName = 'platinumGradient';
      tierText = 'Platinum Supporter';
      tierIcon = 'PLATINUM';
    }
    
          svgContent += `
            <!-- Dev Support 专属标识 - 右下角 -->
            <g transform="translate(${transforms.devSupport.x}, ${transforms.devSupport.y}) scale(${transforms.devSupport.scale})">
              <rect x="0" y="0" width="110" height="18" rx="3" fill="url(#${gradientName})" stroke="#404040" stroke-width="1" />
              <text x="55" y="12" class="card-support">${tierIcon} DEV SUPPORTER</text>
            </g>`;
  }
  
  svgContent += `
    <!-- 个性化徽章 - 调整到合适位置 -->
    ${selectedBadge ? `
      <g transform="translate(${transforms.badge.x}, ${transforms.badge.y}) scale(${transforms.badge.scale})">
        <text x="0" y="0" class="card-badge" fill="#FFD700">${selectedBadge}</text>
      </g>` : ''}
    
    <!-- 国旗标识 - 可拖拽 -->
    ${selectedFlag ? `
      <g transform="translate(${transforms.countryFlag.x}, ${transforms.countryFlag.y}) scale(${transforms.countryFlag.scale})">
        ${selectedFlag.startsWith('/images/') ? 
          `<image x="0" y="0" width="30" height="20" href="${selectedFlag}" />` :
          `<text x="0" y="15" class="card-badge" fill="#000">${selectedFlag}</text>`
        }
        <text x="0" y="35" class="card-label" style="font-size: 8px;">${selectedCountryName}</text>
      </g>` : ''}
    
    ${devSupportAmount > 0 ? `
      <!-- Dev Support 附加信息 - 可拖拽 -->
      <g transform="translate(${transforms.devSupportInfo.x}, ${transforms.devSupportInfo.y}) scale(${transforms.devSupportInfo.scale})">
        <text x="0" y="5" class="card-label">${t ? t('sleepProtocol.nft.labels.devSupport') : 'DEV SUPPORT'}: ${calculateContributionPercent(devSupportAmount, totalSupport)}%</text>
        <text x="0" y="18" class="card-value">${t ? t('sleepProtocol.nft.labels.totalPool') : 'Total Pool'}: ${formatAmountForSvg(totalSupport, 18)} OKB</text>
      </g>
    ` : ''}

    <!-- 银行卡底部验证条 -->
    <rect x="10" y="230" width="380" height="12" fill="rgba(0,0,0,0.1)" rx="2" />
    
    <!-- 银行卡安全全息效果 -->
    <defs>
      <mask id="bankCardMask">
        <rect x="0" y="0" width="400" height="250" rx="12" fill="white" />
      </mask>
    </defs>
    
    <g mask="url(#bankCardMask)">
      <rect x="-100" y="-300" width="15" height="800" fill="rgba(255,255,255,0.3)" pointer-events="none" transform="rotate(30 200 125)">
        <animateTransform
          attributeName="transform"
          type="translate"
          values="-500,-300; 500,300; -500,-300"
          dur="6s"
          repeatCount="indefinite"
          begin="0s"
          additive="sum"
        />
      </rect>
    </g>
    
    <!-- 银行卡防伪微光效果 -->
    <rect x="0" y="0" width="400" height="250" rx="12" fill="rgba(255,255,255,0.01)" pointer-events="none">
      <animate
        attributeName="opacity"
        values="0.01; 0.05; 0.01"
        dur="4s"
        repeatCount="indefinite"
      />
    </rect>
    
    <!-- Win98扫光效果层 -->
    <rect x="0" y="0" width="400" height="250" rx="12" fill="url(#win98Shine)" pointer-events="none" opacity="0.6" />
  </svg>`;
  
  return svgContent;
};

// 生成可拖拽和缩放的预览SVG
const generateDraggablePreviewSvg = (
  design: AccessPassDesign,
  userAddress: string,
  devSupportAmount: number,
  stakedSleep: number,
  claimableOkb: number,
  claimableSleep: number,
  totalSupport: number,
  transforms: ElementTransforms,
  selectedElement: string | null,
  onElementMouseDown: (elementId: string, event: React.MouseEvent) => void,
  onElementDoubleClick: (elementId: string, event: React.MouseEvent) => void,
  onResizeStart: (elementId: string, event: React.MouseEvent) => void,
  cardHovered: boolean,
  t?: any
): JSX.Element => {
  const gradientDirections = [
    { x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
    { x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
    { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }
  ];

  const badges = ["", "🚀", "💎", "🌙", "⚡️"];
  const selectedBadge = badges[design.badgeType] || "";
  
  // 国旗映射 - 真实国旗图片 (运行重命名脚本后将使用简化文件名)
  const countryFlags = {
    AU: "/images/Countries/AU.png", // 澳大利亚
    BR: "/images/Countries/BR.png", // 巴西 
    CA: "/images/Countries/CA.png", // 加拿大
    CN: "/images/Countries/CN.png", // 中国
    FR: "/images/Countries/FR.png", // 法国
    DE: "/images/Countries/DE.png", // 德国
    IN: "/images/Countries/IN.png", // 印度
    IT: "/images/Countries/IT.png", // 意大利
    JP: "/images/Countries/JP.png", // 日本
    MX: "/images/Countries/MX.png", // 墨西哥
    NL: "/images/Countries/NL.png", // 荷兰
    NO: "/images/Countries/NO.png", // 挪威
    RU: "/images/Countries/RU.png", // 俄罗斯
    SG: "/images/Countries/SG.png", // 新加坡
    KR: "/images/Countries/KR.png", // 韩国
    ES: "/images/Countries/ES.png", // 西班牙
    SE: "/images/Countries/SE.png", // 瑞典
    CH: "/images/Countries/CH.png", // 瑞士
    UK: "/images/Countries/UK.png", // 英国
    US: "/images/Countries/US.png"  // 美国
  };
  
  const countryNames = {
    AU: "Australia", BR: "Brazil", CA: "Canada", CN: "China", FR: "France",
    DE: "Germany", IN: "India", IT: "Italy", JP: "Japan", MX: "Mexico",
    NL: "Netherlands", NO: "Norway", RU: "Russia", SG: "Singapore", KR: "South Korea",
    ES: "Spain", SE: "Sweden", CH: "Switzerland", UK: "United Kingdom", US: "United States"
  };
  
  const selectedFlag = design.showCountryFlag ? countryFlags[design.countryCode as keyof typeof countryFlags] || "" : "";
  const selectedCountryName = design.showCountryFlag ? countryNames[design.countryCode as keyof typeof countryNames] || "" : "";

  // 头像生成器 - 用于预览
  const generateAvatar = (d: AccessPassDesign) => {
    const faceTypes = [
      `<circle cx="25" cy="25" r="18" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="1.5"/>`,
      `<rect x="7" y="7" width="36" height="36" rx="3" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="1.5"/>`,
      `<path d="M15,7 C5,20 10,45 25,40 C40,35 35,7 25,7 C22,7 18,7 15,7 Z" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="1.5"/>`,
      `<path d="M7,20 C7,12 12,7 25,7 C38,7 43,12 43,20 V35 C43,40 38,43 33,43 H17 C12,43 7,40 7,35 Z" fill="${d.avatarSkinColor}" stroke="#333" stroke-width="1.5"/>`
    ];

    const eyeTypes = [
      `<circle cx="20" cy="22" r="1.5" fill="#333"/><circle cx="30" cy="22" r="1.5" fill="#333"/>`,
      `<path d="M18,22 L21,19 L21,25 Z" fill="#333"/><path d="M32,22 L29,19 L29,25 Z" fill="#333"/>`,
      `<rect x="18" y="20" width="4" height="4" fill="#333"/><rect x="28" y="20" width="4" height="4" fill="#333"/>`,
      `<path d="M18,20 L22,20 M20,20 L20,25 M28,20 L32,20 M30,20 L30,25" stroke="#333" stroke-width="1.2" fill="none"/>`,
      `<path d="M18,24 Q20,20 22,24" stroke="#333" stroke-width="1.2" fill="none"/><path d="M28,24 Q30,20 32,24" stroke="#333" stroke-width="1.2" fill="none"/>`,
      `<path d="M18,20 L22,24 M22,20 L18,24 M28,20 L32,24 M32,20 L28,24" stroke="#333" stroke-width="1.5" fill="none"/>`,
      `<circle cx="20" cy="22" r="3" fill="none" stroke="#333" stroke-width="1.2"/><circle cx="30" cy="22" r="3" fill="none" stroke="#333" stroke-width="1.2"/>`
    ];

    const mouthTypes = [
      `<path d="M22,30 Q25,34 28,30" stroke="#333" stroke-width="1.2" fill="none"/>`,
      `<path d="M23,30 Q24,28 25,30 Q26,28 27,30" stroke="#333" stroke-width="1.2" fill="none"/>`,
      `<ellipse cx="25" cy="32" rx="3" ry="2" fill="none" stroke="#333" stroke-width="1.2"/>`,
      `<line x1="23" y1="31" x2="27" y2="31" stroke="#333" stroke-width="1.2"/>`,
      `<path d="M22,28 Q25,35 28,28 Z" fill="#333"/>`,
      `<path d="M22,28 L24,32 L25,28 L26,32 L28,28" stroke="#333" stroke-width="1.2" fill="none"/>`
    ];

    const hairTypes = [
      "",
      `<path d="M12,15 L17,8 L25,10 L33,8 L38,15" stroke="#8B4513" stroke-width="1.5" fill="#8B4513" />`,
      `<path d="M7,22 C7,15 43,15 43,22" fill="#8B4513" />`,
      `<circle cx="25" cy="18" r="12" fill="#8B4513" /><circle cx="25" cy="18" r="10" fill="${d.avatarSkinColor}" />`,
      `<path d="M7,15 C2,25 7,40 17,35 L33,35 C43,40 48,25 43,15" fill="#8B4513" />`
    ];

    const accessories = [
      "",
      `<rect x="16" y="20" width="18" height="6" fill="#222" rx="1"/><rect x="17" y="21" width="16" height="1" fill="#555"/>`,
      `<path d="M20,12 C15,8 35,8 30,12 L35,18 L15,18 Z" fill="#4a90e2"/><circle cx="35" cy="18" r="2" fill="white"/>`,
      `<ellipse cx="25" cy="8" rx="12" ry="3" fill="none" stroke="#ffd700" stroke-width="1.5" />`,
      `<g transform="translate(35, 12)" stroke="#333" stroke-width="1.5" fill="none">
        <path d="M0,0 L4,0 L0,4 L4,4" />
        <path d="M1,6 L5,6 L1,10 L5,10" />
      </g>`
    ];

    const face = faceTypes[d.avatarFaceType] || faceTypes[0];
    const eyes = eyeTypes[d.avatarEyeType] || eyeTypes[0];
    const mouth = mouthTypes[d.avatarMouthType] || mouthTypes[0];
    const hair = hairTypes[d.avatarHairType] || "";
    const accessory = accessories[d.avatarAccessory] || "";

    return `<rect x="0" y="0" width="50" height="50" rx="25" fill="rgba(255,255,255,0.85)" stroke="#ccc" stroke-width="1"/>${hair}${face}${eyes}${mouth}${accessory}`;
  };

  // 缩放控制点组件
  const ResizeHandle = ({ elementId, x, y }: { elementId: string, x: number, y: number }) => (
    <circle
      cx={x}
      cy={y}
      r="4"
      fill="#ff0000"
      stroke="#ffffff"
      strokeWidth="1"
      style={{ cursor: 'nw-resize' }}
      onMouseDown={(e) => onResizeStart(elementId, e)}
    />
  );

  const cardScale = cardHovered ? 1.05 : 1.0;

  return (
    <svg 
      width="400" 
      height="250" 
      viewBox="0 0 400 250" 
      style={{ 
        border: '1px solid #ccc', 
        background: '#f8f8f8', 
        cursor: 'default',
        transform: `scale(${cardScale})`,
        transformOrigin: 'center',
        transition: 'transform 0.2s ease'
      }}
    >
      <defs>
        <linearGradient id="win98Background" x1={gradientDirections[design.bgGradientDirection]?.x1} y1={gradientDirections[design.bgGradientDirection]?.y1} x2={gradientDirections[design.bgGradientDirection]?.x2} y2={gradientDirections[design.bgGradientDirection]?.y2}>
          <stop offset="0%" stopColor={design.bgColor1} />
          <stop offset="100%" stopColor={design.bgColor2} />
        </linearGradient>
        <style>
          {`.draggable-element { cursor: move; }
           .draggable-element:hover { stroke: #ff0000; stroke-width: 2; fill: rgba(255,0,0,0.1); }
           .card-title { font: bold 14px 'MS Sans Serif', monospace; fill: #000080; text-anchor: start; }
           .card-subtitle { font: normal 12px 'MS Sans Serif', monospace; fill: #000080; text-anchor: start; }
           .card-holder { font: bold 10px 'Courier New', monospace; fill: #000; text-anchor: start; }
           .card-address { font: bold 11px 'Courier New', monospace; fill: #000; text-anchor: start; }
           .card-label { font: normal 9px 'MS Sans Serif', sans-serif; fill: #000; text-anchor: start; }
           .card-value { font: bold 10px 'MS Sans Serif', sans-serif; fill: #000080; text-anchor: start; }
           .card-badge { font-size: 18px; text-anchor: middle; }
           .card-support { font: bold 8px 'MS Sans Serif', sans-serif; fill: white; text-anchor: middle; }
           .card-bottom { font: normal 8px 'MS Sans Serif', sans-serif; fill: #666; text-anchor: start; }`}
        </style>
      </defs>
      
      {/* 银行卡背景 */}
      <rect width="400" height="250" rx="12" fill="url(#win98Background)" stroke="#404040" strokeWidth="2" />
      <rect x="3" y="3" width="394" height="244" rx="9" fill="none" stroke="#ffffff" strokeWidth="1" />
      <rect x="2" y="2" width="396" height="246" rx="10" fill="none" stroke="#e0e0e0" strokeWidth="1" />
      <rect x="0" y="25" width="400" height="12" fill="#000000" />
      <rect x="2" y="27" width="396" height="8" fill="#333333" />

      {/* Logo区域 - 可拖拽 */}
      <g 
        className="draggable-element"
        onMouseDown={(e) => onElementMouseDown('logo', e)}
        onDoubleClick={(e) => onElementDoubleClick('logo', e)}
        transform={`translate(${transforms.logo.x}, ${transforms.logo.y}) scale(${transforms.logo.scale})`}
      >
        <rect 
          x="-5" 
          y="5" 
          width="120" 
          height="30" 
          fill={selectedElement === 'logo' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'logo' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'logo' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <text x="0" y="20" className="card-title">SLEEP PROTOCOL</text>
        <text x="0" y="35" className="card-subtitle">ACCESS PASS</text>
      </g>
      {selectedElement === 'logo' && (
        <ResizeHandle elementId="logo" x={transforms.logo.x + 115 * transforms.logo.scale} y={transforms.logo.y + 5 * transforms.logo.scale} />
      )}

      {/* 芯片 - 可拖拽 */}
      <g 
        className="draggable-element"
        onMouseDown={(e) => onElementMouseDown('chip', e)}
        onDoubleClick={(e) => onElementDoubleClick('chip', e)}
        transform={`translate(${transforms.chip.x}, ${transforms.chip.y}) scale(${transforms.chip.scale})`}
      >
        <rect 
          x="-2" 
          y="-2" 
          width="36" 
          height="28" 
          fill={selectedElement === 'chip' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'chip' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'chip' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <rect x="0" y="0" width="32" height="24" rx="4" fill="#ffd700" stroke="#b8860b" strokeWidth="1" />
        <rect x="2" y="2" width="28" height="20" rx="2" fill="#ffc107" />
      </g>
      {selectedElement === 'chip' && (
        <ResizeHandle elementId="chip" x={transforms.chip.x + 32 * transforms.chip.scale} y={transforms.chip.y} />
      )}

      {/* 头像 - 可拖拽 */}
      <g 
        className="draggable-element"
        onMouseDown={(e) => onElementMouseDown('avatar', e)}
        onDoubleClick={(e) => onElementDoubleClick('avatar', e)}
        transform={`translate(${transforms.avatar.x}, ${transforms.avatar.y}) scale(${transforms.avatar.scale})`}
      >
        <rect 
          x="-5" 
          y="-5" 
          width="60" 
          height="60" 
          fill={selectedElement === 'avatar' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'avatar' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'avatar' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <g dangerouslySetInnerHTML={{ __html: generateAvatar(design) }} />
      </g>
      {selectedElement === 'avatar' && (
        <ResizeHandle elementId="avatar" x={transforms.avatar.x + 50 * transforms.avatar.scale} y={transforms.avatar.y} />
      )}

      {/* 持卡人信息 - 可拖拽 */}
      <g 
        className="draggable-element"
        onMouseDown={(e) => onElementMouseDown('cardholderInfo', e)}
        onDoubleClick={(e) => onElementDoubleClick('cardholderInfo', e)}
        transform={`translate(${transforms.cardholderInfo.x}, ${transforms.cardholderInfo.y}) scale(${transforms.cardholderInfo.scale})`}
      >
        <rect 
          x="-5" 
          y="5" 
          width="140" 
          height="35" 
          fill={selectedElement === 'cardholderInfo' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'cardholderInfo' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'cardholderInfo' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <text x="0" y="20" className="card-holder">CARDHOLDER</text>
        <text x="0" y="35" className="card-address">{userAddress.substring(0, 8)}...{userAddress.substring(userAddress.length - 6)}</text>
      </g>
      {selectedElement === 'cardholderInfo' && (
        <ResizeHandle elementId="cardholderInfo" x={transforms.cardholderInfo.x + 135 * transforms.cardholderInfo.scale} y={transforms.cardholderInfo.y + 5 * transforms.cardholderInfo.scale} />
      )}

      {/* 账户余额 - 可拖拽 */}
      <g 
        className="draggable-element"
        onMouseDown={(e) => onElementMouseDown('accountBalance', e)}
        onDoubleClick={(e) => onElementDoubleClick('accountBalance', e)}
        transform={`translate(${transforms.accountBalance.x}, ${transforms.accountBalance.y}) scale(${transforms.accountBalance.scale})`}
      >
        <rect 
          x="-5" 
          y="5" 
          width="120" 
          height="35" 
          fill={selectedElement === 'accountBalance' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'accountBalance' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'accountBalance' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <text x="0" y="20" className="card-label">{t ? t('sleepProtocol.nft.labels.stakedSleep') : 'STAKED SLEEP'}</text>
        <text x="0" y="35" className="card-value">{formatAmountForSvg(stakedSleep, 18)}</text>
      </g>
      {selectedElement === 'accountBalance' && (
        <ResizeHandle elementId="accountBalance" x={transforms.accountBalance.x + 115 * transforms.accountBalance.scale} y={transforms.accountBalance.y + 5 * transforms.accountBalance.scale} />
      )}

      {/* 可提取信息 - 可拖拽 */}
      <g 
        className="draggable-element"
        onMouseDown={(e) => onElementMouseDown('claimableInfo', e)}
        onDoubleClick={(e) => onElementDoubleClick('claimableInfo', e)}
        transform={`translate(${transforms.claimableInfo.x}, ${transforms.claimableInfo.y}) scale(${transforms.claimableInfo.scale})`}
      >
        <rect 
          x="-5" 
          y="-5" 
          width="250" 
          height="25" 
          fill={selectedElement === 'claimableInfo' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'claimableInfo' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'claimableInfo' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <text x="0" y="5" className="card-label">{t ? t('sleepProtocol.nft.labels.claimableOkb') : 'CLAIMABLE OKB'}</text>
        <text x="0" y="20" className="card-value">{formatAmountForSvg(claimableOkb, 18)}</text>
        <text x="120" y="5" className="card-label">{t ? t('sleepProtocol.nft.labels.claimableSleep') : 'CLAIMABLE SLEEP'}</text>
        <text x="120" y="20" className="card-value">{formatAmountForSvg(claimableSleep, 18)}</text>
      </g>
      {selectedElement === 'claimableInfo' && (
        <ResizeHandle elementId="claimableInfo" x={transforms.claimableInfo.x + 245 * transforms.claimableInfo.scale} y={transforms.claimableInfo.y - 5 * transforms.claimableInfo.scale} />
      )}

      {/* 个性化徽章 - 可拖拽 */}
      {selectedBadge && (
        <>
          <g 
            className="draggable-element"
            onMouseDown={(e) => onElementMouseDown('badge', e)}
            onDoubleClick={(e) => onElementDoubleClick('badge', e)}
            transform={`translate(${transforms.badge.x}, ${transforms.badge.y}) scale(${transforms.badge.scale})`}
          >
            <rect 
              x="-15" 
              y="-15" 
              width="30" 
              height="30" 
              fill={selectedElement === 'badge' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
              stroke={selectedElement === 'badge' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
              strokeWidth={selectedElement === 'badge' ? "2" : "1"} 
              strokeDasharray="2,2" 
            />
            <text x="0" y="5" className="card-badge" fill="#FFD700">{selectedBadge}</text>
          </g>
          {selectedElement === 'badge' && (
            <ResizeHandle elementId="badge" x={transforms.badge.x + 15 * transforms.badge.scale} y={transforms.badge.y - 15 * transforms.badge.scale} />
          )}
        </>
      )}

      {/* 国旗标识 - 可拖拽 */}
      {selectedFlag && (
        <>
          <g 
            className="draggable-element"
            onMouseDown={(e) => onElementMouseDown('countryFlag', e)}
            onDoubleClick={(e) => onElementDoubleClick('countryFlag', e)}
            transform={`translate(${transforms.countryFlag.x}, ${transforms.countryFlag.y}) scale(${transforms.countryFlag.scale})`}
          >
            <rect 
              x="-5" 
              y="-5" 
              width="60" 
              height="35" 
              fill={selectedElement === 'countryFlag' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
              stroke={selectedElement === 'countryFlag' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
              strokeWidth={selectedElement === 'countryFlag' ? "2" : "1"} 
              strokeDasharray="2,2" 
            />
            {selectedFlag.startsWith('/images/') ? (
              <>
                <image x="0" y="0" width="30" height="20" href={selectedFlag} />
                <text x="0" y="35" className="card-label" style={{fontSize: '8px'}}>{selectedCountryName}</text>
              </>
            ) : (
              <>
                <text x="0" y="15" className="card-badge" fill="#000">{selectedFlag}</text>
                <text x="0" y="30" className="card-label">{selectedCountryName}</text>
              </>
            )}
          </g>
          {selectedElement === 'countryFlag' && (
            <ResizeHandle elementId="countryFlag" x={transforms.countryFlag.x + 55 * transforms.countryFlag.scale} y={transforms.countryFlag.y - 5 * transforms.countryFlag.scale} />
          )}
        </>
      )}

      {/* Dev Support标识 - 可拖拽 */}
      {devSupportAmount > 0 && (
        <>
          <g 
            className="draggable-element"
            onMouseDown={(e) => onElementMouseDown('devSupport', e)}
            onDoubleClick={(e) => onElementDoubleClick('devSupport', e)}
            transform={`translate(${transforms.devSupport.x}, ${transforms.devSupport.y}) scale(${transforms.devSupport.scale})`}
          >
            <rect 
              x="-5" 
              y="-5" 
              width="120" 
              height="28" 
              fill={selectedElement === 'devSupport' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
              stroke={selectedElement === 'devSupport' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
              strokeWidth={selectedElement === 'devSupport' ? "2" : "1"} 
              strokeDasharray="2,2" 
            />
            <rect x="0" y="0" width="110" height="18" rx="3" fill="#ffd700" stroke="#404040" strokeWidth="1" />
            <text x="55" y="12" className="card-support">DEV SUPPORTER</text>
          </g>
          {selectedElement === 'devSupport' && (
            <ResizeHandle elementId="devSupport" x={transforms.devSupport.x + 115 * transforms.devSupport.scale} y={transforms.devSupport.y - 5 * transforms.devSupport.scale} />
          )}
        </>
      )}

      {/* Dev Support附加信息 - 可拖拽 */}
      {devSupportAmount > 0 && (
        <>
          <g 
            className="draggable-element"
            onMouseDown={(e) => onElementMouseDown('devSupportInfo', e)}
            onDoubleClick={(e) => onElementDoubleClick('devSupportInfo', e)}
            transform={`translate(${transforms.devSupportInfo.x}, ${transforms.devSupportInfo.y}) scale(${transforms.devSupportInfo.scale})`}
          >
            <rect 
              x="-5" 
              y="-5" 
              width="200" 
              height="25" 
              fill={selectedElement === 'devSupportInfo' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
              stroke={selectedElement === 'devSupportInfo' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
              strokeWidth={selectedElement === 'devSupportInfo' ? "2" : "1"} 
              strokeDasharray="2,2" 
            />
            <text x="0" y="5" className="card-label">{t ? t('sleepProtocol.nft.labels.devSupport') : 'DEV SUPPORT'}: {calculateContributionPercent(devSupportAmount, totalSupport)}%</text>
            <text x="0" y="18" className="card-value">{t ? t('sleepProtocol.nft.labels.totalPool') : 'Total Pool'}: {formatAmountForSvg(totalSupport, 18)} OKB</text>
          </g>
          {selectedElement === 'devSupportInfo' && (
            <ResizeHandle elementId="devSupportInfo" x={transforms.devSupportInfo.x + 195 * transforms.devSupportInfo.scale} y={transforms.devSupportInfo.y - 5 * transforms.devSupportInfo.scale} />
          )}
        </>
      )}

    </svg>
  );
};

// Navigation items with Sleep Protocol specific pages
const ensureArray = <T,>(value: T | T[] | undefined | null): T[] => {
  if (!value && value !== 0) return [];
  return Array.isArray(value) ? value : [value];
};

const navigationItems = [
  { id: 'dashboard', labelKey: 'sleepProtocol.nav.dashboard', icon: 'Dashboard' },
  { id: 'access-pass', labelKey: 'sleepProtocol.nav.accessPass', icon: 'Access Pass' },
  { id: 'mint', labelKey: 'sleepProtocol.nav.mint', icon: 'Mint' },
  { id: 'stake', labelKey: 'sleepProtocol.nav.stake', icon: 'Stake' },
  { id: 'swap', labelKey: 'sleepProtocol.nav.swap', icon: 'Swap' },
  { id: 'market', labelKey: 'sleepProtocol.nav.market', icon: 'Market' },
  { id: 'profile', labelKey: 'sleepProtocol.nav.profile', icon: 'Profile' },
  { id: 'liquidate', labelKey: 'sleepProtocol.nav.liquidate', icon: 'Liquidate' },
  { id: 'litepaper', labelKey: 'sleepProtocol.nav.litepaper', icon: 'Litepaper' },
];

const skinColorValuesByIndex: Record<number, string> = {
  0: '#FFDBAC',
  1: '#F1C27D',
  2: '#E0AC69',
  3: '#C68642',
  4: '#8D5524',
  5: '#FFB3BA',
  6: '#BAFFC9',
  7: '#BAE1FF',
};

const skinColorOptions = Object.values(skinColorValuesByIndex);

interface SleepProtocolDesktopProps {
  onClose?: () => void;
}

const SleepProtocolDesktop: React.FC<SleepProtocolDesktopProps> = ({ onClose }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { address, isConnected, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { t } = useTranslation('common');
  const router = useRouter();
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // Swap页面的state
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<'SLEEPING' | 'USDT'>('SLEEPING');
  const [toToken, setToToken] = useState<'SLEEPING' | 'USDT'>('USDT');
  const [swapSlippage, setSwapSlippage] = useState('0.5');
  const [swapMode, setSwapMode] = useState<'swap' | 'addLiquidity'>('swap');
  const [liquidityAmount1, setLiquidityAmount1] = useState('');
  const [liquidityAmount2, setLiquidityAmount2] = useState('');
  
  // Swap计算逻辑 - 只在swap页面时执行
  useEffect(() => {
    if (currentPage !== 'swap') return;
    
    const currentPrice = 0.00001; // 1 SLEEPING = 0.00001 OKB
    const getCurrentTaxPhase = () => {
      const genesisTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const daysSinceGenesis = (Date.now() - genesisTime) / (24 * 60 * 60 * 1000);
      
      if (daysSinceGenesis < 180) return { phase: 1, buyTax: 2, sellTax: 5 };
      if (daysSinceGenesis < 365) return { phase: 2, buyTax: 2, sellTax: 4 };
      if (daysSinceGenesis < 545) return { phase: 3, buyTax: 1, sellTax: 3 };
      return { phase: 4, buyTax: 0, sellTax: 0 };
    };
    
    const taxPhase = getCurrentTaxPhase();
    const currentTax = fromToken === 'SLEEPING' ? taxPhase.sellTax : taxPhase.buyTax;
    
    if (fromAmount && !isNaN(Number(fromAmount))) {
      const amount = Number(fromAmount);
      let output = 0;
      
      if (fromToken === 'SLEEPING') {
        output = amount * currentPrice;
        output = output * (1 - currentTax / 100);
      } else {
        output = amount / currentPrice;
        output = output * (1 - currentTax / 100);
      }
      
      setToAmount(output.toFixed(6));
    } else {
      setToAmount('');
    }
  }, [currentPage, fromAmount, fromToken]);

  // Wallet Modal Component
  const WalletModal = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: showWalletModal ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#c0c0c0',
        border: '2px outset #c0c0c0',
        padding: '16px',
        minWidth: '320px',
        fontFamily: 'MS Sans Serif, sans-serif'
      }}>
        <div style={{
          background: '#000080',
          color: 'white',
          padding: '4px 8px',
          margin: '-16px -16px 16px -16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Wallet Connection</span>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onClick={() => setShowWalletModal(false)}
          >
            ×
          </button>
        </div>
        
        {!isConnected ? (
          <div>
            <div style={{ marginBottom: '16px', fontSize: '14px' }}>
              Choose a wallet to connect:
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {connectors.map((connector) => (
                <Win98Button
                  key={connector.id}
                  style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}
                  onClick={() => {
                    connect({ connector });
                    setShowWalletModal(false);
                  }}
                >
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    background: connector.name.toLowerCase().includes('metamask') ? '#f6851b' : '#000', 
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {connector.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{connector.name}</span>
                </Win98Button>
              ))}
              
              {connectors.length === 0 && (
                <div style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>
                  No wallets detected. Please install MetaMask or OKX Wallet.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px', fontSize: '14px' }}>
              Connected to: {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            
            <Win98Button
              style={{ width: '100%', padding: '8px', background: '#ff6b6b', color: 'white' }}
              onClick={() => {
                disconnect();
                setShowWalletModal(false);
              }}
            >
              Disconnect Wallet
            </Win98Button>
          </div>
        )}
      </div>
    </div>
  );

  // Language switching function
  const changeLanguage = (locale: string) => {
    router.push(router.asPath, router.asPath, { locale });
  };

  // 拖拽和双击缩放处理函数
  const handleElementDoubleClick = (elementId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // 双击切换缩放模式
    setSelectedElement(selectedElement === elementId ? null : elementId);
  };

  const handleMouseDown = (elementId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(elementId);
    
    const svgRect = event.currentTarget.closest('svg')?.getBoundingClientRect();
    if (svgRect) {
      // 计算相对于SVG的偏移
      const element = elementTransforms[elementId as keyof ElementTransforms];
      setDragOffset({
        x: event.clientX - svgRect.left - element.x,
        y: event.clientY - svgRect.top - element.y,
        scale: element.scale
      });
    }
  };

  const handleResizeStart = (elementId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResizing(elementId);
    
    const element = elementTransforms[elementId as keyof ElementTransforms];
    setDragOffset({
      x: event.clientX,
      y: event.clientY,
      scale: element.scale
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      const svgRect = event.currentTarget.getBoundingClientRect();
      const newX = Math.max(0, Math.min(380, event.clientX - svgRect.left - dragOffset.x));
      const newY = Math.max(0, Math.min(245, event.clientY - svgRect.top - dragOffset.y));
      
      setElementTransforms(prev => ({
        ...prev,
        [isDragging]: { ...prev[isDragging as keyof ElementTransforms], x: newX, y: newY }
      }));
    } else if (isResizing) {
      const deltaX = event.clientX - dragOffset.x;
      const deltaY = event.clientY - dragOffset.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const scaleChange = distance / 100; // 调整缩放敏感度
      const newScale = Math.max(0.3, Math.min(3.0, dragOffset.scale + scaleChange));
      
      setElementTransforms(prev => ({
        ...prev,
        [isResizing]: { ...prev[isResizing as keyof ElementTransforms], scale: newScale }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setIsResizing(null);
  };

  // 卡片悬停处理
  const handleCardMouseEnter = () => {
    setCardHovered(true);
  };

  const handleCardMouseLeave = () => {
    setCardHovered(false);
    handleMouseUp(); // 同时处理拖拽结束
  };

  // 点击背景退出缩放模式
  const handleBackgroundClick = () => {
    setSelectedElement(null);
  };

  // 重置所有变换到默认值
  const resetTransforms = () => {
    setElementTransforms({
      avatar: { x: 320, y: 50, scale: 1.0 },
      logo: { x: 25, y: 45, scale: 1.0 },
      chip: { x: 25, y: 85, scale: 1.0 },
      cardholderInfo: { x: 25, y: 115, scale: 1.0 },
      accountBalance: { x: 220, y: 115, scale: 1.0 },
      claimableInfo: { x: 25, y: 170, scale: 1.0 },
      devSupport: { x: 270, y: 200, scale: 1.0 },
      devSupportInfo: { x: 25, y: 200, scale: 1.0 },
      badge: { x: 320, y: 35, scale: 1.0 },
      bottomText: { x: 20, y: 235, scale: 1.0 },
      countryFlag: { x: 300, y: 190, scale: 1.0 }
    });
    setSelectedElement(null);
  };

  // Access Pass Design State (完全复制网页版)
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
    avatarHairType: 1,
    avatarSkinColor: '#FFDBAC',
    avatarAccessory: 1,
    fontChoice: 0,
    textColor: '#FFFFFF',
    badgeType: 3,
    countryCode: 'CN',
    showCountryFlag: true,
  });

  // 元素变换状态（默认位置和缩放）
  const [elementTransforms, setElementTransforms] = useState<ElementTransforms>({
    avatar: { x: 320, y: 50, scale: 1.0 },
    logo: { x: 25, y: 45, scale: 1.0 },
    chip: { x: 25, y: 85, scale: 1.0 },
    cardholderInfo: { x: 25, y: 115, scale: 1.0 },
    accountBalance: { x: 220, y: 115, scale: 1.0 },
    claimableInfo: { x: 25, y: 170, scale: 1.0 },
    devSupport: { x: 270, y: 200, scale: 1.0 },
    devSupportInfo: { x: 25, y: 200, scale: 1.0 }, // Dev Support附加信息
    badge: { x: 320, y: 35, scale: 1.0 },
    bottomText: { x: 20, y: 235, scale: 1.0 }, // 底部验证条文字
    countryFlag: { x: 300, y: 190, scale: 1.0 } // 国旗位置
  });

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<ElementTransform>({ x: 0, y: 0, scale: 1.0 });
  const [cardHovered, setCardHovered] = useState<boolean>(false);

  // Preview Data State
  const [previewDevSupportAmount, setPreviewDevSupportAmount] = useState(0);
  const [previewStakedSleep, setPreviewStakedSleep] = useState(12345.67);
  const [previewClaimableOkb, setPreviewClaimableOkb] = useState(88.88);
  const [previewClaimableSleep, setPreviewClaimableSleep] = useState(123456.78);
  const [previewTotalSupport, setPreviewTotalSupport] = useState(1234.56);
  const [previewSvg, setPreviewSvg] = useState('');

  // Access Pass Mint State
  const [showAccessPassMintModal, setShowAccessPassMintModal] = useState(false);
  const [devSupportAmount, setDevSupportAmount] = useState(0.5);

  // Market Page State
  const [marketListings, setMarketListings] = useState<any[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketPage, setMarketPage] = useState(1);
  const [sortBy, setSortBy] = useState<'price' | 'rank' | 'newest'>('newest');
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [termFilter, setTermFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [purchasingTokenId, setPurchasingTokenId] = useState<string | null>(null);

  // Liquidate Page State
  const [liquidatableNFTs, setLiquidatableNFTs] = useState<any[]>([]);
  const [liquidationStats, setLiquidationStats] = useState<any>(null);
  const [liquidateLoading, setLiquidateLoading] = useState(false);
  const [liquidatePage, setLiquidatePage] = useState(1);

  // Profile Page State
  const [userNFTs, setUserNFTs] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profilePage, setProfilePage] = useState(1);

  const { data: block } = useBlock();
  const { writeContractAsync: marketWriteAsync, isPending: isMarketPending } = useWriteContract();

  // Update preview SVG when design changes (Win98 style)
  useEffect(() => {
    const svg = generateWin98AccessPassSvg(
      design, 
      address ?? "0x000...000", 
      previewDevSupportAmount,
      previewStakedSleep,
      previewClaimableOkb,
      previewClaimableSleep,
      previewTotalSupport,
      elementTransforms,
      t
    );
    setPreviewSvg(svg);
  }, [design, address, previewDevSupportAmount, previewStakedSleep, previewClaimableOkb, previewClaimableSleep, previewTotalSupport, elementTransforms]);
  const { 
    globalRank, 
    totalStaked, 
    sleepBalance, 
    genesisTs, 
    userStakeData, 
    refetchGlobals,
    refetchUserData,
    refetchBalance 
  } = useSleepContext();
  const { data: feeData } = useFeeData();
  
  // Mint functionality
  const { writeContractAsync: mintAsync, isPending: isMintPending } = useWriteContract();
  const [isMintConfirming, setMintConfirming] = useState(false);
  
  const mintSchema = yup.object().shape({
    count: yup
      .number()
      .required("Count is required")
      .positive("Count must be positive")
      .integer("Count must be an integer")
      .max(1000, "Maximum count is 1000")
      .typeError("Invalid number"),
    term: yup
      .number()
      .required("Term is required")
      .positive("Term must be positive")
      .integer("Term must be an integer")
      .min(1, "Minimum term is 1 day")
      .max(1000, "Maximum term is 1000 days")
      .typeError("Invalid number"),
  });

  const {
    register: mintRegister,
    handleSubmit: handleMintSubmit,
    formState: { errors: mintErrors, isValid: isMintValid },
    watch: mintWatch,
    reset: resetMint,
  } = useForm<MintForm>({
    mode: 'onChange',
    resolver: yupResolver(mintSchema),
    defaultValues: { 
      count: 1,
      term: 45
    }
  });

  // Mint submit handler
  // Mint card flip state
  const [isMintCardFlipped, setMintCardFlipped] = useState(false);
  
  // Reward Simulator State
  const [simTerm, setSimTerm] = useState<number>(45);
  const [simCount, setSimCount] = useState<number>(1);
  const [simRank, setSimRank] = useState<number>(globalRank || 12345);
  const [simDays, setSimDays] = useState<number>(7);

  const onMintSubmit = async (data: MintForm) => {
    if (!isMintValid || !data.count) return;

    setMintConfirming(true);
    const toastId = 'mint-toast';
    try {
      // Safe conversion to integers and then BigInt
      const safeCount = Math.max(1, Math.floor(Number(data.count)));
      const safeTerm = Math.max(1, Math.floor(Number(data.term)));
      
      const countAsBigInt = safeBigIntConversion(safeCount);
      const termInSeconds = safeBigIntConversion(safeTerm * 24 * 60 * 60);
      const mintFee = countAsBigInt * safeBigIntConversion(Math.pow(10, 16));

      toast.loading('Minting Sleep tokens...', { id: toastId });
      
      const hash = await mintAsync({
        ...sleepMinterContract(),
        functionName: 'claimRank',
        args: [termInSeconds, countAsBigInt],
        value: mintFee,
        gas: safeBigIntConversion(300000),
      });
      
      await waitForTransactionReceipt(config, { hash });

      toast.success('Sleep tokens minted successfully!', { id: toastId });
      setMintCardFlipped(true);
      setTimeout(() => {
        setMintCardFlipped(false);
        resetMint();
      }, 3000);
      refetchGlobals?.();
    } catch (error) {
      console.error("Mint failed:", error);
      toast.error('Mint failed. Please try again.', { id: toastId });
    } finally {
      setMintConfirming(false);
    }
  };

  useEffect(() => {
    refetchGlobals?.();
  }, [refetchGlobals]);

  // Watch mint form values for calculations
  const rawMintCount = mintWatch('count');
  const rawMintTerm = mintWatch('term');
  
  // Convert to safe numbers, handling any type including BigInt
  const mintCount = Math.floor(Number(rawMintCount?.toString?.() || rawMintCount || 1));
  const mintTerm = Math.floor(Number(rawMintTerm?.toString?.() || rawMintTerm || 45));
  const daysSinceGenesis = genesisTs > 0 ? (UTC_TIME - genesisTs) / 86400 : 0;
  const maxTerm = genesisTs > 0 ? Math.floor(45 + daysSinceGenesis / 3) : 45;
  
  // Safe BigInt conversion with validation
  const safeMintCount = Math.max(1, Math.floor(mintCount));
  const safeMintTerm = Math.max(1, Math.floor(mintTerm));
  
  // Calculate display values safely
  let mintFeeDisplay = '0.01';
  try {
    mintFeeDisplay = formatUnits((safeBigIntConversion(safeMintCount) * safeBigIntConversion(Math.pow(10, 16))), 18);
  } catch (error) {
    console.warn('Error calculating mint fee:', error);
    mintFeeDisplay = `${safeMintCount * 0.01}`;
  }
  const amplifier = calculateRewardAmplifier(globalRank || 0);
  const timeDecay = calculateTimeDecayFactor(genesisTs || 0);

  const renderDashboard = () => {
    const daysSinceGenesis = genesisTs > 0 ? (Date.now() / 1000 - genesisTs) / 86400 : 0;
    const maxTerm = genesisTs > 0 ? Math.floor(45 + daysSinceGenesis / 3) : 0;

    return (
      <div>
        <h2 style={{ color: '#000080', marginBottom: '16px' }}> {t('sleepProtocol.dashboard.title')}</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <DataCard>
            <CardTitle>{t('sleepProtocol.dashboard.globalStats')}</CardTitle>
            <StatRow>
              <StatLabel>{t('sleepProtocol.dashboard.globalRank')}</StatLabel>
              <StatValue>{globalRank > 0 ? globalRank.toLocaleString() : t('sleepProtocol.common.loading')}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>{t('sleepProtocol.dashboard.totalStaked')}</StatLabel>
              <StatValue>{totalStaked > 0 ? totalStaked.toLocaleString() : t('sleepProtocol.common.loading')}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>{t('sleepProtocol.dashboard.daysSinceGenesis')}</StatLabel>
              <StatValue>{daysSinceGenesis > 0 ? Math.floor(daysSinceGenesis) : t('sleepProtocol.common.loading')}</StatValue>
            </StatRow>
          </DataCard>

          <DataCard>
            <CardTitle>{t('sleepProtocol.dashboard.protocolParameters')}</CardTitle>
            <StatRow>
              <StatLabel>{t('sleepProtocol.dashboard.maxTerm')}</StatLabel>
              <StatValue>{maxTerm > 0 ? maxTerm : t('sleepProtocol.common.loading')}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>{t('sleepProtocol.dashboard.totalSupply')}</StatLabel>
              <StatValue>10,000,000,000,000</StatValue>
            </StatRow>
          </DataCard>

          {isConnected && (
            <DataCard>
              <CardTitle> {t('sleepProtocol.dashboard.yourAccount')}</CardTitle>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.address')}</StatLabel>
                <StatValue style={{ fontSize: '16px', wordBreak: 'break-all' }}>
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.dashboard.sleepBalance')}</StatLabel>
                <StatValue>{sleepBalance ? safeFormatBalance(sleepBalance, 18) : '0'}</StatValue>
              </StatRow>
            </DataCard>
          )}
        </div>

        {!isConnected && (
          <DataCard style={{ textAlign: 'center', marginTop: '20px' }}>
            <CardTitle>{t('sleepProtocol.common.walletRequired')}</CardTitle>
            <p style={{ margin: '12px 0' }}>{t('sleepProtocol.dashboard.connectDescription')}</p>
            <p style={{ margin: '12px 0', fontSize: '14px', color: '#666' }}>
              { '>>' } {t('sleepProtocol.common.checkBottomRight')}
            </p>
          </DataCard>
        )}
      </div>
    );
  };

        const renderAccessPass = () => (
          <div>
            <h2 style={{ color: '#000080', marginBottom: '16px', fontSize: '20px' }}>{t('sleepProtocol.accessPass.title')}</h2>

            {!isConnected ? (
              <DataCard style={{ textAlign: 'center' }}>
                <CardTitle style={{ fontSize: '20px' }}>Connect Wallet Required</CardTitle>
                <p style={{ margin: '12px 0', fontSize: '16px' }}>To design and mint your Access Pass, please connect your wallet.</p>
                <p style={{ margin: '12px 0', fontSize: '14px', color: '#666' }}>
                  {'>> Check the bottom right corner and click the flashing "Wallet" button'}
                </p>
              </DataCard>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* 左侧：预览和控制 */}
                <div>
                  <DataCard style={{ marginBottom: '8px' }}>
                    <CardTitle style={{ fontSize: '20px' }}>{t('sleepProtocol.accessPass.designerTitle')}</CardTitle>
                    <div 
                      style={{ 
                        padding: '20px', 
                        textAlign: 'center', 
                        border: '1px inset #c0c0c0', 
                        background: '#f8f8f8', 
                        margin: '4px 0',
                        userSelect: 'none'
                      }}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onClick={handleBackgroundClick}
                      onMouseEnter={handleCardMouseEnter}
                      onMouseLeave={handleCardMouseLeave}
                    >
                      <div 
                        style={{ 
                          transform: 'scale(1.0)', 
                          transformOrigin: 'center',
                          display: 'inline-block'
                        }}
                      >
                        {generateDraggablePreviewSvg(
                          design,
                          address ?? "0x000...000",
                          previewDevSupportAmount,
                          previewStakedSleep,
                          previewClaimableOkb,
                          previewClaimableSleep,
                          previewTotalSupport,
                          elementTransforms,
                          selectedElement,
                          handleMouseDown,
                          handleElementDoubleClick,
                          handleResizeStart,
                          cardHovered,
                          t
                        )}
                      </div>
                      <p style={{ margin: '6px 0', fontSize: '16px' }}>{t('sleepProtocol.accessPass.previewInstruction')}</p>
                      {selectedElement && (
                        <p style={{ margin: '6px 0', fontSize: '14px', color: '#000080', fontWeight: 'bold' }}>
                          {t('sleepProtocol.accessPass.scaleModeLabel', {
                            element: t(`sleepProtocol.elements.${selectedElement}`),
                            scale: elementTransforms[selectedElement as keyof ElementTransforms]?.scale.toFixed(2),
                          })}
                        </p>
                      )}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
                      <Win98Button
                        onClick={() => {
                          const randomColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
                          const skinColors = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFB3BA', '#BAFFC9', '#BAE1FF'];
                          const countries = ['AU', 'BR', 'CA', 'CN', 'FR', 'DE', 'IN', 'IT', 'JP', 'MX', 'NL', 'NO', 'RU', 'SG', 'KR', 'ES', 'SE', 'CH', 'UK', 'US'];
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
                            countryCode: countries[Math.floor(Math.random() * countries.length)],
                            showCountryFlag: Math.random() > 0.3, // 70%的概率显示国旗
                          }));
                        }}
                        style={{ fontSize: '16px', padding: '8px 16px' }}
                      >
                        {t('sleepProtocol.accessPass.buttons.random')}
                      </Win98Button>
                      <Win98Button
                        onClick={resetTransforms}
                        style={{ fontSize: '16px', padding: '8px 16px', background: '#800080', color: 'white' }}
                      >
                        {t('sleepProtocol.accessPass.buttons.reset')}
                      </Win98Button>
                      <Win98Button
                        onClick={() => setShowAccessPassMintModal(true)}
                        style={{ fontSize: '16px', padding: '8px 16px', background: '#000080', color: 'white' }}
                      >
                        {t('sleepProtocol.accessPass.buttons.mint')}
                      </Win98Button>
                    </div>
                  </DataCard>

                  {/* Dev Support 说明 */}
                  <DataCard style={{ marginBottom: '8px' }}>
                    <CardTitle style={{ fontSize: '20px' }}>{t('sleepProtocol.devSupport.title')}</CardTitle>
                    <div style={{ fontSize: '16px', lineHeight: '1.4' }}>
                      {ensureArray<string>(t('sleepProtocol.devSupport.points', { returnObjects: true }) as string[]).map((paragraph, idx) => (
                        <p key={idx} style={{ fontSize: '16px', margin: '4px 0' }}>{paragraph}</p>
                      ))}
                      <div style={{ marginTop: '8px', padding: '6px', background: '#e0e0e0', border: '1px inset #c0c0c0', fontSize: '14px' }}>
                        <p style={{ fontSize: '14px', margin: '4px 0' }}><strong>{t('sleepProtocol.devSupport.noteTitle')}</strong> {t('sleepProtocol.devSupport.noteBody')}</p>
                      </div>
                    </div>
                  </DataCard>

                  {/* Data Preview Controls */}
                  <DataCard>
                    <CardTitle style={{ fontSize: '20px' }}>{t('sleepProtocol.preview.title')}</CardTitle>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '16px' }}>{t('sleepProtocol.preview.description')}</p>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '16px' }}>
                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.preview.supportTier')}</Win98Label>
                        <select 
                          value={previewDevSupportAmount}
                          onChange={(e) => setPreviewDevSupportAmount(parseFloat(e.target.value))}
                          style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '16px' }}
                        >
                          <option value={0}>None</option>
                          <option value={0.2}>Gold</option>
                          <option value={0.5}>Platinum</option>
                          <option value={0.8}>Diamond</option>
                        </select>
                      </div>

                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.preview.supportAmount')}</Win98Label>
                        <Win98Input
                          type="number"
                          value={previewDevSupportAmount}
                          onChange={(e) => setPreviewDevSupportAmount(parseFloat(e.target.value) || 0)}
                          step="0.1"
                          min="0"
                          style={{ width: '100%', fontSize: '16px', padding: '4px' }}
                        />
                      </div>

                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.preview.stakedSleep')}</Win98Label>
                        <Win98Input
                          type="number"
                          value={previewStakedSleep}
                          onChange={(e) => setPreviewStakedSleep(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', fontSize: '16px', padding: '4px' }}
                        />
                      </div>

                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.preview.totalSupport')}</Win98Label>
                        <Win98Input
                          type="number"
                          value={previewTotalSupport}
                          onChange={(e) => setPreviewTotalSupport(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', fontSize: '16px', padding: '4px' }}
                        />
                      </div>
                    </div>

                    {previewDevSupportAmount > 0 && previewTotalSupport > 0 && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#f0f0f0', border: '1px inset #c0c0c0', fontSize: '16px' }}>
                        <p style={{ fontSize: '16px', margin: '4px 0' }}><strong>{t('sleepProtocol.preview.summaryTotal', { amount: previewTotalSupport.toFixed(2) })}</strong></p>
                        <p style={{ fontSize: '16px', margin: '4px 0' }}><strong>{t('sleepProtocol.preview.summaryShare', { percent: calculateContributionPercent(previewDevSupportAmount, previewTotalSupport) })}</strong></p>
                      </div>
                    )}
                  </DataCard>
                </div>

                {/* 右侧：设计控件 */}
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {/* 紧凑的功能说明 */}
                  <DataCard style={{ marginBottom: '8px' }}>
                    <CardTitle style={{ fontSize: '20px' }}>{t('sleepProtocol.whatYouGet.title')}</CardTitle>
                    <div style={{ fontSize: '16px', lineHeight: '1.4' }}>
                      {ensureArray<string>(t('sleepProtocol.whatYouGet.items', { returnObjects: true }) as string[]).map((item, idx) => (
                        <p key={idx} style={{ fontSize: '16px', margin: '4px 0' }}>{item}</p>
                      ))}
                    </div>
                  </DataCard>

                  {/* 背景层控件 */}
                  <DataCard style={{ marginBottom: '8px' }}>
                    <CardTitle style={{ fontSize: '20px' }}>{t('sleepProtocol.background.title')}</CardTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.background.color1')}</Win98Label>
                        <input
                          type="color"
                          value={design.bgColor1}
                          onChange={(e) => setDesign(prev => ({ ...prev, bgColor1: e.target.value }))}
                          style={{ width: '100%', height: '24px', border: '2px inset #c0c0c0' }}
                        />
                      </div>
                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.background.color2')}</Win98Label>
                        <input
                          type="color"
                          value={design.bgColor2}
                          onChange={(e) => setDesign(prev => ({ ...prev, bgColor2: e.target.value }))}
                          style={{ width: '100%', height: '24px', border: '2px inset #c0c0c0' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.background.gradientDirection')}</Win98Label>
                      <select 
                        value={design.bgGradientDirection}
                        onChange={(e) => setDesign(prev => ({ ...prev, bgGradientDirection: parseInt(e.target.value) }))}
                        style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '16px' }}
                      >
                        <option value={0}>{t('sleepProtocol.background.directionLR')}</option>
                        <option value={1}>{t('sleepProtocol.background.directionTB')}</option>
                        <option value={2}>{t('sleepProtocol.background.directionDiagonal')}</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.background.pattern')}</Win98Label>
                      <select 
                        value={design.patternType}
                        onChange={(e) => setDesign(prev => ({ ...prev, patternType: parseInt(e.target.value) }))}
                        style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '16px' }}
                      >
                        <option value={0}>{t('sleepProtocol.background.patternNone')}</option>
                        <option value={1}>{t('sleepProtocol.background.patternStars')}</option>
                        <option value={2}>{t('sleepProtocol.background.patternDots')}</option>
                        <option value={3}>{t('sleepProtocol.background.patternGrid')}</option>
                        <option value={4}>{t('sleepProtocol.background.patternWaves')}</option>
                      </select>
                    </div>

                    {design.patternType > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingLeft: '8px', borderLeft: '2px solid #808080' }}>
                        <div>
                      <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.background.patternColor')}</Win98Label>
                          <input
                            type="color"
                            value={design.patternColor}
                            onChange={(e) => setDesign(prev => ({ ...prev, patternColor: e.target.value }))}
                            style={{ width: '100%', height: '20px', border: '2px inset #c0c0c0' }}
                          />
                        </div>
                        <div>
                          <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.background.patternOpacity', { value: design.patternOpacity })}</Win98Label>
                          <input
                            type="range"
                            min="5"
                            max="80"
                            value={design.patternOpacity}
                            onChange={(e) => setDesign(prev => ({ ...prev, patternOpacity: parseInt(e.target.value) }))}
                            style={{ width: '100%', height: '20px' }}
                          />
                        </div>
                      </div>
                    )}
                  </DataCard>

                  {/* 头像层控件 */}
                  <DataCard style={{ marginBottom: '12px' }}>
                    <CardTitle style={{ fontSize: '20px' }}>{t('sleepProtocol.avatar.title')}</CardTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.avatar.face')}</Win98Label>
                        <select 
                          value={design.avatarFaceType}
                          onChange={(e) => setDesign(prev => ({ ...prev, avatarFaceType: parseInt(e.target.value) }))}
                          style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '14px' }}
                        >
                          {ensureArray<string>(t('sleepProtocol.avatar.faceOptions', { returnObjects: true }) as string[]).map((label, index) => (
                            <option key={index} value={index}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.avatar.eyes')}</Win98Label>
                        <select 
                          value={design.avatarEyeType}
                          onChange={(e) => setDesign(prev => ({ ...prev, avatarEyeType: parseInt(e.target.value) }))}
                          style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '14px' }}
                        >
                          {ensureArray<string>(t('sleepProtocol.avatar.eyeOptions', { returnObjects: true }) as string[]).map((label, index) => (
                            <option key={index} value={index}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.avatar.mouth')}</Win98Label>
                        <select 
                          value={design.avatarMouthType}
                          onChange={(e) => setDesign(prev => ({ ...prev, avatarMouthType: parseInt(e.target.value) }))}
                          style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '14px' }}
                        >
                          {ensureArray<string>(t('sleepProtocol.avatar.mouthOptions', { returnObjects: true }) as string[]).map((label, index) => (
                            <option key={index} value={index}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.avatar.hair')}</Win98Label>
                        <select 
                          value={design.avatarHairType}
                          onChange={(e) => setDesign(prev => ({ ...prev, avatarHairType: parseInt(e.target.value) }))}
                          style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '14px' }}
                        >
                          {ensureArray<string>(t('sleepProtocol.avatar.hairOptions', { returnObjects: true }) as string[]).map((label, index) => (
                            <option key={index} value={index}>{label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.avatar.skin')}</Win98Label>
                        <select 
                          value={design.avatarSkinColor}
                          onChange={(e) => setDesign(prev => ({ ...prev, avatarSkinColor: e.target.value }))}
                          style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '14px' }}
                        >
                          {skinColorOptions.map((color, index) => (
                            <option key={color} value={color}>{ensureArray<string>(t('sleepProtocol.avatar.skinOptions', { returnObjects: true }) as string[])[index]}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.avatar.accessory')}</Win98Label>
                        <select 
                          value={design.avatarAccessory}
                          onChange={(e) => setDesign(prev => ({ ...prev, avatarAccessory: parseInt(e.target.value) }))}
                          style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '14px' }}
                        >
                          {ensureArray<string>(t('sleepProtocol.avatar.accessoryOptions', { returnObjects: true }) as string[]).map((label, index) => (
                            <option key={index} value={index}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </DataCard>

                  {/* 徽章层控件 */}
                  <DataCard style={{ marginBottom: '12px' }}>
                    <CardTitle style={{ fontSize: '20px' }}>{t('sleepProtocol.badge.title')}</CardTitle>
                    <div style={{ marginBottom: '8px' }}>
                      <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.badge.type')}</Win98Label>
                      <select 
                        value={design.badgeType}
                        onChange={(e) => setDesign(prev => ({ ...prev, badgeType: parseInt(e.target.value) }))}
                        style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '16px' }}
                      >
                        {ensureArray<string>(t('sleepProtocol.badge.options', { returnObjects: true }) as string[]).map((label, index) => (
                          <option key={index} value={index}>{label}</option>
                        ))}
                      </select>
                    </div>

                  </DataCard>

                  {/* 国家层控件 */}
                  <DataCard style={{ marginBottom: '12px' }}>
                    <CardTitle style={{ fontSize: '20px' }}>🌍 {t('sleepProtocol.country.title')}</CardTitle>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '16px' }}>
                        <input
                          type="checkbox"
                          checked={design.showCountryFlag}
                          onChange={(e) => setDesign(prev => ({ ...prev, showCountryFlag: e.target.checked }))}
                        />
                        <span>{t('sleepProtocol.country.show')}</span>
                      </label>
                    </div>

                    {design.showCountryFlag && (
                      <div>
                        <Win98Label style={{ fontSize: '16px' }}>{t('sleepProtocol.country.select')}</Win98Label>
                        <select 
                          value={design.countryCode}
                          onChange={(e) => setDesign(prev => ({ ...prev, countryCode: e.target.value }))}
                          style={{ width: '100%', padding: '4px', border: '2px inset #c0c0c0', fontSize: '16px' }}
                        >
                          {Object.entries(t('sleepProtocol.country.options', { returnObjects: true }) as Record<string, string>).map(([code, label]) => (
                            <option key={code} value={code}>{label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </DataCard>
                </div>
              </div>
            )}
          </div>
        );

        const renderMint = () => {
          // 计算模拟器奖励
          const simulatedAmplifier = calculateRewardAmplifier(simRank);
          const simulatedTimeDecay = Math.max(0.1, 1 - (simDays / 5000));
          const simulatedReward = safeBigIntConversion(
            Math.floor(simCount * simTerm * 1000 * simulatedAmplifier * simulatedTimeDecay)
          );

          return (
    <div style={{ 
      display: 'flex', 
      gap: '24px', 
      height: '100%', 
      overflowY: 'auto', 
      padding: '12px', 
      background: 'linear-gradient(135deg, #001a14 0%, #002d22 50%, #003d2d 100%)' 
    }}>
      {/* 左侧主铸造区 */}
      <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Plasma品牌标识 */}
        <div style={{
          background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
          border: '3px solid #26A17B',
          padding: '16px 24px',
          boxShadow: '0 4px 15px rgba(38, 161, 123, 0.3)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#26A17B', letterSpacing: '2px' }}>
            SLEEP COIN MINT
          </div>
          <div style={{ fontSize: '11px', color: '#9FD8C7', marginTop: '4px', letterSpacing: '1px' }}>
            POWERED BY TETHER · ENTERPRISE-GRADE MINTING
          </div>
        </div>

        {!isConnected ? (
          <DataCard style={{ 
            background: 'linear-gradient(145deg, rgba(0, 29, 20, 0.8) 0%, rgba(0, 61, 45, 0.6) 100%)', 
            border: '2px solid #26A17B',
            textAlign: 'center',
            padding: '60px 40px'
          }}>
            <div style={{ fontSize: '18px', color: '#9FD8C7', marginBottom: '16px', fontWeight: 'bold' }}>
              {t('sleepProtocol.common.walletRequired')}
            </div>
            <div style={{ color: '#50AF95', marginBottom: '20px', fontSize: '14px' }}>
              {t('sleepProtocol.mint.connectDescription')}
            </div>
            <div style={{ color: '#26A17B', fontSize: '13px' }}>
              {'>>'} {t('sleepProtocol.common.checkBottomRight')}
            </div>
          </DataCard>
        ) : (
          <>
            {/* 翻转卡片容器 - 美金样式 */}
            <div style={{ perspective: '1000px' }}>
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
            {/* 铸造控制台 - 美金级设计 */}
            <DataCard style={{ 
              background: 'linear-gradient(145deg, rgba(0, 29, 20, 0.8) 0%, rgba(0, 61, 45, 0.6) 100%)', 
              border: '2px solid #26A17B',
              boxShadow: '0 4px 20px rgba(38, 161, 123, 0.3)'
            }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
                color: '#26A17B',
                padding: '14px 20px',
                margin: '-8px -8px 20px -8px',
                borderBottom: '2px solid #26A17B'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  铸造控制台
                </h3>
              </div>

              <form onSubmit={handleMintSubmit(onMintSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Count输入 */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.12) 0%, rgba(26, 127, 100, 0.08) 100%)',
                  border: '2px solid #26A17B',
                  padding: '20px',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label style={{ color: '#9FD8C7', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {t('sleepProtocol.mint.form.countLabel')}
                    </label>
                    <label style={{ color: '#9FD8C7', fontSize: '11px' }}>
                      Max: <span style={{ color: '#50AF95', fontWeight: '600' }}>1,000</span>
                    </label>
                  </div>
                  <Win98Input
                    {...mintRegister('count')}
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    placeholder="输入数量"
                    style={{ 
                      width: '100%',
                      fontSize: '28px',
                      fontWeight: '600',
                      border: 'none',
                      padding: '8px 0',
                      background: 'transparent',
                      color: '#50AF95',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                    }}
                  />
                  {mintErrors.count && <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '8px' }}>{mintErrors.count.message}</div>}
                </div>

                {/* Term输入 */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.12) 0%, rgba(26, 127, 100, 0.08) 100%)',
                  border: '2px solid #26A17B',
                  padding: '20px',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label style={{ color: '#9FD8C7', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {t('sleepProtocol.mint.form.termLabel')}
                    </label>
                    <label style={{ color: '#9FD8C7', fontSize: '11px' }}>
                      Max: <span style={{ color: '#50AF95', fontWeight: '600' }}>{maxTerm} 天</span>
                    </label>
                  </div>
                  <Win98Input
                    {...mintRegister('term')}
                    type="number"
                    min="1"
                    max={maxTerm}
                    step="1"
                    placeholder="输入天数"
                    style={{ 
                      width: '100%',
                      fontSize: '28px',
                      fontWeight: '600',
                      border: 'none',
                      padding: '8px 0',
                      background: 'transparent',
                      color: '#50AF95',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                    }}
                  />
                  {mintErrors.term && <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '8px' }}>{mintErrors.term.message}</div>}
                </div>

                {/* 预计奖励显示 */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.13) 0%, rgba(26, 127, 100, 0.09) 100%)',
                  border: '2px solid #26A17B',
                  padding: '20px',
                  borderRadius: '4px'
                }}>
                  <div style={{ fontSize: '12px', color: '#9FD8C7', fontWeight: 'bold', marginBottom: '16px' }}>
                    铸造摘要
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dotted #26A17B' }}>
                    <span style={{ color: '#9FD8C7', fontSize: '14px' }}>手续费:</span>
                    <span style={{ color: '#50AF95', fontWeight: 'bold', fontSize: '14px' }}>{mintFeeDisplay} USDT</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                    <span style={{ color: '#9FD8C7', fontSize: '14px' }}>预计奖励:</span>
                    <span style={{ color: '#26A17B', fontWeight: 'bold', fontSize: '16px' }}>
                      {(() => {
                        try {
                          if (globalRank > 0) {
                            const baseReward = safeMintCount * safeMintTerm * 1000;
                            return `${baseReward.toLocaleString()}`;
                          }
                          return t('sleepProtocol.common.loading');
                        } catch (error) {
                          return t('sleepProtocol.mint.form.rewardError');
                        }
                      })()} SLEEPING
                    </span>
                  </div>
                </div>

                {/* 铸造按钮 */}
                <Win98Button
                  type="submit"
                  disabled={!isMintValid || isMintPending || isMintConfirming}
                  style={{ 
                    width: '100%', 
                    padding: '18px', 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    marginTop: '8px',
                    background: (!isMintValid || isMintPending || isMintConfirming)
                      ? 'linear-gradient(135deg, rgba(0, 61, 45, 0.4) 0%, rgba(0, 29, 20, 0.5) 100%)'
                      : 'linear-gradient(135deg, #26A17B 0%, #1A7F64 100%)',
                    color: (!isMintValid || isMintPending || isMintConfirming) ? '#9FD8C7' : '#001f18',
                    border: '2px solid #26A17B',
                    cursor: (!isMintValid || isMintPending || isMintConfirming) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isMintPending || isMintConfirming ? t('sleepProtocol.mint.form.submitting') : t('sleepProtocol.mint.form.submit')}
                </Win98Button>
              </form>
            </DataCard>
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
                  <DataCard style={{
                    background: 'linear-gradient(135deg, #26A17B 0%, #1d8163 50%, #50AF95 100%)',
                    border: '3px solid #9FD8C7',
                    boxShadow: '0 4px 20px rgba(38, 161, 123, 0.5)',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '60px 40px'
                  }}>
                    <div style={{ fontSize: '72px', marginBottom: '20px' }}>✓</div>
                    <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#001f18', marginBottom: '12px' }}>
                      铸造成功！
                    </h2>
                    <p style={{ fontSize: '16px', color: '#003d2d' }}>
                      您的 SLEEPING 代币正在沉睡中...
                    </p>
                  </DataCard>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 右侧协议参数统计 */}
      <div style={{ flex: '0 1 400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* 全局参数统计 */}
        <DataCard style={{ 
          background: 'linear-gradient(145deg, rgba(0, 29, 20, 0.8) 0%, rgba(0, 61, 45, 0.6) 100%)', 
          border: '2px solid #26A17B'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
            color: '#26A17B',
            padding: '12px 16px',
            margin: '-8px -8px 16px -8px',
            borderBottom: '3px solid #26A17B'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
              协议参数
            </h3>
          </div>

          {/* 全局排名 */}
          <div style={{ 
            background: 'linear-gradient(135deg, #26A17B 0%, #1d8163 50%, #50AF95 100%)',
            padding: '18px',
            marginBottom: '12px',
            border: '3px solid #9FD8C7',
            boxShadow: '0 3px 10px rgba(38, 161, 123, 0.4)'
          }}>
            <div style={{ fontSize: '11px', color: '#d4ede5', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              全局排名
            </div>
            <div style={{ fontSize: '32px', color: '#001f18', fontWeight: 'bold' }}>
              {globalRank > 0 ? globalRank.toLocaleString() : t('sleepProtocol.common.loading')}
            </div>
          </div>

          {/* 其他参数 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.13) 0%, rgba(26, 127, 100, 0.09) 100%)',
              border: '2px solid #26A17B',
              padding: '14px',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '11px', color: '#9FD8C7', marginBottom: '4px' }}>
                {t('sleepProtocol.mint.parameters.amplifier')}
              </div>
              <div style={{ fontSize: '18px', color: '#50AF95', fontWeight: 'bold' }}>
                {amplifier.toFixed(4)}
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.13) 0%, rgba(26, 127, 100, 0.09) 100%)',
              border: '2px solid #26A17B',
              padding: '14px',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '11px', color: '#9FD8C7', marginBottom: '4px' }}>
                {t('sleepProtocol.mint.parameters.maxTerm')}
              </div>
              <div style={{ fontSize: '18px', color: '#50AF95', fontWeight: 'bold' }}>
                {maxTerm} 天
              </div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.13) 0%, rgba(26, 127, 100, 0.09) 100%)',
              border: '2px solid #26A17B',
              padding: '14px',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '11px', color: '#9FD8C7', marginBottom: '4px' }}>
                {t('sleepProtocol.mint.parameters.timeDecay')}
              </div>
              <div style={{ fontSize: '18px', color: '#50AF95', fontWeight: 'bold' }}>
                {timeDecay.toFixed(4)}
              </div>
            </div>
          </div>
        </DataCard>

        {/* 奖励计算器 */}
        <DataCard style={{ 
          background: 'linear-gradient(145deg, rgba(0, 29, 20, 0.8) 0%, rgba(0, 61, 45, 0.6) 100%)', 
          border: '2px solid #26A17B'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
            color: '#26A17B',
            padding: '12px 16px',
            margin: '-8px -8px 16px -8px',
            borderBottom: '3px solid #26A17B'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
              奖励计算器
            </h3>
          </div>

          {/* 当前表单预计奖励 */}
          <div style={{ 
            background: 'linear-gradient(135deg, #26A17B 0%, #1d8163 50%, #50AF95 100%)',
            padding: '18px',
            marginBottom: '12px',
            border: '3px solid #9FD8C7',
            boxShadow: '0 3px 10px rgba(38, 161, 123, 0.4)'
          }}>
            <div style={{ fontSize: '11px', color: '#d4ede5', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              预计奖励
            </div>
            <div style={{ fontSize: '28px', color: '#001f18', fontWeight: 'bold' }}>
              {(() => {
                try {
                  if (globalRank > 0) {
                    const baseReward = safeMintCount * safeMintTerm * 1000;
                    return baseReward.toLocaleString();
                  }
                  return '...';
                } catch (error) {
                  return '计算中...';
                }
              })()}
            </div>
            <div style={{ fontSize: '11px', color: '#003d2d', marginTop: '4px' }}>
              SLEEPING
            </div>
          </div>

          {/* 计算详情 */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.13) 0%, rgba(26, 127, 100, 0.09) 100%)',
            border: '2px solid #26A17B',
            padding: '14px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', color: '#9FD8C7', marginBottom: '8px', fontWeight: 'bold' }}>
              计算参数
            </div>
            <div style={{ fontSize: '10px', color: '#9FD8C7', lineHeight: '1.8' }}>
              • 全局排名: {globalRank > 0 ? globalRank.toLocaleString() : '...'}<br/>
              • 锁定天数: {safeMintTerm}<br/>
              • 放大系数: {amplifier.toFixed(4)}<br/>
              • 时间衰减: {timeDecay.toFixed(4)} (×{Math.round(timeDecay * 100)}%)
            </div>
          </div>
        </DataCard>

        {/* 奖励模拟器 */}
        <DataCard style={{ 
          background: 'linear-gradient(145deg, rgba(0, 29, 20, 0.8) 0%, rgba(0, 61, 45, 0.6) 100%)', 
          border: '2px solid #26A17B'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
            color: '#26A17B',
            padding: '12px 16px',
            margin: '-8px -8px 16px -8px',
            borderBottom: '3px solid #26A17B'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
              奖励模拟器
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#9FD8C7', marginBottom: '4px', display: 'block' }}>
                模拟锁定天数
              </label>
              <Win98Input
                type="number"
                value={simTerm}
                onChange={(e) => setSimTerm(Number(e.target.value))}
                style={{ width: '100%', fontSize: '14px', color: '#50AF95' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: '#9FD8C7', marginBottom: '4px', display: 'block' }}>
                模拟数量
              </label>
              <Win98Input
                type="number"
                value={simCount}
                onChange={(e) => setSimCount(Number(e.target.value))}
                style={{ width: '100%', fontSize: '14px', color: '#50AF95' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: '#9FD8C7', marginBottom: '4px', display: 'block' }}>
                模拟排名
              </label>
              <Win98Input
                type="number"
                value={simRank}
                onChange={(e) => setSimRank(Number(e.target.value))}
                style={{ width: '100%', fontSize: '14px', color: '#50AF95' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '10px', color: '#9FD8C7', marginBottom: '4px', display: 'block' }}>
                模拟天数（创世后）
              </label>
              <Win98Input
                type="number"
                value={simDays}
                onChange={(e) => setSimDays(Number(e.target.value))}
                style={{ width: '100%', fontSize: '14px', color: '#50AF95' }}
              />
            </div>

            {/* 模拟结果 */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.15) 0%, rgba(26, 127, 100, 0.1) 100%)',
              border: '2px solid #26A17B',
              padding: '16px',
              marginTop: '8px'
            }}>
              <div style={{ fontSize: '11px', color: '#9FD8C7', marginBottom: '8px' }}>
                模拟奖励
              </div>
              <div style={{ fontSize: '24px', color: '#26A17B', fontWeight: 'bold' }}>
                {Number(simulatedReward).toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: '#9FD8C7', marginTop: '8px', lineHeight: '1.6' }}>
                • 放大系数: {simulatedAmplifier.toFixed(4)}<br/>
                • 时间衰减: {simulatedTimeDecay.toFixed(4)}
              </div>
            </div>
          </div>
        </DataCard>

      </div>
    </div>
          );
        };

  // ATM State Management
  const [atmScreen, setAtmScreen] = useState<'welcome' | 'services' | 'stake' | 'unstake' | 'balance' | 'rewards' | 'processing' | 'enterAmount' | 'confirm'>('welcome');
  const [atmAmount, setAtmAmount] = useState('');
  const [atmOperation, setAtmOperation] = useState<'stake' | 'unstake' | null>(null);
  const [atmStatus, setAtmStatus] = useState<'idle' | 'approving' | 'confirmingApprove' | 'staking' | 'confirmingStake' | 'unstaking'>('idle');
  
  // Import necessary contracts
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContractAsync: stakeAsync } = useWriteContract();
  const { writeContractAsync: unstakeAsync } = useWriteContract();
  const { writeContractAsync: claimOkbAsync } = useWriteContract();
  const { writeContractAsync: claimSleepAsync } = useWriteContract();
  
  // ATM Functions
  const handleATMStake = async () => {
    if (!sleepBalance || !atmAmount) return;
    
    setAtmScreen('processing');
    setAtmStatus('approving');
    
    try {
      const amountToStake = parseUnits(atmAmount, sleepBalance.decimals);
      
      // Approve
      const approveHash = await approveAsync({
        ...sleepCoinContract(),
        functionName: 'approve',
        args: [stakingRewardsContract().address, amountToStake],
      });
      
      setAtmStatus('confirmingApprove');
      await waitForTransactionReceipt(config, { hash: approveHash });
      
      // Stake
      setAtmStatus('staking');
      const stakeHash = await stakeAsync({
        ...stakingRewardsContract(),
        functionName: 'stake',
        args: [amountToStake],
      });
      
      setAtmStatus('confirmingStake');
      await waitForTransactionReceipt(config, { hash: stakeHash });
      
      toast.success('Stake successful!');
      refetchBalance?.();
      refetchUserData?.();
      setAtmAmount('');
      setAtmScreen('services');
    } catch (error) {
      console.error("Staking failed:", error);
      toast.error('Staking failed');
      setAtmScreen('services');
    } finally {
      setAtmStatus('idle');
    }
  };
  
  const handleATMUnstake = async () => {
    setAtmScreen('processing');
    setAtmStatus('unstaking');
    
    try {
      await unstakeAsync({
        ...stakingRewardsContract(),
        functionName: 'unstake',
      });
      
      toast.success('Unstake successful!');
      refetchUserData?.();
      refetchBalance?.();
      setAtmScreen('services');
    } catch (error) {
      console.error("Unstaking failed:", error);
      toast.error('Unstaking failed');
      setAtmScreen('services');
    } finally {
      setAtmStatus('idle');
    }
  };
  
  const handleATMClaimRewards = async () => {
    setAtmScreen('processing');
    
    try {
      // Claim both OKB and SLEEP rewards
      await Promise.all([
        claimOkbAsync({
          ...stakingRewardsContract(),
          functionName: 'claimReward',
        }),
        claimSleepAsync({
          ...stakingRewardsContract(),
          functionName: 'claimSleepReward',
        })
      ]);
      
      toast.success('Rewards claimed!');
      refetchUserData?.();
      setAtmScreen('services');
    } catch (error) {
      console.error("Claiming failed:", error);
      toast.error('Claiming failed');
      setAtmScreen('services');
    }
  };
  
  const renderStake = () => (
    <div>
      <h2 style={{ color: '#000080', marginBottom: '16px' }}>{t('sleepProtocol.stake.atm.title')}</h2>
      
      {!isConnected ? (
        <DataCard style={{ textAlign: 'center' }}>
          <CardTitle>{t('sleepProtocol.common.walletRequired')}</CardTitle>
          <p style={{ margin: '12px 0' }}>{t('sleepProtocol.stake.connectDescription')}</p>
          <p style={{ margin: '12px 0', fontSize: '14px', color: '#666' }}>
            { '>>' } {t('sleepProtocol.common.checkBottomRight')}
          </p>
        </DataCard>
      ) : (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '500px',
          background: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)',
          padding: '20px'
        }}>
          {/* ATM Machine */}
          <div style={{
            width: '400px',
            height: '600px',
            background: 'linear-gradient(145deg, #e0e0e0, #a0a0a0)',
            border: '4px outset #c0c0c0',
            borderRadius: '8px',
            position: 'relative',
            boxShadow: '8px 8px 16px rgba(0,0,0,0.3)'
          }}>
            {/* ATM Screen */}
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '40px',
              right: '40px',
              height: '200px',
              background: '#000080',
              border: '3px inset #c0c0c0',
              color: '#00ff00',
              fontFamily: 'monospace',
              fontSize: '14px',
              padding: '16px',
              overflow: 'auto'
            }}>
              {atmScreen === 'welcome' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>SLEEP PROTOCOL ATM</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>═══════════════════════</div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>{t('sleepProtocol.stake.atm.welcome')}</div>
                  <div style={{ marginBottom: '16px' }}>{t('sleepProtocol.stake.atm.insertCard')}</div>
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <div style={{ animation: 'blink 1s infinite' }}>{t('sleepProtocol.stake.atm.screen.walletConnected')}</div>
                  </div>
                </div>
              )}
              
              {atmScreen === 'services' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                    {t('sleepProtocol.stake.atm.selectService')}
                  </div>
                  <div style={{ marginBottom: '8px' }}>1. {t('sleepProtocol.stake.atm.services.stake')}</div>
                  <div style={{ marginBottom: '8px' }}>2. {t('sleepProtocol.stake.atm.services.unstake')}</div>
                  <div style={{ marginBottom: '8px' }}>3. {t('sleepProtocol.stake.atm.services.checkBalance')}</div>
                  <div style={{ marginBottom: '8px' }}>4. {t('sleepProtocol.stake.atm.services.rewards')}</div>
                </div>
              )}
              
              {atmScreen === 'balance' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                    {t('sleepProtocol.stake.atm.screen.accountSummary')}
                  </div>
                  <div style={{ marginBottom: '8px' }}>{t('sleepProtocol.stake.atm.screen.balance')} {safeFormatBalance(sleepBalance)} SLEEP</div>
                  <div style={{ marginBottom: '8px' }}>{t('sleepProtocol.stake.atm.screen.staked')} {userStakeData ? safeFormatBalance(userStakeData.totalStake) : '0'} SLEEP</div>
                  <div style={{ marginBottom: '8px' }}>{t('sleepProtocol.stake.atm.screen.okbRewards')} {userStakeData ? safeFormatBalance(userStakeData.userRewards) : '0'} OKB</div>
                  <div style={{ marginBottom: '8px' }}>{t('sleepProtocol.stake.atm.screen.sleepRewards')} {userStakeData ? safeFormatBalance(userStakeData.userSleepRewards || 0) : '0'} SLEEP</div>
                </div>
              )}
              
              {atmScreen === 'enterAmount' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                    {t('sleepProtocol.stake.atm.screen.enterAmount')}
                  </div>
                  <div style={{ marginBottom: '8px' }}>{t('sleepProtocol.stake.atm.screen.operation')} {atmOperation?.toUpperCase()}</div>
                  <div style={{ marginBottom: '8px' }}>{t('sleepProtocol.stake.atm.screen.amount')} {atmAmount || '0'} SLEEP</div>
                  <div style={{ marginBottom: '8px' }}>{t('sleepProtocol.stake.atm.screen.available')} {safeFormatBalance(sleepBalance)} SLEEP</div>
                  <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px' }}>
                    {t('sleepProtocol.stake.atm.screen.enterUsingKeypad')}
                  </div>
                </div>
              )}
              
              {atmScreen === 'processing' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '20px' }}>
                    {atmStatus === 'approving' && t('sleepProtocol.stake.atm.status.approving')}
                    {atmStatus === 'confirmingApprove' && t('sleepProtocol.stake.atm.status.confirmingApprove')}
                    {atmStatus === 'staking' && t('sleepProtocol.stake.atm.status.staking')}
                    {atmStatus === 'confirmingStake' && t('sleepProtocol.stake.atm.status.confirmingStake')}
                    {atmStatus === 'unstaking' && t('sleepProtocol.stake.atm.status.unstaking')}
                    {atmStatus === 'idle' && t('sleepProtocol.stake.atm.processing')}
                  </div>
                  <div style={{ fontSize: '24px', animation: 'spin 1s linear infinite' }}>[*]</div>
                  <div style={{ marginTop: '20px', fontSize: '12px' }}>{t('sleepProtocol.stake.atm.screen.pleaseWait')}</div>
                </div>
              )}
            </div>
            
            {/* ATM Keypad */}
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              right: '40px',
              height: '300px'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '8px',
                marginBottom: '16px'
              }}>
                {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map((key) => (
                  <Win98Button
                    key={key}
                    style={{ 
                      height: '40px', 
                      fontSize: '18px', 
                      fontWeight: 'bold',
                      background: '#d0d0d0',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.border = '2px inset #c0c0c0';
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.border = '2px outset #c0c0c0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border = '2px outset #c0c0c0';
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (typeof key === 'number') {
                        if (atmScreen === 'welcome') {
                          setAtmScreen('services');
                        } else if (atmScreen === 'services') {
                          if (key === 1) {
                            setAtmOperation('stake');
                            setAtmScreen('enterAmount');
                          }
                          else if (key === 2) {
                            setAtmOperation('unstake');
                            handleATMUnstake();
                          }
                          else if (key === 3) setAtmScreen('balance');
                          else if (key === 4) handleATMClaimRewards();
                        } else if (atmScreen === 'enterAmount') {
                          setAtmAmount(prev => prev + key.toString());
                        }
                      } else if (key === '*') {
                        // Clear amount
                        if (atmScreen === 'enterAmount') {
                          setAtmAmount('');
                        }
                      } else if (key === '#') {
                        // Confirm amount
                        if (atmScreen === 'enterAmount' && atmAmount && atmOperation === 'stake') {
                          handleATMStake();
                        }
                      }
                    }}
                  >
                    {key}
                  </Win98Button>
                ))}
              </div>
              
              {/* Service Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <Win98Button
                  style={{ flex: 1, background: '#ff6b6b', color: 'white' }}
                  onClick={() => {
                    if (atmScreen === 'enterAmount') {
                      setAtmScreen('services');
                      setAtmAmount('');
                    } else {
                      setAtmScreen('welcome');
                    }
                  }}
                >
                  {atmScreen === 'enterAmount' ? t('sleepProtocol.stake.atm.buttons.cancel') : t('sleepProtocol.stake.atm.buttons.back')}
                </Win98Button>
                <Win98Button
                  style={{ flex: 1, background: '#51cf66', color: 'white' }}
                  onClick={() => {
                    if (atmScreen === 'enterAmount' && atmAmount && atmOperation === 'stake') {
                      handleATMStake();
                    } else {
                      setAtmScreen('services');
                    }
                  }}
                >
                  {atmScreen === 'enterAmount' ? t('sleepProtocol.stake.atm.buttons.confirm') : t('sleepProtocol.stake.atm.buttons.menu')}
                </Win98Button>
              </div>
            </div>
            
          </div>
        </div>
      )}
      
      {/* CSS animations moved to end */}
    </div>
  );

        // Market Data Fetching
        const fetchMarketListings = async () => {
          setMarketLoading(true);
          setMarketError(null);
          try {
            // Mock GraphQL query - in real implementation would use actual subgraph
            const mockListings = [
              {
                id: '1',
                tokenId: '123',
                seller: '0x1234...5678',
                price: '5000000000000000000', // 5 OKB
                listedAt: Date.now() - 86400000,
                nft: {
                  tokenId: '123',
                  owner: '0x1234...5678',
                  term: '3888000', // 45 days in seconds
                  maturityTs: Date.now() + 2592000000,
                  rank: '100',
                  amplifier: '1.5',
                  count: '3'
                }
              },
              {
                id: '2', 
                tokenId: '456',
                seller: '0xabcd...efgh',
                price: '25000000000000000000', // 25 OKB
                listedAt: Date.now() - 172800000,
                nft: {
                  tokenId: '456',
                  owner: '0xabcd...efgh', 
                  term: '7776000', // 90 days in seconds
                  maturityTs: Date.now() + 5184000000,
                  rank: '50',
                  amplifier: '2.1',
                  count: '1'
                }
              }
            ];
            setMarketListings(mockListings);
          } catch (error) {
            setMarketError(t('sleepProtocol.market.errors.fetchFailed'));
          } finally {
            setMarketLoading(false);
          }
        };

        useEffect(() => {
          if (currentPage === 'market' && isConnected) {
            fetchMarketListings();
          }
        }, [currentPage, isConnected, marketPage]);

        // Market NFT Purchase
        const handlePurchaseNFT = async (listing: any) => {
          // Check if trying to buy own NFT
          if (listing.seller && address && listing.seller.toLowerCase() === address.toLowerCase()) {
            toast.error(t('sleepProtocol.market.toast.cannotBuyOwn') || 'Cannot buy your own NFT');
            return;
          }
          
          setPurchasingTokenId(listing.tokenId);
          try {
            // Determine NFT contract address based on nftType
            const nftContractAddress = listing.nftType === 'MINTING_POSITION' 
              ? tokenMinterContract(currentChain).address 
              : tokenAccessPassContract(currentChain).address;
            
            const hash = await marketWriteAsync({
              ...nftMarketplaceContract(currentChain),
              functionName: 'buyNFT',
              args: [nftContractAddress, safeBigIntConversion(listing.tokenId)],
              value: safeBigIntConversion(listing.price),
            });
            
            await waitForTransactionReceipt(config, { hash });
            toast.success(t('sleepProtocol.market.toast.purchaseSuccess'));
            fetchMarketListings();
          } catch (error) {
            console.error('Purchase failed:', error);
            toast.error(t('sleepProtocol.market.toast.purchaseFailed'));
          } finally {
            setPurchasingTokenId(null);
          }
        };

        // Filtered and sorted market listings
        const processedListings = marketListings.filter(listing => {
          const price = Number(listing.price) / 1e18;
          const termDays = Math.floor(Number(listing.nft.term) / 86400);
          
          // Price filter
          if (priceFilter !== 'all') {
            if (priceFilter === 'low' && price >= 10) return false;
            if (priceFilter === 'mid' && (price < 10 || price >= 100)) return false;
            if (priceFilter === 'high' && price < 100) return false;
          }
          
          // Term filter
          if (termFilter !== 'all') {
            if (termFilter === 'short' && termDays > 7) return false;
            if (termFilter === 'medium' && (termDays <= 7 || termDays > 30)) return false;
            if (termFilter === 'long' && termDays <= 30) return false;
          }
          
          return true;
        }).sort((a, b) => {
          switch (sortBy) {
            case 'price':
              return Number(a.price) - Number(b.price);
            case 'rank':
              return Number(a.nft.rank) - Number(b.nft.rank);
            case 'newest':
            default:
              return Number(b.listedAt) - Number(a.listedAt);
          }
        });

        const renderMarket = () => (
          <div>
            <h2 style={{ color: '#000080', marginBottom: '16px' }}>{t('sleepProtocol.market.title')}</h2>

            {!isConnected ? (
              <DataCard style={{ textAlign: 'center' }}>
                <CardTitle>Connect Wallet Required</CardTitle>
                <p style={{ margin: '12px 0' }}>To browse and purchase NFTs, please connect your wallet.</p>
                <p style={{ margin: '12px 0', fontSize: '14px', color: '#666' }}>
                  {'>> Check the bottom right corner and click the flashing "Wallet" button'}
                </p>
              </DataCard>
            ) : (
              <div>
                {/* Filters and Stats */}
                <DataCard style={{ marginBottom: '16px' }}>
                  <CardTitle>{t('sleepProtocol.market.filters.title')}</CardTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                    <StatRow>
                      <StatLabel>{t('sleepProtocol.market.filters.totalListings')}</StatLabel>
                      <StatValue>{marketListings.length}</StatValue>
                    </StatRow>
                    <StatRow>
                      <StatLabel>{t('sleepProtocol.market.filters.floor')}</StatLabel>
                      <StatValue>{marketListings.length > 0 ? Math.min(...marketListings.map(l => Number(l.price) / 1e18)).toFixed(2) : '0'} OKB</StatValue>
                    </StatRow>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                    <div>
                      <Win98Label>{t('sleepProtocol.market.filters.sort')}</Win98Label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        style={{ width: '100%', padding: '2px', border: '2px inset #c0c0c0', fontSize: '10px' }}
                      >
                        <option value="newest">{t('sleepProtocol.market.sort.newest')}</option>
                        <option value="price">{t('sleepProtocol.market.sort.price')}</option>
                        <option value="rank">{t('sleepProtocol.market.sort.rank')}</option>
                      </select>
                    </div>

                    <div>
                      <Win98Label>{t('sleepProtocol.market.filters.price')}</Win98Label>
                      <select
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value as any)}
                        style={{ width: '100%', padding: '2px', border: '2px inset #c0c0c0', fontSize: '10px' }}
                      >
                        <option value="all">{t('sleepProtocol.market.price.all')}</option>
                        <option value="low">{t('sleepProtocol.market.price.low')}</option>
                        <option value="mid">{t('sleepProtocol.market.price.mid')}</option>
                        <option value="high">{t('sleepProtocol.market.price.high')}</option>
                      </select>
                    </div>

                    <div>
                      <Win98Label>{t('sleepProtocol.market.filters.term')}</Win98Label>
                      <select
                        value={termFilter}
                        onChange={(e) => setTermFilter(e.target.value as any)}
                        style={{ width: '100%', padding: '2px', border: '2px inset #c0c0c0', fontSize: '10px' }}
                      >
                        <option value="all">{t('sleepProtocol.market.term.all')}</option>
                        <option value="short">{t('sleepProtocol.market.term.short')}</option>
                        <option value="medium">{t('sleepProtocol.market.term.medium')}</option>
                        <option value="long">{t('sleepProtocol.market.term.long')}</option>
                      </select>
                    </div>

                    <Win98Button
                      onClick={fetchMarketListings}
                      disabled={marketLoading}
                      style={{ fontSize: '10px', alignSelf: 'end' }}
                    >
                      {t('sleepProtocol.market.filters.refresh')}
                    </Win98Button>
                  </div>
                </DataCard>

                {/* NFT Listings */}
                <DataCard>
                  <CardTitle>{t('sleepProtocol.market.listings.title')}</CardTitle>
                  {marketLoading ? (
                    <p style={{ textAlign: 'center', margin: '20px 0' }}>{t('sleepProtocol.market.listings.loading')}</p>
                  ) : marketError ? (
                    <p style={{ textAlign: 'center', margin: '20px 0', color: 'red' }}>{marketError}</p>
                  ) : processedListings.length === 0 ? (
                    <p style={{ textAlign: 'center', margin: '20px 0' }}>{t('sleepProtocol.market.listings.empty')}</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginTop: '12px' }}>
                      {processedListings.map((listing) => {
                        const termDays = Math.floor(Number(listing.nft.term) / 86400);
                        const price = Number(listing.price) / 1e18;
                        const isPurchasing = purchasingTokenId === listing.tokenId;
                        
                        return (
                          <div
                            key={listing.id}
                            style={{
                              padding: '8px',
                              border: '2px outset #c0c0c0',
                              background: 'white',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>💎</div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>
                              {t('sleepProtocol.market.listings.cardTitle', { id: listing.tokenId })}
                            </div>
                            <div style={{ fontSize: '9px', marginBottom: '2px' }}>
                              <strong>{t('sleepProtocol.market.listings.price')}</strong> {price.toFixed(2)} OKB
                            </div>
                            <div style={{ fontSize: '9px', marginBottom: '2px' }}>
                              <strong>{t('sleepProtocol.market.listings.count')}</strong> {listing.nft.count}
                            </div>
                            <div style={{ fontSize: '9px', marginBottom: '2px' }}>
                              <strong>{t('sleepProtocol.market.listings.term')}</strong> {termDays} {t('sleepProtocol.market.listings.termUnit')}
                            </div>
                            <div style={{ fontSize: '9px', marginBottom: '2px' }}>
                              <strong>{t('sleepProtocol.market.listings.rank')}</strong> {listing.nft.rank}
                            </div>
                            <div style={{ fontSize: '8px', marginBottom: '6px', color: '#666' }}>
                              {t('sleepProtocol.market.listings.seller', { seller: listing.seller })}
                            </div>
                            <Win98Button
                              onClick={() => handlePurchaseNFT(listing)}
                              disabled={isPurchasing || isMarketPending}
                              style={{ 
                                fontSize: '9px', 
                                padding: '2px 6px',
                                background: isPurchasing ? '#808080' : '#c0c0c0'
                              }}
                            >
                      {isPurchasing ? t('sleepProtocol.market.listings.buying') : t('sleepProtocol.market.listings.buy')}
                            </Win98Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </DataCard>
              </div>
            )}
          </div>
        );

  const renderProfile = () => (
    <div>
      <h2 style={{ color: '#000080', marginBottom: '16px' }}>{t('sleepProtocol.profile.title')}</h2>
      
      {!isConnected ? (
        <DataCard style={{ textAlign: 'center' }}>
          <CardTitle>Connect Wallet Required</CardTitle>
          <p style={{ margin: '12px 0' }}>To view your profile and NFTs, please connect your wallet.</p>
          <p style={{ margin: '12px 0', fontSize: '14px', color: '#666' }}>
            👉 Check the bottom right corner and click the flashing "Wallet" button
          </p>
        </DataCard>
      ) : (
        <>
          <DataCard style={{ marginBottom: '16px' }}>
            <CardTitle>👤 {t('sleepProtocol.profile.account.title')}</CardTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <StatRow>
                <StatLabel>{t('sleepProtocol.profile.account.address')}</StatLabel>
                <StatValue style={{ fontSize: '9px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {address}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.profile.account.balance')}</StatLabel>
                <StatValue>{sleepBalance ? safeFormatBalance(sleepBalance, 18) : '0.0000'} SLEEP</StatValue>
              </StatRow>
              {userStakeData && (
                <>
                  <StatRow>
                    <StatLabel>{t('sleepProtocol.profile.account.totalStaked')}</StatLabel>
                    <StatValue>
                      {userStakeData.totalStake > BigInt(0) ? 
                        formatUnits(userStakeData.totalStake, 18) : 
                        '0.0000'
                      } SLEEP
                    </StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>{t('sleepProtocol.profile.account.claimableOkb')}</StatLabel>
                    <StatValue>
                      {userStakeData.userRewards > BigInt(0) ? 
                        formatUnits(userStakeData.userRewards, 18) : 
                        '0.0000'
                      } OKB
                    </StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>{t('sleepProtocol.profile.account.claimableSleep')}</StatLabel>
                    <StatValue>
                      {userStakeData.userSleepRewards > BigInt(0) ? 
                        formatUnits(userStakeData.userSleepRewards, 18) : 
                        '0.0000'
                      } SLEEP
                    </StatValue>
                  </StatRow>
                </>
              )}
            </div>
          </DataCard>

          <DataCard>
            <CardTitle>{t('sleepProtocol.profile.status.title')}</CardTitle>
            <div style={{ padding: '12px', background: '#f0f0f0', border: '1px inset #c0c0c0' }}>
              {userStakeData ? (
                <>
                  <StatRow>
                    <StatLabel>{t('sleepProtocol.profile.status.label')}</StatLabel>
                    <StatValue>
                      {userStakeData.totalStake > BigInt(0) ? 
                        t('sleepProtocol.profile.status.active', {
                          tier: t(userStakeData.isVeteran ? 'sleepProtocol.profile.status.tierVeteran' : 'sleepProtocol.profile.status.tierNew')
                        }) :
                        t('sleepProtocol.profile.status.inactive')
                      }
                    </StatValue>
                  </StatRow>
                  {userStakeData.totalStake > BigInt(0) && (
                    <StatRow>
                      <StatLabel>{t('sleepProtocol.profile.status.effective')}</StatLabel>
                      <StatValue>
                        {formatUnits(userStakeData.effectiveStake, 18)} SLEEP
                      </StatValue>
                    </StatRow>
                  )}
                </>
              ) : (
                <p style={{ textAlign: 'center', margin: '12px 0' }}>{t('sleepProtocol.profile.status.loading')}</p>
              )}
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Win98Button 
                onClick={() => setCurrentPage('stake')}
                style={{ fontSize: '10px' }}
              >
                🔒 {t('sleepProtocol.profile.actions.stake')}
              </Win98Button>
              <Win98Button 
                onClick={() => setCurrentPage('mint')}
                style={{ fontSize: '10px' }}
              >
                💎 {t('sleepProtocol.profile.actions.mint')}
              </Win98Button>
              <Win98Button 
                onClick={() => toast.success(t('sleepProtocol.profile.actions.historyToast'))}
                style={{ fontSize: '10px' }}
              >
                📋 {t('sleepProtocol.profile.actions.history')}
              </Win98Button>
            </div>
          </DataCard>
        </>
      )}
    </div>
  );

  const renderLiquidate = () => (
    <div>
      <h2 style={{ color: '#000080', marginBottom: '16px' }}>{t('sleepProtocol.liquidate.title')}</h2>
      
      {!isConnected ? (
        <DataCard style={{ textAlign: 'center' }}>
          <CardTitle>Connect Wallet Required</CardTitle>
          <p style={{ margin: '12px 0' }}>To play the liquidation game, please connect your wallet.</p>
          <p style={{ margin: '12px 0', fontSize: '14px', color: '#666' }}>
            👉 Check the bottom right corner and click the flashing "Wallet" button
          </p>
        </DataCard>
      ) : (
        <>
          <DataCard style={{ marginBottom: '16px' }}>
            <CardTitle>{t('sleepProtocol.liquidate.overview.title')}</CardTitle>
            <div style={{ background: '#f0f0f0', padding: '12px', border: '1px inset #c0c0c0', fontSize: '16px', lineHeight: '1.4' }}>
              {ensureArray<string>(t('sleepProtocol.liquidate.overview.points', { returnObjects: true }) as string[]).map((line, idx) => (
                <p key={idx} style={{ margin: '8px 0' }} dangerouslySetInnerHTML={{ __html: line }} />
              ))}
            </div>
          </DataCard>
          
          <DataCard>
            <CardTitle>{t('sleepProtocol.liquidate.listings.title')}</CardTitle>
            <div style={{ padding: '12px', border: '1px inset #c0c0c0', background: '#f8f8f8', marginBottom: '12px' }}>
              <p style={{ textAlign: 'center', margin: '20px 0', color: '#666' }}>{t('sleepProtocol.liquidate.listings.searching')}</p>
              <div style={{ textAlign: 'center' }}>
                <small style={{ color: '#666' }}>{t('sleepProtocol.liquidate.listings.hint')}</small>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <Win98Button 
                onClick={() => toast.success(t('sleepProtocol.liquidate.actions.refreshToast'))}
                style={{ fontSize: '10px' }}
              >
                {t('sleepProtocol.liquidate.actions.refresh')}
              </Win98Button>
              <Win98Button 
                onClick={() => toast.success(t('sleepProtocol.liquidate.actions.historyToast'))}
                style={{ fontSize: '10px' }}
              >
                📋 {t('sleepProtocol.liquidate.actions.history')}
              </Win98Button>
            </div>
          </DataCard>
        </>
      )}
    </div>
  );

   // Litepaper state management
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
       
       default:
         return (
           <div>
             <h3 style={{ color: '#000080', marginBottom: '16px' }}>Welcome to Sleep Protocol Litepaper!</h3>
             <p>Please select a section from the table of contents to begin reading.</p>
           </div>
         );
     }
   };

   const renderSwap = () => {
     // InfoRow 组件
     const InfoRow = ({ label, value }: { label: string; value: string }) => (
       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', borderBottom: '1px dotted #26A17B' }}>
         <span style={{ color: '#9FD8C7' }}>{label}:</span>
         <span style={{ color: '#50AF95', fontWeight: 'bold' }}>{value}</span>
       </div>
     );
     
     // Mock数据 - 实际需要从合约读取
     const currentPrice = 0.00001; // 1 SLEEPING = 0.00001 USDT
     const poolLiquidity = {
       locked: { 
         sleeping: 1000000, 
         usdt: 10,
         lockEndTime: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1年后解锁
       },
       community: { 
         sleeping: 500000, 
         usdt: 5,
         unlocked: true 
       }
     };
     
     // 获取当前税率阶段
     const getCurrentTaxPhase = () => {
       // 模拟：实际需要从合约读取
       const genesisTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30天前
       const daysSinceGenesis = (Date.now() - genesisTime) / (24 * 60 * 60 * 1000);
       
       if (daysSinceGenesis < 180) return { phase: 1, buyTax: 2, sellTax: 5 };
       if (daysSinceGenesis < 365) return { phase: 2, buyTax: 2, sellTax: 4 };
       if (daysSinceGenesis < 545) return { phase: 3, buyTax: 1, sellTax: 3 };
       return { phase: 4, buyTax: 0, sellTax: 0 };
     };
     
     const taxPhase = getCurrentTaxPhase();
     const currentTax = fromToken === 'SLEEPING' ? taxPhase.sellTax : taxPhase.buyTax;
     
     const handleSwapDirection = () => {
       setFromToken(toToken);
       setToToken(fromToken);
       setFromAmount(toAmount);
       setToAmount(fromAmount);
     };
     
     const handleSwap = () => {
       if (!isConnected) {
         toast.error('请先连接钱包！');
         return;
       }
       
       toast.success(`交易功能即将上线！\n兑换: ${fromAmount} ${fromToken} → ${toAmount} ${toToken}\n税费: ${currentTax}%`);
     };
     
     const handleAddLiquidity = () => {
       if (!isConnected) {
         toast.error('请先连接钱包！');
         return;
       }
       
       toast.success(`添加流动性功能即将上线！\n添加: ${liquidityAmount1} SLEEPING + ${liquidityAmount2} USDT`);
     };
     
     const totalLiquidity = {
       sleeping: poolLiquidity.locked.sleeping + poolLiquidity.community.sleeping,
       usdt: poolLiquidity.locked.usdt + poolLiquidity.community.usdt
     };
     
     // 计算锁定剩余天数
     const daysRemaining = Math.ceil((poolLiquidity.locked.lockEndTime - Date.now()) / (24 * 60 * 60 * 1000));

     return (
       <div style={{ display: 'flex', gap: '24px', height: '100%', overflowY: 'auto', padding: '12px', background: 'linear-gradient(135deg, #001a14 0%, #002d22 50%, #003d2d 100%)' }}>
         {/* 左侧主交易区 */}
         <div style={{ flex: '1 1 550px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
           {/* Plasma品牌标识 - Tether官方配色 */}
           <div style={{
             background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
             padding: '18px 24px',
             border: '3px solid #26A17B',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'space-between',
             boxShadow: '0 4px 20px rgba(38, 161, 123, 0.25)'
           }}>
             <div>
               <div style={{ 
                 color: '#26A17B', 
                 fontSize: '24px', 
                 fontWeight: 'bold', 
                 marginBottom: '6px', 
                 letterSpacing: '2.5px',
                 textShadow: '0 2px 8px rgba(38, 161, 123, 0.5)',
                 fontFamily: 'Arial, sans-serif'
               }}>
                 PLASMA NETWORK
               </div>
               <div style={{ 
                 color: '#9FD8C7', 
                 fontSize: '11px', 
                 letterSpacing: '1.2px', 
                 fontWeight: '500',
                 textTransform: 'uppercase'
               }}>
                 Powered by Tether • Enterprise Liquidity
               </div>
             </div>
             <div style={{ 
               background: 'linear-gradient(135deg, #26A17B 0%, #50AF95 100%)',
               padding: '10px 20px',
               border: '2px solid #9FD8C7',
               fontSize: '14px',
               color: '#001f18',
               fontWeight: 'bold',
               letterSpacing: '1px',
               boxShadow: '0 3px 12px rgba(38, 161, 123, 0.4)',
               borderRadius: '2px'
             }}>
               USDT
             </div>
           </div>

           {/* 模式切换 - Tether配色 */}
           <div style={{ 
             background: 'linear-gradient(135deg, rgba(0, 61, 45, 0.5) 0%, rgba(0, 29, 20, 0.6) 100%)', 
             border: '2px solid #26A17B',
             padding: '6px',
             display: 'flex',
             gap: '6px',
             boxShadow: '0 2px 8px rgba(38, 161, 123, 0.3)'
           }}>
             <Win98Button
               onClick={() => setSwapMode('swap')}
               style={{
                 flex: 1,
                 padding: '14px 20px',
                 background: swapMode === 'swap' ? 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)' : 'transparent',
                 color: swapMode === 'swap' ? '#26A17B' : '#666',
                 border: swapMode === 'swap' ? '2px solid #26A17B' : 'none',
                 fontWeight: 'bold',
                 fontSize: '14px',
                 letterSpacing: '1.5px'
               }}
             >
               SWAP
             </Win98Button>
             <Win98Button
               onClick={() => setSwapMode('addLiquidity')}
               style={{
                 flex: 1,
                 padding: '14px 20px',
                 background: swapMode === 'addLiquidity' ? 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)' : 'transparent',
                 color: swapMode === 'addLiquidity' ? '#26A17B' : '#666',
                 border: swapMode === 'addLiquidity' ? '2px solid #26A17B' : 'none',
                 fontWeight: 'bold',
                 fontSize: '14px',
                 letterSpacing: '1.5px'
               }}
             >
               ADD LIQUIDITY
             </Win98Button>
           </div>
           
           {/* 主交易卡片 - 美元级高级感 */}
           <DataCard style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, rgba(0, 29, 20, 0.8) 0%, rgba(0, 61, 45, 0.6) 100%)', boxShadow: '0 4px 20px rgba(38, 161, 123, 0.3)', border: '2px solid #26A17B' }}>
             <div style={{ 
               background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
               color: '#26A17B',
               padding: '14px 20px',
               margin: '-8px -8px 20px -8px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'space-between',
               borderBottom: '3px solid #26A17B'
             }}>
               <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                 {swapMode === 'swap' ? 'Token Exchange' : 'Liquidity Provision'}
               </h3>
               <div style={{ fontSize: '11px', opacity: 0.7, letterSpacing: '0.5px' }}>
                 {swapMode === 'addLiquidity' && 'COMMUNITY POOL'}
               </div>
             </div>
           
           {swapMode === 'swap' ? (
             <>
               {/* Swap模式 - 美元级专业输入 */}
               <div style={{ 
                 background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.12) 0%, rgba(26, 127, 100, 0.08) 100%)',
                 border: '2px solid #26A17B',
                 padding: '20px',
                 marginBottom: '10px',
                 borderRadius: '4px',
                 boxShadow: '0 2px 8px rgba(38, 161, 123, 0.2)'
               }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                   <label style={{ color: '#9FD8C7', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>From</label>
                   <label style={{ color: '#9FD8C7', fontSize: '11px', fontWeight: '500' }}>Balance: <span style={{ color: '#50AF95', fontWeight: '600' }}>0.00</span></label>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <Win98Input
                     type="number"
                     value={fromAmount}
                     onChange={(e) => setFromAmount(e.target.value)}
                     placeholder="0.00"
                     style={{ 
                       flex: 1, 
                       fontSize: '32px', 
                       fontWeight: '300',
                       border: 'none',
                       padding: '0',
                       background: 'transparent',
                       color: '#9FD8C7',
                       fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                     }}
                   />
                   <Win98Button style={{ 
                     background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
                     color: '#26A17B', 
                     padding: '10px 24px',
                     fontSize: '13px',
                     fontWeight: '600',
                     border: 'none',
                     minWidth: '130px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'space-between',
                     gap: '10px',
                     letterSpacing: '0.5px',
                     boxShadow: '0 2px 8px rgba(38, 208, 206, 0.3)'
                   }}>
                     <span>{fromToken}</span>
                     <span style={{ fontSize: '10px', opacity: 0.8 }}>▼</span>
                   </Win98Button>
                 </div>
                 {fromAmount && (
                   <div style={{ marginTop: '10px', fontSize: '13px', color: '#999', fontWeight: '500' }}>
                     ≈ ${(Number(fromAmount) * (fromToken === 'SLEEPING' ? currentPrice : 1)).toFixed(2)} USD
                   </div>
                 )}
               </div>
               
               {/* 美元级交换图标 */}
               <div style={{ 
                 display: 'flex', 
                 justifyContent: 'center',
                 margin: '-8px 0',
                 position: 'relative',
                 zIndex: 1
               }}>
                 <Win98Button 
                   onClick={handleSwapDirection}
                   style={{ 
                     width: '44px',
                     height: '44px',
                     borderRadius: '50%',
                     background: 'linear-gradient(135deg, #26D0CE 0%, #1A2980 100%)',
                     border: '2px solid white',
                     boxShadow: '0 4px 12px rgba(38, 208, 206, 0.4)',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     fontSize: '20px',
                     cursor: 'pointer',
                     transition: 'transform 0.3s',
                     color: 'white'
                   }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.transform = 'rotate(180deg)';
                     e.currentTarget.style.boxShadow = '0 6px 16px rgba(38, 208, 206, 0.6)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.transform = 'rotate(0deg)';
                     e.currentTarget.style.boxShadow = '0 4px 12px rgba(38, 208, 206, 0.4)';
                   }}
                 >
                   ⇅
                 </Win98Button>
               </div>
               
               <div style={{ 
                 background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.12) 0%, rgba(26, 127, 100, 0.08) 100%)',
                 border: '2px solid #26A17B',
                 padding: '20px',
                 marginTop: '10px',
                 borderRadius: '4px',
                 boxShadow: '0 2px 8px rgba(38, 161, 123, 0.2)'
               }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                   <label style={{ color: '#9FD8C7', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>To</label>
                   <label style={{ color: '#9FD8C7', fontSize: '11px', fontWeight: '500' }}>Balance: <span style={{ color: '#50AF95', fontWeight: '600' }}>0.00</span></label>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <Win98Input
                     type="number"
                     value={toAmount}
                     readOnly
                     placeholder="0.00"
                     style={{ 
                       flex: 1, 
                       fontSize: '32px', 
                       fontWeight: '300',
                       border: 'none',
                       padding: '0',
                       background: 'transparent',
                       color: '#50AF95',
                       fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                     }}
                   />
                   <Win98Button style={{ 
                     background: toToken === 'USDT' ? 'linear-gradient(135deg, #50AF95 0%, #1A7F64 100%)' : 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
                     color: toToken === 'USDT' ? '#001f18' : '#26A17B', 
                     padding: '10px 24px',
                     fontSize: '13px',
                     fontWeight: '600',
                     border: 'none',
                     minWidth: '130px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'space-between',
                     gap: '10px',
                     letterSpacing: '0.5px',
                     boxShadow: toToken === 'USDT' ? '0 2px 8px rgba(80, 175, 149, 0.3)' : '0 2px 8px rgba(38, 208, 206, 0.3)'
                   }}>
                     <span>{toToken}</span>
                     <span style={{ fontSize: '10px', opacity: 0.8 }}>▼</span>
                   </Win98Button>
                 </div>
                 {toAmount && (
                   <div style={{ marginTop: '10px', fontSize: '13px', color: '#999', fontWeight: '500' }}>
                     ≈ ${(Number(toAmount) * (toToken === 'USDT' ? 1 : currentPrice)).toFixed(2)} USD
                   </div>
                 )}
               </div>
             </>
           ) : (
             <>
               {/* 添加流动性模式 - 精致设计 */}
               <div style={{ 
                 background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.12) 0%, rgba(26, 127, 100, 0.08) 100%)',
                 border: '2px solid #26A17B',
                 padding: '16px',
                 marginBottom: '12px'
               }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                   <label style={{ color: '#9FD8C7', fontSize: '12px', fontWeight: 'bold' }}>SLEEPING</label>
                   <label style={{ color: '#9FD8C7', fontSize: '11px' }}>余额: 0.00</label>
                 </div>
                 <Win98Input
                   type="number"
                   value={liquidityAmount1}
                   onChange={(e) => {
                     setLiquidityAmount1(e.target.value);
                     if (e.target.value) {
                       setLiquidityAmount2((Number(e.target.value) * currentPrice).toFixed(6));
                     } else {
                       setLiquidityAmount2('');
                     }
                   }}
                   placeholder="0.0"
                   style={{ 
                     width: '100%',
                     fontSize: '24px',
                     fontWeight: 'bold',
                     border: 'none',
                     padding: '8px 0',
                     background: 'transparent',
                     color: '#50AF95'
                   }}
                 />
               </div>
               
               <div style={{ 
                 textAlign: 'center', 
                 margin: '8px 0',
                 color: '#26A17B',
                 fontSize: '24px',
                 fontWeight: 'bold'
               }}>
                 +
               </div>
               
               <div style={{ 
                 background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.12) 0%, rgba(26, 127, 100, 0.08) 100%)',
                 border: '2px solid #26A17B',
                 padding: '16px'
               }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                   <label style={{ color: '#9FD8C7', fontSize: '12px', fontWeight: 'bold' }}>USDT</label>
                   <label style={{ color: '#9FD8C7', fontSize: '11px' }}>自动计算</label>
                 </div>
                 <Win98Input
                   type="number"
                   value={liquidityAmount2}
                   readOnly
                   placeholder="0.0"
                   style={{ 
                     width: '100%',
                     fontSize: '24px',
                     fontWeight: 'bold',
                     border: 'none',
                     padding: '8px 0',
                     background: 'transparent',
                     color: '#50AF95'
                   }}
                 />
               </div>
             </>
           )}
           
           {/* 滑点设置 - 美元绿设计 */}
           {swapMode === 'swap' && (
             <div style={{ 
               background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.15) 0%, rgba(26, 127, 100, 0.1) 100%)',
               border: '2px solid #26A17B',
               padding: '14px',
               marginTop: '12px',
               borderRadius: '4px'
             }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                 <label style={{ color: '#9FD8C7', fontSize: '13px', fontWeight: 'bold' }}>
                   滑点容忍度
                 </label>
                 <span style={{ fontSize: '16px', color: '#50AF95', fontWeight: 'bold' }}>{swapSlippage}%</span>
               </div>
               <div style={{ display: 'flex', gap: '6px' }}>
                 {['0.1', '0.5', '1.0', '2.0'].map(value => (
                   <Win98Button
                     key={value}
                     onClick={() => setSwapSlippage(value)}
                     style={{
                       flex: 1,
                       padding: '6px',
                       fontSize: '12px',
                       background: swapSlippage === value ? 'linear-gradient(135deg, #26A17B 0%, #1A7F64 100%)' : 'linear-gradient(135deg, rgba(0, 61, 45, 0.3) 0%, rgba(0, 29, 20, 0.4) 100%)',
                       color: swapSlippage === value ? '#001f18' : '#9FD8C7',
                       border: swapSlippage === value ? '2px inset #c0c0c0' : '2px outset #c0c0c0',
                       fontWeight: swapSlippage === value ? 'bold' : 'normal'
                     }}
                   >
                     {value}%
                   </Win98Button>
                 ))}
                 <Win98Input
                   type="number"
                   value={swapSlippage}
                   onChange={(e) => setSwapSlippage(e.target.value)}
                   placeholder="自定义"
                   style={{ width: '70px', textAlign: 'center', fontSize: '12px' }}
                   step="0.1"
                 />
               </div>
             </div>
           )}
           
           {/* 税收提示 - 只在swap模式显示 */}
           {swapMode === 'swap' && currentTax > 0 && (
             <div style={{ 
               background: currentTax >= 3 ? 'rgba(255, 107, 107, 0.2)' : 'rgba(38, 161, 123, 0.15)',
               color: currentTax >= 3 ? '#ff6b6b' : '#50AF95',
               padding: '12px',
               margin: '16px 0',
               border: currentTax >= 3 ? '2px solid #ff6b6b' : '2px solid #26A17B',
               fontSize: '13px',
               textAlign: 'center'
             }}>
               当前税率阶段 {taxPhase.phase}: {fromToken === 'SLEEPING' ? '卖出' : '买入'}税 {currentTax}%
               <br />
               税款将用于流动性池、质押奖励和回购销毁
             </div>
           )}
           
           {/* 交易信息 - 精美卡片式 */}
           {swapMode === 'swap' && fromAmount && toAmount && (
             <div style={{ 
               background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.13) 0%, rgba(26, 127, 100, 0.09) 100%)',
               border: '2px solid #26A17B',
               padding: '14px',
               marginTop: '12px',
               borderRadius: '4px'
             }}>
              <div style={{ fontSize: '12px', color: '#9FD8C7', fontWeight: 'bold', marginBottom: '8px' }}>交易详情</div>
              <InfoRow label="汇率" value={`1 SLEEPING = ${currentPrice.toFixed(8)} USDT`} />
              <InfoRow label="税费" value={`${currentTax}% (${(Number(fromAmount) * currentTax / 100).toFixed(6)} ${fromToken})`} />
              <InfoRow label="最少收到" value={`${(Number(toAmount) * (1 - Number(swapSlippage) / 100)).toFixed(6)} ${toToken}`} />
            </div>
          )}
           
           {/* 流动性信息 - 精美卡片式 */}
           {swapMode === 'addLiquidity' && liquidityAmount1 && liquidityAmount2 && (
             <div style={{ 
               background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.13) 0%, rgba(26, 127, 100, 0.09) 100%)',
               border: '2px solid #26A17B',
               padding: '14px',
               marginTop: '12px',
               borderRadius: '4px'
             }}>
              <div style={{ fontSize: '12px', color: '#9FD8C7', fontWeight: 'bold', marginBottom: '8px' }}>添加详情</div>
              <InfoRow label="当前汇率" value={`1 SLEEPING = ${currentPrice.toFixed(8)} USDT`} />
              <InfoRow label="你的池份额" value="≈ 0.05%" />
              <InfoRow label="预计LP代币" value="≈ 12.5 LP" />
            </div>
          )}
           
           {/* 高级按钮 */}
           <Win98Button
             onClick={swapMode === 'swap' ? handleSwap : handleAddLiquidity}
             disabled={swapMode === 'swap' 
               ? (!isConnected || !fromAmount || Number(fromAmount) <= 0)
               : (!isConnected || !liquidityAmount1 || Number(liquidityAmount1) <= 0)}
             style={{ 
               width: '100%', 
               padding: '16px', 
               fontSize: '16px', 
               fontWeight: 'bold', 
               marginTop: '16px',
               background: (swapMode === 'swap' 
                 ? (!isConnected || !fromAmount || Number(fromAmount) <= 0)
                 : (!isConnected || !liquidityAmount1 || Number(liquidityAmount1) <= 0)) 
                 ? 'linear-gradient(135deg, rgba(0, 61, 45, 0.4) 0%, rgba(0, 29, 20, 0.5) 100%)' 
                 : 'linear-gradient(135deg, #26A17B 0%, #1A7F64 100%)',
               color: (swapMode === 'swap' 
                 ? (!isConnected || !fromAmount || Number(fromAmount) <= 0)
                 : (!isConnected || !liquidityAmount1 || Number(liquidityAmount1) <= 0)) 
                 ? '#9FD8C7' 
                 : '#001f18',
               border: (swapMode === 'swap' 
                 ? (!isConnected || !fromAmount || Number(fromAmount) <= 0)
                 : (!isConnected || !liquidityAmount1 || Number(liquidityAmount1) <= 0)) 
                 ? '2px solid #26A17B' 
                 : '2px solid #26A17B',
               cursor: (swapMode === 'swap' 
                 ? (!isConnected || !fromAmount || Number(fromAmount) <= 0)
                 : (!isConnected || !liquidityAmount1 || Number(liquidityAmount1) <= 0)) ? 'not-allowed' : 'pointer',
               opacity: (swapMode === 'swap' 
                 ? (!isConnected || !fromAmount || Number(fromAmount) <= 0)
                 : (!isConnected || !liquidityAmount1 || Number(liquidityAmount1) <= 0)) ? 0.7 : 1
             }}
           >
             {!isConnected ? '请先连接钱包' : (swapMode === 'swap' ? '立即兑换' : '添加流动性')}
           </Win98Button>
         </DataCard>
         </div>
         
         {/* 右侧信息面板 */}
         <div style={{ flex: '0 1 400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
         
         {/* 流动性池统计 - 精致设计 */}
         <DataCard>
           <div style={{ 
             background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
             color: '#26A17B',
             padding: '12px 16px',
             margin: '-8px -8px 16px -8px',
             borderBottom: '3px solid #26A17B'
           }}>
             <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
               流动性池统计
             </h3>
           </div>
           
          {/* 总体数据 - 美元绿 */}
          <div style={{ 
            background: 'linear-gradient(135deg, #26A17B 0%, #1d8163 50%, #50AF95 100%)',
            borderRadius: '0',
            padding: '18px',
            marginBottom: '16px',
            border: '3px solid #9FD8C7',
            boxShadow: '0 4px 12px rgba(38, 161, 123, 0.4)'
          }}>
             <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>总流动性价值</div>
             <div style={{ fontSize: '28px', color: 'white', fontWeight: 'bold', marginBottom: '8px' }}>
               ${((totalLiquidity.sleeping * currentPrice + totalLiquidity.usdt) * 1000).toLocaleString()}
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
               <div>
                 <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>SLEEPING</div>
                 <div style={{ fontSize: '14px', color: 'white', fontWeight: 'bold' }}>{totalLiquidity.sleeping.toLocaleString()}</div>
               </div>
               <div>
                 <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>USDT</div>
                 <div style={{ fontSize: '14px', color: 'white', fontWeight: 'bold' }}>{totalLiquidity.usdt.toLocaleString()}</div>
               </div>
             </div>
           </div>
           
          {/* 协议锁定池信息 - 深绿美元色 */}
          <div style={{ 
            background: 'linear-gradient(135deg, #003d2d 0%, #002d22 50%, #00241a 100%)',
            border: '3px solid #26A17B',
            padding: '16px',
            marginBottom: '12px',
            boxShadow: '0 3px 10px rgba(0, 61, 45, 0.5)'
          }}>
             <div style={{ 
               fontSize: '11px', 
               color: 'rgba(255,255,255,0.9)', 
               marginBottom: '6px',
               textTransform: 'uppercase',
               letterSpacing: '1px',
               fontWeight: 'bold'
             }}>
               协议锁定池 (POL)
             </div>
             <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.3)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                 <span style={{ fontSize: '11px', color: '#d4ede5' }}>SLEEPING</span>
                 <span style={{ fontSize: '13px', color: '#e8f5f1', fontWeight: 'bold' }}>{poolLiquidity.locked.sleeping.toLocaleString()}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ fontSize: '11px', color: '#d4ede5' }}>USDT</span>
                 <span style={{ fontSize: '13px', color: '#e8f5f1', fontWeight: 'bold' }}>{poolLiquidity.locked.usdt.toLocaleString()}</span>
               </div>
             </div>
             <div style={{ background: 'rgba(0, 61, 45, 0.4)', padding: '8px', border: '1px solid #26A17B' }}>
               <div style={{ fontSize: '11px', color: '#d4ede5', marginBottom: '4px' }}>永久锁定 · {daysRemaining} 天后解锁</div>
               <div style={{ fontSize: '10px', color: '#c5e6dc', fontStyle: 'italic' }}>
                 深度锁定确保价格稳定
               </div>
             </div>
           </div>
           
          {/* 社区流动池信息 - 浅绿美元色 */}
          <div style={{ 
            background: 'linear-gradient(135deg, #50AF95 0%, #6BCFB3 50%, #9FD8C7 100%)',
            border: '3px solid #9FD8C7',
            padding: '16px',
            marginBottom: '12px',
            boxShadow: '0 3px 10px rgba(80, 175, 149, 0.4)'
          }}>
             <div style={{ 
               fontSize: '11px', 
               color: 'rgba(255,255,255,0.9)', 
               marginBottom: '6px',
               textTransform: 'uppercase',
               letterSpacing: '1px',
               fontWeight: 'bold'
             }}>
               社区流动池
             </div>
             <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.3)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                 <span style={{ fontSize: '11px', color: '#001f18' }}>SLEEPING</span>
                 <span style={{ fontSize: '13px', color: '#003d2d', fontWeight: 'bold' }}>{poolLiquidity.community.sleeping.toLocaleString()}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ fontSize: '11px', color: '#001f18' }}>USDT</span>
                 <span style={{ fontSize: '13px', color: '#003d2d', fontWeight: 'bold' }}>{poolLiquidity.community.usdt.toLocaleString()}</span>
               </div>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px', border: '1px solid #26A17B' }}>
               <div style={{ fontSize: '11px', color: '#001f18', marginBottom: '4px' }}>随时可提取 · ~25% APR</div>
               <div style={{ fontSize: '10px', color: '#003d2d', fontStyle: 'italic' }}>
                 获得交易手续费分成
               </div>
             </div>
           </div>
           
           {/* 市场数据 */}
           <div style={{ background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.13) 0%, rgba(26, 127, 100, 0.09) 100%)', border: '2px solid #26A17B', padding: '14px', borderRadius: '4px' }}>
             <div style={{ fontSize: '12px', color: '#9FD8C7', fontWeight: 'bold', marginBottom: '8px' }}>市场数据</div>
             <InfoRow label="当前价格" value={`${currentPrice.toFixed(8)} USDT`} />
             <InfoRow label="24h 交易量" value="0.5 USDT" />
             <InfoRow label="24h 手续费" value="0.0015 USDT" />
           </div>
         </DataCard>
         
         {/* 税率进度表 - 精致设计 */}
         <DataCard>
           <div style={{ 
             background: 'linear-gradient(135deg, #003d2d 0%, #001f18 100%)',
             color: '#26A17B',
             padding: '12px 16px',
             margin: '-8px -8px 16px -8px',
             borderBottom: '3px solid #26A17B'
           }}>
             <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>
               税率阶段进度
             </h3>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {[
               { phase: 1, period: '前6个月', buy: 2, sell: 5, gradient: 'linear-gradient(135deg, #26A17B 0%, #50AF95 100%)' },
               { phase: 2, period: '6-12个月', buy: 2, sell: 4, gradient: 'linear-gradient(135deg, #1d8163 0%, #26A17B 100%)' },
               { phase: 3, period: '12-18个月', buy: 1, sell: 3, gradient: 'linear-gradient(135deg, #50AF95 0%, #6BCFB3 100%)' },
               { phase: 4, period: '18个月后', buy: 0, sell: 0, gradient: 'linear-gradient(135deg, #6BCFB3 0%, #9FD8C7 100%)' }
             ].map((stage) => (
               <div key={stage.phase} style={{ 
                 background: taxPhase.phase === stage.phase ? stage.gradient : 'linear-gradient(135deg, rgba(38, 161, 123, 0.1) 0%, rgba(26, 127, 100, 0.08) 100%)',
                 padding: '12px',
                 border: taxPhase.phase === stage.phase ? '2px solid #26A17B' : '2px solid rgba(38, 161, 123, 0.5)',
                 position: 'relative'
               }}>
                 <div style={{ 
                   color: taxPhase.phase === stage.phase ? '#001f18' : '#9FD8C7',
                   fontWeight: 'bold',
                   marginBottom: '4px',
                   fontSize: '13px'
                 }}>
                   阶段 {stage.phase} ({stage.period})
                 </div>
                 <div style={{ 
                   color: taxPhase.phase === stage.phase ? '#003d2d' : '#9FD8C7',
                   fontSize: '12px'
                 }}>
                   买入 {stage.buy}% • 卖出 {stage.sell}%
                 </div>
                 {taxPhase.phase === stage.phase && (
                   <div style={{ 
                     position: 'absolute',
                     top: '8px',
                     right: '8px',
                     background: 'rgba(0, 31, 24, 0.5)',
                     padding: '2px 8px',
                     fontSize: '10px',
                     color: '#d4ede5',
                     fontWeight: 'bold',
                     border: '1px solid #26A17B'
                   }}>
                     当前
                   </div>
                 )}
               </div>
             ))}
           </div>
         </DataCard>
         </div>
       </div>
     );
   };

   const renderLitepaper = () => (
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

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard': return renderDashboard();
      case 'access-pass': return renderAccessPass();
      case 'mint': return renderMint();
      case 'stake': return renderStake();
      case 'swap': return renderSwap();
      case 'market': return renderMarket();
      case 'profile': return renderProfile();
      case 'liquidate': return renderLiquidate();
      case 'litepaper': return renderLitepaper();
      default: return renderDashboard();
    }
  };

  const currentNavItem = navigationItems.find(item => item.id === currentPage);

  return (
    <AppContainer>
      <MenuBar>
        {navigationItems.map(item => (
          <MenuButton
            key={item.id}
            active={currentPage === item.id}
            onClick={() => setCurrentPage(item.id)}
          >
            {t(item.labelKey)}
          </MenuButton>
        ))}
      </MenuBar>

      <MainContent>
        {renderCurrentPage()}
      </MainContent>

      <StatusBar>
        <span>{t('sleepProtocol.status.current', { page: currentNavItem ? t(currentNavItem.labelKey) : t('sleepProtocol.nav.dashboard') })}</span>
        
        <LanguageSwitcher>
          <span>Lang:</span>
          <LanguageButton 
            active={router.locale === 'en'} 
            onClick={() => changeLanguage('en')}
          >
            EN
          </LanguageButton>
          <LanguageButton 
            active={router.locale === 'zh'} 
            onClick={() => changeLanguage('zh')}
          >
            中文
          </LanguageButton>
          <LanguageButton 
            active={router.locale === 'ko'} 
            onClick={() => changeLanguage('ko')}
          >
            한국어
          </LanguageButton>
          <LanguageButton 
            active={router.locale === 'ja'} 
            onClick={() => changeLanguage('ja')}
          >
            日本語
          </LanguageButton>
        </LanguageSwitcher>
        
        <WalletSection>
          <Win98Button
            style={{ 
              padding: '4px 10px',  // 与LanguageButton一致
              fontSize: '14px',     // 与LanguageButton一致
              marginRight: '8px',
              minWidth: '45px',     // 与LanguageButton一致
              animation: !isConnected ? 'blink 1s infinite' : 'none',
              background: !isConnected ? '#ff6b6b' : '#c0c0c0',
              color: !isConnected ? 'white' : 'black',
              fontFamily: 'MS Sans Serif, sans-serif'  // 与LanguageButton一致
            }}
            onClick={() => setShowWalletModal(true)}
          >
            Wallet
          </Win98Button>
          {isConnected ? (
            <span style={{ color: 'green' }}>
              <span style={{ fontSize: '16px' }}>●</span> Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          ) : (
            <span style={{ color: 'red' }}>
              <span className="blinking-dot" style={{ fontSize: '16px' }}>●</span> Not Connected
            </span>
          )}
        </WalletSection>
      </StatusBar>

      {/* Access Pass Mint Modal */}
      {showAccessPassMintModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#c0c0c0',
            border: '2px outset #c0c0c0',
            width: '500px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#000080',
              color: 'white',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              <span>Mint Your Access Pass</span>
              <Win98Button
                onClick={() => setShowAccessPassMintModal(false)}
                style={{ fontSize: '16px', padding: '4px 8px' }}
              >
                ✕
              </Win98Button>
            </div>

            <div style={{ padding: '12px' }}>
              {/* Preview */}
              <DataCard style={{ marginBottom: '12px' }}>
                <CardTitle style={{ fontSize: '20px' }}>Your Access Pass Preview</CardTitle>
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'left', 
                  border: '1px inset #c0c0c0', 
                  background: '#f8f8f8',
                  paddingLeft: '9.5px'
                }}>
                     <div 
                       style={{ transform: 'scale(1.0)', transformOrigin: 'left center' }}
                       dangerouslySetInnerHTML={{ 
                         __html: generateWin98AccessPassSvg(
                           design, 
                           address ?? "0x000...000", 
                           devSupportAmount,
                           previewStakedSleep,
                           previewClaimableOkb,
                           previewClaimableSleep,
                           previewTotalSupport,
                           elementTransforms,
                           t
                         ) 
                       }} 
                     />
                </div>
              </DataCard>

              {/* Dev Support Selection */}
              <DataCard style={{ marginBottom: '12px' }}>
                <CardTitle style={{ fontSize: '20px' }}>Dev Support - Choose Your Tier</CardTitle>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0' }}>
                    <input
                      type="radio"
                      name="devSupport"
                      checked={devSupportAmount === 0}
                      onChange={() => setDevSupportAmount(0)}
                    />
                    <span style={{ fontSize: '16px' }}>No Support - Standard Access Pass</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0' }}>
                    <input
                      type="radio"
                      name="devSupport"
                      checked={devSupportAmount > 0 && devSupportAmount < 0.4}
                      onChange={() => setDevSupportAmount(0.2)}
                    />
                    <span style={{ fontSize: '16px' }}><strong>Gold Tier (0.1-0.3 OKB)</strong> - Golden halo</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0' }}>
                    <input
                      type="radio"
                      name="devSupport"
                      checked={devSupportAmount >= 0.4 && devSupportAmount < 0.7}
                      onChange={() => setDevSupportAmount(0.5)}
                    />
                    <span style={{ fontSize: '16px' }}><strong>Platinum Tier (0.4-0.6 OKB)</strong> - Silver halo</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0' }}>
                    <input
                      type="radio"
                      name="devSupport"
                      checked={devSupportAmount >= 0.7}
                      onChange={() => setDevSupportAmount(0.8)}
                    />
                    <span style={{ fontSize: '16px' }}>💎 <strong>Diamond Tier (0.7-1.0 OKB)</strong> - Rainbow halo</span>
                  </div>

                  {devSupportAmount > 0 && (
                    <div style={{ 
                      margin: '8px 0', 
                      padding: '8px', 
                      background: '#f0f0f0', 
                      border: '1px inset #c0c0c0' 
                    }}>
                      <Win98Label style={{ fontSize: '16px' }}>Exact Amount: {devSupportAmount.toFixed(2)} OKB</Win98Label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={devSupportAmount}
                        onChange={(e) => setDevSupportAmount(parseFloat(e.target.value))}
                        style={{ width: '100%', margin: '4px 0', height: '20px' }}
                      />
                    </div>
                  )}
                </div>
              </DataCard>

              {/* Cost Summary */}
              <DataCard style={{ marginBottom: '12px' }}>
                <CardTitle style={{ fontSize: '20px' }}>💰 Cost Summary</CardTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '14px' }}>
                  <div style={{ textAlign: 'center', padding: '8px', border: '1px inset #c0c0c0' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Access Pass</div>
                    <div style={{ color: 'green', fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>FREE</div>
                    <div style={{ fontSize: '14px' }}>0 OKB</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', border: '1px inset #c0c0c0' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Dev Support</div>
                    <div style={{ color: '#000080', fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>
                      {devSupportAmount > 0 ? `+${devSupportAmount.toFixed(2)} OKB` : 'OFF'}
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      {devSupportAmount >= 0.7 ? 'Diamond' : 
                       devSupportAmount >= 0.4 ? 'Platinum' :
                       devSupportAmount > 0 ? 'Gold' : 'None'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', border: '1px inset #c0c0c0' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Total Cost</div>
                    <div style={{ color: 'red', fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>
                      {devSupportAmount > 0 ? `${devSupportAmount.toFixed(2)} OKB` : 'FREE'}
                    </div>
                    <div style={{ fontSize: '14px' }}>+ Gas Fee</div>
                  </div>
                </div>
              </DataCard>

              {/* Important Notice */}
              <DataCard style={{ marginBottom: '12px' }}>
                <CardTitle style={{ fontSize: '20px' }}>Important Notice</CardTitle>
                <div style={{ fontSize: '16px', lineHeight: '1.4' }}>
                  <p style={{ fontSize: '16px', margin: '4px 0' }}>• Access Pass is completely free, only gas fees apply</p>
                  <p style={{ fontSize: '16px', margin: '4px 0' }}>• Dev Support is optional and doesn't affect Sleep Protocol functions</p>
                  <p style={{ fontSize: '16px', margin: '4px 0' }}>• Your design will be permanently stored on the blockchain</p>
                  <p style={{ fontSize: '16px', margin: '4px 0' }}>• 解释权完全归项目方所有</p>
                </div>
              </DataCard>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Win98Button
                  onClick={() => setShowAccessPassMintModal(false)}
                  style={{ fontSize: '16px', padding: '6px 12px' }}
                >
                  Cancel
                </Win98Button>
                <Win98Button
                  onClick={() => {
                    toast.success('Access Pass mint functionality will be implemented with smart contracts!');
                    setShowAccessPassMintModal(false);
                  }}
                  style={{ 
                    fontSize: '16px', 
                    padding: '6px 12px',
                    background: '#000080', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  Mint Access Pass
                </Win98Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Wallet Connection Modal */}
      <WalletModal />
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        :global(.blinking-dot) {
          animation: blink 1s infinite;
        }
      `}</style>
    </AppContainer>
  );
};

export default SleepProtocolDesktop;
