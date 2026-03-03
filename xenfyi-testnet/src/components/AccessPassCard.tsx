import { useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { Address, formatUnits } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import toast from "react-hot-toast";
import { ChevronDownIcon, ChevronUpIcon, TagIcon, XIcon } from "@heroicons/react/outline";
import { clsx } from "clsx";

import { sleepNftMarketplaceContract, tokenAccessPassContract } from "~/lib/contracts";
import { config } from "~/lib/client";
import { xLayerTestnet } from "~/lib/chains";

export interface AccessPassInfo {
    totalLocked: bigint;
    permanentlyLocked: bigint;
    lockStartTime: bigint;
}

interface AccessPassCardProps {
    tokenId: bigint;
    accessPassInfo: AccessPassInfo;
    isOwner?: boolean;
    isListed?: boolean;
    marketPrice?: bigint;
    refetch?: () => void;
    className?: string;
}

const AccessPassCard: React.FC<AccessPassCardProps> = ({
    tokenId,
    accessPassInfo,
    isOwner = false,
    isListed = false,
    marketPrice,
    refetch,
    className
}) => {
    const { address, chain } = useAccount();
    const currentChain = chain ?? xLayerTestnet;
    const [showDetails, setShowDetails] = useState(false);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [listingPrice, setListingPrice] = useState("");
    const [isConfirming, setConfirming] = useState(false);

    const { writeContractAsync, isPending } = useWriteContract();

    const lockStartDate = useMemo(() => {
        if (accessPassInfo.lockStartTime > 0n) {
            return new Date(Number(accessPassInfo.lockStartTime) * 1000);
        }
        return null;
    }, [accessPassInfo.lockStartTime]);

    const isLocked = accessPassInfo.totalLocked > 0n;
    const isPermanentlyLocked = accessPassInfo.permanentlyLocked > 0n;

    const handleListNFT = async () => {
        if (!listingPrice) return;
        
        setConfirming(true);
        try {
            const priceInWei = BigInt(Math.floor(parseFloat(listingPrice) * 1e18));
            const nftContractAddress = tokenAccessPassContract(currentChain).address;
            const hash = await writeContractAsync({
                ...sleepNftMarketplaceContract(currentChain),
                functionName: 'listNFT',
                args: [nftContractAddress, tokenId, priceInWei],
            });
            await waitForTransactionReceipt(config, { hash });
            toast.success('Access Pass listed successfully!');
            setShowPriceModal(false);
            setListingPrice("");
            refetch?.();
        } catch (error) {
            console.error("Listing failed", error);
            toast.error("Failed to list Access Pass.");
        } finally {
            setConfirming(false);
        }
    };

    const handleDelistNFT = async () => {
        setConfirming(true);
        try {
            const nftContractAddress = tokenAccessPassContract(currentChain).address;
            const hash = await writeContractAsync({
                ...sleepNftMarketplaceContract(currentChain),
                functionName: 'delistNFT',
                args: [nftContractAddress, tokenId],
            });
            await waitForTransactionReceipt(config, { hash });
            toast.success('Access Pass delisted successfully!');
            refetch?.();
        } catch (error) {
            console.error("Delisting failed", error);
            toast.error("Failed to delist Access Pass.");
        } finally {
            setConfirming(false);
        }
    };

    const isProcessing = isPending || isConfirming;

    return (
        <>
            <div className={clsx("card bg-base-100 shadow-xl", className)}>
                <div className="card-body">
                    <h3 className="card-title">🎫 Access Pass #{tokenId.toString()}</h3>
                    
                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-semibold">Total Locked:</span>
                            <div className="text-lg font-bold text-primary">
                                {formatUnits(accessPassInfo.totalLocked, 18)} SLEEP
                            </div>
                        </div>
                        <div>
                            <span className="font-semibold">Permanently Locked:</span>
                            <div className="text-lg font-bold text-secondary">
                                {formatUnits(accessPassInfo.permanentlyLocked, 18)} SLEEP
                            </div>
                        </div>
                        <div className="col-span-2">
                            <span className="font-semibold">Lock Status:</span>
                            <div className="flex gap-2 mt-1">
                                {isLocked ? (
                                    <div className="badge badge-success">🔒 Locked</div>
                                ) : (
                                    <div className="badge badge-ghost">🔓 Unlocked</div>
                                )}
                                {isPermanentlyLocked && (
                                    <div className="badge badge-warning">⚡ Permanent</div>
                                )}
                            </div>
                        </div>
                        {lockStartDate && (
                            <div className="col-span-2">
                                <span className="font-semibold">Lock Start Time:</span>
                                <div className="text-sm text-neutral-content">
                                    {lockStartDate.toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detailed Information */}
                    {showDetails && (
                        <div className="mt-4 p-4 bg-base-200 rounded-lg">
                            <h4 className="text-sm font-semibold mb-2">Detailed Information:</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Token ID:</span>
                                    <span className="font-mono">#{tokenId.toString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Lock Ratio:</span>
                                    <span>
                                        {accessPassInfo.totalLocked > 0n 
                                            ? `${((Number(accessPassInfo.permanentlyLocked) / Number(accessPassInfo.totalLocked)) * 100).toFixed(1)}% Permanent`
                                            : 'No locks'
                                        }
                                    </span>
                                </div>
                                {lockStartDate && (
                                    <div className="flex justify-between">
                                        <span>Days Since Lock:</span>
                                        <span>
                                            {Math.floor((Date.now() - lockStartDate.getTime()) / (1000 * 60 * 60 * 24))} days
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Utility Status:</span>
                                    <span className={isLocked ? "text-success" : "text-warning"}>
                                        {isLocked ? "Active for Staking" : "Ready to Lock"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Badges */}
                    <div className="flex gap-2 mt-2">
                        {isListed && (
                            <div className="badge badge-secondary">📈 Listed on Marketplace</div>
                        )}
                        {isOwner && (
                            <div className="badge badge-outline">👤 Owned</div>
                        )}
                        {marketPrice && (
                            <div className="badge badge-accent">
                                💰 {formatUnits(marketPrice, 18)} SLEEP
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="card-actions justify-between items-center mt-4">
                        <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => setShowDetails(!showDetails)}
                        >
                            {showDetails ? "Hide Details" : "Show Details"}
                            {showDetails ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />}
                        </button>
                        
                        {isOwner && (
                            <div className="flex gap-2">
                                {isListed ? (
                                    <button 
                                        className="btn btn-warning btn-sm"
                                        disabled={isProcessing}
                                        onClick={handleDelistNFT}
                                    >
                                        <XIcon className="w-4 h-4 mr-1" />
                                        {isConfirming ? "Delisting..." : "Remove Sale"}
                                    </button>
                                ) : (
                                    <button 
                                        className="btn btn-primary btn-sm"
                                        disabled={isProcessing}
                                        onClick={() => setShowPriceModal(true)}
                                    >
                                        <TagIcon className="w-4 h-4 mr-1" />
                                        List for Sale
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Price Setting Modal */}
            {showPriceModal && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">List Access Pass for Sale</h3>
                        <div className="py-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Price (SLEEP tokens)</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter price..."
                                    className="input input-bordered"
                                    value={listingPrice}
                                    onChange={(e) => setListingPrice(e.target.value)}
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                        </div>
                        <div className="modal-action">
                            <button 
                                className="btn btn-primary"
                                disabled={!listingPrice || isProcessing}
                                onClick={handleListNFT}
                            >
                                {isConfirming ? "Listing..." : "List NFT"}
                            </button>
                            <button 
                                className="btn"
                                onClick={() => {
                                    setShowPriceModal(false);
                                    setListingPrice("");
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AccessPassCard;

