import { NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useForm } from 'react-hook-form';
import { useAccount, useWriteContract, useBlock } from 'wagmi';
import { parseUnits } from 'viem';
import toast from 'react-hot-toast';
import { useState } from 'react';

import Container from '~/components/containers/Container';
import CardContainer from '~/components/containers/CardContainer';
import { sleepCoinContract, sleepMinterContract, stakingRewardsContract, nftMarketplaceContract } from '~/lib/contracts';
import { clsx } from 'clsx';
import { useSleepContext } from '~/contexts/SleepContext';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '~/lib/client';
import { NftCard, MintInfo } from '~/components/NftCard'; // Assuming MintInfo is exported
import { Address } from 'viem';
import { useMemo } from 'react';
import { xLayerTestnet } from '~/lib/chains';

// --- SVG Generator Function ---
const generateNftSvg = (rank: number, term: number, units: number, status: 'active' | 'mature' | 'penalty' | 'liquidated'): string => {
    
    const statusInfo = {
        active:     { bgGradient: ['#3D5AFE', '#2979FF'], chipColor: '#90CAF9', textColor: '#FFFFFF' },
        mature:     { bgGradient: ['#00C853', '#00E676'], chipColor: '#A5D6A7', textColor: '#FFFFFF' },
        penalty:    { bgGradient: ['#FFAB00', '#FFD600'], chipColor: '#FFE082', textColor: '#000000' },
        liquidated: { bgGradient: ['#D50000', '#FF1744'], chipColor: '#EF9A9A', textColor: '#FFFFFF' },
    };

    const selectedStatus = statusInfo[status];
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);

    const svg = `
    <svg width="400" height="250" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="background" x1="0" y1="0" x2="400" y2="250">
                <stop offset="0%" stop-color="${selectedStatus.bgGradient[0]}" />
                <stop offset="100%" stop-color="${selectedStatus.bgGradient[1]}" />
            </linearGradient>
            <style>
                .brand { font: bold 16px sans-serif; fill: ${selectedStatus.textColor}; opacity: 0.8; text-anchor: end; }
                .chip-text { font: bold 10px sans-serif; fill: black; text-anchor: middle; }
                .main-id { font: normal 32px monospace; fill: ${selectedStatus.textColor}; letter-spacing: 2px; }
                .label { font: normal 12px sans-serif; fill: ${selectedStatus.textColor}; opacity: 0.7; }
                .value { font: bold 16px sans-serif; fill: ${selectedStatus.textColor}; }
            </style>
        </defs>
        
        <rect width="400" height="250" rx="20" fill="url(#background)" />
        
        <text x="380" y="35" class="brand">SLEEP PROTOCOL</text>

        <g transform="translate(30, 50)">
            <rect width="40" height="30" rx="4" fill="${selectedStatus.chipColor}" />
            <rect x="5" y="12" width="15" height="6" rx="2" fill="${selectedStatus.textColor}" opacity="0.3" />
            <rect x="23" y="12" width="12" height="6" rx="2" fill="${selectedStatus.textColor}" opacity="0.3" />
        </g>
        
        <text x="30" y="130" class="main-id"># ${rank}</text>

        <g transform="translate(30, 180)">
            <text class="label">Term</text>
            <text y="20" class="value">${term} Days</text>
        </g>

        <g transform="translate(150, 180)">
            <text class="label">Units</text>
            <text y="20" class="value">${units}</text>
        </g>

        <g transform="translate(270, 180)">
            <text class="label">Status</text>
            <text y="20" class="value">${statusText}</text>
        </g>

    </svg>
    `;
    return svg.replace(/\\n\\s*/g, "");
};


type FormData = {
  amount: number;
  tokenId: number;
  daysAgo: number;
  genesisTs: number;
  feePercent: number;
  tokenAddress: string;
  amount: number;
};

const DevPage: NextPage = () => {
  console.log("Rendering DevPage component at", new Date().toISOString());
  const { t } = useTranslation('common');
  const { address, chain } = useAccount();
  const currentChain = chain ?? xLayerTestnet;
  const { refetchBalance, refetchGlobals } = useSleepContext();

  // --- Admin Mint ---
  const { register: registerMint, handleSubmit: handleSubmitMint, formState: { errors: errorsMint, isValid: isValidMint } } = useForm<{ amount: number }>();
  const { writeContractAsync: ownerMintAsync, isPending: isMinting } = useWriteContract();

  const onOwnerMintSubmit = async (data: { amount: number }) => {
    try {
      const amountInWei = parseUnits(data.amount.toString(), 18);
      await ownerMintAsync({
        ...sleepCoinContract(currentChain),
        functionName: 'ownerMint',
        args: [address, amountInWei],
      });
      toast.success(`Successfully minted ${data.amount} SLEEPING!`);
      
      toast.loading('Refreshing balance...', { id: 'balance-toast' });
      await refetchBalance?.();
      toast.success('Balance updated!', { id: 'balance-toast' });

    } catch (error) {
      console.error(error);
      toast.error('Failed to mint tokens.');
    }
  };

  // --- Minter Time Machine ---
  const { register: registerMaturity, handleSubmit: handleSubmitMaturity, formState: { isValid: isValidMaturity } } = useForm<{ tokenId: number, daysAgo: number }>();
  const { writeContractAsync: setMaturityAsync, isPending: isSettingMaturity } = useWriteContract();

  const onSetMaturitySubmit = async (data: { tokenId: number, daysAgo: number }) => {
    const toastId = 'maturity-toast';
    try {
      // Calculate the target timestamp based on the relative days input
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const newMaturityTs = nowInSeconds - (data.daysAgo * 86400); // 86400 seconds in a day

      const hash = await setMaturityAsync({
        ...sleepMinterContract(currentChain),
        functionName: 'setMaturity',
        args: [BigInt(data.tokenId), BigInt(newMaturityTs)],
      });
      toast.loading('Confirming transaction...', { id: toastId });
      await waitForTransactionReceipt(config, { hash });
      toast.success(`Successfully set maturity for Token ID #${data.tokenId}!`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to set maturity.', { id: toastId });
    }
  };

  // --- Genesis Time Machine ---
  const { register: registerGenesis, handleSubmit: handleSubmitGenesis, formState: { isValid: isValidGenesis } } = useForm<{ genesisTs: number }>();
  const { writeContractAsync: setGenesisTsAsync, isPending: isSettingGenesis } = useWriteContract();

  const onSetGenesisTsSubmit = async (data: { genesisTs: number }) => {
    const toastId = 'genesis-toast';
    try {
      const hash = await setGenesisTsAsync({
        ...sleepMinterContract(currentChain),
        functionName: 'setGenesisTs',
        args: [BigInt(data.genesisTs)],
      });
      toast.loading('Confirming transaction...', { id: toastId });

      const receipt = await waitForTransactionReceipt(config, { hash });

      if (receipt.status === 'success') {
        toast.success('Successfully set new Genesis Timestamp!', { id: toastId });
        await refetchGlobals?.();
        toast.success('Global data refreshed!', { id: toastId, duration: 2000 });
      } else {
        throw new Error('Transaction reverted on-chain');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to set Genesis Timestamp.', { id: toastId });
    }
  };

  // --- Marketplace Fee Control ---
  const { register: registerMarketFee, handleSubmit: handleSubmitMarketFee, formState: { isValid: isValidMarketFee } } = useForm<{ feePercent: number }>();
  const { writeContractAsync: setMarketFeeAsync, isPending: isSettingMarketFee } = useWriteContract();

  const onSetMarketFeeSubmit = async (data: { feePercent: number }) => {
    const toastId = 'market-fee-toast';
    try {
      // Convert percentage to basis points (e.g., 0.5% = 50 basis points)
      const feeBasisPoints = Math.floor(data.feePercent * 100);
      
      if (feeBasisPoints > 1000) { // Max 10%
        toast.error('Fee cannot exceed 10%', { id: toastId });
        return;
      }

      const hash = await setMarketFeeAsync({
        ...nftMarketplaceContract(currentChain),
        functionName: 'setMarketplaceFee',
        args: [BigInt(feeBasisPoints)],
      });
      toast.loading('Confirming transaction...', { id: toastId });

      const receipt = await waitForTransactionReceipt(config, { hash });

      if (receipt.status === 'success') {
        toast.success(`Successfully set marketplace fee to ${data.feePercent}%!`, { id: toastId });
      } else {
        throw new Error('Transaction reverted on-chain');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to set marketplace fee.', { id: toastId });
    }
  };

  // --- Token Recovery (Minter) ---
  const { register: registerRecoverMinter, handleSubmit: handleSubmitRecoverMinter, formState: { isValid: isValidRecoverMinter } } = useForm<{ tokenAddress: string, amount: number }>();
  const { writeContractAsync: recoverMinterAsync, isPending: isRecoveringMinter } = useWriteContract();

  const onRecoverMinterSubmit = async (data: { tokenAddress: string, amount: number }) => {
    try {
      // Note: This assumes the recovered token has 18 decimals.
      // A more robust solution would fetch the token's decimals first.
      const amountInWei = parseUnits(data.amount.toString(), 18);
      await recoverMinterAsync({
        ...sleepMinterContract(currentChain),
        functionName: 'recoverTokens',
        args: [data.tokenAddress, amountInWei],
      });
      toast.success(`Recovery transaction sent for SleepMinter!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to recover tokens from SleepMinter.');
    }
  };

  // --- Token Recovery (Staking) ---
  const { register: registerRecoverStaking, handleSubmit: handleSubmitRecoverStaking, formState: { isValid: isValidRecoverStaking } } = useForm<{ tokenAddress: string, amount: number }>();
  const { writeContractAsync: recoverStakingAsync, isPending: isRecoveringStaking } = useWriteContract();

  const onRecoverStakingSubmit = async (data: { tokenAddress: string, amount: number }) => {
    try {
      const amountInWei = parseUnits(data.amount.toString(), 18);
      await recoverStakingAsync({
        ...stakingRewardsContract(),
        functionName: 'recoverTokens',
        args: [data.tokenAddress, amountInWei],
      });
      toast.success(`Recovery transaction sent for StakingRewards!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to recover tokens from StakingRewards.');
    }
  };

  // --- Token Recovery (Coin) ---
  const { register: registerRecoverCoin, handleSubmit: handleSubmitRecoverCoin, formState: { isValid: isValidRecoverCoin } } = useForm<{ tokenAddress: string, amount: number }>();
  const { writeContractAsync: recoverCoinAsync, isPending: isRecoveringCoin } = useWriteContract();

  const onRecoverCoinSubmit = async (data: { tokenAddress: string, amount: number }) => {
    try {
      const amountInWei = parseUnits(data.amount.toString(), 18);
      await recoverCoinAsync({
        ...sleepCoinContract(currentChain),
        functionName: 'recoverTokens',
        args: [data.tokenAddress, amountInWei],
      });
      toast.success(`Recovery transaction sent for SleepCoin!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to recover tokens from SleepCoin.');
    }
  };

  // --- State for On-Chain NFT Art Studio ---
  const [svgRank, setSvgRank] = useState(12345);
  const [svgTerm, setSvgTerm] = useState(28);
  const [svgUnits, setSvgUnits] = useState(1);
  const [svgStatus, setSvgStatus] = useState<'active' | 'mature' | 'penalty' | 'liquidated'>('active');
    
    const nftSvgString = useMemo(() => {
        return generateNftSvg(svgRank, svgTerm, svgUnits, svgStatus);
    }, [svgRank, svgTerm, svgUnits, svgStatus]);

  // -----------------------------------------


  const { data: block } = useBlock({
      blockTag: 'latest',
      query: {
          blockNumber: 1, // Placeholder, will be updated to 'latest'
      },
  });


  return (
    <Container className="max-w-screen-lg">
      <h1 className="text-3xl font-bold text-center mb-8">Developer Control Panel</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Admin Mint Card */}
        <CardContainer>
          <form onSubmit={handleSubmitMint(onOwnerMintSubmit)}>
            <h2 className="card-title">Admin Mint (SleepCoin)</h2>
            <p className="text-sm opacity-70 mb-4">Mint SLEEPING tokens for testing.</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount to Mint</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 1000000"
                className="input input-bordered"
                {...registerMint('amount', { required: true, min: 1 })}
              />
            </div>
            <div className="card-actions justify-end mt-4">
              <button type="submit" className={clsx('btn btn-primary', { 'loading': isMinting })} disabled={!isValidMint || isMinting}>
                Mint Tokens
              </button>
            </div>
          </form>
        </CardContainer>

        {/* Minter Time Machine Card */}
        <CardContainer>
          <form onSubmit={handleSubmitMaturity(onSetMaturitySubmit)}>
            <h2 className="card-title">Time Machine (Minter)</h2>
            <p className="text-sm opacity-70 mb-4">Modify the maturity of a minted NFT.</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Token ID</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 1"
                className="input input-bordered"
                {...registerMaturity('tokenId', { required: true, min: 1 })}
              />
            </div>
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Set Maturity Relative to Today (Days)</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 3 (for 3 days ago)"
                className="input input-bordered"
                {...registerMaturity('daysAgo', { required: true })}
              />
               <label className="label">
                <span className="label-text-alt">Use 0 for today, 3 for 3 days ago, -7 for 7 days from now.</span>
              </label>
            </div>
            <div className="card-actions justify-end mt-4">
              <button type="submit" className={clsx('btn btn-primary', { 'loading': isSettingMaturity })} disabled={!isValidMaturity || isSettingMaturity}>
                Set Maturity
              </button>
            </div>
          </form>
        </CardContainer>

        {/* Genesis Time Machine Card */}
        <CardContainer>
          <form onSubmit={handleSubmitGenesis(onSetGenesisTsSubmit)}>
            <h2 className="card-title">Genesis Time Machine</h2>
            <p className="text-sm opacity-70 mb-4">Modify the protocol's genesis timestamp to test time-based features.</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">New Genesis (Unix Timestamp)</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 1672531200"
                className="input input-bordered"
                {...registerGenesis('genesisTs', { required: true })}
              />
               <label className="label">
                <span className="label-text-alt">Changes amplifier, max term, etc.</span>
              </label>
            </div>
            <div className="card-actions justify-end mt-4">
              <button type="submit" className={clsx('btn btn-primary', { 'loading': isSettingGenesis })} disabled={!isValidGenesis || isSettingGenesis}>
                Set Genesis Time
              </button>
            </div>
          </form>
        </CardContainer>

        {/* Marketplace Fee Control Card */}
        <CardContainer>
          <form onSubmit={handleSubmitMarketFee(onSetMarketFeeSubmit)}>
            <h2 className="card-title">Marketplace Fee Control</h2>
            <p className="text-sm opacity-70 mb-4">Adjust the marketplace trading fee percentage (0-10%).</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Fee Percentage (%)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="e.g., 0.5"
                className="input input-bordered"
                {...registerMarketFee('feePercent', { 
                  required: true, 
                  min: 0, 
                  max: 10,
                  valueAsNumber: true 
                })}
              />
              <label className="label">
                <span className="label-text-alt">Current: 0.5% (50 basis points)</span>
              </label>
            </div>
            <div className="card-actions justify-end mt-4">
              <button type="submit" className={clsx('btn btn-primary', { 'loading': isSettingMarketFee })} disabled={!isValidMarketFee || isSettingMarketFee}>
                Update Fee
              </button>
            </div>
          </form>
        </CardContainer>

        {/* Token Recovery Card (Minter) */}
        <CardContainer>
          <form onSubmit={handleSubmitRecoverMinter(onRecoverMinterSubmit)}>
            <h2 className="card-title">Recover Tokens (Minter)</h2>
            <p className="text-sm opacity-70 mb-4">Recover ERC20 tokens sent to SleepMinter.</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Token Address</span>
              </label>
              <input
                type="text"
                placeholder="0x..."
                className="input input-bordered"
                {...registerRecoverMinter('tokenAddress', { required: true })}
              />
            </div>
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Amount (in human-readable format)</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g., 1.25"
                className="input input-bordered"
                {...registerRecoverMinter('amount', { required: true, min: 0 })}
              />
            </div>
            <div className="card-actions justify-end mt-4">
              <button type="submit" className={clsx('btn btn-accent', { 'loading': isRecoveringMinter })} disabled={!isValidRecoverMinter || isRecoveringMinter}>
                Recover
              </button>
            </div>
          </form>
        </CardContainer>

        {/* Token Recovery Card (Staking) */}
        <CardContainer>
          <form onSubmit={handleSubmitRecoverStaking(onRecoverStakingSubmit)}>
            <h2 className="card-title">Recover Tokens (Staking)</h2>
            <p className="text-sm opacity-70 mb-4">Recover ERC20 tokens sent to StakingRewards.</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Token Address</span>
              </label>
              <input
                type="text"
                placeholder="0x..."
                className="input input-bordered"
                {...registerRecoverStaking('tokenAddress', { required: true })}
              />
            </div>
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Amount (in human-readable format)</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g., 10.5"
                className="input input-bordered"
                {...registerRecoverStaking('amount', { required: true, min: 0 })}
              />
            </div>
            <div className="card-actions justify-end mt-4">
              <button type="submit" className={clsx('btn btn-accent', { 'loading': isRecoveringStaking })} disabled={!isValidRecoverStaking || isRecoveringStaking}>
                Recover
              </button>
            </div>
          </form>
        </CardContainer>

        {/* Token Recovery Card (Coin) */}
        <CardContainer>
          <form onSubmit={handleSubmitRecoverCoin(onRecoverCoinSubmit)}>
            <h2 className="card-title">Recover Tokens (Coin)</h2>
            <p className="text-sm opacity-70 mb-4">Recover ERC20 tokens sent to SleepCoin.</p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Token Address</span>
              </label>
              <input
                type="text"
                placeholder="0x..."
                className="input input-bordered"
                {...registerRecoverCoin('tokenAddress', { required: true })}
              />
            </div>
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Amount (in human-readable format)</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g., 500.0"
                className="input input-bordered"
                {...registerRecoverCoin('amount', { required: true, min: 0 })}
              />
            </div>
            <div className="card-actions justify-end mt-4">
              <button type="submit" className={clsx('btn btn-accent', { 'loading': isRecoveringCoin })} disabled={!isValidRecoverCoin || isRecoveringCoin}>
                Recover
              </button>
            </div>
          </form>
        </CardContainer>

        {/* On-Chain NFT Art Studio */}
        <CardContainer>
            <h2 className="card-title">🎨 On-Chain NFT Art Studio</h2>
            <p className="text-sm opacity-70 mb-4">
                Design and preview the on-chain SVG for the NFTs. Changes here are reflected live in the preview below, allowing for rapid iteration before writing any Solidity code.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Controls */}
                <div className="space-y-4">
                    <div>
                        <label className="label">
                            <span className="label-text">Rank</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={svgRank}
                            onChange={(e) => setSvgRank(parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <div>
                        <label className="label">
                            <span className="label-text">Term (days)</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={svgTerm}
                            onChange={(e) => setSvgTerm(parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <div>
                        <label className="label">
                            <span className="label-text">Units</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={svgUnits}
                            onChange={(e) => setSvgUnits(parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <div>
                        <label className="label">
                            <span className="label-text">Status</span>
                        </label>
                        <select 
                            className="select select-bordered w-full"
                            value={svgStatus}
                            onChange={(e) => setSvgStatus(e.target.value as any)}
                        >
                            <option value="active">Active</option>
                            <option value="mature">Mature</option>
                            <option value="penalty">Penalty</option>
                            <option value="liquidated">Liquidated</option>
                        </select>
                    </div>
                </div>

                {/* Preview */}
                <div className="p-4 bg-base-300 rounded-lg flex items-center justify-center">
                   <div dangerouslySetInnerHTML={{ __html: nftSvgString }} />
                </div>
            </div>
        </CardContainer>

      </div>
    </Container>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default DevPage;
