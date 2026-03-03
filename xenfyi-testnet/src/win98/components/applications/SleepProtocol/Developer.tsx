import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { DataCard, CardTitle, Win98Label, Win98Button, Win98Input } from './index';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { 
  tokenMinterContract, 
  nftMarketplaceContract,
  sleepingTokenContract 
} from '~/lib/contracts';
import { xLayerTestnet } from '~/lib/chains';

interface DeveloperProps {
  isConnected: boolean;
}

export const Developer: React.FC<DeveloperProps> = ({ isConnected }) => {
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const { writeContract, isPending } = useWriteContract();

  // State for different admin functions
  const [tokenId, setTokenId] = useState('');
  const [newMaturityTime, setNewMaturityTime] = useState('');
  const [timeOffset, setTimeOffset] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [marketplaceFee, setMarketplaceFee] = useState('');

  // Read current states
  const { data: adminControlsEnabled } = useReadContract({
    ...tokenMinterContract(currentChain),
    functionName: 'adminControlsEnabled',
  });

  const { data: currentMarketplaceFee } = useReadContract({
    ...nftMarketplaceContract(currentChain),
    functionName: 'marketplaceFeePercent',
  });

  const { data: currentTimeOffset } = useReadContract({
    ...tokenMinterContract(currentChain),
    functionName: 'adminTimeOffset',
  });

  const { data: adjustedTime } = useReadContract({
    ...tokenMinterContract(currentChain),
    functionName: 'getAdjustedTime',
  });

  const { data: ownerAddress } = useReadContract({
    ...tokenMinterContract(currentChain),
    functionName: 'owner',
  });

  const isOwner = address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase();

  // Admin function handlers
  const handleAdjustMintExpiry = async () => {
    if (!tokenId || !newMaturityTime) {
      toast.error('请输入Token ID和新的到期时间');
      return;
    }

    try {
      const maturityTimestamp = Math.floor(new Date(newMaturityTime).getTime() / 1000);
      
      await writeContract({
        ...tokenMinterContract(currentChain),
        functionName: 'adjustMintExpiry',
        args: [BigInt(tokenId), BigInt(maturityTimestamp)],
      });

      toast.success('Mint到期时间调整请求已发送！');
    } catch (error: any) {
      console.error('调整Mint到期时间失败:', error);
      toast.error(error.message || '调整失败');
    }
  };

  const handleAdjustProtocolTime = async () => {
    if (!timeOffset) {
      toast.error('请输入时间偏移量');
      return;
    }

    try {
      const offsetSeconds = parseInt(timeOffset) * 24 * 60 * 60; // Convert days to seconds
      
      await writeContract({
        ...tokenMinterContract(currentChain),
        functionName: 'adjustProtocolTime',
        args: [BigInt(offsetSeconds)],
      });

      toast.success('协议时间调整请求已发送！');
    } catch (error: any) {
      console.error('调整协议时间失败:', error);
      toast.error(error.message || '调整失败');
    }
  };

  const handleAdminMint = async () => {
    if (!mintAmount) {
      toast.error('请输入铸造数量');
      return;
    }

    try {
      const amount = parseEther(mintAmount);
      
      await writeContract({
        ...tokenMinterContract(currentChain),
        functionName: 'adminMintTokens',
        args: [amount],
      });

      toast.success('管理员铸造请求已发送！');
    } catch (error: any) {
      console.error('管理员铸造失败:', error);
      toast.error(error.message || '铸造失败');
    }
  };

  const handleAdjustMarketplaceFee = async () => {
    if (!marketplaceFee) {
      toast.error('请输入市场费率');
      return;
    }

    try {
      const feePercent = parseInt(marketplaceFee) * 100; // Convert to basis points
      
      await writeContract({
        ...nftMarketplaceContract(currentChain),
        functionName: 'adminAdjustMarketplaceFee',
        args: [BigInt(feePercent)],
      });

      toast.success('市场费率调整请求已发送！');
    } catch (error: any) {
      console.error('调整市场费率失败:', error);
      toast.error(error.message || '调整失败');
    }
  };

  const handleDisableAdminControls = async () => {
    if (!window.confirm('确定要永久禁用管理员控制吗？此操作不可逆转！')) {
      return;
    }

    try {
      await writeContract({
        ...tokenMinterContract(currentChain),
        functionName: 'disableAdminControls',
      });

      toast.success('禁用管理员控制请求已发送！');
    } catch (error: any) {
      console.error('禁用管理员控制失败:', error);
      toast.error(error.message || '操作失败');
    }
  };

  if (!isConnected) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <DataCard>
          <CardTitle>🔒 需要连接钱包</CardTitle>
          <p style={{ margin: '16px 0', color: '#666' }}>
            请先连接钱包以访问开发者控制面板
          </p>
        </DataCard>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <DataCard>
          <CardTitle>⛔ 权限不足</CardTitle>
          <p style={{ margin: '16px 0', color: '#666' }}>
            只有合约所有者才能访问开发者控制面板
          </p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            当前地址: {address}<br/>
            所有者地址: {ownerAddress}
          </p>
        </DataCard>
      </div>
    );
  }

  if (!adminControlsEnabled) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <DataCard>
          <CardTitle>🚫 管理员控制已禁用</CardTitle>
          <p style={{ margin: '16px 0', color: '#666' }}>
            管理员控制功能已被永久禁用，无法使用开发者面板
          </p>
        </DataCard>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 页面标题 */}
      <DataCard>
        <CardTitle style={{ fontSize: '18px', marginBottom: '8px' }}>
          🛠️ 开发者控制面板
        </CardTitle>
        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
          管理员开发阶段权限系统 - 仅用于测试和验证
        </p>
      </DataCard>

      {/* 当前状态显示 */}
      <DataCard>
        <CardTitle style={{ fontSize: '16px', marginBottom: '12px' }}>
          📊 当前状态
        </CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
          <div>
            <Win98Label>管理员控制状态:</Win98Label>
            <div style={{ color: adminControlsEnabled ? '#008000' : '#ff0000', fontWeight: 'bold' }}>
              {adminControlsEnabled ? '✅ 已启用' : '❌ 已禁用'}
            </div>
          </div>
          <div>
            <Win98Label>当前时间偏移:</Win98Label>
            <div style={{ fontWeight: 'bold' }}>
              {currentTimeOffset ? `${Number(currentTimeOffset) / (24 * 60 * 60)} 天` : '0 天'}
            </div>
          </div>
          <div>
            <Win98Label>调整后时间:</Win98Label>
            <div style={{ fontSize: '10px', fontFamily: 'monospace' }}>
              {adjustedTime ? new Date(Number(adjustedTime) * 1000).toLocaleString() : '加载中...'}
            </div>
          </div>
          <div>
            <Win98Label>实际时间:</Win98Label>
            <div style={{ fontSize: '10px', fontFamily: 'monospace' }}>
              {new Date().toLocaleString()}
            </div>
          </div>
          <div>
            <Win98Label>市场费率:</Win98Label>
            <div style={{ fontWeight: 'bold' }}>
              {currentMarketplaceFee ? `${Number(currentMarketplaceFee) / 100}%` : '0%'}
            </div>
          </div>
          <div>
            <Win98Label>合约所有者:</Win98Label>
            <div style={{ fontSize: '10px', fontFamily: 'monospace' }}>
              {ownerAddress}
            </div>
          </div>
        </div>
      </DataCard>

      {/* 质押时间测试说明 */}
      <DataCard style={{ background: '#f0f8ff', border: '2px solid #4169e1' }}>
        <CardTitle style={{ fontSize: '16px', marginBottom: '12px', color: '#4169e1' }}>
          ⏰ 质押时间测试功能
        </CardTitle>
        <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.5' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>协议时间调整现在会影响质押系统：</strong>
          </p>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li>质押到期时间计算使用调整后的时间</li>
            <li>分红周期分配使用调整后的时间</li>
            <li>清算宽限期计算使用调整后的时间</li>
            <li>可以通过调整协议时间来测试不同质押期限的奖励</li>
          </ul>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
            💡 提示：调整时间后，可以在质押页面测试不同期限的奖励计算和到期逻辑
          </p>
        </div>
      </DataCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* 调整Mint到期时间 */}
        <DataCard>
          <CardTitle style={{ fontSize: '16px', marginBottom: '12px' }}>
            ⏰ 调整Mint到期时间
          </CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Win98Label>Token ID:</Win98Label>
            <Win98Input
              type="number"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="输入NFT Token ID"
              style={{ width: '100%' }}
            />
            <Win98Label>新到期时间:</Win98Label>
            <Win98Input
              type="datetime-local"
              value={newMaturityTime}
              onChange={(e) => setNewMaturityTime(e.target.value)}
              style={{ width: '100%' }}
            />
            <Win98Button
              onClick={handleAdjustMintExpiry}
              disabled={!tokenId || !newMaturityTime || isPending}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '8px',
                background: (!tokenId || !newMaturityTime || isPending) ? '#c0c0c0' : '#000080',
                color: (!tokenId || !newMaturityTime || isPending) ? '#666' : 'white',
              }}
            >
              {isPending ? '⏳ 处理中...' : '🔄 调整到期时间'}
            </Win98Button>
          </div>
        </DataCard>

        {/* 调整协议时间 */}
        <DataCard>
          <CardTitle style={{ fontSize: '16px', marginBottom: '12px' }}>
            🕒 调整协议时间
          </CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Win98Label>时间偏移 (天):</Win98Label>
            <Win98Input
              type="number"
              value={timeOffset}
              onChange={(e) => setTimeOffset(e.target.value)}
              placeholder="输入天数 (可为负数)"
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              正数：向前推进时间<br/>
              负数：向后回退时间
            </div>
            <Win98Button
              onClick={handleAdjustProtocolTime}
              disabled={!timeOffset || isPending}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '8px',
                background: (!timeOffset || isPending) ? '#c0c0c0' : '#000080',
                color: (!timeOffset || isPending) ? '#666' : 'white',
              }}
            >
              {isPending ? '⏳ 处理中...' : '⏰ 调整协议时间'}
            </Win98Button>
          </div>
        </DataCard>

        {/* 直接铸造代币 */}
        <DataCard>
          <CardTitle style={{ fontSize: '16px', marginBottom: '12px' }}>
            🪙 直接铸造SLEEP代币
          </CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Win98Label>铸造数量 (SLEEP):</Win98Label>
            <Win98Input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="输入铸造数量"
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              代币将直接铸造到所有者钱包
            </div>
            <Win98Button
              onClick={handleAdminMint}
              disabled={!mintAmount || isPending}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '8px',
                background: (!mintAmount || isPending) ? '#c0c0c0' : '#000080',
                color: (!mintAmount || isPending) ? '#666' : 'white',
              }}
            >
              {isPending ? '⏳ 处理中...' : '🪙 铸造代币'}
            </Win98Button>
          </div>
        </DataCard>

        {/* 调整市场费率 */}
        <DataCard>
          <CardTitle style={{ fontSize: '16px', marginBottom: '12px' }}>
            💰 调整NFT市场费率
          </CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Win98Label>费率 (%):</Win98Label>
            <Win98Input
              type="number"
              value={marketplaceFee}
              onChange={(e) => setMarketplaceFee(e.target.value)}
              placeholder="输入费率百分比 (最大10%)"
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              当前费率: {currentMarketplaceFee ? `${Number(currentMarketplaceFee) / 100}%` : '0%'}
            </div>
            <Win98Button
              onClick={handleAdjustMarketplaceFee}
              disabled={!marketplaceFee || isPending}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '8px',
                background: (!marketplaceFee || isPending) ? '#c0c0c0' : '#000080',
                color: (!marketplaceFee || isPending) ? '#666' : 'white',
              }}
            >
              {isPending ? '⏳ 处理中...' : '💰 调整费率'}
            </Win98Button>
          </div>
        </DataCard>
      </div>

      {/* 危险操作区域 */}
      <DataCard style={{ border: '2px solid #ff0000' }}>
        <CardTitle style={{ fontSize: '16px', marginBottom: '12px', color: '#ff0000' }}>
          ⚠️ 危险操作
        </CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>永久禁用管理员控制</strong><br/>
            此操作将永久禁用所有管理员开发功能，无法撤销！<br/>
            仅在准备生产部署时使用。
          </div>
          <Win98Button
            onClick={handleDisableAdminControls}
            disabled={isPending}
            style={{
              width: '100%',
              padding: '12px',
              background: isPending ? '#c0c0c0' : '#ff0000',
              color: isPending ? '#666' : 'white',
              fontWeight: 'bold',
            }}
          >
            {isPending ? '⏳ 处理中...' : '🚫 永久禁用管理员控制'}
          </Win98Button>
        </div>
      </DataCard>
    </div>
  );
};
