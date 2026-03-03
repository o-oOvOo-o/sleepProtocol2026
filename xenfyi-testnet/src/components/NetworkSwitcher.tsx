import { useChainId, useSwitchChain } from 'wagmi';
import { xLayerTestnet, sepolia } from '~/lib/chains';
import { useState } from 'react';
import styled from '@emotion/styled';
import { getSupportedChains, getChainConfig, getChainLogo, getChainName, isChainSupported } from '~/lib/chainConfig';

const supportedChains = [sepolia, xLayerTestnet];

const NetworkButton = styled.button<{ isSupported: boolean; variant?: 'win98' | 'modern' | 'menu' }>`
  display: flex;
  align-items: center;
  gap: ${props => {
    if (props.variant === 'modern') return '4px';
    if (props.variant === 'menu') return '8px';
    return '2px';
  }};
  padding: ${props => {
    if (props.variant === 'modern') return '8px 12px';
    if (props.variant === 'menu') return '8px 20px';
    return '6px';
  }};
  margin: ${props => props.variant === 'menu' ? '3px' : '0'};
  background: ${props => props.variant === 'modern' ? 'rgba(30, 41, 59, 0.8)' : '#c0c0c0'};
  border: ${props => props.variant === 'modern' ? '1px solid rgba(59, 130, 246, 0.3)' : '2px outset #c0c0c0'};
  border-radius: ${props => props.variant === 'modern' ? '6px' : '0'};
  font-family: ${props => props.variant === 'modern' ? 'inherit' : "'MS Sans Serif', sans-serif"};
  font-size: ${props => {
    if (props.variant === 'modern') return '14px';
    if (props.variant === 'menu') return '16px';
    return '10px';
  }};
  font-weight: ${props => props.variant === 'win98' ? 'normal' : 'inherit'};
  width: ${props => props.variant === 'win98' ? '48px' : 'auto'};
  height: ${props => props.variant === 'win98' ? '48px' : 'auto'};
  min-width: ${props => props.variant === 'win98' ? '48px' : 'auto'};
  flex-direction: ${props => props.variant === 'win98' ? 'column' : 'row'};
  justify-content: center;
  cursor: pointer;
  color: ${props => {
    if (props.variant === 'modern') {
      return props.isSupported ? 'rgb(226, 232, 240)' : '#ef4444';
    }
    return props.isSupported ? 'black' : '#ff0000';
  }};
  backdrop-filter: ${props => props.variant === 'modern' ? 'blur(12px)' : 'none'};
  transition: ${props => props.variant === 'modern' ? 'all 0.2s ease' : 'none'};
  
  &:hover:not(:disabled) {
    background: ${props => {
      if (props.variant === 'modern') return 'rgba(51, 65, 85, 0.9)';
      return '#dfdfdf';
    }};
    border-color: ${props => props.variant === 'modern' ? 'rgba(59, 130, 246, 0.5)' : '#c0c0c0'};
  }
  
  &:active:not(:disabled) {
    border: ${props => props.variant === 'modern' ? '1px solid rgba(59, 130, 246, 0.7)' : '2px inset #c0c0c0'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DropdownMenu = styled.div<{ visible: boolean; variant?: 'win98' | 'modern' }>`
  position: absolute;
  top: 100%;
  left: 0;
  background: ${props => props.variant === 'modern' ? 'rgba(30, 41, 59, 0.95)' : '#c0c0c0'};
  border: ${props => props.variant === 'modern' ? '1px solid rgba(59, 130, 246, 0.3)' : '2px outset #c0c0c0'};
  border-radius: ${props => props.variant === 'modern' ? '8px' : '0'};
  min-width: ${props => props.variant === 'modern' ? '160px' : '120px'};
  display: ${props => props.visible ? 'block' : 'none'};
  z-index: 1000;
  font-family: ${props => props.variant === 'modern' ? 'inherit' : "'MS Sans Serif', sans-serif"};
  font-size: ${props => props.variant === 'modern' ? '14px' : '11px'};
  backdrop-filter: ${props => props.variant === 'modern' ? 'blur(12px)' : 'none'};
  box-shadow: ${props => props.variant === 'modern' ? '0 10px 25px rgba(0, 0, 0, 0.3)' : 'none'};
`;

const DropdownItem = styled.div<{ disabled?: boolean; variant?: 'win98' | 'modern' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: ${props => props.variant === 'modern' ? '8px 12px' : '4px 8px'};
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  color: ${props => {
    if (props.variant === 'modern') {
      return props.disabled ? 'rgb(148, 163, 184)' : 'rgb(226, 232, 240)';
    }
    return props.disabled ? '#808080' : 'black';
  }};
  border-radius: ${props => props.variant === 'modern' ? '4px' : '0'};
  margin: ${props => props.variant === 'modern' ? '2px 4px' : '0'};
  transition: ${props => props.variant === 'modern' ? 'all 0.2s ease' : 'none'};
  
  &:hover {
    background: ${props => {
      if (props.disabled) return 'transparent';
      return props.variant === 'modern' ? 'rgba(59, 130, 246, 0.2)' : '#316AC5';
    }};
    color: ${props => {
      if (props.disabled) return props.variant === 'modern' ? 'rgb(148, 163, 184)' : '#808080';
      return props.variant === 'modern' ? 'white' : 'white';
    }};
  }
`;

const NetworkSwitcherContainer = styled.div`
  position: relative;
  display: inline-block;
`;

interface NetworkSwitcherProps {
  variant?: 'win98' | 'modern' | 'menu';
}

export const NetworkSwitcher = ({ variant = 'win98' }: NetworkSwitcherProps) => {
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  
  // 从配置文件获取链信息
  const currentChainConfig = getChainConfig(chainId);
  const isSupported = isChainSupported(chainId);
  const currentChainName = getChainName(chainId);
  const currentChainLogo = getChainLogo(chainId);

  if (!chainId) {
    return <div style={{ fontSize: '11px', color: '#808080' }}>Connecting...</div>;
  }

  const handleSwitchChain = (targetChainId: number) => {
    console.log('尝试切换到链:', targetChainId);
    try {
      switchChain({ chainId: targetChainId });
      setIsOpen(false);
    } catch (err) {
      console.error('切换网络时发生错误:', err);
    }
  };

  return (
    <NetworkSwitcherContainer>
      <NetworkButton 
        isSupported={!!isSupported}
        variant={variant}
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        disabled={isPending}
      >
        <img 
          src={isSupported ? currentChainLogo : "/win98/assets/icons/network-bad.png"} 
          alt="Network" 
          style={{ 
            width: variant === 'win98' ? '24px' : '16px', 
            height: variant === 'win98' ? '24px' : '16px' 
          }} 
        />
        {variant === 'win98' ? (
          isPending ? '...' : (isSupported ? (currentChainConfig?.nativeToken.symbol || 'NET') : '?')
        ) : variant === 'menu' ? (
          isPending ? 'Switching...' : (isSupported ? currentChainName : 'Unsupported')
        ) : (
          isPending ? 'Switching...' : (isSupported ? currentChainName : 'Unsupported')
        )}
      </NetworkButton>
      
      <DropdownMenu visible={isOpen && !isPending} variant={variant}>
        {supportedChains.map((chain) => {
          const chainConfig = getChainConfig(chain.id);
          const chainLogo = getChainLogo(chain.id);
          return (
            <DropdownItem
              key={chain.id}
              disabled={!switchChain || chain.id === chainId || isPending}
              variant={variant}
              onClick={() => handleSwitchChain(chain.id)}
            >
              <img 
                src={chainLogo} 
                alt={chain.name} 
                style={{ 
                  width: variant === 'win98' ? '16px' : '14px', 
                  height: variant === 'win98' ? '16px' : '14px' 
                }} 
              />
              {chain.name} {chain.id === chainId ? '✓' : ''}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </NetworkSwitcherContainer>
  );
};
