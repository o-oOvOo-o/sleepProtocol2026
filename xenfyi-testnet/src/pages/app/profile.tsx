import { NextPage } from "next";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import Container from "~/components/containers/Container";
import CardContainer from "~/components/containers/CardContainer";
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ConnectWalletInfo } from "~/components/stake/ConnectWalletInfo";
import { sleepMinterContract, sleepNftMarketplaceContract, tokenAccessPassContract } from "~/lib/contracts";
import { Address } from "viem";
import { useMemo, useState } from "react";
import NftCard, { MintInfo } from "~/components/NftCard";
import AccessPassCard, { AccessPassInfo } from "~/components/AccessPassCard";
import Pagination from "~/components/Pagination";
import { xLayerTestnet } from "~/lib/chains";

const ITEMS_PER_PAGE = 15;

const ProfilePage: NextPage = () => {
  const { t } = useTranslation('common');
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'mint' | 'access'>('mint');

  // Mint Card NFT balance
  const { data: mintBalance } = useReadContract({
    ...sleepMinterContract(currentChain),
    functionName: 'balanceOf',
    args: [address as Address],
    query: {
        enabled: !!address,
    }
  });

  // Access Pass NFT balance
  const { data: accessBalance } = useReadContract({
    ...tokenAccessPassContract(currentChain),
    functionName: 'balanceOf',
    args: [address as Address],
    query: {
        enabled: !!address,
    }
  });

  const nftCount = useMemo(() => {
    if (activeTab === 'mint') {
      return mintBalance ? Number(mintBalance) : 0;
    } else {
      return accessBalance ? Number(accessBalance) : 0;
    }
  }, [activeTab, mintBalance, accessBalance]);
  
  const totalPages = useMemo(() => Math.ceil(nftCount / ITEMS_PER_PAGE), [nftCount]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, nftCount);
  const itemsOnPage = endIndex - startIndex;

  const { data: tokenIdsResults, isLoading: isLoadingTokenIds, refetch: refetchTokenIds } = useReadContracts({
    contracts: Array.from({ length: itemsOnPage > 0 ? itemsOnPage : 0 }, (_, i) => ({
      ...(activeTab === 'mint' ? sleepMinterContract(currentChain) : tokenAccessPassContract(currentChain)),
      functionName: 'tokenOfOwnerByIndex',
      args: [address as Address, BigInt(startIndex + i)],
    })),
    query: {
        enabled: !!address && nftCount > 0,
    }
  });

  const tokenIds = useMemo(() => {
    return (tokenIdsResults ?? [])
        .filter(r => r.status === 'success' && r.result)
        .map(r => r.result as bigint);
  }, [tokenIdsResults]);


  const { data: mintInfos, refetch: refetchMintInfos, isLoading: isLoadingMintInfos } = useReadContracts({
    contracts: tokenIds.map((tokenId) => ({
        ...(activeTab === 'mint' ? sleepMinterContract(currentChain) : tokenAccessPassContract(currentChain)),
        functionName: activeTab === 'mint' ? 'mintPositions' : 'getLockingInfo',
        args: [tokenId],
    })),
    query: {
        enabled: tokenIds.length > 0,
    }
  });

  // Check if NFTs are listed on marketplace
  const { data: marketListings, refetch: refetchMarketListings, isLoading: isLoadingMarketListings } = useReadContracts({
    contracts: tokenIds.map((tokenId) => {
      const nftContractAddress = activeTab === 'mint' 
        ? sleepMinterContract(currentChain).address 
        : tokenAccessPassContract(currentChain).address;
      
      return {
        ...sleepNftMarketplaceContract(currentChain),
        functionName: 'isListed',
        args: [nftContractAddress, tokenId],
      };
    }),
    query: {
        enabled: tokenIds.length > 0,
    }
  });

  const handleRefetch = () => {
    refetchTokenIds().then(() => {
        refetchMintInfos();
        refetchMarketListings();
    });
  }
  
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleTabChange = (tab: 'mint' | 'access') => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when switching tabs
  };

  const isLoading = (isLoadingTokenIds || isLoadingMintInfos || isLoadingMarketListings) && nftCount > 0;

  return (
    <Container className="max-w-4xl">
      <div className="flex flex-col space-y-6">
        {/* User Profile Header */}
        <CardContainer>
          <div className="flex flex-col space-y-4">
            <h1 className="card-title text-neutral">👤 User Profile</h1>
            {address && (
              <div className="bg-base-200 p-4 rounded-lg">
                <div className="text-sm text-neutral-content mb-2">Wallet Address</div>
                <div className="font-mono text-sm break-all">{address}</div>
              </div>
            )}
            
            {/* NFT Collection Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {mintBalance ? Number(mintBalance) : 0}
                </div>
                <div className="text-xs text-neutral-content">💎 Mint Cards</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">
                  {accessBalance ? Number(accessBalance) : 0}
                </div>
                <div className="text-xs text-neutral-content">🎫 Access Pass</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {(mintBalance ? Number(mintBalance) : 0) + (accessBalance ? Number(accessBalance) : 0)}
                </div>
                <div className="text-xs text-neutral-content">📦 Total NFTs</div>
              </div>
            </div>
          </div>
        </CardContainer>

        <CardContainer>
          <div className="flex flex-col space-y-4">
            {/* NFT Collection */}
            <div className="flex flex-col space-y-4">
              <h2 className="card-title text-neutral">📚 NFT Collection & Marketplace</h2>
              <div className="alert alert-info">
                <div>
                  <h4 className="font-semibold">💡 Marketplace Features:</h4>
                  <p className="text-sm mt-1">
                    • View detailed information for each NFT<br/>
                    • List your NFTs for sale on the marketplace<br/>
                    • Manage your listings (update price, delist)<br/>
                    • Claim rewards from mature Mint Cards
                  </p>
                </div>
              </div>
              <div className="tabs tabs-boxed">
                <button 
                  className={`tab ${activeTab === 'mint' ? 'tab-active' : ''}`}
                  onClick={() => handleTabChange('mint')}
                >
                  💎 Mint Cards
                </button>
                <button 
                  className={`tab ${activeTab === 'access' ? 'tab-active' : ''}`}
                  onClick={() => handleTabChange('access')}
                >
                  🎫 Access Pass
                </button>
              </div>
            </div>
            {!address ? (
              <ConnectWalletInfo />
            ) : (
              <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center">
                        <span className="loading loading-spinner loading-lg"></span>
                        <p>Loading your NFTs...</p>
                    </div>
                ) : nftCount > 0 && mintInfos ? (
                    <>
                        {mintInfos.map((mintInfoResult, index) => {
                            const tokenId = tokenIds[index];
                            const isListed = marketListings?.[index]?.result as boolean ?? false;

                            if (!tokenId) return null;

                            if (activeTab === 'mint') {
                                const mintData = mintInfoResult.result as [bigint, bigint, bigint, bigint, bigint, Address] | undefined;
                                if (!mintData) return null;

                                const mintInfo: MintInfo = {
                                    maturityTs: mintData[0],
                                    term: mintData[1],
                                    count: mintData[2],
                                    rank: mintData[3],
                                    amplifier: mintData[4],
                                    minter: mintData[5],
                                };

                                return (
                                    <NftCard 
                                        key={tokenId.toString()} 
                                        tokenId={tokenId} 
                                        mintInfo={mintInfo} 
                                        refetch={handleRefetch}
                                        isOwner={true}
                                        isListed={isListed}
                                    />
                                );
                            } else {
                                // Access Pass NFT
                                const lockingData = mintInfoResult.result as [bigint, bigint, bigint] | undefined;
                                if (!lockingData) return null;

                                const accessPassInfo: AccessPassInfo = {
                                    totalLocked: lockingData[0],
                                    permanentlyLocked: lockingData[1],
                                    lockStartTime: lockingData[2],
                                };

                                return (
                                    <AccessPassCard
                                        key={tokenId.toString()}
                                        tokenId={tokenId}
                                        accessPassInfo={accessPassInfo}
                                        isOwner={true}
                                        isListed={isListed}
                                        refetch={handleRefetch}
                                    />
                                );
                            }
                        })}
                        {totalPages > 1 && (
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                        )}
                    </>
                ) : (
                    <p>You have no {activeTab === 'mint' ? 'minted NFTs' : 'access pass cards'} yet.</p>
                )}
              </div>
            )}
          </div>
        </CardContainer>
      </div>

    </Container>
  );
};

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

export default ProfilePage;
