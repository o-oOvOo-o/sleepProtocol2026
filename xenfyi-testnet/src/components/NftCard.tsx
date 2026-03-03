import { useMemo, useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { Address, formatUnits } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import toast from "react-hot-toast";
import { ChevronDownIcon, ChevronUpIcon, ExclamationIcon, TagIcon, XIcon } from "@heroicons/react/outline";
import { clsx } from "clsx";

import { useSleepContext } from "~/contexts/SleepContext";
import { sleepMinterContract, nftMarketplaceContract, sleepCoinContract } from "~/lib/contracts";
import { calculateMintReward, calculatePenaltyPercent, applyPenalty } from "~/lib/reward-calculator";
import { config } from "~/lib/client";
import { xLayerTestnet } from "~/lib/chains";

export interface MintInfo {
    maturityTs: bigint;
    term: bigint;
    count: bigint;
    rank: bigint;
    amplifier: bigint;
    minter: Address;
}

const formatReward = (reward: bigint) => {
    return Number(formatUnits(reward, 18)).toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
    });
};

const BatchDetails = ({ mintInfo, globalRank, genesisTs }: { mintInfo: MintInfo, globalRank: number, genesisTs: number }) => {
    const termInDays = Number(mintInfo.term) / 86400;

    const ranks = Array.from({ length: Number(mintInfo.count) }, (_, i) => mintInfo.rank + BigInt(i));

    return (
        <div className="mt-4 p-4 bg-base-100 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Batch Details:</h4>
            <div className="overflow-x-auto max-h-40">
                <table className="table table-compact w-full">
                    <thead>
                        <tr>
                            <th>Unit Rank</th>
                            <th>Total Reward</th>
                            <th className="text-success">Rank Bonus</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranks.map((rank) => {
                            const { totalReward, rankBonus } = calculateMintReward(termInDays, globalRank, Number(rank), genesisTs);
                            return (
                                <tr key={rank.toString()}>
                                    <td>{rank.toString()}</td>
                                    <td>{formatReward(totalReward)}</td>
                                    <td className="text-success">+{formatReward(rankBonus)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const NftCard = ({ 
    tokenId, 
    mintInfo, 
    refetch, 
    isLiquidation, 
    isMarketplace, 
    marketPrice, 
    seller,
    isListed,
    isOwner,
    className
}: { 
    tokenId: bigint, 
    mintInfo: MintInfo, 
    refetch: () => void, 
    isLiquidation?: boolean,
    isMarketplace?: boolean,
    marketPrice?: bigint,
    seller?: Address,
    isListed?: boolean,
    isOwner?: boolean,
    className?: string
}) => {
    const { genesisTs, globalRank } = useSleepContext();
    const { writeContractAsync, isPending } = useWriteContract();
    const { chain } = useAccount();
    const currentChain = chain ?? xLayerTestnet;
    const [isConfirming, setConfirming] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [listingPrice, setListingPrice] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const maturityDate = new Date(Number(mintInfo.maturityTs) * 1000);
    const isMature = maturityDate.getTime() <= currentTime;

    const { baseReward, rankBonus, penaltyPercent, netBaseReward, netRankBonus } = useMemo(() => {
        if (!genesisTs || genesisTs === 0 || !mintInfo.rank || !globalRank) {
            return { baseReward: 0n, rankBonus: 0n, penaltyPercent: 0, netBaseReward: 0n, netRankBonus: 0n };
        }
        
        const rewardData = calculateMintReward(
            Number(mintInfo.term) / 86400,
            globalRank,
            Number(mintInfo.rank),
            Number(genesisTs)
        );

        const grossBaseReward = rewardData.baseReward * mintInfo.count;
        const grossRankBonus = rewardData.rankBonus * mintInfo.count;

        let penalty = 0;
        if (isMature) {
            penalty = calculatePenaltyPercent(Number(mintInfo.maturityTs));
        }

        const finalBaseReward = applyPenalty(grossBaseReward, penalty);
        const finalRankBonus = applyPenalty(grossRankBonus, penalty);

        return {
            baseReward: grossBaseReward,
            rankBonus: grossRankBonus,
            penaltyPercent: penalty,
            netBaseReward: finalBaseReward,
            netRankBonus: finalRankBonus,
        };
    }, [genesisTs, globalRank, mintInfo, isMature]);

    const handleClaim = async () => {
        setConfirming(true);
        try {
            const hash = await writeContractAsync({
                ...sleepMinterContract(currentChain),
                functionName: 'claimMintReward',
                args: [tokenId],
            });
            await waitForTransactionReceipt(config, { hash });
            toast.success('Reward claimed successfully!');
            refetch();
        } catch (error) {
            console.error("Claim failed", error);
            toast.error("Failed to claim reward.");
        } finally {
            setConfirming(false);
        }
    }

    const handleLiquidate = async () => {
        setConfirming(true);
        try {
            const hash = await writeContractAsync({
                ...sleepMinterContract(currentChain),
                functionName: 'claimFor',
                args: [tokenId],
            });
            await waitForTransactionReceipt(config, { hash });
            toast.success('NFT liquidated successfully!');
            refetch();
        } catch (error) {
            console.error("Liquidation failed", error);
            toast.error("Failed to liquidate NFT.");
        } finally {
            setConfirming(false);
        }
    }

    const handleBuyNFT = async () => {
        if (!marketPrice) return;
        
        setConfirming(true);
        try {
            // First approve SLEEP tokens for the marketplace
            const approveHash = await writeContractAsync({
                ...sleepCoinContract(currentChain),
                functionName: 'approve',
                args: [nftMarketplaceContract(currentChain).address, marketPrice],
            });
            await waitForTransactionReceipt(config, { hash: approveHash });
            
            // Then buy the NFT
            const buyHash = await writeContractAsync({
                ...nftMarketplaceContract(currentChain),
                functionName: 'buyNFT',
                args: [tokenId],
            });
            await waitForTransactionReceipt(config, { hash: buyHash });
            toast.success('NFT purchased successfully!');
            refetch();
        } catch (error) {
            console.error("Purchase failed", error);
            toast.error("Failed to purchase NFT.");
        } finally {
            setConfirming(false);
        }
    }

    const handleListNFT = async (price: string) => {
        if (!price || parseFloat(price) <= 0) {
            toast.error("Please enter a valid price");
            return;
        }
        
        setConfirming(true);
        try {
            const priceInWei = BigInt(Math.floor(parseFloat(price) * 1e18));
            
            // First approve NFT for marketplace
            const approveHash = await writeContractAsync({
                ...sleepMinterContract(currentChain),
                functionName: 'approve',
                args: [nftMarketplaceContract(currentChain).address, tokenId],
            });
            await waitForTransactionReceipt(config, { hash: approveHash });
            
            // Then list the NFT
            const listHash = await writeContractAsync({
                ...nftMarketplaceContract(currentChain),
                functionName: 'listNFT',
                args: [tokenId, priceInWei],
            });
            await waitForTransactionReceipt(config, { hash: listHash });
            toast.success('NFT listed successfully!');
            refetch();
        } catch (error) {
            console.error("Listing failed", error);
            toast.error("Failed to list NFT.");
        } finally {
            setConfirming(false);
        }
    }

    const handleDelistNFT = async () => {
        setConfirming(true);
        try {
            const hash = await writeContractAsync({
                ...nftMarketplaceContract(currentChain),
                functionName: 'delistNFT',
                args: [tokenId],
            });
            await waitForTransactionReceipt(config, { hash });
            toast.success('NFT delisted successfully!');
            refetch();
        } catch (error) {
            console.error("Delisting failed", error);
            toast.error("Failed to delist NFT.");
        } finally {
            setConfirming(false);
        }
    }

    const isProcessing = isPending || isConfirming;
    const endRank = mintInfo.rank + mintInfo.count - 1n;

    return (
        <div className={clsx("card bg-base-200 shadow-md", className)} data-token-id={tokenId.toString()}>
            <div className="card-body">
                <h2 className="card-title">NFT #{tokenId.toString()}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="font-semibold">Maturity:</span> {maturityDate.toLocaleString()}</p>
                    <p><span className="font-semibold">Term:</span> {Number(mintInfo.term) / 86400} days</p>
                    <p><span className="font-semibold">Units:</span> {mintInfo.count.toString()}</p>
                    {mintInfo.count > 1 ? (
                        <p><span className="font-semibold">Rank Range:</span> {`${mintInfo.rank.toString()} - ${endRank.toString()}`}</p>
                    ) : (
                        <p><span className="font-semibold">Rank:</span> {mintInfo.rank.toString()}</p>
                    )}
                    <p className="col-span-2">
                        <span className="font-semibold">Est. Reward:</span>
                        <span> {formatReward(netBaseReward)} SLEEPING</span>
                        {netRankBonus > 0n && (
                            <span className="text-gray-400 ml-1 text-sm">+ Rank Bonus</span>
                        )}
                    </p>
                    {rankBonus > 0n && (
                        <p className="col-span-2 text-success">
                            <span className="font-semibold">Rank Reward:</span> +{formatReward(netRankBonus)} ({baseReward > 0n ? (Number(rankBonus * 10000n / baseReward) / 100).toFixed(2) : '...'}%)
                        </p>
                    )}
                    {isMature && penaltyPercent > 0 && (
                        <p className="col-span-2 text-warning flex items-center">
                            <ExclamationIcon className="w-4 h-4 mr-1" />
                            <span className="font-semibold">Penalty: {penaltyPercent}% - Claim Soon!</span>
                        </p>
                    )}
                </div>
                <div className="card-actions justify-between items-center mt-4">
                     {mintInfo.count > 1 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowDetails(!showDetails)}>
                            {showDetails ? "Hide Details" : "Show Details"}
                            {showDetails ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />}
                        </button>
                    )}
                    
                    {/* Profile page: Show listing/delisting controls for owner */}
                    {isOwner && !isLiquidation && !isMarketplace && (
                        <div className="flex gap-3 items-center">
                            {isListed ? (
                                <button 
                                    className="btn bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 group"
                                    disabled={isProcessing}
                                    onClick={handleDelistNFT}
                                >
                                    <XIcon className="w-4 h-4 mr-1 group-hover:rotate-90 transition-transform duration-300" />
                                    {isConfirming ? "Delisting..." : "Remove Sale"}
                                </button>
                            ) : (
                                <button 
                                    className="btn bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 group"
                                    disabled={isProcessing}
                                    onClick={() => setShowPriceModal(true)}
                                >
                                    <TagIcon className="w-4 h-4 mr-1 group-hover:rotate-12 transition-transform duration-300" />
                                    List for Sale
                                </button>
                            )}
                            <button 
                                className="btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                                disabled={!isMature || isProcessing}
                                onClick={handleClaim}
                            >
                                {isConfirming ? "Claiming..." : (isPending ? "Confirm..." : "Claim Reward")}
                            </button>
                        </div>
                    )}
                    
                    {/* Default single action button for other contexts */}
                    {(!isOwner || isLiquidation || isMarketplace) && (
                        <button 
                            className={clsx("btn", {
                                "btn-primary": !isLiquidation && !isMarketplace,
                                "btn-secondary": isLiquidation,
                                "btn-accent": isMarketplace,
                            })}
                            disabled={
                                isLiquidation ? isProcessing : 
                                isMarketplace ? isProcessing :
                                !isMature || isProcessing
                            }
                            onClick={
                                isLiquidation ? handleLiquidate :
                                isMarketplace ? handleBuyNFT :
                                handleClaim
                            }
                        >
                            {isConfirming ? 
                                (isLiquidation ? "Liquidating..." : 
                                 isMarketplace ? "Purchasing..." : 
                                 "Claiming...") : 
                                (isPending ? "Confirm..." : 
                                 (isLiquidation ? "Liquidate" : 
                                  isMarketplace ? `Buy for ${marketPrice ? (Number(marketPrice) / 1e18).toFixed(2) : '...'} SLEEP` :
                                  "Claim Reward"))
                            }
                        </button>
                    )}
                </div>
                 {showDetails && mintInfo.count > 1 && genesisTs && globalRank && (
                    <BatchDetails mintInfo={mintInfo} globalRank={globalRank} genesisTs={genesisTs} />
                )}
            </div>
            
            {/* Price Input Modal */}
            {showPriceModal && (
                <div className="modal modal-open">
                    <div className="modal-box bg-gradient-to-br from-base-200 to-base-300 border border-base-content/10 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                                <TagIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-base-content">List NFT for Sale</h3>
                                <p className="text-base-content/70 text-sm">NFT #{tokenId.toString()}</p>
                            </div>
                        </div>
                        
                        <div className="form-control mb-6">
                            <label className="label">
                                <span className="label-text font-semibold text-base-content">Price (SLEEP tokens)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    placeholder="Enter your price (e.g., 100.5)"
                                    className="input input-bordered w-full bg-base-100 border-2 border-base-content/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                                    value={listingPrice}
                                    onChange={(e) => setListingPrice(e.target.value)}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className="text-base-content/50 font-medium">SLEEP</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end">
                            <button 
                                className="btn btn-ghost hover:bg-base-content/10 transition-all duration-300" 
                                onClick={() => {
                                    setShowPriceModal(false);
                                    setListingPrice('');
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" 
                                disabled={!listingPrice || parseFloat(listingPrice) <= 0 || isProcessing}
                                onClick={async () => {
                                    await handleListNFT(listingPrice);
                                    setShowPriceModal(false);
                                    setListingPrice('');
                                }}
                            >
                                <TagIcon className="w-4 h-4 mr-2" />
                                {isProcessing ? "Listing..." : "List NFT"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default NftCard;
