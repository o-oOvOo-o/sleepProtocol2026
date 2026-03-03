import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useAccount, useDisconnect, useConnect } from 'wagmi';

// 声明 window.ethereum 类型
declare global {
  interface Window {
    ethereum?: any;
  }
}
import { useSleepContext } from '~/contexts/SleepContext';
import styled from '@emotion/styled';
import { toast } from 'react-hot-toast';
import { Win98ButtonStyled } from '../../../styles/win98sm.styles';

// 导入子组件
import { Dashboard } from './Dashboard';
import { Mint } from './Mint';
import { Stake } from './Stake';
import { Market } from './Market';
import { Profile } from './Profile';
import { Liquidate } from './Liquidate';
import { Litepaper } from './Litepaper';
import { AccessPass } from './AccessPass';
import { Developer } from './Developer';

// 导入工具函数
import { safeFormatBalance } from './utils';
import { NetworkSwitcher } from '~/components/NetworkSwitcher';
import { useChainId, useSwitchChain } from 'wagmi';
import { getChainConfig, getChainLogo, getChainName, isChainSupported } from '~/lib/chainConfig';
import { xLayerTestnet, sepolia } from '~/lib/chains';

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
  color: ${props => props.active ? 'white' : 'black'};
  
  ${props => props.active && `
    background: #000080 !important;
    border: 2px inset #c0c0c0 !important;
  `}
  
  &:hover {
    ${props => props.active ? `
      background: #000080 !important;
    ` : `
      filter: brightness(1.05);
    `}
  }
`;

const NetworkMenuButton = styled(Win98ButtonStyled)`
  width: 48px;
  height: 48px;
  margin: 3px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  font-weight: bold;
  position: relative;
  
  &:hover {
    filter: brightness(1.05);
  }
`;

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownMenu = styled.div<{ visible: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: #c0c0c0;
  border: 2px outset #c0c0c0;
  min-width: 160px;
  max-height: 200px;
  overflow-y: auto;
  display: ${props => props.visible ? 'block' : 'none'};
  z-index: 1000;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 12px;
  
  /* Win98 风格滚动条 - 使用与按钮相同的背景图片 */
  &::-webkit-scrollbar {
    width: 17px;
    background:rgb(250, 242, 242);
  }
  
  &::-webkit-scrollbar-track {
    background: #808080;
    border-top: 2px solid #404040;
    border-left: 2px solid #404040;
    border-right: 2px solid #dfdfdf;
    border-bottom: 2px solid #dfdfdf;
    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.3);
  }
  
  &::-webkit-scrollbar-thumb {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      #c0c0c0;
    border: 1px solid black;
    min-height: 20px;
    
    &:hover {
      filter: brightness(1.05);
    }
    
    &:active {
      background:
        url('/win98/assets/win98sm/button/n.png') repeat-x top,
        url('/win98/assets/win98sm/button/n.png') repeat-x bottom,
        url('/win98/assets/win98sm/button/n.png') repeat-y left,
        url('/win98/assets/win98sm/button/n.png') repeat-y right, 
        #c0c0c0;
    }
  }
  
  &::-webkit-scrollbar-button {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      #c0c0c0;
    border: 1px solid black;
    height: 17px;
    width: 17px;
    
    &:hover {
      filter: brightness(1.05);
    }
    
    &:active {
      background:
        url('/win98/assets/win98sm/button/n.png') repeat-x top,
        url('/win98/assets/win98sm/button/n.png') repeat-x bottom,
        url('/win98/assets/win98sm/button/n.png') repeat-y left,
        url('/win98/assets/win98sm/button/n.png') repeat-y right, 
        #c0c0c0;
    }
  }
  
  /* 上箭头 */
  &::-webkit-scrollbar-button:vertical:start:decrement {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M4 1 L1 6 L7 6 Z" fill="black"/></svg>') center no-repeat,
      #c0c0c0;
    border: 1px solid black;
  }
  
  /* 下箭头 */
  &::-webkit-scrollbar-button:vertical:end:increment {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M4 7 L1 2 L7 2 Z" fill="black"/></svg>') center no-repeat,
      #c0c0c0;
    border: 1px solid black;
  }
  
  /* 角落 */
  &::-webkit-scrollbar-corner {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      #c0c0c0;
    border: 1px solid black;
  }
`;

const DropdownItem = styled.div<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  color: ${props => props.disabled ? '#808080' : 'black'};
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 12px;
  border: 1px solid transparent;
  
  &:hover {
    ${props => !props.disabled && `
      background: #316AC5;
      color: white;
      border: 1px solid #316AC5;
    `}
  }
  
  &:active {
    ${props => !props.disabled && `
      background: #1E4A8C;
      color: white;
      border: 1px inset #c0c0c0;
    `}
  }
`;

// 专门为 MenuBar 设计的 NetworkSwitcher
const MenuNetworkSwitcher = () => {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  
  const supportedChains = [sepolia, xLayerTestnet];
  const currentChainConfig = getChainConfig(chainId);
  const isSupported = isChainSupported(chainId);
  const currentChainName = getChainName(chainId);
  const currentChainLogo = getChainLogo(chainId);

  const handleSwitchChain = (targetChainId: number) => {
    try {
      switchChain({ chainId: targetChainId });
      setIsOpen(false);
    } catch (err) {
      console.error('切换网络时发生错误:', err);
    }
  };

  if (!chainId) {
    return (
      <NetworkMenuButton disabled>
        Connecting...
      </NetworkMenuButton>
    );
  }

  return (
    <DropdownContainer>
      <NetworkMenuButton
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        disabled={isPending}
      >
        <img 
          src={isSupported ? currentChainLogo : "/win98/assets/icons/network-bad.png"} 
          alt="Network" 
          style={{ width: '24px', height: '24px' }} 
        />
        {isPending ? '...' : (isSupported ? (currentChainConfig?.nativeToken?.symbol || 'NET') : '?')}
      </NetworkMenuButton>
      
      <DropdownMenu visible={isOpen && !isPending}>
        {supportedChains.map((chain) => {
          const chainLogo = getChainLogo(chain.id);
          return (
            <DropdownItem
              key={chain.id}
              disabled={!switchChain || chain.id === chainId || isPending}
              onClick={() => handleSwitchChain(chain.id)}
            >
              <img 
                src={chainLogo} 
                alt={chain.name} 
                style={{ width: '14px', height: '14px' }} 
              />
              {chain.name} {chain.id === chainId ? '✓' : ''}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </DropdownContainer>
  );
};

const MainContent = styled.div`
  flex: 1;
  background: white;
  border: 2px inset #c0c0c0;
  margin: 6px;
  padding: 16px;  /* 增大padding */
  overflow: auto;
  
  /* Win98 scrollbar styling - 使用与按钮相同的背景图片 */
  ::-webkit-scrollbar {
    width: 17px;
    height: 17px;
    background: #c0c0c0;
  }
  
  ::-webkit-scrollbar-track {
    background: #808080;
    border-top: 2px solid #404040;
    border-left: 2px solid #404040;
    border-right: 2px solid #dfdfdf;
    border-bottom: 2px solid #dfdfdf;
    box-shadow: inset 1px 1px 2px rgba(0,0,0,0.3);
  }
  
  ::-webkit-scrollbar-thumb {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      #c0c0c0;
    border: 1px solid black;
    min-height: 20px;
    min-width: 20px;
    
    &:hover {
      filter: brightness(1.05);
    }
    
    &:active {
      background:
        url('/win98/assets/win98sm/button/n.png') repeat-x top,
        url('/win98/assets/win98sm/button/n.png') repeat-x bottom,
        url('/win98/assets/win98sm/button/n.png') repeat-y left,
        url('/win98/assets/win98sm/button/n.png') repeat-y right, 
        #c0c0c0;
    }
  }
  
  ::-webkit-scrollbar-button {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      #c0c0c0;
    border: 1px solid black;
    height: 17px;
    width: 17px;
    
    &:hover {
      filter: brightness(1.05);
    }
    
    &:active {
      background:
        url('/win98/assets/win98sm/button/n.png') repeat-x top,
        url('/win98/assets/win98sm/button/n.png') repeat-x bottom,
        url('/win98/assets/win98sm/button/n.png') repeat-y left,
        url('/win98/assets/win98sm/button/n.png') repeat-y right, 
        #c0c0c0;
    }
  }
  
  /* 上箭头 */
  ::-webkit-scrollbar-button:vertical:start:decrement {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M4 1 L1 6 L7 6 Z" fill="black"/></svg>') center no-repeat,
      #c0c0c0;
    border: 1px solid black;
  }
  
  /* 下箭头 */
  ::-webkit-scrollbar-button:vertical:end:increment {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M4 7 L1 2 L7 2 Z" fill="black"/></svg>') center no-repeat,
      #c0c0c0;
    border: 1px solid black;
  }
  
  /* 左箭头 */
  ::-webkit-scrollbar-button:horizontal:start:decrement {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M1 4 L6 1 L6 7 Z" fill="black"/></svg>') center no-repeat,
      #c0c0c0;
    border: 1px solid black;
  }
  
  /* 右箭头 */
  ::-webkit-scrollbar-button:horizontal:end:increment {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path d="M7 4 L2 1 L2 7 Z" fill="black"/></svg>') center no-repeat,
      #c0c0c0;
    border: 1px solid black;
  }
  
  /* 角落 */
  ::-webkit-scrollbar-corner {
    background:
      url('/win98/assets/win98sm/button/topright.png') no-repeat right top,
      url('/win98/assets/win98sm/button/topleft.png') no-repeat left top,
      url('/win98/assets/win98sm/button/bottomright.png') no-repeat right bottom,
      url('/win98/assets/win98sm/button/bottomleft.png') no-repeat left bottom,
      url('/win98/assets/win98sm/button/right.png') repeat-y right,
      url('/win98/assets/win98sm/button/top.png') repeat-x top,
      url('/win98/assets/win98sm/button/left.png') repeat-y left,
      url('/win98/assets/win98sm/button/bottom.png') repeat-x bottom, 
      #c0c0c0;
    border: 1px solid black;
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

const LanguageSwitcher = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const LanguageButton = styled(Win98ButtonStyled)<{ active?: boolean }>`
  padding: 4px 10px;
  font-size: 14px;
  min-width: 45px;
  background: ${props => props.active ? '#000080' : undefined};
  color: ${props => props.active ? 'white' : 'black'};
  
  ${props => props.active && `
    border: 2px inset #c0c0c0 !important;
  `}
`;

const WalletSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WalletModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
`;

const WalletModalContent = styled.div`
  background:
    url('/win98/assets/win98sm/window/topleft.png') no-repeat top left,
    url('/win98/assets/win98sm/window/topright.png') no-repeat top right,
    url('/win98/assets/win98sm/window/bottomleft.png') no-repeat bottom left,
    url('/win98/assets/win98sm/window/bottomright.png') no-repeat bottom right,
    url('/win98/assets/win98sm/window/left.png') repeat-y left,
    url('/win98/assets/win98sm/window/right.png') repeat-y right,
    url('/win98/assets/win98sm/window/bottom.png') repeat-x bottom,
    url('/win98/assets/win98sm/window/top.png') repeat-x top, 
    #C0C0C0;
  padding: 3px;
  min-width: 350px;
  font-family: 'MS Sans Serif', sans-serif;
  font-size: 12px;
`;

const WalletModalHeader = styled.div`
  background: linear-gradient(to right, #00007B, #0884CE);
  color: white;
  height: 18px;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  cursor: default;
  user-select: none;
`;

const WalletModalIcon = styled.img`
  display: inline-block;
  width: 16px;
  height: 16px;
  margin: 1px 3px 1px 2px;
  padding: 0;
`;

const WalletModalTitle = styled.span`
  color: white;
  font-size: 11px;
  font-weight: bold;
  margin: 3px 0 0 2px;
  flex: 1;
`;

const WalletModalCloseButton = styled.button`
  width: 16px;
  height: 14px;
  margin: 2px 2px 0 0;
  padding: 0;
  border: none;
  background: url('/win98/assets/win98sm/window/close.png') no-repeat center;
  cursor: pointer;
  
  &:active {
    background: url('/win98/assets/win98sm/window/closep.png') no-repeat center;
  }
  
  &:hover {
    filter: brightness(1.1);
  }
`;

const WalletModalBody = styled.div`
  padding: 16px;
  background: #C0C0C0;
`;

const WalletModalButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
`;

const WalletButton = styled(Win98ButtonStyled)`
  padding: 6px 16px;
  font-size: 14px;
  min-width: 120px;
  
  ${props => props.disabled && `
    opacity: 0.6;
    cursor: not-allowed;
  `}
`;

export const Win98Button = styled(Win98ButtonStyled)<{ disabled?: boolean }>`
  padding: 8px 20px;
  font-size: 16px;
  opacity: ${props => props.disabled ? 0.6 : 1};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;

export const Win98Input = styled.input`
  border: 2px inset #c0c0c0;
  padding: 4px;
  font-size: 12px;
  background: white;
  color: black;
`;

export const Win98Label = styled.label`
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #000;
`;

export const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px dotted #808080;
`;

export const StatLabel = styled.span`
  font-size: 12px;
  color: #000;
`;

export const StatValue = styled.span`
  font-size: 12px;
  font-weight: bold;
  color: #000080;
`;

// 添加缺失的样式组件
export const DataCard = styled.div`
  background: #c0c0c0;
  border: 2px inset #c0c0c0;
  padding: 16px;  /* 增大padding */
  margin: 12px 0;  /* 增大margin */
`;

export const CardTitle = styled.h3`
  margin: 0 0 12px 0;
  color: #000080;
  font-size: 16px;
  font-weight: bold;
`;

interface SleepProtocolProps {
  onClose?: () => void;
}

export const SleepProtocol: React.FC<SleepProtocolProps> = ({ onClose }) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { 
    sleepBalance, 
    userStakeData,
    globalRank,
    genesisTs,
    maxTermDays,
    maxMintCount
  } = useSleepContext();

  // 计算派生值，添加安全检查
  const amplifier = globalRank > 0 ? Math.max(0.1, 1 - (globalRank - 1) * 0.0001) : 1.0;
  const maxTerm = genesisTs > 0 ? Math.floor(45 + (Date.now() / 1000 - genesisTs) / 86400 / 3) : 45;
  const timeDecay = genesisTs > 0 ? Math.max(0.1, 1 - (Date.now() / 1000 - genesisTs) / (365 * 24 * 3600 * 5)) : 1.0;

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWalletInfo, setShowWalletInfo] = useState(false);
  const [copyButtonState, setCopyButtonState] = useState<'default' | 'copied'>('default');
  
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  // 钱包功能函数
  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopyButtonState('copied');
        toast.success('地址已复制到剪贴板！');
        
        // 1.5秒后恢复按钮状态
        setTimeout(() => {
          setCopyButtonState('default');
        }, 1500);
      } catch (err) {
        toast.error('复制失败，请手动复制');
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowWalletInfo(false);
    setCopyButtonState('default'); // 重置复制按钮状态
    toast.success('钱包已断开连接');
  };

  const handleWalletClick = () => {
    if (isConnected) {
      setShowWalletInfo(true);
    } else {
      // 如果只有一个连接器，直接连接
      if (connectors.length === 1) {
        connect({ connector: connectors[0] });
      } else {
        // 如果有多个连接器，显示选择模态框
        setShowWalletModal(true);
      }
    }
  };

  const navigationItems = [
    { id: 'dashboard', labelKey: 'sleepProtocol.nav.dashboard' },
    { id: 'access-pass', labelKey: 'sleepProtocol.nav.accessPass' },
    { id: 'mint', labelKey: 'sleepProtocol.nav.mint' },
    { id: 'stake', labelKey: 'sleepProtocol.nav.stake' },
    { id: 'market', labelKey: 'sleepProtocol.nav.market' },
    { id: 'profile', labelKey: 'sleepProtocol.nav.profile' },
    { id: 'liquidate', labelKey: 'sleepProtocol.nav.liquidate' },
    { id: 'developer', labelKey: 'sleepProtocol.nav.developer' },
    { id: 'litepaper', labelKey: 'sleepProtocol.nav.litepaper' },
  ];

  const changeLanguage = (locale: string) => {
    router.push(router.pathname, router.asPath, { locale });
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            isConnected={isConnected}
            address={address}
            sleepBalance={sleepBalance}
            userStakeData={userStakeData}
            globalRank={globalRank}
            amplifier={amplifier}
            maxTerm={maxTerm}
            timeDecay={timeDecay}
            safeFormatBalance={safeFormatBalance}
          />
        );
      case 'access-pass':
        return (
          <AccessPass
            isConnected={isConnected}
            address={address}
          />
        );
      case 'mint':
        return (
          <Mint
            isConnected={isConnected}
            globalRank={globalRank}
            amplifier={amplifier}
            maxTerm={maxTermDays} // 使用合约常量
            timeDecay={timeDecay}
          />
        );
      case 'stake':
        return (
          <Stake
            isConnected={isConnected}
            sleepBalance={sleepBalance}
            userStakeData={userStakeData}
            safeFormatBalance={safeFormatBalance}
          />
        );
      case 'market':
        return (
          <Market
            isConnected={isConnected}
          />
        );
      case 'profile':
        return (
          <Profile
            isConnected={isConnected}
            address={address}
            sleepBalance={sleepBalance}
            userStakeData={userStakeData}
            onNavigate={setCurrentPage}
          />
        );
      case 'liquidate':
        return (
          <Liquidate
            isConnected={isConnected}
          />
        );
      case 'developer':
        return (
          <Developer
            isConnected={isConnected}
          />
        );
      case 'litepaper':
        return (
          <Litepaper />
        );
      default:
        return <div><h2>功能开发中...</h2><p>页面: {currentPage}</p></div>;
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
        <div style={{ flex: 1 }} /> {/* 占位符，将 NetworkSwitcher 推到最右边 */}
        <div style={{ marginRight: '1px' }}>
          <MenuNetworkSwitcher />
        </div>
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
          <WalletButton
            onClick={handleWalletClick}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              minWidth: '140px',
              ...(isConnected ? {
                background: '#228B22',
                color: 'white'
              } : {
                background: '#ff6b6b',
                color: 'white',
                animation: 'blink 1s infinite'
              })
            }}
          >
            {isConnected 
              ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
              : 'Connect Wallet'
            }
          </WalletButton>
        </WalletSection>
      </StatusBar>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        :global(.blinking-dot) {
          animation: blink 1s infinite;
        }
      `}</style>

      {/* 钱包信息弹窗 */}
      {showWalletInfo && isConnected && (
        <WalletModal onClick={() => {
          setShowWalletInfo(false);
          setCopyButtonState('default'); // 重置复制按钮状态
        }}>
          <WalletModalContent onClick={(e) => e.stopPropagation()}>
            <WalletModalHeader>
              <WalletModalIcon src="/win98/assets/icons/wallet.png" alt="Wallet" />
              <WalletModalTitle>钱包信息</WalletModalTitle>
              <WalletModalCloseButton onClick={() => {
                setShowWalletInfo(false);
                setCopyButtonState('default'); // 重置复制按钮状态
              }} />
            </WalletModalHeader>
            
            <WalletModalBody>
              <div style={{ marginBottom: '12px' }}>
                <strong>钱包地址:</strong>
              </div>
              <div style={{ 
                background: '#fff',
                border: '2px inset #c0c0c0',
                padding: '8px',
                marginBottom: '16px',
                fontFamily: 'monospace',
                fontSize: '11px',
                wordBreak: 'break-all'
              }}>
                {address}
              </div>
              
              <WalletModalButtons>
                <WalletButton 
                  onClick={handleCopyAddress}
                  disabled={copyButtonState === 'copied'}
                >
                  {copyButtonState === 'copied' ? '✅ 已复制' : '📋 复制地址'}
                </WalletButton>
                <WalletButton 
                  onClick={handleDisconnect}
                  style={{ 
                    background: '#ff6b6b',
                    color: 'white'
                  }}
                >
                  🔌 断开连接
                </WalletButton>
              </WalletModalButtons>
            </WalletModalBody>
          </WalletModalContent>
        </WalletModal>
      )}

      {/* 钱包连接选择弹窗 */}
      {showWalletModal && !isConnected && (
        <WalletModal onClick={() => setShowWalletModal(false)}>
          <WalletModalContent onClick={(e) => e.stopPropagation()}>
            <WalletModalHeader>
              <WalletModalIcon src="/win98/assets/icons/wallet.png" alt="Wallet" />
              <WalletModalTitle>连接钱包</WalletModalTitle>
              <WalletModalCloseButton onClick={() => setShowWalletModal(false)} />
            </WalletModalHeader>
            
            <WalletModalBody>
              <div style={{ marginBottom: '16px' }}>
                <strong>选择钱包类型:</strong>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {connectors.map((connector) => {
                  // 检查钱包是否可用
                  const isAvailable = typeof window !== 'undefined' && (
                    (connector.name === 'MetaMask' && window.ethereum?.isMetaMask) ||
                    (connector.name === 'Injected' && window.ethereum) ||
                    connector.name.includes('Injected')
                  );
                  
                  return (
                    <WalletButton
                      key={connector.id}
                      onClick={() => {
                        connect({ connector });
                        setShowWalletModal(false);
                      }}
                      disabled={!isAvailable}
                    >
                      🔗 {connector.name}
                      {!isAvailable && ' (未安装)'}
                    </WalletButton>
                  );
                })}
              </div>
            </WalletModalBody>
          </WalletModalContent>
        </WalletModal>
      )}
    </AppContainer>
  );
};

export default SleepProtocol;

