import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'next-i18next';
import styled from '@emotion/styled';

import { AccessPassDesign, ElementTransforms, ElementTransform } from './types';
import { ensureArray, calculateContributionPercent, formatAmountForSvg } from './utils';
import { DataCard, CardTitle, Win98Button, Win98Input, Win98Label } from './index';
import { useMintAccessPass } from '~/hooks/useContractWrite';

// 缩放手柄组件
const ResizeHandle = ({ elementId, x, y }: { elementId: string; x: number; y: number }) => (
  <circle
    cx={x}
    cy={y}
    r="4"
    fill="#0000ff"
    stroke="#ffffff"
    strokeWidth="1"
    style={{ cursor: 'nw-resize' }}
    onMouseDown={(e) => {
      e.stopPropagation();
      // 这里应该调用 onResizeStart，但我们在父组件中处理
    }}
  />
);

// 生成头像SVG
const generateAvatar = (design: AccessPassDesign): string => {
  const faces = [
    `<circle cx="25" cy="25" r="20" fill="${design.avatarSkinColor}" stroke="#333" stroke-width="1"/>`,
    `<ellipse cx="25" cy="25" rx="18" ry="22" fill="${design.avatarSkinColor}" stroke="#333" stroke-width="1"/>`,
    `<rect x="7" y="7" width="36" height="36" rx="8" fill="${design.avatarSkinColor}" stroke="#333" stroke-width="1"/>`,
    `<polygon points="25,5 40,20 35,40 15,40 10,20" fill="${design.avatarSkinColor}" stroke="#333" stroke-width="1"/>`
  ];

  const eyes = [
    `<circle cx="20" cy="20" r="2" fill="#000"/><circle cx="30" cy="20" r="2" fill="#000"/>`,
    `<ellipse cx="20" cy="20" rx="3" ry="2" fill="#000"/><ellipse cx="30" cy="20" rx="3" ry="2" fill="#000"/>`,
    `<rect x="18" y="18" width="4" height="4" fill="#000"/><rect x="28" y="18" width="4" height="4" fill="#000"/>`,
    `<circle cx="20" cy="20" r="3" fill="#00f"/><circle cx="30" cy="20" r="3" fill="#00f"/>`,
    `<path d="M18,20 Q20,18 22,20 Q20,22 18,20" fill="#000"/><path d="M28,20 Q30,18 32,20 Q30,22 28,20" fill="#000"/>`,
    `<line x1="18" y1="20" x2="22" y2="20" stroke="#000" stroke-width="2"/><line x1="28" y1="20" x2="32" y2="20" stroke="#000" stroke-width="2"/>`,
    `<text x="20" y="22" text-anchor="middle" font-size="8" fill="#000">^</text><text x="30" y="22" text-anchor="middle" font-size="8" fill="#000">^</text>`
  ];

  const mouths = [
    `<ellipse cx="25" cy="32" rx="4" ry="2" fill="#000"/>`,
    `<path d="M21,32 Q25,35 29,32" stroke="#000" stroke-width="2" fill="none"/>`,
    `<path d="M21,32 Q25,29 29,32" stroke="#000" stroke-width="2" fill="none"/>`,
    `<rect x="23" y="31" width="4" height="2" fill="#000"/>`,
    `<circle cx="25" cy="32" r="2" fill="#f00"/>`,
    `<path d="M22,32 L28,32" stroke="#000" stroke-width="2"/>`
  ];

  const hairs = [
    `<path d="M10,15 Q25,5 40,15" stroke="#8B4513" stroke-width="3" fill="none"/>`,
    `<ellipse cx="25" cy="12" rx="18" ry="8" fill="#8B4513"/>`,
    `<rect x="10" y="8" width="30" height="12" fill="#8B4513"/>`,
    `<path d="M12,10 Q15,5 18,10 Q21,5 24,10 Q27,5 30,10 Q33,5 36,10 Q39,5 42,10" stroke="#8B4513" stroke-width="2" fill="none"/>`,
    `<circle cx="25" cy="10" r="15" fill="#8B4513"/>`
  ];

  const accessories = [
    ``, // None
    `<rect x="15" y="18" width="20" height="6" rx="3" fill="#000" opacity="0.8"/>`, // Sunglasses
    `<ellipse cx="25" cy="8" rx="12" ry="4" fill="#f00"/>`, // Hat
    `<path d="M20,15 Q25,10 30,15" stroke="#ffd700" stroke-width="2" fill="none"/>`, // Crown
    `<circle cx="22" cy="25" r="1" fill="#ffd700"/><circle cx="28" cy="25" r="1" fill="#ffd700"/>` // Earrings
  ];

  return `
    ${faces[design.avatarFaceType] || faces[0]}
    ${hairs[design.avatarHairType] || hairs[0]}
    ${eyes[design.avatarEyeType] || eyes[0]}
    ${mouths[design.avatarMouthType] || mouths[0]}
    ${accessories[design.avatarAccessory] || accessories[0]}
  `;
};

// 生成图案SVG
const generatePattern = (design: AccessPassDesign): string => {
  const opacity = design.patternOpacity / 100;
  
  switch (design.patternType) {
    case 1: // Stars
      return `<g opacity="${opacity}">
        ${Array.from({ length: 20 }, (_, i) => {
          const x = (i * 37) % 400;
          const y = (i * 23) % 250;
          return `<text x="${x}" y="${y}" font-size="12" fill="${design.patternColor}">★</text>`;
        }).join('')}
      </g>`;
    case 2: // Dots
      return `<g opacity="${opacity}">
        ${Array.from({ length: 50 }, (_, i) => {
          const x = (i * 29) % 400;
          const y = (i * 17) % 250;
          return `<circle cx="${x}" cy="${y}" r="2" fill="${design.patternColor}"/>`;
        }).join('')}
      </g>`;
    case 3: // Grid
      return `<g opacity="${opacity}">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${design.patternColor}" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="400" height="250" fill="url(#grid)"/>
      </g>`;
    case 4: // Waves
      return `<g opacity="${opacity}">
        ${Array.from({ length: 8 }, (_, i) => {
          const y = i * 30;
          return `<path d="M0,${y} Q100,${y-10} 200,${y} T400,${y}" stroke="${design.patternColor}" stroke-width="2" fill="none"/>`;
        }).join('')}
      </g>`;
    default:
      return '';
  }
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
  
  // 国旗映射
  const countryFlags = {
    AU: "/images/Countries/AU.png", BR: "/images/Countries/BR.png", CA: "/images/Countries/CA.png",
    CN: "/images/Countries/CN.png", FR: "/images/Countries/FR.png", DE: "/images/Countries/DE.png",
    IN: "/images/Countries/IN.png", IT: "/images/Countries/IT.png", JP: "/images/Countries/JP.png",
    MX: "/images/Countries/MX.png", NL: "/images/Countries/NL.png", NO: "/images/Countries/NO.png",
    RU: "/images/Countries/RU.png", SG: "/images/Countries/SG.png", KR: "/images/Countries/KR.png",
    ES: "/images/Countries/ES.png", SE: "/images/Countries/SE.png", CH: "/images/Countries/CH.png",
    UK: "/images/Countries/UK.png", US: "/images/Countries/US.png"
  };

  return (
    <svg width="400" height="250" viewBox="0 0 400 250" style={{ border: '2px solid #ccc' }}>
      <defs>
        <linearGradient 
          id="win98Background" 
          x1={gradientDirections[design.bgGradientDirection].x1}
          y1={gradientDirections[design.bgGradientDirection].y1}
          x2={gradientDirections[design.bgGradientDirection].x2}
          y2={gradientDirections[design.bgGradientDirection].y2}
        >
          <stop offset="0%" stopColor={design.bgColor1} />
          <stop offset="100%" stopColor={design.bgColor2} />
        </linearGradient>
        
        
        <style>{`
          .draggable-element {
            cursor: ${cardHovered ? 'move' : 'pointer'};
          }
          .draggable-element:hover {
            opacity: 0.9;
          }
          .card-title { font: bold 12px 'MS Sans Serif'; fill: #000080; }
          .card-subtitle { font: normal 10px 'MS Sans Serif'; fill: #000080; }
          .card-holder { font: bold 8px 'MS Sans Serif'; fill: #000080; }
          .card-address { font: normal 7px 'MS Sans Serif'; fill: #000080; }
          .card-label { font: normal 7px 'MS Sans Serif'; fill: #000080; }
          .card-value { font: bold 8px 'MS Sans Serif'; fill: #000080; }
        `}
        </style>
      </defs>
      
      {/* 银行卡背景 */}
      <rect width="400" height="250" rx="12" fill="url(#win98Background)" stroke="#404040" strokeWidth="2" />
      <rect x="3" y="3" width="394" height="244" rx="9" fill="none" stroke="#ffffff" strokeWidth="1" />
      <rect x="2" y="2" width="396" height="246" rx="10" fill="none" stroke="#e0e0e0" strokeWidth="1" />
      <rect x="0" y="25" width="400" height="12" fill="#000000" />
      <rect x="2" y="27" width="396" height="8" fill="#333333" />

      {/* 图案层 */}
      <g dangerouslySetInnerHTML={{ __html: generatePattern(design) }} />

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
        <text x="0" y="15" className="card-holder">NFT WALLET</text>
        <text x="0" y="30" className="card-address">{userAddress.substring(0, 8)}...{userAddress.substring(userAddress.length - 6)}</text>
        <text x="0" y="42" className="card-label" style={{ fontSize: '6px', fill: '#666' }}>ERC-6551 Token Bound Account</text>
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
          width="140" 
          height="25" 
          fill={selectedElement === 'accountBalance' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'accountBalance' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'accountBalance' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <text x="0" y="15" className="card-label">NFT OWNED ASSETS</text>
        <text x="0" y="25" className="card-value">{formatAmountForSvg(stakedSleep, 18)} SLEEPING</text>
      </g>
      {selectedElement === 'accountBalance' && (
        <ResizeHandle elementId="accountBalance" x={transforms.accountBalance.x + 135 * transforms.accountBalance.scale} y={transforms.accountBalance.y + 5 * transforms.accountBalance.scale} />
      )}

      {/* 可领取信息 - 可拖拽 */}
      <g 
        className="draggable-element"
        onMouseDown={(e) => onElementMouseDown('claimableInfo', e)}
        onDoubleClick={(e) => onElementDoubleClick('claimableInfo', e)}
        transform={`translate(${transforms.claimableInfo.x}, ${transforms.claimableInfo.y}) scale(${transforms.claimableInfo.scale})`}
      >
        <rect 
          x="-5" 
          y="-5" 
          width="140" 
          height="35" 
          fill={selectedElement === 'claimableInfo' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'claimableInfo' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'claimableInfo' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <text x="0" y="5" className="card-label">{t ? t('sleepProtocol.nft.labels.claimableOkb') : 'CLAIMABLE OKB'}: {formatAmountForSvg(claimableOkb, 18)}</text>
        <text x="0" y="18" className="card-label">{t ? t('sleepProtocol.nft.labels.claimableSleep') : 'CLAIMABLE SLEEP'}: {formatAmountForSvg(claimableSleep, 18)}</text>
      </g>
      {selectedElement === 'claimableInfo' && (
        <ResizeHandle elementId="claimableInfo" x={transforms.claimableInfo.x + 135 * transforms.claimableInfo.scale} y={transforms.claimableInfo.y - 5 * transforms.claimableInfo.scale} />
      )}

      {/* Dev Support - 可拖拽 */}
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
              width="100" 
              height="25" 
              fill={selectedElement === 'devSupport' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
              stroke={selectedElement === 'devSupport' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
              strokeWidth={selectedElement === 'devSupport' ? "2" : "1"} 
              strokeDasharray="2,2" 
            />
            <text x="0" y="5" className="card-label">{t ? t('sleepProtocol.nft.labels.devSupportTier') : 'DEV SUPPORT'}</text>
            <text x="0" y="18" className="card-value">{formatAmountForSvg(devSupportAmount, 18)} OKB</text>
          </g>
          {selectedElement === 'devSupport' && (
            <ResizeHandle elementId="devSupport" x={transforms.devSupport.x + 95 * transforms.devSupport.scale} y={transforms.devSupport.y - 5 * transforms.devSupport.scale} />
          )}
        </>
      )}

      {/* 徽章 - 可拖拽 */}
      {selectedBadge && (
        <>
          <g 
            className="draggable-element"
            onMouseDown={(e) => onElementMouseDown('badge', e)}
            onDoubleClick={(e) => onElementDoubleClick('badge', e)}
            transform={`translate(${transforms.badge.x}, ${transforms.badge.y}) scale(${transforms.badge.scale})`}
          >
            <rect 
              x="-5" 
              y="-5" 
              width="30" 
              height="30" 
              fill={selectedElement === 'badge' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
              stroke={selectedElement === 'badge' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
              strokeWidth={selectedElement === 'badge' ? "2" : "1"} 
              strokeDasharray="2,2" 
            />
            <text x="10" y="15" fontSize="16" textAnchor="middle">{selectedBadge}</text>
          </g>
          {selectedElement === 'badge' && (
            <ResizeHandle elementId="badge" x={transforms.badge.x + 25 * transforms.badge.scale} y={transforms.badge.y - 5 * transforms.badge.scale} />
          )}
        </>
      )}

      {/* 国旗 - 可拖拽 */}
      {design.showCountryFlag && (
        <>
          <g 
            className="draggable-element"
            onMouseDown={(e) => onElementMouseDown('countryFlag', e)}
            onDoubleClick={(e) => onElementDoubleClick('countryFlag', e)}
            transform={`translate(${transforms.countryFlag.x}, ${transforms.countryFlag.y}) scale(${transforms.countryFlag.scale})`}
          >
            <rect 
              x="-2" 
              y="-2" 
              width="34" 
              height="26" 
              fill={selectedElement === 'countryFlag' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
              stroke={selectedElement === 'countryFlag' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
              strokeWidth={selectedElement === 'countryFlag' ? "2" : "1"} 
              strokeDasharray="2,2" 
            />
            <rect x="0" y="0" width="30" height="22" fill="#ffffff" stroke="#000000" strokeWidth="1" />
            <text x="15" y="14" fontSize="10" textAnchor="middle" fill="#000">{design.countryCode}</text>
          </g>
          {selectedElement === 'countryFlag' && (
            <ResizeHandle elementId="countryFlag" x={transforms.countryFlag.x + 30 * transforms.countryFlag.scale} y={transforms.countryFlag.y} />
          )}
        </>
      )}

      {/* 底部验证条文字 - 可拖拽 */}
      <g 
        className="draggable-element"
        onMouseDown={(e) => onElementMouseDown('bottomText', e)}
        onDoubleClick={(e) => onElementDoubleClick('bottomText', e)}
        transform={`translate(${transforms.bottomText.x}, ${transforms.bottomText.y}) scale(${transforms.bottomText.scale})`}
      >
        <rect 
          x="-5" 
          y="-5" 
          width="200" 
          height="15" 
          fill={selectedElement === 'bottomText' ? "rgba(0,0,255,0.1)" : "rgba(255,255,255,0.1)"} 
          stroke={selectedElement === 'bottomText' ? "rgba(0,0,255,0.8)" : "rgba(255,0,0,0.3)"} 
          strokeWidth={selectedElement === 'bottomText' ? "2" : "1"} 
          strokeDasharray="2,2" 
        />
        <text x="0" y="5" className="card-label">ERC-6551 TOKEN BOUND ACCOUNT | SELF-CUSTODY NFT</text>
      </g>
      {selectedElement === 'bottomText' && (
        <ResizeHandle elementId="bottomText" x={transforms.bottomText.x + 195 * transforms.bottomText.scale} y={transforms.bottomText.y - 5 * transforms.bottomText.scale} />
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

// 生成用于铸造的最终SVG字符串
const generateMintableSvgString = (
  design: AccessPassDesign,
  userAddress: string,
  transforms: ElementTransforms
): string => {
  const gradientDirections = [
    { x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
    { x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
    { x1: "0%", y1: "0%", x2: "100%", y2: "100%" }
  ];

  const badges = ["", "🚀", "💎", "🌙", "⚡️"];
  const selectedBadge = badges[design.badgeType] || "";

  // 复用大部分SVG结构，但用占位符替换动态数据
  const finalSvg = `
    <svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient 
          id="win98Background" 
          x1="${gradientDirections[design.bgGradientDirection].x1}"
          y1="${gradientDirections[design.bgGradientDirection].y1}"
          x2="${gradientDirections[design.bgGradientDirection].x2}"
          y2="${gradientDirections[design.bgGradientDirection].y2}"
        >
          <stop offset="0%" stop-color="${design.bgColor1}" />
          <stop offset="100%" stop-color="${design.bgColor2}" />
        </linearGradient>
        <style>
          .card-title { font: bold 12px 'MS Sans Serif'; fill: ${design.textColor}; }
          .card-subtitle { font: normal 10px 'MS Sans Serif'; fill: ${design.textColor}; }
          .card-holder { font: bold 8px 'MS Sans Serif'; fill: ${design.textColor}; }
          .card-address { font: normal 7px 'MS Sans Serif'; fill: ${design.textColor}; }
          .card-label { font: normal 7px 'MS Sans Serif'; fill: ${design.textColor}; }
          .card-value { font: bold 8px 'MS Sans Serif'; fill: ${design.textColor}; }
        </style>
      </defs>
      
      <rect width="400" height="250" rx="12" fill="url(#win98Background)" stroke="#404040" stroke-width="2" />
      <rect x="3" y="3" width="394" height="244" rx="9" fill="none" stroke="#ffffff" stroke-width="1" />
      <rect x="2" y="2" width="396" height="246" rx="10" fill="none" stroke="#e0e0e0" stroke-width="1" />
      <rect x="0" y="25" width="400" height="12" fill="#000000" />
      <rect x="2" y="27" width="396" height="8" fill="#333333" />
      
      ${generatePattern(design)}
      
      <g transform="translate(${transforms.logo.x}, ${transforms.logo.y}) scale(${transforms.logo.scale})">
        <text x="0" y="20" class="card-title">SLEEP PROTOCOL</text>
        <text x="0" y="35" class="card-subtitle">ACCESS PASS</text>
      </g>
      
      <g transform="translate(${transforms.chip.x}, ${transforms.chip.y}) scale(${transforms.chip.scale})">
        <rect x="0" y="0" width="32" height="24" rx="4" fill="#ffd700" stroke="#b8860b" stroke-width="1" />
        <rect x="2" y="2" width="28" height="20" rx="2" fill="#ffc107" />
      </g>
      
      <g transform="translate(${transforms.avatar.x}, ${transforms.avatar.y}) scale(${transforms.avatar.scale})">
        ${generateAvatar(design)}
      </g>
      
      <g transform="translate(${transforms.cardholderInfo.x}, ${transforms.cardholderInfo.y}) scale(${transforms.cardholderInfo.scale})">
        <text x="0" y="15" class="card-holder">NFT WALLET</text>
        <text x="0" y="30" class="card-address">${userAddress.substring(0, 8)}...${userAddress.substring(userAddress.length - 6)}</text>
        <text x="0" y="42" class="card-label" style="font-size: 6px; fill: #666">ERC-6551 Token Bound Account</text>
      </g>

      <g transform="translate(${transforms.accountBalance.x}, ${transforms.accountBalance.y}) scale(${transforms.accountBalance.scale})">
        <text x="0" y="15" class="card-label">NFT OWNED ASSETS</text>
        <text x="0" y="25" class="card-value"><!--SLEEP_REWARD--> SLEEPING</text>
      </g>
      
      <g transform="translate(${transforms.claimableInfo.x}, ${transforms.claimableInfo.y}) scale(${transforms.claimableInfo.scale})">
        <text x="0" y="5" class="card-label">CLAIMABLE OKB: <!--OKB_REWARD--></text>
        <text x="0" y="18" class="card-label">CLAIMABLE SLEEP: <!--SLEEP_REWARD--></text>
      </g>
      
      <g transform="translate(${transforms.devSupport.x}, ${transforms.devSupport.y}) scale(${transforms.devSupport.scale})">
        <text x="0" y="5" class="card-label">DEV SUPPORT</text>
        <text x="0" y="18" class="card-value"><!--DEV_SUPPORT_USER--> OKB</text>
      </g>
      
      ${selectedBadge ? `
        <g transform="translate(${transforms.badge.x}, ${transforms.badge.y}) scale(${transforms.badge.scale})">
          <text x="10" y="15" font-size="16" text-anchor="middle">${selectedBadge}</text>
        </g>
      ` : ''}
      
      ${design.showCountryFlag ? `
        <g transform="translate(${transforms.countryFlag.x}, ${transforms.countryFlag.y}) scale(${transforms.countryFlag.scale})">
          <rect x="0" y="0" width="30" height="22" fill="#ffffff" stroke="#000000" stroke-width="1" />
          <text x="15" y="14" font-size="10" text-anchor="middle" fill="#000">${design.countryCode}</text>
        </g>
      ` : ''}

      <g transform="translate(${transforms.bottomText.x}, ${transforms.bottomText.y}) scale(${transforms.bottomText.scale})">
        <text x="0" y="5" class="card-label">ERC-6551 TOKEN BOUND ACCOUNT | SELF-CUSTODY NFT</text>
      </g>

      <g transform="translate(${transforms.devSupportInfo.x}, ${transforms.devSupportInfo.y}) scale(${transforms.devSupportInfo.scale})">
        <text x="0" y="5" class="card-label">DEV SUPPORT CONTRIBUTION: <!--DEV_SUPPORT_USER--> OKB</text>
        <text x="0" y="18" class="card-value">TOTAL POOL: <!--DEV_SUPPORT_TOTAL--> OKB</text>
      </g>
    </svg>
  `;
  // 移除多余的换行符和空格
  return finalSvg.replace(/\s+/g, ' ').trim();
};

interface AccessPassProps {
  isConnected: boolean;
  address?: string;
  onMintAccessPass?: (design: AccessPassDesign, devSupportAmount: number) => Promise<void>;
}

export const AccessPass: React.FC<AccessPassProps> = ({
  isConnected,
  address,
  onMintAccessPass
}) => {
  const { t } = useTranslation('common');
  
  // 使用真实的合约交互 Hook
  const { mintAccessPass, status, error, reset } = useMintAccessPass();

  // 监听交易状态，成功或失败后自动关闭模态框
  useEffect(() => {
    if (status === 'success') {
      // 成功后延迟关闭模态框，让用户看到成功状态
      const timer = setTimeout(() => {
        setShowAccessPassMintModal(false);
        reset(); // 重置交易状态
      }, 3000); // 3秒后关闭
      
      return () => clearTimeout(timer);
    } else if (status === 'error') {
      // 错误后延迟关闭模态框，让用户看到错误状态
      const timer = setTimeout(() => {
        setShowAccessPassMintModal(false);
        reset(); // 重置交易状态
      }, 5000); // 5秒后关闭，给用户更多时间看到错误信息
      
      return () => clearTimeout(timer);
    }
  }, [status, reset]);
  
  // 设计状态
  const [design, setDesign] = useState<AccessPassDesign>({
    bgColor1: '#4ECDC4',
    bgColor2: '#45B7D1',
    bgGradientDirection: 0,
    patternType: 1,
    patternColor: '#FFFFFF',
    patternOpacity: 20,
    avatarFaceType: 0,
    avatarEyeType: 0,
    avatarMouthType: 0,
    avatarHairType: 0,
    avatarSkinColor: '#FFDBAC',
    avatarAccessory: 0,
    fontChoice: 0,
    textColor: '#000000',
    badgeType: 1,
    countryCode: 'US',
    showCountryFlag: true
  });

  // 预览数据
  const [previewDevSupportAmount, setPreviewDevSupportAmount] = useState(0);
  const [previewStakedSleep, setPreviewStakedSleep] = useState(1000);
  const [previewClaimableOkb] = useState(50);
  const [previewClaimableSleep] = useState(100);
  const [previewTotalSupport, setPreviewTotalSupport] = useState(1000);

  // 模态框状态
  const [showAccessPassMintModal, setShowAccessPassMintModal] = useState(false);

  // 拖拽和缩放状态
  const [elementTransforms, setElementTransforms] = useState<ElementTransforms>({
    avatar: { x: 320, y: 50, scale: 1.0 },
    logo: { x: 25, y: 45, scale: 1.0 },
    chip: { x: 25, y: 85, scale: 1.0 },
    cardholderInfo: { x: 25, y: 120, scale: 1.0 },
    accountBalance: { x: 25, y: 160, scale: 1.0 },
    claimableInfo: { x: 200, y: 120, scale: 1.0 },
    devSupport: { x: 200, y: 160, scale: 1.0 },
    devSupportInfo: { x: 25, y: 190, scale: 1.0 },
    badge: { x: 350, y: 120, scale: 1.0 },
    bottomText: { x: 25, y: 220, scale: 1.0 },
    countryFlag: { x: 350, y: 160, scale: 1.0 }
  });

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<ElementTransform>({ x: 0, y: 0, scale: 1.0 });
  const [cardHovered, setCardHovered] = useState<boolean>(false);

  // 皮肤颜色选项
  const skinColorOptions = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFB3BA', '#BAFFC9', '#BAE1FF'];

  // 拖拽处理函数
  const handleMouseDown = (elementId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedElement(elementId);
    setIsDragging(elementId);
    
    // 获取 SVG 容器的位置信息
    const svgElement = event.currentTarget.closest('svg');
    if (!svgElement) return;
    
    const svgRect = svgElement.getBoundingClientRect();
    const currentTransform = elementTransforms[elementId as keyof ElementTransforms];
    
    // 计算鼠标相对于 SVG 的位置
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;
    
    // 设置拖动偏移量，使元素中心跟随鼠标
    setDragOffset({
      x: mouseX - currentTransform.x,
      y: mouseY - currentTransform.y,
      scale: currentTransform.scale
    });
  };

  const handleElementDoubleClick = (elementId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedElement(elementId === selectedElement ? null : elementId);
  };

  const handleResizeStart = (elementId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedElement(elementId);
    setIsResizing(elementId);
    
    const currentTransform = elementTransforms[elementId as keyof ElementTransforms];
    setDragOffset({
      x: event.clientX,
      y: event.clientY,
      scale: currentTransform.scale
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging) {
      // 获取 SVG 容器的位置信息
      const svgElement = event.currentTarget.querySelector('svg');
      if (!svgElement) return;
      
      const svgRect = svgElement.getBoundingClientRect();
      
      // 计算鼠标相对于 SVG 的位置
      const mouseX = event.clientX - svgRect.left;
      const mouseY = event.clientY - svgRect.top;
      
      // 计算新的元素位置，减去拖动偏移量
      const newX = Math.max(0, Math.min(380, mouseX - dragOffset.x));
      const newY = Math.max(0, Math.min(245, mouseY - dragOffset.y));
      
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
      cardholderInfo: { x: 25, y: 120, scale: 1.0 },
      accountBalance: { x: 25, y: 160, scale: 1.0 },
      claimableInfo: { x: 200, y: 120, scale: 1.0 },
      devSupport: { x: 200, y: 160, scale: 1.0 },
      devSupportInfo: { x: 25, y: 190, scale: 1.0 },
      badge: { x: 350, y: 120, scale: 1.0 },
      bottomText: { x: 25, y: 220, scale: 1.0 },
      countryFlag: { x: 350, y: 160, scale: 1.0 }
    });
    setSelectedElement(null);
  };

  return (
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
                className="access-pass-preview-container"
                style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  border: '1px inset #c0c0c0', 
                  background: '#f8f8f8', 
                  margin: '4px 0',
                  userSelect: 'none',
                  position: 'relative',
                  overflow: 'hidden'
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
                  disabled={status !== 'idle'}
                  style={{ 
                    fontSize: '16px', 
                    padding: '8px 16px', 
                    background: status !== 'idle' ? '#666' : '#000080', 
                    color: 'white',
                    opacity: status !== 'idle' ? 0.6 : 1,
                    cursor: status !== 'idle' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {status === 'preparing' && 'PREPARING...'}
                  {status === 'pending' && 'CONFIRM IN WALLET...'}
                  {status === 'confirming' && 'MINTING...'}
                  {status === 'success' && 'SUCCESS!'}
                  {status === 'error' && 'ERROR - TRY AGAIN'}
                  {status === 'idle' && t('sleepProtocol.accessPass.buttons.mint')}
                </Win98Button>
              </div>

              {/* 主界面交易状态提示 */}
              {status !== 'idle' && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: status === 'error' ? '#ff6b6b' : status === 'success' ? '#26A17B' : '#4169E1',
                  color: 'white',
                  borderRadius: '4px',
                  textAlign: 'center',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    {status === 'preparing' && (
                      <>
                        <div className="spinning-loader"></div>
                        准备铸造 Access Pass...
                      </>
                    )}
                    {status === 'pending' && (
                      <>
                        <div style={{ fontSize: '24px' }}>💳</div>
                        请在钱包中确认交易
                      </>
                    )}
                    {status === 'confirming' && (
                      <>
                        <div className="spinning-loader"></div>
                        正在铸造 Access Pass，请稍候...
                      </>
                    )}
                    {status === 'success' && (
                      <>
                        <div style={{ fontSize: '24px' }}>🎉</div>
                        Access Pass 铸造成功！
                      </>
                    )}
                    {status === 'error' && (
                      <>
                        <div style={{ fontSize: '24px' }}>❌</div>
                        铸造失败，请重试
                      </>
                    )}
                  </div>
                  
                  {/* 进度条效果 */}
                  {(status === 'preparing' || status === 'confirming') && (
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      marginTop: '8px'
                    }}>
                      <div className="progress-bar"></div>
                    </div>
                  )}
                </div>
              )}
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

      {/* Access Pass Mint Modal - 完整版本 */}
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
              <div 
                className="access-pass-preview-container"
                style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  border: '1px inset #c0c0c0', 
                  background: '#f8f8f8',
                  margin: '4px 0',
                  userSelect: 'none',
                  position: 'relative',
                  overflow: 'hidden'
                }}
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
                      null, // selectedElement
                      () => {}, // handleMouseDown - disabled in modal
                      () => {}, // handleElementDoubleClick - disabled in modal
                      () => {}, // handleResizeStart - disabled in modal
                      false, // cardHovered
                      t
                    )}
                  </div>
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
                      checked={previewDevSupportAmount === 0}
                      onChange={() => setPreviewDevSupportAmount(0)}
                    />
                    <span style={{ fontSize: '16px' }}>No Support - Standard Access Pass</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0' }}>
                    <input
                      type="radio"
                      name="devSupport"
                      checked={previewDevSupportAmount > 0 && previewDevSupportAmount < 0.4}
                      onChange={() => setPreviewDevSupportAmount(0.2)}
                    />
                    <span style={{ fontSize: '16px' }}><strong>Gold Tier (0.1-0.3 OKB)</strong> - Golden halo</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0' }}>
                    <input
                      type="radio"
                      name="devSupport"
                      checked={previewDevSupportAmount >= 0.4 && previewDevSupportAmount < 0.7}
                      onChange={() => setPreviewDevSupportAmount(0.5)}
                    />
                    <span style={{ fontSize: '16px' }}><strong>Platinum Tier (0.4-0.6 OKB)</strong> - Silver halo</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0' }}>
                    <input
                      type="radio"
                      name="devSupport"
                      checked={previewDevSupportAmount >= 0.7}
                      onChange={() => setPreviewDevSupportAmount(0.8)}
                    />
                    <span style={{ fontSize: '16px' }}>💎 <strong>Diamond Tier (0.7-1.0 OKB)</strong> - Rainbow halo</span>
                  </div>

                  {previewDevSupportAmount > 0 && (
                    <div style={{ 
                      margin: '8px 0', 
                      padding: '8px', 
                      background: '#f0f0f0', 
                      border: '1px inset #c0c0c0' 
                    }}>
                      <Win98Label style={{ fontSize: '16px' }}>Exact Amount: {previewDevSupportAmount.toFixed(2)} OKB</Win98Label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={previewDevSupportAmount}
                        onChange={(e) => setPreviewDevSupportAmount(parseFloat(e.target.value))}
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
                      {previewDevSupportAmount > 0 ? `+${previewDevSupportAmount.toFixed(2)} OKB` : 'OFF'}
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      {previewDevSupportAmount >= 0.7 ? 'Diamond' : 
                       previewDevSupportAmount >= 0.4 ? 'Platinum' :
                       previewDevSupportAmount > 0 ? 'Gold' : 'None'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', border: '1px inset #c0c0c0' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Total Cost</div>
                    <div style={{ color: 'red', fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>
                      {previewDevSupportAmount > 0 ? `${previewDevSupportAmount.toFixed(2)} OKB` : 'FREE'}
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

            {/* 交易状态提示 */}
            {status !== 'idle' && (
              <DataCard style={{
                marginBottom: '12px',
                background: status === 'error' ? '#ff6b6b' : status === 'success' ? '#26A17B' : '#4169E1',
                color: 'white',
                textAlign: 'center',
                border: '2px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '8px'
                }}>
                  {status === 'preparing' && (
                    <>
                      <div className="spinning-loader"></div>
                      准备铸造 Access Pass...
                    </>
                  )}
                  {status === 'pending' && (
                    <>
                      <div style={{ fontSize: '24px' }}>💳</div>
                      请在钱包中确认交易
                    </>
                  )}
                  {status === 'confirming' && (
                    <>
                      <div className="spinning-loader"></div>
                      正在铸造 Access Pass，请稍候...
                    </>
                  )}
                  {status === 'success' && (
                    <>
                      <div style={{ fontSize: '24px' }}>🎉</div>
                      Access Pass 铸造成功！
                    </>
                  )}
                  {status === 'error' && (
                    <>
                      <div style={{ fontSize: '24px' }}>❌</div>
                      铸造失败，请重试
                    </>
                  )}
                </div>
                
                {/* 进度条效果 */}
                {(status === 'preparing' || status === 'confirming') && (
                  <div style={{
                    width: '100%',
                    height: '4px',
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginTop: '8px'
                  }}>
                    <div className="progress-bar"></div>
                  </div>
                )}
              </DataCard>
            )}

            {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Win98Button
                  onClick={() => {
                    setShowAccessPassMintModal(false);
                    reset(); // 关闭时重置状态
                  }}
                  disabled={status === 'pending' || status === 'confirming'}
                  style={{ 
                    fontSize: '16px', 
                    padding: '6px 12px',
                    opacity: (status === 'pending' || status === 'confirming') ? 0.5 : 1
                  }}
                >
                  {(status === 'pending' || status === 'confirming') ? 'Processing...' : 'Cancel'}
                </Win98Button>
                <Win98Button
                  onClick={() => {
                    try {
                      // 使用新的函数生成包含占位符的SVG字符串
                      const svgString = generateMintableSvgString(
                        design,
                        address ?? "0x...0",
                        elementTransforms
                      );
                      mintAccessPass(svgString);
                      console.log('AccessPass mint 请求已发送');
                    } catch (error) {
                      console.error('AccessPass mint error:', error);
                    }
                  }}
                  disabled={status !== 'idle'}
                  style={{ 
                    fontSize: '16px', 
                    padding: '6px 12px',
                    background: status !== 'idle' ? '#666' : '#000080', 
                    color: 'white',
                    fontWeight: 'bold',
                    opacity: status !== 'idle' ? 0.6 : 1,
                    cursor: status !== 'idle' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {status === 'preparing' && 'PREPARING...'}
                  {status === 'pending' && 'CONFIRM IN WALLET...'}
                  {status === 'confirming' && 'CONFIRMING...'}
                  {status === 'success' && 'SUCCESS!'}
                  {status === 'error' && 'ERROR - TRY AGAIN'}
                  {status === 'idle' && 'Mint Access Pass'}
                </Win98Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS 扫光动画 - 仅在网站中显示，NFT 本身是纯静态的 */}
      <style jsx>{`
        .access-pass-preview-container {
          position: relative;
        }

        .access-pass-preview-container svg {
          position: relative;
          overflow: hidden;
        }

        .access-pass-preview-container svg::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0) 30%,
            rgba(255, 255, 255, 0.8) 50%,
            rgba(255, 255, 255, 0) 70%
          );
          transform: skewX(-25deg);
          animation: shine 3s infinite;
          pointer-events: none;
          z-index: 10;
          border-radius: 12px;
        }

        @keyframes shine {
          0% {
            left: -100%;
          }
          50% {
            left: 100%;
          }
          100% {
            left: 100%;
          }
        }

        /* 悬停时触发扫光 */
        .access-pass-preview-container:hover svg::before {
          animation: shine 1s ease-in-out;
        }

        /* 为 SVG 添加扫光遮罩 */
        .access-pass-preview-container::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          height: 250px;
          border-radius: 12px;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0) 30%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(255, 255, 255, 0) 70%
          );
          transform: translate(-50%, -50%) skewX(-25deg) translateX(-100%);
          animation: cardShine 3s infinite;
          pointer-events: none;
          z-index: 10;
        }

        @keyframes cardShine {
          0% {
            transform: translate(-50%, -50%) skewX(-25deg) translateX(-150%);
          }
          50% {
            transform: translate(-50%, -50%) skewX(-25deg) translateX(150%);
          }
          100% {
            transform: translate(-50%, -50%) skewX(-25deg) translateX(150%);
          }
        }

        /* 悬停时触发扫光 */
        .access-pass-preview-container:hover::after {
          animation: cardShine 1s ease-in-out;
        }

        /* 交易状态动画 */
        .spinning-loader {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .progress-bar {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};