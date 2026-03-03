import type { NextPage } from 'next';
import React, { useMemo, useState, useEffect } from 'react';
import { useAccount, useBlock, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '~/lib/client';
import toast from 'react-hot-toast';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import NftCard, { MintInfo } from '~/components/NftCard';
import Page from '~/components/Page';
import { ConnectWalletInfo } from '~/components/stake/ConnectWalletInfo';
import Container from '~/components/containers/Container';
import { nftMarketplaceContract, tokenMinterContract, tokenAccessPassContract } from '~/lib/contracts';
import Link from 'next/link';
import { UserIcon } from '@heroicons/react/24/outline';
import { xLayerTestnet } from '~/lib/chains';
import chainConfigs from '../../../../chain-configs.json';

const ITEMS_PER_PAGE = 12;
const SUBGRAPH_URL = chainConfigs.subgraph.localUrl;

// GraphQL query for market listings
const GET_MARKET_LISTINGS_QUERY = `
    query GetMarketListings($first: Int!, $skip: Int!) {
        marketListings(
            where: {
                active: true
            },
            orderBy: listedAt,
            orderDirection: desc,
            first: $first,
            skip: $skip
        ) {
            id
            tokenId
            nftType
            seller
            price
            listedAt
            nft {
                id
                tokenId
                owner
                term
                maturityTs
                rank
                amplifier
                count
            }
        }
        _meta {
            block {
                number
            }
        }
    }
`;

interface SubgraphMarketListing {
    id: string;
    tokenId: string;
    nftType: 'MINTING_POSITION' | 'ACCESS_PASS';
    seller: string;
    price: string;
    listedAt: string;
    nft: {
        id: string;
        tokenId: string;
        owner: string;
        term: string;
        maturityTs: string;
        rank: string;
        amplifier: string;
        count: string;
    };
}

const MarketPage: NextPage = () => {
    const { t } = useTranslation('common');
    const { address, chain } = useAccount();
    const currentChain = chain ?? xLayerTestnet;
    const [currentPage, setCurrentPage] = useState(1);
    const [listings, setListings] = useState<SubgraphMarketListing[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [purchasingTokenId, setPurchasingTokenId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'price' | 'rank' | 'newest'>('newest');
    const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
    const [countFilter, setCountFilter] = useState<'all' | '1' | '2-5' | '6+'>('all');
    const [termFilter, setTermFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
    
    // Contract interaction hooks
    const { writeContractAsync, isPending } = useWriteContract();
    
    const fetchMarketListings = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(SUBGRAPH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: GET_MARKET_LISTINGS_QUERY,
                    variables: {
                        first: ITEMS_PER_PAGE,
                        skip: (currentPage - 1) * ITEMS_PER_PAGE,
                    },
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.errors) {
                throw new Error(result.errors[0]?.message || 'GraphQL error');
            }
            
            setListings(result.data?.marketListings || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch market data');
            setListings([]);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchMarketListings();
    }, [currentPage]);
    
    const hasNextPage = listings.length === ITEMS_PER_PAGE;
    
    const handlePageChange = (page: number) => {
        if (page > 0) {
            setCurrentPage(page);
        }
    };
    
    // Purchase NFT function
    const handlePurchaseNFT = async (tokenId: string, price: string) => {
        if (!address) return;

        const listing = listings.find(l => l.tokenId === tokenId);
        if (!listing) {
            toast.error("Listing not found.");
            return;
        }
        
        if (listing.seller.toLowerCase() === address.toLowerCase()) {
            toast.error("You cannot buy your own NFT.");
            return;
        }
        
        const toastId = `purchase-${tokenId}`;
        setPurchasingTokenId(tokenId);
        
        try {
            toast.loading('Preparing purchase...', { id: toastId });
            
            // Determine NFT contract address based on nftType
            const nftContractAddress = listing.nftType === 'MINTING_POSITION' 
                ? tokenMinterContract(currentChain).address 
                : tokenAccessPassContract(currentChain).address;
            
            const priceInWei = BigInt(price);

            const hash = await writeContractAsync({
                ...nftMarketplaceContract(currentChain),
                functionName: 'buyNFT',
                args: [nftContractAddress, BigInt(tokenId)],
                value: priceInWei, // Pass the OKB amount here
            });
            
            toast.loading('Confirming transaction...', { id: toastId });
            
            const receipt = await waitForTransactionReceipt(config, { hash });
            
            if (receipt.status === 'success') {
                toast.success(`Successfully purchased NFT #${tokenId}!`, { id: toastId });
                fetchMarketListings(); // Refresh the listings
            } else {
                throw new Error('Transaction reverted');
            }
        } catch (error: any) {
            console.error('Purchase failed:', error);
            toast.error(
                error.message?.includes('insufficient') 
                    ? 'Insufficient OKB balance' // Updated error message
                    : 'Purchase failed. Please try again.',
                { id: toastId }
            );
        } finally {
            setPurchasingTokenId(null);
        }
    };

    // Filtered and sorted listings
    const processedListings = useMemo(() => {
        let filtered = [...listings];
        
        // Apply price filter
        if (priceFilter !== 'all') {
            filtered = filtered.filter(listing => {
                const price = Number(listing.price) / 1e18;
                switch (priceFilter) {
                    case 'low': return price < 10;
                    case 'mid': return price >= 10 && price < 100;
                    case 'high': return price >= 100;
                    default: return true;
                }
            });
        }
        
        // Apply count filter
        if (countFilter !== 'all') {
            filtered = filtered.filter(listing => {
                const count = Number(listing.nft.count);
                switch (countFilter) {
                    case '1': return count === 1;
                    case '2-5': return count >= 2 && count <= 5;
                    case '6+': return count >= 6;
                    default: return true;
                }
            });
        }
        
        // Apply term filter
        if (termFilter !== 'all') {
            filtered = filtered.filter(listing => {
                const termDays = Math.floor(Number(listing.nft.term) / 86400);
                switch (termFilter) {
                    case 'short': return termDays <= 7;
                    case 'medium': return termDays > 7 && termDays <= 30;
                    case 'long': return termDays > 30;
                    default: return true;
                }
            });
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
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
        
        return filtered;
    }, [listings, sortBy, priceFilter, countFilter, termFilter]);
    
    return (
        <Page>

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Geometric Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}></div>
                </div>
                
                <div className="relative z-10 py-24">
                    <Container className="max-w-7xl">
                        <div className="text-center space-y-8">
                            {/* Floating Sleep Icon */}
                            <div className="flex justify-center mb-8">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                    <div className="relative text-8xl animate-bounce">
                                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                                            😴
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Main Title */}
                            <div className="space-y-4">
                                <h1 className="text-6xl lg:text-7xl font-black leading-tight">
                                    <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent animate-pulse">
                                        Sleep Protocol
                                    </span>
                                    <br />
                                    <span className="text-slate-300">Dream Market</span>
                                </h1>
                                <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full"></div>
                            </div>
                            
                            {/* Subtitle */}
                            <p className="text-2xl text-slate-300/90 max-w-4xl mx-auto font-light leading-relaxed">
                                Enter the dreamscape where Sleep Protocol NFTs find their perfect owners. 
                                <br />
                                <span className="text-blue-400 font-medium">Trade in the realm of eternal slumber</span>
                            </p>
                            
                            {/* Premium Stats */}
                            <div className="flex justify-center mt-16">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                                    <div className="group">
                                        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-md p-8 border border-blue-400/30 hover:border-blue-400/60 transition-all duration-500 hover:scale-105">
                                            <div className="text-center space-y-3">
                                                <div className="text-blue-300 text-4xl font-bold group-hover:scale-110 transition-transform duration-300">
                                                    {listings.length}
                                                </div>
                                                <div className="text-slate-300/80 font-medium uppercase tracking-wider text-sm">
                                                    Dream Collections
                                                </div>
                                                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="group">
                                        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-600/10 backdrop-blur-xl rounded-md p-8 border border-purple-400/30 hover:border-purple-400/60 transition-all duration-500 hover:scale-105">
                                            <div className="text-center space-y-3">
                                                <div className="text-purple-300 text-4xl font-bold group-hover:scale-110 transition-transform duration-300">
                                                    X Layer
                                                </div>
                                                <div className="text-slate-300/80 font-medium uppercase tracking-wider text-sm">
                                                    Dream Network
                                                </div>
                                                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent mx-auto"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10">
                <Container className="max-w-7xl py-16">
                    {!address ? (
                        <div className="text-center py-24">
                            <div className="max-w-lg mx-auto">
                                <div className="relative mb-12">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-2xl"></div>
                                    <div className="relative text-8xl">🔐</div>
                                </div>
                                <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                    Connect Your Wallet
                                </h2>
                                <p className="text-xl text-base-content/70 mb-12 leading-relaxed">
                                    Unlock the full potential of the Sleep Protocol marketplace. Connect your wallet to browse, purchase, and manage your NFT collection.
                                </p>
                                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-xl rounded p-8 border border-primary/20">
                                    <ConnectWalletInfo />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Advanced Filter & Sort Bar */}
                            <div className="bg-gradient-to-r from-base-100/80 to-base-200/80 backdrop-blur-xl rounded p-8 border border-base-300/50 shadow-2xl">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                                {loading && currentPage === 1 ? 'Loading Collection...' : `${processedListings.length} Premium NFT${processedListings.length !== 1 ? 's' : ''}`}
                                            </h2>
                                            <div className="flex items-center gap-3">
                                                <div className="badge badge-primary badge-lg">Page {currentPage}</div>
                                                {loading && <span className="loading loading-dots loading-sm text-primary"></span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Sleep-themed Advanced Controls */}
                                    <div className="flex flex-wrap items-center gap-4">
                                        {/* Price Filter */}
                                        <div className="dropdown dropdown-end">
                                            <div tabIndex={0} role="button" className="btn btn-outline btn-lg gap-2 border-blue-400/40 hover:bg-blue-500/20 hover:border-blue-400/60 text-blue-300 transition-colors">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                                </svg>
                                                Price: {priceFilter === 'all' ? 'All' : priceFilter.charAt(0).toUpperCase() + priceFilter.slice(1)}
                                            </div>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-2xl bg-slate-800/95 backdrop-blur-xl rounded w-56 border border-blue-400/30">
                                                <li><a onClick={() => setPriceFilter('all')} className={priceFilter === 'all' ? 'active bg-blue-500/20 text-blue-300' : 'text-slate-300 hover:bg-blue-500/10'}>All Prices</a></li>
                                                <li><a onClick={() => setPriceFilter('low')} className={priceFilter === 'low' ? 'active bg-blue-500/20 text-blue-300' : 'text-slate-300 hover:bg-blue-500/10'}>&lt; 10 OKB</a></li>
                                                <li><a onClick={() => setPriceFilter('mid')} className={priceFilter === 'mid' ? 'active bg-blue-500/20 text-blue-300' : 'text-slate-300 hover:bg-blue-500/10'}>10-100 OKB</a></li>
                                                <li><a onClick={() => setPriceFilter('high')} className={priceFilter === 'high' ? 'active bg-blue-500/20 text-blue-300' : 'text-slate-300 hover:bg-blue-500/10'}>&gt; 100 OKB</a></li>
                                            </ul>
                                        </div>

                                        {/* Count Filter */}
                                        <div className="dropdown dropdown-end">
                                            <div tabIndex={0} role="button" className="btn btn-outline btn-lg gap-2 border-purple-400/40 hover:bg-purple-500/20 hover:border-purple-400/60 text-purple-300 transition-colors">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m6-6h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m-6 0V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1"/>
                                                </svg>
                                                Count: {countFilter === 'all' ? 'All' : countFilter}
                                            </div>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-2xl bg-slate-800/95 backdrop-blur-xl rounded w-56 border border-purple-400/30">
                                                <li><a onClick={() => setCountFilter('all')} className={countFilter === 'all' ? 'active bg-purple-500/20 text-purple-300' : 'text-slate-300 hover:bg-purple-500/10'}>All Counts</a></li>
                                                <li><a onClick={() => setCountFilter('1')} className={countFilter === '1' ? 'active bg-purple-500/20 text-purple-300' : 'text-slate-300 hover:bg-purple-500/10'}>Single (1)</a></li>
                                                <li><a onClick={() => setCountFilter('2-5')} className={countFilter === '2-5' ? 'active bg-purple-500/20 text-purple-300' : 'text-slate-300 hover:bg-purple-500/10'}>Few (2-5)</a></li>
                                                <li><a onClick={() => setCountFilter('6+')} className={countFilter === '6+' ? 'active bg-purple-500/20 text-purple-300' : 'text-slate-300 hover:bg-purple-500/10'}>Many (6+)</a></li>
                                            </ul>
                                        </div>

                                        {/* Term Filter */}
                                        <div className="dropdown dropdown-end">
                                            <div tabIndex={0} role="button" className="btn btn-outline btn-lg gap-2 border-indigo-400/40 hover:bg-indigo-500/20 hover:border-indigo-400/60 text-indigo-300 transition-colors">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <polyline points="12,6 12,12 16,14"/>
                                                </svg>
                                                Term: {termFilter === 'all' ? 'All' : termFilter.charAt(0).toUpperCase() + termFilter.slice(1)}
                                            </div>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-2xl bg-slate-800/95 backdrop-blur-xl rounded w-56 border border-indigo-400/30">
                                                <li><a onClick={() => setTermFilter('all')} className={termFilter === 'all' ? 'active bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-indigo-500/10'}>All Terms</a></li>
                                                <li><a onClick={() => setTermFilter('short')} className={termFilter === 'short' ? 'active bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-indigo-500/10'}>Short ≤ 7d</a></li>
                                                <li><a onClick={() => setTermFilter('medium')} className={termFilter === 'medium' ? 'active bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-indigo-500/10'}>Medium 8-30d</a></li>
                                                <li><a onClick={() => setTermFilter('long')} className={termFilter === 'long' ? 'active bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-indigo-500/10'}>Long &gt; 30d</a></li>
                                            </ul>
                                        </div>
                                        
                                        {/* Sort Options */}
                                        <div className="dropdown dropdown-end">
                                            <div tabIndex={0} role="button" className="btn btn-outline btn-lg gap-2 border-slate-400/40 hover:bg-slate-500/20 hover:border-slate-400/60 text-slate-300 transition-colors">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 6h18M7 12h10M10 18h4"/>
                                                </svg>
                                                Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'price' ? 'Price' : 'Rank'}
                                            </div>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-2xl bg-slate-800/95 backdrop-blur-xl rounded w-56 border border-slate-400/30">
                                                <li><a onClick={() => setSortBy('newest')} className={sortBy === 'newest' ? 'active bg-slate-500/20 text-slate-300' : 'text-slate-300 hover:bg-slate-500/10'}>Newest First</a></li>
                                                <li><a onClick={() => setSortBy('price')} className={sortBy === 'price' ? 'active bg-slate-500/20 text-slate-300' : 'text-slate-300 hover:bg-slate-500/10'}>Price: Low to High</a></li>
                                                <li><a onClick={() => setSortBy('rank')} className={sortBy === 'rank' ? 'active bg-slate-500/20 text-slate-300' : 'text-slate-300 hover:bg-slate-500/10'}>Rank: Low to High</a></li>
                                            </ul>
                                        </div>
                                        
                                        {/* Refresh Button */}
                                        <button 
                                            className="btn btn-lg gap-2 bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-500 hover:to-purple-500 text-white border-none hover:scale-105 transition-all duration-300"
                                            onClick={fetchMarketListings}
                                            disabled={loading}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}>
                                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                                <path d="M21 3v5h-5"/>
                                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                                                <path d="M8 16H3v5"/>
                                            </svg>
                                            Refresh
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Premium Loading State */}
                            {loading && currentPage === 1 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="group">
                                            <div className="bg-gradient-to-br from-base-100 to-base-200 rounded shadow-2xl border border-base-300/50 overflow-hidden animate-pulse">
                                                <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20"></div>
                                                <div className="p-6 space-y-4">
                                                    <div className="h-6 bg-base-300 rounded-full w-3/4"></div>
                                                    <div className="h-4 bg-base-300 rounded-full w-1/2"></div>
                                                    <div className="space-y-2">
                                                        <div className="h-3 bg-base-300 rounded-full"></div>
                                                        <div className="h-3 bg-base-300 rounded-full w-2/3"></div>
                                                    </div>
                                                    <div className="h-12 bg-base-300 rounded"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="text-center py-24">
                                    <div className="max-w-lg mx-auto">
                                        <div className="relative mb-12">
                                            <div className="absolute inset-0 bg-error/20 rounded-full blur-2xl"></div>
                                            <div className="relative text-8xl">⚠️</div>
                                        </div>
                                        <h3 className="text-4xl font-bold mb-6 text-error">Connection Failed</h3>
                                        <p className="text-xl text-base-content/70 mb-12">
                                            {error}
                                        </p>
                                        <button 
                                            className="btn btn-error btn-lg gap-3 hover:scale-105 transition-transform"
                                            onClick={fetchMarketListings}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                                <path d="M21 3v5h-5"/>
                                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                                                <path d="M8 16H3v5"/>
                                            </svg>
                                            Retry Connection
                                        </button>
                                    </div>
                                </div>
                            ) : processedListings.length > 0 ? (
                                <>
                                    {/* Premium NFT Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                        {processedListings.map((listing, index) => {
                                            const mintInfo: MintInfo = {
                                                maturityTs: BigInt(listing.nft.maturityTs),
                                                term: BigInt(listing.nft.term),
                                                count: BigInt(listing.nft.count),
                                                rank: BigInt(listing.nft.rank),
                                                amplifier: BigInt(listing.nft.amplifier),
                                                minter: listing.nft.owner as `0x${string}`,
                                            };
                                            
                                            const price = (Number(listing.price) / 1e18);
                                            const isPurchasing = purchasingTokenId === listing.tokenId;
                                            const isOwner = address === listing.seller;
                                            
                                            return (
                                                <div 
                                                    key={listing.id} 
                                                    className="group"
                                                    style={{ animationDelay: `${index * 100}ms` }}
                                                >
                                                    <div className="bg-gradient-to-br from-base-100 via-base-100 to-base-200/50 backdrop-blur-xl rounded shadow-2xl border border-base-300/50 overflow-hidden hover:shadow-3xl hover:border-primary/30 transition-all duration-700 hover:scale-[1.02] group-hover:-translate-y-2">
                                                        {/* Sleep-themed NFT Visual */}
                                                        <div className="relative overflow-hidden">
                                                            <div className="aspect-square bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-blue-900/40 flex items-center justify-center relative">
                                                                {/* Dreamy Animated Background */}
                                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 animate-pulse"></div>
                                                                <div className="absolute inset-0 opacity-40">
                                                                    <div className="w-full h-full" style={{
                                                                        backgroundImage: `radial-gradient(circle at 30% 30%, rgba(147,197,253,0.4) 0%, transparent 50%), 
                                                                                        radial-gradient(circle at 70% 70%, rgba(196,181,253,0.3) 0%, transparent 50%)`,
                                                                    }}></div>
                                                                </div>
                                                                
                                                                {/* Sleep NFT Content */}
                                                                <div className="text-center z-10 group-hover:scale-110 transition-transform duration-500">
                                                                    <div className="text-6xl mb-4 animate-pulse">😴</div>
                                                                    <div className="text-2xl font-bold text-slate-200 mb-2">Dream NFT</div>
                                                                    <div className="text-lg text-blue-300">#{listing.nft.tokenId}</div>
                                                                </div>
                                                                
                                                                {/* Dreamy Hover Overlay */}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center pb-8">
                                                                    <div className="text-blue-200 font-bold text-lg">
                                                                        Enter Dream
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Moonlight Price Badge */}
                                                                <div className="absolute top-4 right-4">
                                                                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded font-bold shadow-2xl backdrop-blur-sm border border-blue-300/30">
                                                                        <div className="flex items-center gap-2">
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                                                            </svg>
                                                                            <span>{price.toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Star Rank Badge */}
                                                                <div className="absolute top-4 left-4">
                                                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded font-bold text-sm shadow-lg">
                                                                        #{listing.nft.rank}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Sleep-themed Card Content */}
                                                        <div className="p-4 space-y-4">
                                                            <div className="space-y-3">
                                                                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-tight">
                                                                    Dream NFT #{listing.nft.tokenId}
                                                                </h3>
                                                                
                                                                {/* Sleep-themed Stats */}
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="bg-gradient-to-r from-blue-500/15 to-blue-600/10 rounded p-2 border border-blue-400/30">
                                                                        <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                                                                            Sleep Term
                                                                        </div>
                                                                        <div className="text-base font-bold text-slate-200">{Math.floor(Number(listing.nft.term) / 86400)}d</div>
                                                                    </div>
                                                                    <div className="bg-gradient-to-r from-purple-500/15 to-purple-600/10 rounded p-2 border border-purple-400/30">
                                                                        <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider">
                                                                            Dream Count
                                                                        </div>
                                                                        <div className="text-base font-bold text-slate-200">{listing.nft.count}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Dreamy Seller Info */}
                                                            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/30 rounded border border-slate-600/50">
                                                                <div className="avatar placeholder">
                                                                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full w-12">
                                                                        <span className="text-sm font-bold">
                                                                            {listing.seller.slice(2, 4).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                                                        Dream Keeper
                                                                    </div>
                                                                    <div className="font-mono text-xs font-medium text-slate-300 break-all">
                                                                        {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Dreamy Purchase Button */}
                                                            <button 
                                                                className="btn btn-md w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-none shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 group-hover:animate-pulse rounded"
                                                                onClick={() => handlePurchaseNFT(listing.tokenId, listing.price)}
                                                                disabled={isPurchasing || !address || isOwner}
                                                            >
                                                                {isPurchasing ? (
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="loading loading-spinner loading-sm"></span>
                                                                        <span>Entering Dream...</span>
                                                                    </div>
                                                                ) : isOwner ? (
                                                                    <div className="flex flex-col items-center text-center">
                                                                        <span className="font-bold text-sm leading-tight">Your Listing</span>
                                                                        <span className="text-xs opacity-90">Cannot Buy</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center text-center">
                                                                        <span className="font-bold text-sm leading-tight">Enter Dream</span>
                                                                        <span className="text-xs opacity-90">{price.toFixed(2)} OKB</span>
                                                                    </div>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Premium Pagination */}
                                    <div className="flex justify-center mt-20">
                                        <div className="bg-gradient-to-r from-base-100/80 to-base-200/80 backdrop-blur-xl rounded p-4 border border-base-300/50 shadow-2xl">
                                            <div className="join">
                                                <button
                                                    className="join-item btn btn-lg btn-outline border-primary/30 hover:btn-primary hover:scale-105 transition-all duration-300"
                                                    disabled={currentPage === 1 || loading}
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="15,18 9,12 15,6"></polyline>
                                                    </svg>
                                                    Previous
                                                </button>
                                                
                                                <button className="join-item btn btn-lg bg-gradient-to-r from-primary to-secondary text-white border-none">
                                                    <span className="font-bold">Page {currentPage}</span>
                                                </button>
                                                
                                                <button
                                                    className="join-item btn btn-lg btn-outline border-primary/30 hover:btn-primary hover:scale-105 transition-all duration-300"
                                                    disabled={!hasNextPage || loading}
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                >
                                                    Next
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="9,18 15,12 9,6"></polyline>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Premium Empty State */
                                <div className="text-center py-32">
                                    <div className="max-w-2xl mx-auto">
                                        <div className="relative mb-16">
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl"></div>
                                            <div className="relative text-9xl animate-bounce">🏪</div>
                                        </div>
                                        <h3 className="text-5xl font-black mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                            No NFTs Listed Yet
                                        </h3>
                                        <p className="text-2xl text-base-content/70 mb-16 leading-relaxed">
                                            Be the first to list your Sleep Protocol NFT for sale! 
                                            <br />
                                            Start your journey as a premium NFT trader today.
                                        </p>
                                        <a 
                                            href="/app/profile" 
                                            className="btn btn-lg bg-gradient-to-r from-primary to-secondary text-white border-none shadow-2xl hover:shadow-primary/25 hover:scale-110 transition-all duration-300 gap-4"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                            <span className="font-bold">Visit Your Profile</span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="m9 18 6-6-6-6"/>
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Container>
            </div>
            
            {/* Ultra Discrete Trading Fee Notice */}
            <div className="fixed bottom-4 right-4 z-50">
                <div className="tooltip tooltip-left" data-tip="Platform trading fee applies to all transactions">
                    <div className="badge badge-ghost badge-xs opacity-40 hover:opacity-80 transition-all duration-300 text-xs">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        0.5%
                    </div>
                </div>
            </div>
        </Page>
    );
};

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

export default MarketPage;
