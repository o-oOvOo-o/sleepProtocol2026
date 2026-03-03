import type { NextPage } from 'next';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAccount, useBlock, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import NftCard, { MintInfo } from '~/components/NftCard';
import Page from '~/components/Page';
import { ConnectWalletInfo } from '~/components/stake/ConnectWalletInfo';
import Container from '~/components/containers/Container';
import toast from 'react-hot-toast';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { formatUnits } from 'viem';
import { sleepMinterContract } from '~/lib/contracts';

// Add custom styles for animations
const customStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes swordGlow {
    0%, 100% { 
      text-shadow: 0 0 10px #f59e0b, 0 0 20px #f59e0b, 0 0 30px #f59e0b;
      transform: scale(1);
    }
    50% { 
      text-shadow: 0 0 20px #ef4444, 0 0 40px #ef4444, 0 0 60px #ef4444;
      transform: scale(1.1);
    }
  }
  @keyframes battlePulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.8; }
  }
  @keyframes warningBlink {
    0%, 100% { background-color: rgba(239, 68, 68, 0.1); }
    50% { background-color: rgba(239, 68, 68, 0.3); }
  }
  @keyframes targetScan {
    0% { transform: translateX(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(100%); opacity: 0; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out forwards;
  }
  .animate-sword-glow {
    animation: swordGlow 2s ease-in-out infinite;
  }
  .animate-battle-pulse {
    animation: battlePulse 3s ease-in-out infinite;
  }
  .animate-warning-blink {
    animation: warningBlink 2s ease-in-out infinite;
  }
  .animate-target-scan {
    animation: targetScan 3s linear infinite;
  }
`;

const ITEMS_PER_PAGE = 15;
const SUBGRAPH_URL = 'http://127.0.0.1:8000/subgraphs/name/sleep-protocol-subgraph';

// GraphQL Query to get both liquidatable NFTs and statistics in one request
const GET_LIQUIDATABLE_NFTS_QUERY = `
    query GetLiquidatableNfts($currentTime: String!, $first: Int!, $skip: Int!) {
        sleepNftPositions(
            where: { 
                maturityTs_lt: $currentTime, 
                isLiquidated: false 
            },
            orderBy: maturityTs, 
            orderDirection: asc,
            first: $first,
            skip: $skip
        ) {
            id
            tokenId
            owner
            term
            maturityTs
            count
        }
    }
`;

const GET_LIQUIDATION_STATS_QUERY = `
    query GetLiquidationStats {
        liquidationStats(id: "1") {
            totalLiquidatedNfts
            totalLiquidatorRewards
            totalStakingRewards
        }
    }
`;

interface SubgraphNFT {
    id: string;
    tokenId: string;
    owner: string;
    term: string;
    maturityTs: string;
    count: string;
    // No longer need isLiquidated here
}

interface LiquidationStats {
    totalLiquidatedNfts: string;
    totalLiquidatorRewards: string;
    totalStakingRewards: string;
}

interface LiquidationData {
  liquidatableNfts: SubgraphNFT[];
  liquidationStats: LiquidationStats | null;
}

const LiquidatePage: NextPage = () => {
    const { t } = useTranslation('common');
    const { address } = useAccount();
    const [currentPage, setCurrentPage] = useState(1);
    const [nfts, setNfts] = useState<SubgraphNFT[]>([]);
    const [liquidationStats, setLiquidationStats] = useState<LiquidationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const nftsPerPage = 15;

    const { data: block } = useBlock({
        query: {
            refetchInterval: 60000, // Refetch block time every minute
        },
    });
    const now = useMemo(() => block?.timestamp ?? BigInt(Math.floor(Date.now() / 1000)), [block]);
    
    // An NFT is liquidatable if it has been in the 99% penalty zone for at least 10 days.
    // 99% penalty is reached at maturity + 10 days.
    // So, liquidatable timestamp = maturity + 10 days + 10 days = maturity + 20 days.
    // This means we query for NFTs where maturityTs <= now - 20 days.
    const liquidationTimestamp = useMemo(() => now - BigInt(20 * 86400), [now]);
    
    useEffect(() => {
        const fetchAllData = async () => {
            if (!block?.timestamp) return;
            setLoading(true);
            setError(null);

            const nftsQuery = fetch(SUBGRAPH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_LIQUIDATABLE_NFTS_QUERY,
                    variables: {
                        first: nftsPerPage,
                        skip: page * nftsPerPage,
                        currentTime: block.timestamp.toString(),
                    },
                }),
            }).then(res => res.json());

            const statsQuery = fetch(SUBGRAPH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: GET_LIQUIDATION_STATS_QUERY }),
            }).then(res => res.json());

            try {
                const [nftsResult, statsResult] = await Promise.all([nftsQuery, statsQuery]);

                if (nftsResult.errors) throw new Error(`NFTs Error: ${nftsResult.errors.map((e: any) => e.message).join(', ')}`);
                if (statsResult.errors) throw new Error(`Stats Error: ${statsResult.errors.map((e: any) => e.message).join(', ')}`);
                
                // No longer need client-side filtering
                setNfts(nftsResult.data.sleepNftPositions);
                setLiquidationStats(statsResult.data.liquidationStats);

            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [page, block?.timestamp]);
    
    const hasNextPage = nfts.length === ITEMS_PER_PAGE;
    
    const handlePageChange = (page: number) => {
        if (page > 0) {
            setCurrentPage(page);
        }
    };

    return (
        <Page>
            <style jsx>{customStyles}</style>
            {/* Battle Arena Background */}
            <div className="min-h-screen bg-gradient-to-br from-red-950/40 via-slate-900 to-orange-950/40">
                {/* Animated Background Effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-red-500/5 via-transparent to-orange-500/5 animate-pulse"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1),transparent_50%)]"></div>
        </div>

                <Container className="max-w-6xl relative z-10">
                    <div className="space-y-8 py-12">
                        {/* Epic Header Section */}
                        <div className="text-center space-y-6 relative">
                            {/* Giant Animated Sword */}
                            <div className="text-8xl animate-sword-glow mb-8">
                                ⚔️
                            </div>
                            
                            {/* Battle Alert Banner */}
                            <div className="animate-warning-blink rounded-lg p-4 border border-red-500/50 mb-6">
                                <div className="text-red-400 font-bold text-lg tracking-wider">
                                    [ BATTLE ARENA ACTIVE ]
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Main Title with dramatic styling */}
                                <h1 className="text-6xl font-black bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-2xl">
                                    CAPITAL CONQUEST
                                </h1>
                                <div className="w-32 h-1 bg-gradient-to-r from-red-500 to-orange-500 mx-auto rounded-full shadow-lg"></div>
                                
                                {/* Battle Status Indicator */}
                                <div className="flex justify-center items-center gap-3 mt-6">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-red-400 font-mono text-sm tracking-widest">COMBAT MODE ENGAGED</span>
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                            
                            {/* Battle Description */}
                            <div className="max-w-4xl mx-auto space-y-4 relative">
                                {/* Scanning Line Effect */}
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-target-scan"></div>
                                </div>
                                
                                <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded border border-orange-500/30 p-6 animate-battle-pulse">
                                    <p className="text-2xl text-slate-200 font-bold mb-4">
                                        MISSION BRIEFING
                                    </p>
                                    <p className="text-lg text-slate-300 leading-relaxed mb-4">
                                        Hostile assets detected. Abandoned positions have exceeded critical penalty thresholds. 
                                        Execute liquidation protocol for immediate reward extraction.
                                    </p>
                                    <div className="border-t border-orange-500/30 pt-4">
                                        <p className="text-orange-400 font-bold text-center">
                                            REWARD: 1% of original stake per successful liquidation
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Battle Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
                                <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 backdrop-blur-xl rounded border border-red-500/30 p-6 hover:border-red-400/60 transition-all duration-300 hover:scale-105">
                                    <div className="text-center space-y-2">
                                        <div className="text-xs text-red-400 font-mono tracking-widest mb-1">
                                            [ TARGET COUNT ]
                                        </div>
                                        <div className="text-red-400 text-4xl font-black animate-pulse">
                                            {loading ? '...' : nfts.length}
                                        </div>
                                        <div className="text-slate-300 font-bold uppercase tracking-wider text-sm">
                                            HOSTILE ASSETS
                                        </div>
                                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded"></div>
                                        
                                        {/* Historical Data */}
                                        <div className="border-t border-red-500/30 pt-3 mt-3">
                                            <div className="text-xs text-red-300 font-mono tracking-widest mb-1">
                                                TOTAL LIQUIDATED
                                            </div>
                                            <div className="text-red-300 text-xl font-bold">
                                                {liquidationStats?.totalLiquidatedNfts ?? '0'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 backdrop-blur-xl rounded border border-orange-500/30 p-6 hover:border-orange-400/60 transition-all duration-300 hover:scale-105">
                                    <div className="text-center space-y-2">
                                        <div className="text-xs text-orange-400 font-mono tracking-widest mb-1">
                                            [ REWARD RATE ]
                                        </div>
                                        <div className="text-orange-400 text-4xl font-black">
                                            1%
                                        </div>
                                        <div className="text-slate-300 font-bold uppercase tracking-wider text-sm">
                                            EXTRACTION RATE
                                        </div>
                                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded"></div>
                                        
                                        {/* Liquidator Rewards Data */}
                                        <div className="border-t border-orange-500/30 pt-3 mt-3">
                                            <div className="text-xs text-orange-300 font-mono tracking-widest mb-1">
                                                TOTAL REWARDS
                                            </div>
                                            <div className="text-orange-300 text-lg font-bold">
                                                {liquidationStats ? parseFloat(formatUnits(BigInt(liquidationStats.totalLiquidatorRewards), 18)).toFixed(2) : '0.00'} SLEEP
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 backdrop-blur-xl rounded border border-yellow-500/30 p-6 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105">
                                    <div className="text-center space-y-2">
                                        <div className="text-xs text-yellow-400 font-mono tracking-widest mb-1">
                                            [ CRITICAL THRESHOLD ]
                                        </div>
                                        <div className="text-yellow-400 text-4xl font-black">
                                            20+
                                        </div>
                                        <div className="text-slate-300 font-bold uppercase tracking-wider text-sm">
                                            DAYS ABANDONED
                                        </div>
                                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded"></div>
                                        
                                        {/* Staking Rewards Data */}
                                        <div className="border-t border-yellow-500/30 pt-3 mt-3">
                                            <div className="text-xs text-yellow-300 font-mono tracking-widest mb-1">
                                                TO STAKERS (6%)
                                            </div>
                                            <div className="text-yellow-300 text-lg font-bold">
                                                {liquidationStats ? parseFloat(formatUnits(BigInt(liquidationStats.totalStakingRewards), 18)).toFixed(2) : '0.00'} SLEEP
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                        
                        {/* Battle Arena Content */}
                        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded border border-slate-600/50 shadow-2xl">
            {!address ? (
                                <div className="p-12 text-center space-y-6">
                                    <div className="text-4xl font-bold text-red-400 mb-4">
                                        ENTER THE ARENA
                                    </div>
                                    <p className="text-xl text-slate-300 mb-8">
                                        Connect your wallet to join the capital conquest and claim your rewards
                                    </p>
                                    <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 backdrop-blur-xl rounded border border-red-500/30 p-8">
              <ConnectWalletInfo />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 space-y-8">
                                    {loading && currentPage === 1 ? (
                                        <div className="text-center py-16 space-y-4">
                                            <span className="loading loading-spinner loading-lg text-orange-400"></span>
                                            <p className="text-xl text-slate-300 font-semibold">Scanning for vulnerable targets...</p>
                                            <p className="text-sm text-slate-400">Analyzing abandoned positions in the battlefield</p>
                                        </div>
                                    ) : error ? (
                                        <div className="text-center py-16 space-y-6">
                                            <div className="text-red-400 text-2xl font-bold">RECONNAISSANCE FAILED</div>
                                            <p className="text-slate-300">Error fetching battlefield data: {error}</p>
                                            <button 
                                                className="btn btn-outline btn-error hover:btn-error hover:scale-105 transition-all duration-300"
                                                onClick={() => {
                                                    setPage(0); // Reset page to 0 to refetch
                                                    setCurrentPage(1); // Reset current page to 1
                                                }}
                                            >
                                                Retry Scan
                                            </button>
                    </div>
                                    ) : nfts.length > 0 ? (
                                        <>
                                            {/* Battle Header */}
                                            <div className="text-center mb-8 relative">
                                                <div className="animate-warning-blink rounded-lg p-4 border border-red-500/50 mb-4">
                                                    <div className="text-red-400 font-mono text-sm tracking-widest">
                                                        [ TARGETS ACQUIRED ]
                                                    </div>
                                                </div>
                                                
                                                <h2 className="text-4xl font-black text-orange-400 mb-4 tracking-wider">
                                                    HOSTILE ASSETS DETECTED
                                                </h2>
                                                
                                                <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 backdrop-blur-xl rounded border border-orange-500/30 p-4">
                                                    <p className="text-orange-300 font-bold mb-2">TACTICAL ASSESSMENT</p>
                                                    <p className="text-slate-300">Multiple abandoned positions identified. Execute liquidation protocol immediately.</p>
                                                    <div className="flex justify-center items-center gap-2 mt-3">
                                                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                                        <span className="text-orange-400 font-mono text-xs">STRIKE AUTHORIZATION GRANTED</span>
                                                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Target Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {nfts.map((nftData, index) => {
                            const mintInfo: MintInfo = {
                                                        maturityTs: BigInt(nftData.maturityTs),
                                                        term: BigInt(nftData.term),
                                                        count: BigInt(nftData.count),
                                                        rank: BigInt(nftData.rank),
                                                        amplifier: BigInt(nftData.amplifier),
                                                        minter: nftData.owner as `0x${string}`,
                                                    };
                                                    return (
                                                        <div 
                                                            key={nftData.id}
                                                            className="animate-fadeIn"
                                                            style={{ animationDelay: `${index * 100}ms` }}
                                                        >
                                                            {/* Hidden Original NftCard for functionality */}
                                                            <NftCard
                                                                tokenId={BigInt(nftData.tokenId)}
                                                                mintInfo={mintInfo}
                                                                refetch={() => {
                                                                    setPage(0); // Reset page to 0 to refetch
                                                                    setCurrentPage(1); // Reset current page to 1
                                                                }}
                                                                isLiquidation={true}
                                                                className="hidden"
                                                            />
                                                            
                                                            {/* Custom Battle NFT Card */}
                                                            <div className="bg-gradient-to-br from-red-900/20 via-slate-800/90 to-orange-900/20 backdrop-blur-xl rounded border border-red-500/30 hover:border-orange-400/60 shadow-2xl hover:shadow-red-500/20 transition-all duration-500 overflow-hidden group hover:scale-105">
                                                                {/* Hostile Asset Header */}
                                                                <div className="relative overflow-hidden">
                                                                    <div className="bg-gradient-to-br from-red-900/40 via-orange-900/30 to-yellow-900/20 p-4">
                                                                        {/* Warning Stripe */}
                                                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                                                                        
                                                                        {/* Target Classification */}
                                                                        <div className="flex justify-between items-start mb-3">
                                                                            <div className="bg-red-500/20 backdrop-blur-sm rounded px-3 py-1 border border-red-500/40">
                                                                                <span className="text-red-400 font-mono text-xs tracking-widest">HOSTILE ASSET</span>
                                                                            </div>
                                                                            <div className="bg-orange-500/20 backdrop-blur-sm rounded px-3 py-1 border border-orange-500/40">
                                                                                <span className="text-orange-400 font-mono text-xs">#{nftData.tokenId}</span>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Threat Level Display */}
                                                                        <div className="text-center">
                                                                            <div className="text-4xl mb-2 animate-pulse">🎯</div>
                                                                            <div className="text-red-400 font-black text-lg tracking-wider">
                                                                                RANK #{nftData.rank}
                                                                            </div>
                                                                            <div className="text-orange-300 text-sm font-semibold">
                                                                                THREAT LEVEL: HIGH
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* Scanning Line Effect */}
                                                                    <div className="absolute inset-0 overflow-hidden">
                                                                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-target-scan opacity-50"></div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Intel Data */}
                                                                <div className="p-4 space-y-4">
                                                                    {/* Asset Details */}
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="bg-gradient-to-r from-red-500/10 to-red-600/5 rounded border border-red-500/20 p-3">
                                                                            <div className="text-xs text-red-400 font-mono tracking-wider mb-1">
                                                                                TERM
                                                                            </div>
                                                                            <div className="text-red-300 font-bold">
                                                                                {Math.floor(Number(nftData.term) / 86400)}d
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 rounded border border-orange-500/20 p-3">
                                                                            <div className="text-xs text-orange-400 font-mono tracking-wider mb-1">
                                                                                COUNT
                                                                            </div>
                                                                            <div className="text-orange-300 font-bold">
                                                                                {nftData.count}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* Target Owner */}
                                                                    <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded border border-slate-600/30 p-3">
                                                                        <div className="text-xs text-slate-400 font-mono tracking-wider mb-1">
                                                                            ABANDONED BY
                                                                        </div>
                                                                        <div className="font-mono text-slate-300 text-sm">
                                                                            {nftData.owner.slice(0, 6)}...{nftData.owner.slice(-4)}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* Strike Button */}
                                                                    <div className="pt-2">
                                                                        <button 
                                                                            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black py-3 px-4 rounded border border-red-400/50 hover:border-orange-400/60 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-red-500/25 group-hover:animate-pulse"
                                                                            onClick={(e) => {
                                                                                const parent = (e.target as HTMLElement).closest('.animate-fadeIn');
                                                                                const hiddenButton = parent?.querySelector(`[data-token-id="${nftData.tokenId}"] .btn-secondary`);
                                                                                if (hiddenButton) {
                                                                                    (hiddenButton as HTMLButtonElement).click();
                                                                                } else {
                                                                                    console.error('Liquidation button not found for token', nftData.tokenId);
                                                                                    toast.error('Could not initiate liquidation.');
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div className="flex items-center justify-center gap-3">
                                                                                <span className="text-lg">💥</span>
                                                                                <span className="font-black tracking-wider">LIQUIDATE TARGET</span>
                                                                                <span className="text-lg">💥</span>
                                                                            </div>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Battle Navigation */}
                                            <div className="flex justify-center mt-12">
                                                <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded border border-slate-600/50 p-4 shadow-xl">
                                                    <div className="join grid grid-cols-2">
                                                        <button
                                                            className="join-item btn btn-outline border-orange-500/40 hover:bg-orange-500/20 hover:border-orange-400 hover:scale-105 transition-all duration-300"
                                                            disabled={currentPage === 1 || loading}
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                        >
                                                            Previous Wave
                                                        </button>
                                                        <button
                                                            className="join-item btn btn-outline border-orange-500/40 hover:bg-orange-500/20 hover:border-orange-400 hover:scale-105 transition-all duration-300"
                                                            disabled={!hasNextPage || loading}
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                        >
                                                            Next Wave
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                    </>
                ) : (
                                        <div className="text-center py-16 space-y-6">
                                            {/* Mission Complete Display */}
                                            <div className="relative">
                                                <div className="text-6xl mb-4 animate-sword-glow">⚔️</div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/20 to-transparent animate-target-scan"></div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="text-3xl font-black text-green-400 tracking-wider">
                                                    BATTLEFIELD SECURED
                                                </div>
                                                <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 backdrop-blur-xl rounded border border-green-500/30 p-6">
                                                    <p className="text-green-300 text-lg font-bold mb-2">MISSION STATUS: COMPLETE</p>
                                                    <p className="text-slate-300">All hostile assets have been neutralized.</p>
                                                    <p className="text-slate-400 text-sm mt-4">Return to base and await new targets.</p>
                                                </div>
                                                
                                                {/* Radar Sweep Animation */}
                                                <div className="flex justify-center items-center gap-2 mt-6">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    <span className="text-green-400 font-mono text-sm">SCANNING FOR NEW THREATS</span>
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                </div>
                                            </div>
                                        </div>
                )}
              </div>
            )}
          </div>
      </div>
    </Container>
            </div>
        </Page>
  );
};

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

export default LiquidatePage;
