import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'react-hot-toast';
import { useAccount, useReadContracts, useWriteContract, useReadContract } from 'wagmi';
import { formatUnits, parseEther } from 'viem';
import { DataCard, CardTitle, StatRow, StatLabel, StatValue, Win98Label, Win98Button, Win98Input } from './index';
import { 
  tokenMinterContract, 
  tokenAccessPassContract,
  nftMarketplaceContract,
  marketTreasuryContract, // 导入金库合约
  BLOCK_EXPLORER_CONFIG
} from '~/lib/contracts';
import { xLayerTestnet } from '~/lib/chains';
import { useMarketData } from '~/hooks/useSubgraphData';

interface NFTMarketProps {
  isConnected: boolean;
}

interface MarketListing {
  id: string;
  tokenId: string;
  nftType: 'MINTING_POSITION' | 'ACCESS_PASS';
  seller: string;
  price: string;
  listedAt: string;
}

interface MarketSale {
  id: string;
  tokenId: string;
  nftType: 'MINTING_POSITION' | 'ACCESS_PASS';
  seller: string;
  buyer: string;
  price: string;
  timestamp: string;
}

export const NFTMarket: React.FC<NFTMarketProps> = ({ isConnected }) => {
  const { t } = useTranslation('common');
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const { writeContract, isPending } = useWriteContract();
  const { data: marketData, isLoading: isLoadingMarket, error: marketError, refetch: refetchMarketData } = useMarketData();

  // 统一从合约读取数据 (市场统计, 金库余额, 金库Owner)
  const { data: contractReads, refetch: refetchContractData } = useReadContracts({
    contracts: [
      { // 0: Market Stats
        ...nftMarketplaceContract(currentChain),
        functionName: 'getMarketStats',
      },
      { // 1: Market Treasury Balance
        ...marketTreasuryContract(),
        functionName: 'getBalance',
      },
      { // 2: Market Treasury Owner
        ...marketTreasuryContract(),
        functionName: 'owner',
      }
    ],
  });

  // 解析从 useReadContracts 返回的数据
  const marketStats = contractReads?.[0]?.result as [bigint, bigint, bigint, bigint, string] | undefined;
  const treasuryBalance = contractReads?.[1]?.result as bigint | undefined;
  const treasuryOwner = contractReads?.[2]?.result as `0x${string}` | undefined;

  // getMarketStats 返回: (totalVolume, totalFees, totalSales, feePercent, treasury)
  const contractTotalVolume = marketStats?.[0] || BigInt(0);
  const contractTotalFees = marketStats?.[1] || BigInt(0);
  const contractTotalSales = marketStats?.[2] || BigInt(0);
  const marketplaceFeePercent = marketStats?.[3] || BigInt(50); // 默认 0.5%
  const treasuryAddress = marketStats?.[4] || '';

  // 状态管理
  const [activeTab, setActiveTab] = useState<'listings' | 'sales' | 'treasury'>('listings');
  const [selectedNFT, setSelectedNFT] = useState<MarketListing | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [newFeePercent, setNewFeePercent] = useState(''); // 用于输入新的手续费

  // 获取市场统计数据和金库余额（从合约直接读取）
  // const { data: contractReads, refetch: refetchContractData } = useReadContracts({
  //   contracts: [
  //     {
  //       ...nftMarketplaceContract(),
  //       functionName: 'getMarketStats',
  //     },
  //   ],
  //   query: {
  //     enabled: isConnected,
  //   },
  // });

  // getMarketStats 返回: (totalVolume, totalFees, totalSales, feePercent, treasury)
  // const marketStats = contractReads?.[0]?.result as [bigint, bigint, bigint, bigint, string] | undefined;
  // const contractTotalVolume = marketStats?.[0] || BigInt(0);
  // const contractTotalFees = marketStats?.[1] || BigInt(0);
  // const contractTotalSales = marketStats?.[2] || BigInt(0);
  // const marketplaceFeePercent = marketStats?.[3] || BigInt(50);
  // const treasuryAddress = marketStats?.[4] || '';

  // 购买NFT
  const handlePurchaseNFT = async (listing: MarketListing) => {
    if (!isConnected || !address) {
      toast.error('请先连接钱包！');
      return;
    }

    // Check if trying to buy own NFT
    if (listing.seller.toLowerCase() === address.toLowerCase()) {
      toast.error('不能购买自己的NFT！');
      return;
    }

    try {
      // Determine NFT contract address based on nftType
      const nftContractAddress = listing.nftType === 'MINTING_POSITION' 
        ? tokenMinterContract(currentChain).address 
        : tokenAccessPassContract(currentChain).address;
      
      const priceInWei = BigInt(listing.price);
      
      console.log('🛒 准备购买 NFT:');
      console.log('  NFT Contract:', nftContractAddress);
      console.log('  Token ID:', listing.tokenId);
      console.log('  Price (string):', listing.price);
      console.log('  Price (BigInt):', priceInWei.toString());
      console.log('  Price (OKB):', formatPrice(listing.price));
      console.log('  Marketplace:', nftMarketplaceContract(currentChain).address);
      
      toast.loading('正在准备购买...', { id: `buy-${listing.tokenId}` });
      
      await writeContract({
        ...nftMarketplaceContract(currentChain),
        functionName: 'buyNFT',
        args: [nftContractAddress, BigInt(listing.tokenId)],
        value: priceInWei,
      });

      toast.success('购买请求已发送！请等待确认...', { id: `buy-${listing.tokenId}` });
      setSelectedNFT(null);
    } catch (error: any) {
      console.error('购买NFT失败:', error);
      toast.error(error.message || '购买失败', { id: `buy-${listing.tokenId}` });
    }
  };

  // 格式化价格
  const formatPrice = (price: string) => {
    try {
      return (Number(price) / 1e18).toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    try {
      return new Date(Number(timestamp) * 1000).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  // 渲染NFT列表
  const renderNFTListings = () => (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>🏪 NFT市场列表</h3>
        <div style={{ fontSize: '12px', color: '#666' }}>
          市场费率: {Number(marketplaceFeePercent) / 100}%
        </div>
      </div>

      {isLoadingMarket ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          加载中...
        </div>
      ) : marketError ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#ff0000' }}>
          加载失败: {marketError}
        </div>
      ) : !marketData?.activeListings || marketData.activeListings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          暂无NFT在售
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {marketData.activeListings.map((listing) => (
            <DataCard key={listing.id} style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                  {listing.nftType === 'MINTING_POSITION' ? '🪙 Mint Card' : '🎫 Access Pass'} #{listing.tokenId}
                </h4>
                <div style={{
                  background: listing.nftType === 'MINTING_POSITION' ? '#ff6b6b' : '#4ecdc4',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {listing.nftType === 'MINTING_POSITION' ? 'MINT' : 'ACCESS'}
                </div>
              </div>

              <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                <StatRow>
                  <StatLabel>卖家:</StatLabel>
                  <StatValue style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                    {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                  </StatValue>
                </StatRow>
                <StatRow>
                  <StatLabel>价格:</StatLabel>
                  <StatValue style={{ fontWeight: 'bold', color: '#008000' }}>
                    {formatPrice(listing.price)} OKB
                  </StatValue>
                </StatRow>
                <StatRow>
                  <StatLabel>上架时间:</StatLabel>
                  <StatValue>{formatTime(listing.listedAt)}</StatValue>
                </StatRow>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Win98Button
                  style={{ flex: 1, fontSize: '11px', padding: '6px 12px' }}
                  onClick={() => setSelectedNFT(listing as MarketListing)}
                >
                  查看详情
                </Win98Button>
                <Win98Button
                  style={{ 
                    flex: 1, 
                    fontSize: '11px', 
                    padding: '6px 12px',
                    background: '#008000',
                    color: 'white'
                  }}
                  disabled={!isConnected || isPending || listing.seller.toLowerCase() === address?.toLowerCase()}
                  onClick={() => handlePurchaseNFT(listing as MarketListing)}
                >
                  {listing.seller.toLowerCase() === address?.toLowerCase() ? '自己的NFT' : 
                   isPending ? '购买中...' : '立即购买'}
                </Win98Button>
              </div>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );

  // 渲染最近交易
  const renderRecentSales = () => (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>📈 最近交易</h3>
      </div>

      {isLoadingMarket ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          加载中...
        </div>
      ) : !marketData?.recentSales || marketData.recentSales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          暂无交易记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {marketData.recentSales.map((sale) => (
            <DataCard key={sale.id} style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: sale.nftType === 'MINTING_POSITION' ? '#ff6b6b' : '#4ecdc4',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {sale.nftType === 'MINTING_POSITION' ? 'MINT' : 'ACCESS'} #{sale.tokenId}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: '#008000' }}>
                      {formatPrice(sale.price)} OKB
                    </div>
                    <div style={{ color: '#666', fontSize: '10px' }}>
                      {formatTime(sale.timestamp)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#666', textAlign: 'right' }}>
                  <div>卖家: {sale.seller.slice(0, 6)}...{sale.seller.slice(-4)}</div>
                  <div>买家: {sale.buyer.slice(0, 6)}...{sale.buyer.slice(-4)}</div>
                </div>
              </div>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );

  // 渲染市场金库
  const renderTreasury = () => {
    // 安全检查
    if (!marketData || isLoadingMarket) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          加载中...
        </div>
      );
    }

    if (marketError) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#cc0000' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div>加载失败，请刷新重试</div>
        </div>
      );
    }

    // 安全获取数据
    const sales = marketData.recentSales || [];
    const activeListings = marketData.activeListings || [];
    
    // 使用合约统计数据（更准确）
    const totalVolume = Number(contractTotalVolume);
    const totalFees = Number(contractTotalFees);
    const totalSales = Number(contractTotalSales);
    const feePercent = Number(marketplaceFeePercent);

    return (
      <div>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>💰 市场金库统计</h3>
          <Win98Button
            onClick={() => refetchContractData()}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            🔄 刷新
          </Win98Button>
        </div>

        {/* 市场统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <DataCard style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>总交易量（合约统计）</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0080ff' }}>
              {(totalVolume / 1e18).toFixed(4)} OKB
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {totalSales} 笔交易
            </div>
          </DataCard>

          <DataCard style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>累计手续费收入（已存入金库）</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00aa00' }}>
              {(totalFees / 1e18).toFixed(6)} OKB
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              手续费率: {feePercent / 100}%
            </div>
          </DataCard>
        </div>

        {/* 金库信息 */}
        <DataCard style={{ padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🏦 金库合约</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div>
              <StatLabel>金库地址</StatLabel>
              <div style={{ 
                fontSize: '11px', 
                fontFamily: 'monospace', 
                color: '#0066cc', 
                wordBreak: 'break-all',
                marginBottom: '8px'
              }}>
                {treasuryAddress || '未设置'}
              </div>
              {treasuryAddress && treasuryAddress !== '未设置' && (
                <a
                  href={BLOCK_EXPLORER_CONFIG.addressUrl(treasuryAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: '#0080ff',
                    textDecoration: 'none',
                    padding: '4px 8px',
                    border: '1px solid #0080ff',
                    borderRadius: '2px',
                    background: '#f0f8ff',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e0f0ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f0f8ff';
                  }}
                >
                  🔍 在区块浏览器中查看
                  <span style={{ fontSize: '9px' }}>↗</span>
                </a>
              )}
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              💡 所有市场手续费自动存入金库合约，由 owner 管理提取权限
            </div>
            
            {/* DEV: Owner Tools */}
            {address && treasuryOwner && address.toLowerCase() === treasuryOwner.toLowerCase() && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #dfdfdf', paddingTop: '12px' }}>
                <Win98Label>开发者工具 (仅 Owner 可见)</Win98Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  {/* Withdraw Tool */}
                  <Win98Button
                    onClick={handleWithdraw}
                    disabled={isPending}
                    style={{ 
                      padding: '8px', 
                      background: '#ff8080', // Red color for caution
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {isPending ? '处理中...' : '提取全部资金 (withdrawAll)'}
                  </Win98Button>
                  
                  {/* Set Fee Tool */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Win98Input
                      type="number"
                      placeholder={`当前: ${Number(marketplaceFeePercent) / 100}%`}
                      value={newFeePercent}
                      onChange={(e) => setNewFeePercent(e.target.value)}
                      style={{ flex: 1, height: '35px' }}
                    />
                    <Win98Button
                      onClick={handleSetFee}
                      disabled={isPending || !newFeePercent}
                      style={{ height: '35px' }}
                    >
                      设置费率
                    </Win98Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DataCard>

        {/* 活跃市场统计 */}
        <DataCard style={{ padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>📊 市场活跃度</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <StatLabel>活跃挂单</StatLabel>
              <StatValue style={{ fontSize: '18px' }}>{activeListings.length}</StatValue>
            </div>
            <div>
              <StatLabel>历史交易</StatLabel>
              <StatValue style={{ fontSize: '18px' }}>{totalSales}</StatValue>
            </div>
            <div>
              <StatLabel>平均交易额</StatLabel>
              <StatValue style={{ fontSize: '14px' }}>
                {totalSales > 0 ? (totalVolume / totalSales / 1e18).toFixed(4) : '0.0000'} OKB
              </StatValue>
            </div>
          </div>
        </DataCard>

        {/* NFT类型分布 */}
        <DataCard style={{ padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🎨 NFT类型分布</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <StatLabel>Mint Card 挂单</StatLabel>
              <StatValue style={{ fontSize: '18px' }}>
                {activeListings.filter(l => l.nftType === 'MINTING_POSITION').length}
              </StatValue>
            </div>
            <div>
              <StatLabel>Access Pass 挂单</StatLabel>
              <StatValue style={{ fontSize: '18px' }}>
                {activeListings.filter(l => l.nftType === 'ACCESS_PASS').length}
              </StatValue>
            </div>
          </div>
        </DataCard>
      </div>
    );
  };

  // 提取金库资金 (仅限 owner)
  const handleWithdraw = () => {
    if (address?.toLowerCase() !== treasuryOwner?.toLowerCase()) {
      toast.error('只有金库合约所有者才能执行此操作！');
      return;
    }

    toast.loading('正在发送提取请求...', { id: 'withdraw-treasury' });

    writeContract({
      ...marketTreasuryContract(),
      functionName: 'withdrawAll',
      args: [],
    }, {
      onSuccess: () => {
        toast.success('提取请求已发送！请等待确认...', { id: 'withdraw-treasury' });
        refetchContractData(); // 刷新合约统计数据
      },
      onError: (error: any) => {
        console.error('提取失败:', error);
        toast.error(error.message || '提取失败', { id: 'withdraw-treasury' });
      }
    });
  };

  // 设置市场手续费 (仅限 owner)
  const handleSetFee = () => {
    // We need the treasuryOwner to determine if the user is the owner of the marketplace
    // as well, since we assume they are the same deployer.
    if (address?.toLowerCase() !== treasuryOwner?.toLowerCase()) {
      toast.error('只有合约所有者才能执行此操作！');
      return;
    }

    const fee = parseFloat(newFeePercent);
    if (isNaN(fee) || fee < 0 || fee > 10) {
      toast.error('请输入有效的手续费率 (0% - 10%)');
      return;
    }

    const feeInBasisPoints = Math.round(fee * 100);
    toast.loading(`正在设置手续费为 ${fee}% (${feeInBasisPoints} 基点)...`, { id: 'set-fee' });

    writeContract({
      ...nftMarketplaceContract(),
      functionName: 'setMarketplaceFee',
      args: [BigInt(feeInBasisPoints)],
    }, {
      onSuccess: () => {
        toast.success('手续费更新请求已发送！', { id: 'set-fee' });
        setNewFeePercent('');
        // Delay refetch to allow time for blockchain update
        setTimeout(() => refetchContractData(), 2000);
      },
      onError: (error: any) => {
        console.error('设置手续费失败:', error);
        toast.error(error.message || '设置手续费失败', { id: 'set-fee' });
      }
    });
  };

  // NFT详情弹窗
  const renderNFTModal = () => {
    if (!selectedNFT) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <DataCard style={{ 
          width: '400px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <CardTitle>
              {selectedNFT.nftType === 'MINTING_POSITION' ? '🪙 Mint Card' : '🎫 Access Pass'} #{selectedNFT.tokenId}
            </CardTitle>
            <Win98Button
              onClick={() => setSelectedNFT(null)}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              ✕
            </Win98Button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <StatRow>
              <StatLabel>类型:</StatLabel>
              <StatValue>{selectedNFT.nftType === 'MINTING_POSITION' ? 'Mint Card' : 'Access Pass'}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>Token ID:</StatLabel>
              <StatValue>#{selectedNFT.tokenId}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>卖家:</StatLabel>
              <StatValue style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                {selectedNFT.seller}
              </StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>价格:</StatLabel>
              <StatValue style={{ fontWeight: 'bold', color: '#008000', fontSize: '16px' }}>
                {formatPrice(selectedNFT.price)} OKB
              </StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>上架时间:</StatLabel>
              <StatValue>{formatTime(selectedNFT.listedAt)}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>市场费用:</StatLabel>
              <StatValue>
                {`${(Number(selectedNFT.price) * Number(marketplaceFeePercent) / 100 / 1e18).toFixed(4)} OKB (${Number(marketplaceFeePercent) / 100}%)`}
              </StatValue>
            </StatRow>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Win98Button
              style={{ flex: 1, padding: '8px 16px' }}
              onClick={() => setSelectedNFT(null)}
            >
              取消
            </Win98Button>
            <Win98Button
              style={{ 
                flex: 1, 
                padding: '8px 16px',
                background: selectedNFT.seller.toLowerCase() === address?.toLowerCase() ? '#c0c0c0' : '#008000',
                color: selectedNFT.seller.toLowerCase() === address?.toLowerCase() ? '#666' : 'white'
              }}
              disabled={!isConnected || isPending || selectedNFT.seller.toLowerCase() === address?.toLowerCase()}
              onClick={() => handlePurchaseNFT(selectedNFT)}
            >
              {selectedNFT.seller.toLowerCase() === address?.toLowerCase() ? '这是您的NFT' : 
               isPending ? '购买中...' : '确认购买'}
            </Win98Button>
          </div>
        </DataCard>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <DataCard>
          <CardTitle>🔒 需要连接钱包</CardTitle>
          <p style={{ margin: '16px 0', color: '#666' }}>
            请先连接钱包以访问NFT市场
          </p>
        </DataCard>
      </div>
    );
  }

  return (
    <div>
      {/* 标签页导航 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex',
          gap: '2px',
          borderBottom: '2px solid #c0c0c0'
        }}>
          <Win98Button
            onClick={() => setActiveTab('listings')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'listings' ? '#c0c0c0' : '#a0a0a0',
              border: activeTab === 'listings' ? '2px outset #c0c0c0' : '2px outset #a0a0a0',
              borderBottom: activeTab === 'listings' ? '2px solid #c0c0c0' : '2px inset #a0a0a0',
              fontSize: '12px',
              fontWeight: 'bold',
              color: activeTab === 'listings' ? '#000' : '#666',
            }}
          >
            🏪 在售NFT
          </Win98Button>
          <Win98Button
            onClick={() => setActiveTab('sales')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'sales' ? '#c0c0c0' : '#a0a0a0',
              border: activeTab === 'sales' ? '2px outset #c0c0c0' : '2px outset #a0a0a0',
              borderBottom: activeTab === 'sales' ? '2px solid #c0c0c0' : '2px inset #a0a0a0',
              fontSize: '12px',
              fontWeight: 'bold',
              color: activeTab === 'sales' ? '#000' : '#666',
            }}
          >
            📈 最近交易
          </Win98Button>
          <Win98Button
            onClick={() => setActiveTab('treasury')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'treasury' ? '#c0c0c0' : '#a0a0a0',
              border: activeTab === 'treasury' ? '2px outset #c0c0c0' : '2px outset #a0a0a0',
              borderBottom: activeTab === 'treasury' ? '2px solid #c0c0c0' : '2px inset #a0a0a0',
              fontSize: '12px',
              fontWeight: 'bold',
              color: activeTab === 'treasury' ? '#000' : '#666',
            }}
          >
            💰 市场金库
          </Win98Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{ 
        minHeight: '500px',
        background: '#f0f0f0',
        border: '2px inset #c0c0c0',
        padding: '16px'
      }}>
        {activeTab === 'listings' && renderNFTListings()}
        {activeTab === 'sales' && renderRecentSales()}
        {activeTab === 'treasury' && renderTreasury()}
      </div>

      {/* NFT详情弹窗 */}
      {renderNFTModal()}
    </div>
  );
};


