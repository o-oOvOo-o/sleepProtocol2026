import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from 'wagmi';
import { readContracts } from 'wagmi/actions';
import { formatUnits, parseEther } from 'viem';
import { toast } from 'react-hot-toast';
import { config } from '~/lib/client';
import { xLayerTestnet } from '~/lib/chains';
import { DataCard, CardTitle, StatRow, StatLabel, StatValue, Win98Button, Win98Input, Win98Label } from './index';
import { 
  tokenMinterContract,
  tokenAccessPassContract,
  sleepNftMarketplaceContract,
  tokenStakingContract,
  tokenCoreContract
} from '~/lib/contracts';
import { useUserListings } from '~/hooks/useSubgraphData';

interface ProfileProps {
  isConnected: boolean;
}

interface NFTData {
  id: number;
  type: 'mint' | 'access';
  maturityDate?: string;
  term?: number;
  quantity?: number;
  rank?: string;
  lockedAmount?: string;
  isPermanentLock?: boolean;
  lockStartTime?: string;
  svgData?: string;
  isMatured?: boolean;
  isClaimed?: boolean;
  // listing状态 (isListed 必须提供，其他可选)
  isListed: boolean;
  listingPrice?: string;
  listingId?: string;
}

interface UserStakeData {
  totalStake: bigint;
  userRewards: bigint;
  userSleepRewards: bigint;
  stakingPower: number;
}

export const Profile: React.FC<ProfileProps> = ({ isConnected }) => {
  const { t } = useTranslation();
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  
  // NOTE: All staking-related states and logic have been moved to Stake.tsx
  // This component is now only responsible for displaying and managing NFTs (listing).

  // Listing states
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedNFTForListing, setSelectedNFTForListing] = useState<NFTData | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [userNFTs, setUserNFTs] = useState<NFTData[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  
  // 上架流程状态
  const [listingStep, setListingStep] = useState<'idle' | 'approving' | 'approved' | 'listing' | 'completed'>('idle');
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [listingTxHash, setListingTxHash] = useState<`0x${string}` | undefined>(undefined);

  // Hooks for LISTING process
  const { data: approveListingTxHash, writeContract: approveListing, isPending: isApprovingListing, reset: resetApproveListing } = useWriteContract();
  const { isSuccess: isApproveListingSuccess } = useWaitForTransactionReceipt({ hash: approveListingTxHash });
  
  const { data: listTxHash, writeContract: list, isPending: isListing, isSuccess: isListSuccess, reset: resetList } = useWriteContract();
  const { isSuccess: isListTxSuccess, isError: isListTxError } = useWaitForTransactionReceipt({ hash: listTxHash });


  // 开始上架流程（授权+上架）
  const handleStartListing = async () => {
    if (!selectedNFTForListing || !address || !listingPrice) {
      toast.error('请填写完整信息！');
      return;
    }

    try {
      setListingStep('approving');
      const tokenId = BigInt(selectedNFTForListing.id);
      
      // 统一授权给 SleepNftMarketplace（无论是 Mint Card 还是 Access Pass）
      const nftContract = selectedNFTForListing.type === 'mint' 
        ? tokenMinterContract(currentChain) 
        : tokenAccessPassContract(currentChain);
      
      console.log(`授权 ${selectedNFTForListing.type === 'mint' ? 'Mint Card' : 'Access Pass'} #${tokenId} 给统一市场合约...`);
      
      approveListing({
        ...nftContract,
        functionName: 'approve',
        args: [sleepNftMarketplaceContract(currentChain).address, tokenId],
      });

      toast.success('授权交易已发送！等待确认后将自动上架...');
    } catch (error: any) {
      console.error('授权NFT失败:', error);
      toast.error(error.message || '授权失败');
      setListingStep('idle');
    }
  };

  // 上架NFT到市场
  const handleListNFT = async () => {
    console.log('handleListNFT 被调用:', { selectedNFTForListing, listingPrice, address });
    
    if (!selectedNFTForListing || !listingPrice || !address) {
      console.error('上架参数不完整:', { selectedNFTForListing, listingPrice, address });
      toast.error('请填写完整信息！');
      return;
    }

    try {
      console.log('开始上架流程...');
      setListingStep('listing');
      const priceInWei = parseEther(listingPrice);
      const tokenId = BigInt(selectedNFTForListing.id);
      
      // 获取NFT合约地址
      const nftContractAddress = selectedNFTForListing.type === 'mint' 
        ? tokenMinterContract(currentChain).address 
        : tokenAccessPassContract(currentChain).address;
      
      console.log('上架参数:', { 
        nftContract: nftContractAddress,
        tokenId: tokenId.toString(), 
        priceInWei: priceInWei.toString(), 
        type: selectedNFTForListing.type 
      });
      
      // 统一调用 SleepNftMarketplace.listNFT(_nftContract, _tokenId, _price)
      console.log(`上架 ${selectedNFTForListing.type === 'mint' ? 'Mint Card' : 'Access Pass'} #${tokenId} 到统一市场合约...`);
      
      list({
        ...sleepNftMarketplaceContract(currentChain),
        functionName: 'listNFT',
        args: [nftContractAddress, tokenId, priceInWei],
      });

      toast.success('上架交易已发送！等待确认...');
      
    } catch (error: any) {
      console.error('上架NFT失败:', error);
      setListingStep('idle');
      if (error.message?.includes('not approved')) {
        toast.error('授权可能未完成，请重试！');
      } else {
        toast.error(error.message || '上架失败');
      }
    }
  };

  // 取消上架NFT
  const handleDelistNFT = async (nft: NFTData) => {
    if (!address || !nft.listingId) {
      toast.error('无法取消上架，缺少必要信息！');
      return;
    }

    try {
      const tokenId = BigInt(nft.id);
      
      // 获取NFT合约地址
      const nftContractAddress = nft.type === 'mint' 
        ? tokenMinterContract(currentChain).address 
        : tokenAccessPassContract(currentChain).address;
      
      console.log(`取消上架 ${nft.type === 'mint' ? 'Mint Card' : 'Access Pass'} #${tokenId}...`);
      
      // 注意: 取消上架也使用 'list' hook，因为它与上架共享 'isPending' 状态
      list({
        ...sleepNftMarketplaceContract(currentChain),
        functionName: 'delistNFT',
        args: [nftContractAddress, tokenId],
      });

      toast.success('取消上架请求已发送！');
      
      // 延迟刷新数据
      setTimeout(() => {
        refreshAllData();
      }, 2000);
      
    } catch (error: any) {
      console.error('取消上架失败:', error);
      toast.error(error.message || '取消上架失败');
    }
  };

  // 打开上架弹窗
  const openListingModal = (nft: NFTData) => {
    setSelectedNFTForListing(nft);
    setListingPrice('');
    setListingStep('idle');
    setApprovalTxHash(undefined);
    setListingTxHash(undefined);
    setShowListingModal(true);
  };

  // Helper函数：检查NFT是否已上架（从 Subgraph 查询）
  const getNFTListingStatus = useCallback((nftId: number, nftType: 'mint' | 'access'): { isListed: boolean; listingPrice?: string; listingId?: string } => {
    if (!userListings) return { isListed: false, listingPrice: undefined, listingId: undefined };
    
    const nftTypeMapping = {
      'mint': 'MINTING_POSITION',
      'access': 'ACCESS_PASS'
    };
    
    const listing = userListings.find(
      listing => 
        listing.tokenId === nftId.toString() && 
        listing.nftType === nftTypeMapping[nftType] &&
        listing.active
    );
    
    if (listing) {
      return {
        isListed: true,
        listingPrice: formatUnits(BigInt(listing.price), 18),
        listingId: listing.id
      };
    }
    
    return { isListed: false, listingPrice: undefined, listingId: undefined };
  }, [userListings]);

  // 🔧 新增：从合约直接读取 listing 状态（作为 Subgraph 的回退方案）
  const [contractListings, setContractListings] = useState<Map<string, { price: bigint }>>(new Map());

  // 从合约读取所有 NFT 的 listing 状态
  useEffect(() => {
    const fetchContractListings = async () => {
      if (!address || userNFTs.length === 0) return;

      console.log('[fetchContractListings] 从合约读取 listing 状态...');
      const listingChecks = userNFTs.map(nft => {
        const nftContractAddress = nft.type === 'mint' 
          ? tokenMinterContract(currentChain).address 
          : tokenAccessPassContract(currentChain).address;
        
        return {
          ...sleepNftMarketplaceContract(currentChain),
          functionName: 'getListing',
          args: [nftContractAddress, BigInt(nft.id)],
        };
      });

      try {
        const results = await readContracts(config, { contracts: listingChecks });
        const newContractListings = new Map();

        results.forEach((result, i) => {
          if (result.status === 'success' && result.result) {
            const [seller, price] = result.result as [string, bigint];
            if (price > 0n) {
              const nft = userNFTs[i];
              const key = `${nft.type}-${nft.id}`;
              newContractListings.set(key, { price });
              console.log(`[fetchContractListings] ${key} 已上架，价格: ${formatUnits(price, 18)} OKB`);
            }
          }
        });

        setContractListings(newContractListings);
      } catch (error) {
        console.error('[fetchContractListings] 读取失败:', error);
      }
    };

    fetchContractListings();
  }, [address, userNFTs, currentChain]);

  // 直接从区块链获取用户NFT详情
  useEffect(() => {
    const fetchUserNFTs = async () => {
      if (!address || !isConnected) {
        console.log('用户未连接或无地址，清空NFT列表');
        setUserNFTs([]);
        return;
      }
      
      console.log('开始获取用户NFT数据:', {
        address,
        mintBalance: mintBalance?.toString(),
        accessPassBalance: accessPassBalance?.toString()
      });
      
      setIsLoadingNFTs(true);
      const nfts: NFTData[] = [];
      
      const fetchNftsByType = async (balance: bigint | undefined, type: 'mint' | 'access') => {
        console.log(`[fetchNftsByType] 开始获取 ${type} NFTs, balance:`, balance?.toString());
        
        if (!balance || Number(balance) === 0) {
          console.log(`[fetchNftsByType] ${type} balance 为 0 或 undefined，跳过`);
          return [];
        }

        const nftContract = type === 'mint' ? tokenMinterContract(currentChain) : tokenAccessPassContract(currentChain);
        const balanceNum = Number(balance);
        console.log(`[fetchNftsByType] ${type}: 将获取 ${balanceNum} 个 NFT, 合约地址:`, nftContract.address);

        // 1. 并行获取所有 token ID
        const tokenIdContracts = Array.from({ length: balanceNum }, (_, i) => ({
          ...nftContract,
          functionName: 'tokenOfOwnerByIndex',
          args: [address!, BigInt(i)],
        }));

        const tokenIdsResult = await readContracts(config, { contracts: tokenIdContracts });
        
        console.log(`[fetchNftsByType] ${type} tokenIdsResult:`, tokenIdsResult);
        
        // 检查失败的调用
        const failedCalls = tokenIdsResult.filter(r => r.status !== 'success');
        if (failedCalls.length > 0) {
          console.error(`[fetchNftsByType] ${type} 有 ${failedCalls.length} 个 tokenId 获取失败:`, failedCalls);
        }
        
        const tokenIds = tokenIdsResult
          .filter(result => result.status === 'success')
          .map(result => result.result as bigint);
        
        console.log(`[fetchNftsByType] ${type} 成功获取 ${tokenIds.length}/${balanceNum} 个 token IDs:`, tokenIds.map(String));

        if (tokenIds.length === 0) {
          console.error(`[fetchNftsByType] ❌ ${type} 没有有效的 token IDs！原始结果:`, tokenIdsResult);
          return [];
        }
        
        // 2. 根据类型并行获取所有 NFT 的元数据
        let metadataContracts: any[];
        if (type === 'mint') {
          metadataContracts = tokenIds.map(tokenId => ({
            ...nftContract,
            functionName: 'mintPositions',
            args: [tokenId],
          }));
        } else { // 'access'
          // 使用 getLockingInfo 函数获取 Access Pass 的锁定信息
          metadataContracts = tokenIds.map(tokenId => ({
            ...nftContract,
            functionName: 'getLockingInfo',
            args: [tokenId],
          }));
        }

        const metadatasResult = await readContracts(config, { contracts: metadataContracts });
        
        console.log(`[fetchNftsByType] ${type} metadatasResult:`, metadatasResult);
        
        // 检查失败的元数据调用
        const failedMetadata = metadatasResult.filter(r => r.status !== 'success');
        if (failedMetadata.length > 0) {
          console.error(`[fetchNftsByType] ${type} 有 ${failedMetadata.length} 个元数据获取失败:`, failedMetadata);
        }

        // 3. 将元数据和 token ID 组合成最终的 NFT 对象
        const nftData = metadatasResult.map((result, i) => {
          const tokenId = tokenIds[i];
          if (result.status !== 'success' || !result.result) {
            console.error(`[fetchNftsByType] ❌ ${type} NFT #${String(tokenId)} 元数据获取失败:`, result);
            return null;
          }
          
          const metadata = result.result as any;
          let listingStatus = getNFTListingStatus(Number(tokenId), type);
          
          // 🔧 回退方案：如果 Subgraph 没有数据，从 contractListings 读取
          if (!listingStatus.isListed) {
            const key = `${type}-${Number(tokenId)}`;
            const contractListing = contractListings.get(key);
            if (contractListing && contractListing.price > 0n) {
              listingStatus = {
                isListed: true,
                listingPrice: formatUnits(contractListing.price, 18),
                listingId: undefined
              };
              console.log(`[fetchNftsByType] 使用合约数据: ${key} 已上架`);
            }
          }

          if (type === 'mint') {
            const [maturityTs, term, count, rank, amplifier] = metadata;
            const isMatured = Number(maturityTs) * 1000 < Date.now();
            return {
              id: Number(tokenId),
              type: 'mint' as const,
              maturityDate: new Date(Number(maturityTs) * 1000).toLocaleDateString(),
              term: Number(term) / 86400,
              quantity: Number(count),
              rank: rank.toString(),
              isMatured: isMatured,
              isClaimed: false,
              isListed: listingStatus.isListed,
              listingPrice: listingStatus.listingPrice,
              listingId: listingStatus.listingId,
            } as NFTData;
          } else { // 'access'
            // getLockingInfo 返回: (totalLocked, permanentlyLocked, lockStartTime)
            const [totalLocked, permanentlyLocked, startTime] = metadata;
            const hasPermanentLock = Number(permanentlyLocked) > 0;
            
            return {
              id: Number(tokenId),
              type: 'access' as const,
              lockedAmount: formatUnits(totalLocked, 18),
              isPermanentLock: hasPermanentLock,
              lockStartTime: new Date(Number(startTime) * 1000).toLocaleDateString(),
              isListed: listingStatus.isListed,
              listingPrice: listingStatus.listingPrice,
              listingId: listingStatus.listingId,
            } as NFTData;
          }
        }).filter((nft): nft is NFTData => nft !== null);
        
        console.log(`[fetchNftsByType] ${type} 最终返回 ${nftData.length} 个 NFT:`, nftData);
        return nftData;
      };

      try {
        console.log('========== 开始并行获取 Mint 和 Access Pass NFTs ==========');
        console.log('mintBalance:', mintBalance?.toString());
        console.log('accessPassBalance:', accessPassBalance?.toString());
        
        const [mintNfts, accessNfts] = await Promise.all([
          fetchNftsByType(mintBalance as bigint | undefined, 'mint'),
          fetchNftsByType(accessPassBalance as bigint | undefined, 'access')
        ]);
        
        console.log('========== NFT 获取完成 ==========');
        console.log('mintNfts 数量:', mintNfts.length, mintNfts);
        console.log('accessNfts 数量:', accessNfts.length, accessNfts);
        
        const allNfts = [...mintNfts, ...accessNfts];
        console.log('========== 合并后所有 NFTs ==========');
        console.log('总数量:', allNfts.length);
        console.log('详细数据:', allNfts);
        
        setUserNFTs(allNfts);
        
      } catch (error) {
        console.error('Error fetching user NFTs:', error);
      } finally {
        setIsLoadingNFTs(false);
      }
    };

    fetchUserNFTs();
  }, [address, isConnected, mintBalance, accessPassBalance, userListings, getNFTListingStatus, currentChain]);

  // 监听授权完成，自动触发上架
  useEffect(() => {
    console.log('授权状态监听:', { isApproveListingSuccess, listingStep, approvalTxHash });
    
    if (isApproveListingSuccess && listingStep === 'approving') {
      console.log('授权成功，准备自动上架...');
      setListingStep('approved');
      toast.success('授权成功！正在自动上架NFT...');
      
      // 延迟一秒后自动触发上架
      setTimeout(() => {
        console.log('开始自动上架NFT...');
        handleListNFT();
      }, 1000);
    }
  }, [isApproveListingSuccess, listingStep, approvalTxHash]);

  // 监听上架交易确认
  useEffect(() => {
    if (isListTxSuccess && listingStep === 'listing') {
      setListingStep('completed');
      toast.success('🎉 NFT上架成功！');
      
      // 延迟刷新数据，确保区块链状态已更新
      setTimeout(() => {
        refreshAllData();
      }, 2000);
      
      // 延迟3秒后关闭弹窗，让用户看到成功状态
      setTimeout(() => {
        setShowListingModal(false);
        setSelectedNFTForListing(null);
        setListingPrice('');
        setListingStep('idle');
        setApprovalTxHash(undefined);
        setListingTxHash(undefined);
      }, 3000);
    } else if (isListTxError && listingStep === 'listing') {
      setListingStep('idle');
      toast.error('❌ NFT上架失败，请重试！');
    }
  }, [isListTxSuccess, isListTxError, listingStep, refreshAllData]);

  // 获取用户的listing状态
  const { data: userListings, loading: isLoadingListings, error: listingsError, refetch: refetchListings } = useUserListings();

  // 获取 SLEEP 代币余额
  const { data: sleepBalance, isLoading: isLoadingSleepBalance, refetch: refetchSleepBalance } = useReadContract({
    ...tokenCoreContract(),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 直接从区块链查询用户NFT余额
  const { data: mintBalance, isLoading: isLoadingMintBalance, refetch: refetchMintBalance } = useReadContract({
    ...tokenMinterContract(currentChain),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  const { data: accessPassBalance, isLoading: isLoadingAccessBalance, refetch: refetchAccessBalance } = useReadContract({
    ...tokenAccessPassContract(currentChain),
    functionName: 'balanceOf', 
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 监听授权交易确认
  const { data: approvalReceipt, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
  });

  // 监听上架交易确认
  const { data: listingReceipt, isSuccess: isListingSuccess, isError: isListingError } = useWaitForTransactionReceipt({
    hash: listingTxHash,
  });

  const refreshAllData = useCallback(async () => {
    try {
      console.log('开始刷新数据...');
      // 注意: 不再需要 refetchStaking()，因为质押数据获取依赖于NFT余额
      const results = await Promise.all([
        refetchMintBalance(),
        refetchAccessBalance(), 
        refetchListings(),
        refetchSleepBalance()
      ]);
      console.log('数据刷新结果:', results);
      toast.success('数据已刷新！');
    } catch (error) {
      console.error('刷新数据失败:', error);
      toast.error('刷新数据失败，请重试');
    }
  }, [refetchMintBalance, refetchAccessBalance, refetchListings, refetchSleepBalance]);

  if (!isConnected) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: '#666'
      }}>
        {t('sleepProtocol.profile.connectWallet')}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {isLoadingNFTs || isLoadingMintBalance || isLoadingAccessBalance ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          color: '#666'
        }}>
          正在加载用户数据...
        </div>
      ) : (
        <>
          {/* 添加手动刷新按钮和调试信息 */}
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: '#666' }}>
              调试: Mint余额={mintBalance?.toString() || '0'}, Access余额={accessPassBalance?.toString() || '0'}
            </div>
            <Win98Button
              onClick={refreshAllData}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              🔄 刷新数据
            </Win98Button>
          </div>

          {/* NFT 展示区域 */}
          <DataCard style={{ marginBottom: '20px' }}>
            <CardTitle>{t('sleepProtocol.profile.nfts.title')}</CardTitle>
            
            {/* 调试信息 */}
            <div style={{ padding: '8px', background: '#e0e0e0', marginBottom: '8px', fontSize: '11px' }}>
              🐛 调试: userNFTs.length = {userNFTs.length} | 
              Mint: {userNFTs.filter(n => n.type === 'mint').length} | 
              Access: {userNFTs.filter(n => n.type === 'access').length}
            </div>
            
            {userNFTs.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '40px',
                background: '#f0f0f0',
                border: '1px inset #c0c0c0'
              }}>
                {t('sleepProtocol.profile.nfts.noNFTs')}
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '16px',
                padding: '16px'
              }}>
                {userNFTs.map((nft) => {
                  console.log('🎨 渲染单个 NFT:', nft);
                  return (
                  <div
                    key={`${nft.type}-${nft.id}`}
                    style={{
                      background: '#f0f0f0',
                      border: '2px outset #c0c0c0',
                      padding: '12px',
                      borderRadius: '4px'
                    }}
                  >
                    {/* NFT Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #ccc'
                    }}>
                      <h4 style={{ 
                        margin: 0, 
                        color: nft.type === 'mint' ? '#ff6b6b' : '#4ecdc4',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {nft.type === 'mint' ? 'Mint Card' : 'Access Pass'} #{nft.id}
                      </h4>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {nft.isListed && (
                          <div style={{
                            background: '#ff9500',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '9px',
                            fontWeight: 'bold'
                          }}>
                            🏪 已上架
                          </div>
                        )}
                        <div style={{
                          background: nft.type === 'mint' ? '#ff6b6b' : '#4ecdc4',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}>
                          {nft.type === 'mint' ? 'MINT' : 'ACCESS'}
                        </div>
                      </div>
                    </div>

                    {/* NFT Details */}
                    <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                      {nft.type === 'mint' && (
                        <>
                          <StatRow>
                            <StatLabel>Term</StatLabel>
                            <StatValue>{nft.term} days</StatValue>
                          </StatRow>
                          <StatRow>
                            <StatLabel>Quantity</StatLabel>
                            <StatValue>{nft.quantity}</StatValue>
                          </StatRow>
                          <StatRow>
                            <StatLabel>Rank</StatLabel>
                            <StatValue>{nft.rank}</StatValue>
                          </StatRow>
                          <StatRow>
                            <StatLabel>Maturity</StatLabel>
                            <StatValue>{nft.maturityDate}</StatValue>
                          </StatRow>
                          <StatRow>
                            <StatLabel>Status</StatLabel>
                            <StatValue style={{ 
                              color: nft.isMatured ? (nft.isClaimed ? '#666' : '#008000') : '#ff6600',
                              fontWeight: 'bold'
                            }}>
                              {nft.isClaimed ? 'Claimed' : nft.isMatured ? 'Ready' : 'Pending'}
                            </StatValue>
                          </StatRow>
                        </>
                      )}
                      {nft.type === 'access' && (
                        <>
                          <StatRow>
                            <StatLabel>Locked Amount</StatLabel>
                            <StatValue>{nft.lockedAmount} SLEEPING</StatValue>
                          </StatRow>
                          <StatRow>
                            <StatLabel>Lock Type</StatLabel>
                            <StatValue>
                              {nft.isPermanentLock ? 'Permanent' : 'Temporary'}
                            </StatValue>
                          </StatRow>
                          <StatRow>
                            <StatLabel>Lock Start</StatLabel>
                            <StatValue>{nft.lockStartTime}</StatValue>
                          </StatRow>
                        </>
                      )}
                      {/* Listing信息 */}
                      {nft.isListed && (
                        <StatRow>
                          <StatLabel>上架价格</StatLabel>
                          <StatValue style={{ 
                            color: '#ff9500',
                            fontWeight: 'bold'
                          }}>
                            {nft.listingPrice} OKB
                          </StatValue>
                        </StatRow>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      marginTop: '12px',
                      paddingTop: '8px',
                      borderTop: '1px solid #ccc'
                    }}>
                      <Win98Button 
                        style={{ flex: 1, fontSize: '10px', padding: '4px 8px' }}
                        onClick={() => {
                          // 显示NFT详细信息弹窗
                          alert(`NFT Details:\n\nType: ${nft.type === 'mint' ? 'Mint Card' : 'Access Pass'}\nToken ID: #${nft.id}\nOwner: ${address}\n${nft.type === 'mint' ? 
                            `Term: ${nft.term} days\nQuantity: ${nft.quantity}\nRank: ${nft.rank}\nMaturity: ${nft.maturityDate}` : 
                            `Locked Amount: ${nft.lockedAmount} SLEEPING\nLock Type: ${nft.isPermanentLock ? 'Permanent' : 'Temporary'}\nLock Start: ${nft.lockStartTime}`
                          }`);
                        }}
                      >
                        View Details
                      </Win98Button>
                      {nft.isListed ? (
                        <Win98Button 
                          style={{ 
                            flex: 1, 
                            fontSize: '10px', 
                            padding: '4px 8px',
                            background: '#ff9500',
                            color: 'white'
                          }}
                          onClick={() => handleDelistNFT(nft)}
                        >
                          取消上架
                        </Win98Button>
                      ) : (
                        <Win98Button 
                          style={{ flex: 1, fontSize: '10px', padding: '4px 8px' }}
                          onClick={() => openListingModal(nft)}
                        >
                          上架
                        </Win98Button>
                      )}
                      {nft.type === 'mint' && (
                        <Win98Button 
                          style={{ 
                            flex: 1, 
                            fontSize: '10px', 
                            padding: '4px 8px',
                            background: nft.isMatured && !nft.isClaimed ? '#008000' : '#c0c0c0',
                            color: nft.isMatured && !nft.isClaimed ? 'white' : '#666'
                          }}
                          disabled={!nft.isMatured || nft.isClaimed}
                        >
                          {nft.isClaimed ? 'Claimed' : nft.isMatured ? 'Claim' : 'Not Ready'}
                        </Win98Button>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </DataCard>

          {/* 账户信息 */}
          <DataCard>
            <CardTitle>{t('sleepProtocol.profile.account.title')}</CardTitle>
            <div style={{ padding: '12px', background: '#f0f0f0', border: '1px inset #c0c0c0' }}>
              <StatRow>
                <StatLabel>{t('sleepProtocol.profile.account.address')}</StatLabel>
                <StatValue style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.profile.account.mintCards')}</StatLabel>
                <StatValue>
                  {userNFTs.filter(nft => nft.type === 'mint').length}
                </StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>{t('sleepProtocol.profile.account.accessPasses')}</StatLabel>
                <StatValue>
                  {userNFTs.filter(nft => nft.type === 'access').length}
                </StatValue>
              </StatRow>
            </div>
          </DataCard>
        </>
      )}

      {/* NFT上架弹窗 */}
      {showListingModal && selectedNFTForListing && (
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
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <CardTitle>
                上架 {selectedNFTForListing.type === 'mint' ? 'Mint Card' : 'Access Pass'} #{selectedNFTForListing.id}
              </CardTitle>
              <Win98Button
                onClick={() => setShowListingModal(false)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                ✕
              </Win98Button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <StatRow>
                <StatLabel>NFT类型:</StatLabel>
                <StatValue>{selectedNFTForListing.type === 'mint' ? 'Mint Card' : 'Access Pass'}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>Token ID:</StatLabel>
                <StatValue>#{selectedNFTForListing.id}</StatValue>
              </StatRow>
              {selectedNFTForListing.type === 'mint' && (
                <>
                  <StatRow>
                    <StatLabel>期限:</StatLabel>
                    <StatValue>{selectedNFTForListing.term} 天</StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>数量:</StatLabel>
                    <StatValue>{selectedNFTForListing.quantity}</StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>到期时间:</StatLabel>
                    <StatValue>{selectedNFTForListing.maturityDate}</StatValue>
                  </StatRow>
                </>
              )}
              {selectedNFTForListing.type === 'access' && (
                <>
                  <StatRow>
                    <StatLabel>锁定金额:</StatLabel>
                    <StatValue>{selectedNFTForListing.lockedAmount} SLEEPING</StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>锁定类型:</StatLabel>
                    <StatValue>{selectedNFTForListing.isPermanentLock ? '永久' : '临时'}</StatValue>
                  </StatRow>
                </>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '12px', 
                fontWeight: 'bold' 
              }}>
                售价 (OKB):
              </label>
              <Win98Input
                type="number"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="输入售价，例如: 1.5"
                style={{ width: '100%', marginBottom: '8px' }}
              />
              <div style={{ fontSize: '10px', color: '#666' }}>
                建议价格: 根据NFT稀有度和市场行情定价
              </div>
            </div>

            {/* 流程状态显示 */}
            {listingStep !== 'idle' && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                background: '#e6f3ff', 
                border: '1px solid #0066cc',
                fontSize: '11px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔄 上架进度：</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%',
                    background: listingStep === 'approving' ? '#ff9500' : 
                               listingStep === 'approved' || listingStep === 'listing' || listingStep === 'completed' ? '#008000' : '#ccc',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px'
                  }}>
                    {listingStep === 'approving' ? '⏳' : '✓'}
                  </div>
                  <span>1. 授权NFT</span>
                  <div style={{ flex: 1, height: '2px', background: '#ccc', margin: '0 8px' }}>
                    <div style={{ 
                      height: '100%', 
                      background: listingStep === 'approved' || listingStep === 'listing' || listingStep === 'completed' ? '#008000' : '#ccc',
                      width: listingStep === 'approved' || listingStep === 'listing' || listingStep === 'completed' ? '100%' : '0%',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%',
                    background: listingStep === 'listing' ? '#ff9500' : 
                               listingStep === 'completed' ? '#008000' : '#ccc',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px'
                  }}>
                    {listingStep === 'listing' ? '⏳' : listingStep === 'completed' ? '✓' : '2'}
                  </div>
                  <span>2. 上架NFT</span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
                  {listingStep === 'approving' && '正在等待授权交易确认...'}
                  {listingStep === 'approved' && '授权成功！准备上架...'}
                  {listingStep === 'listing' && '正在上架NFT到市场...'}
                  {listingStep === 'completed' && '🎉 NFT上架成功！'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <Win98Button
                style={{ flex: 1, padding: '8px 12px', fontSize: '11px' }}
                onClick={() => setShowListingModal(false)}
                disabled={listingStep === 'approving' || listingStep === 'listing'}
              >
                {listingStep === 'completed' ? '完成' : '取消'}
              </Win98Button>
              <Win98Button
                style={{ 
                  flex: 2, 
                  padding: '8px 12px',
                  fontSize: '11px',
                  background: !listingPrice ? '#c0c0c0' : 
                             listingStep === 'idle' ? '#008000' :
                             listingStep === 'approving' ? '#ff9500' :
                             listingStep === 'listing' ? '#ff9500' :
                             listingStep === 'completed' ? '#008000' : '#c0c0c0',
                  color: !listingPrice ? '#666' : 'white'
                }}
                disabled={!listingPrice || listingStep === 'approving' || listingStep === 'listing'}
                onClick={handleStartListing}
              >
                {listingStep === 'idle' && '🚀 开始上架'}
                {listingStep === 'approving' && '⏳ 等待授权确认...'}
                {listingStep === 'approved' && '⏳ 准备上架...'}
                {listingStep === 'listing' && '⏳ 正在上架...'}
                {listingStep === 'completed' && '✅ 上架完成'}
              </Win98Button>
            </div>

            <div style={{ 
              marginTop: '12px', 
              padding: '8px', 
              background: '#ffffcc', 
              border: '1px solid #ffcc00',
              fontSize: '10px'
            }}>
              💡 <strong>一键上架流程：</strong><br/>
              🔹 点击"开始上架"后，系统将自动完成授权和上架两个步骤<br/>
              🔹 首先会请求授权NFT给市场合约<br/>
              🔹 授权确认后，自动发起上架交易<br/>
              📝 整个过程需要确认两次钱包交易
            </div>
          </DataCard>
        </div>
      )}
    </div>
  );
};