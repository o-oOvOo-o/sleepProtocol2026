import { useSleepContext } from '~/contexts/SleepContext';
import { formatUnits, parseUnits } from 'viem';
import { ClockIcon, InformationCircleIcon } from '@heroicons/react/outline';
import { timedelta } from '~/lib/helpers';
import { useEffect, useState } from 'react';
import { useWriteContract } from 'wagmi';
import { sleepCoinContract, stakingRewardsContract } from '~/lib/contracts';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { MaxValueField } from '../FormFields';
import { ErrorMessage } from '@hookform/error-message';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '~/lib/client';

const VETERAN_SECONDS = 30 * 86400; // 30 days

type ManageStakeForm = {
  amount: number;
};

type StakeStatus = 'idle' | 'approving' | 'confirmingApprove' | 'staking' | 'confirmingStake';

export const StakeDashboard = () => {
  const { userStakeData, sleepBalance, refetchUserData, refetchBalance, totalStaked, rewardPool } = useSleepContext();
  const [showAddStake, setShowAddStake] = useState(false);
  const [showUnstake, setShowUnstake] = useState(false);
  const [manageStakeStatus, setManageStakeStatus] = useState<StakeStatus>('idle');
  const [timeToVeteran, setTimeToVeteran] = useState('');

  const { writeContractAsync: claimOkbAsync, isPending: isClaimingOkb } = useWriteContract();
  const { writeContractAsync: claimSleepAsync, isPending: isClaimingSleep } = useWriteContract();
  const { writeContractAsync: unstakeAsync, isPending: isUnstaking } = useWriteContract();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContractAsync: stakeAsync } = useWriteContract();

  const handleClaimOkb = async () => {
    try {
      await claimOkbAsync({
        ...stakingRewardsContract(),
        functionName: 'claimReward',
      });
      toast.success('OKB rewards claimed!');
      refetchUserData();
    } catch (e) {
      toast.error('Failed to claim OKB rewards.');
      console.error(e);
    }
  };

  const handleClaimSleep = async () => {
    try {
      await claimSleepAsync({
        ...stakingRewardsContract(),
        functionName: 'claimSleepReward',
      });
      toast.success('SLEEPING rewards claimed!');
      refetchUserData();
    } catch (e) {
      toast.error('Failed to claim SLEEPING rewards.');
      console.error(e);
    }
  };

  const handleUnstake = async () => {
    if (confirm('Are you sure you want to unstake all your tokens? This action cannot be undone.')) {
      try {
        await unstakeAsync({
          ...stakingRewardsContract(),
          functionName: 'unstake',
        });
        toast.success('Successfully unstaked all tokens!');
        refetchUserData();
      } catch (e) {
        toast.error('Failed to unstake.');
        console.error(e);
      }
    }
  };

  const maxBalance = sleepBalance ? parseFloat(formatUnits(sleepBalance.value, sleepBalance.decimals)) : 0;
  const maxUnstakeBalance = userStakeData ? parseFloat(formatUnits(userStakeData.totalStake, sleepBalance?.decimals ?? 18)) : 0;

  const schema = yup.object().shape({
    amount: yup
      .number()
      .required("Amount is required")
      .positive("Amount must be positive")
      .typeError("Invalid number"),
  }).required();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    reset,
    trigger,
  } = useForm<ManageStakeForm>({
    mode: 'onChange',
    resolver: yupResolver(schema),
  });

  const handleAddStakeSubmit = async (data: ManageStakeForm) => {
    if (!isValid || !sleepBalance) return;
    const toastId = 'manage-stake-toast';
    setManageStakeStatus('approving');
    try {
      const amount = parseUnits(data.amount.toString(), sleepBalance.decimals);
      toast.loading('Approving token spend...', { id: toastId });
      const approveHash = await approveAsync({
        ...sleepCoinContract(),
        functionName: 'approve',
        args: [stakingRewardsContract().address, amount],
      });
      setManageStakeStatus('confirmingApprove');
      await waitForTransactionReceipt(config, { hash: approveHash });

      toast.loading('Staking tokens...', { id: toastId });
      setManageStakeStatus('staking');
      const stakeHash = await stakeAsync({
        ...stakingRewardsContract(),
        functionName: 'stake',
        args: [amount],
      });
      setManageStakeStatus('confirmingStake');
      await waitForTransactionReceipt(config, { hash: stakeHash });

      toast.success('Successfully added to stake!', { id: toastId });
      reset();
      setShowAddStake(false);
      refetchBalance?.();
      refetchUserData?.();
    } catch (error) {
      console.error("Stake failed:", error);
      toast.error('Failed to add stake.', { id: toastId });
    } finally {
      setManageStakeStatus('idle');
    }
  };

  const handleUnstakeSubmit = async (data: ManageStakeForm) => {
    if (!isValid || !userStakeData || !sleepBalance) return;
    const toastId = 'manage-stake-toast';
    setManageStakeStatus('staking'); // Re-using status for unstaking
    try {
      const amount = parseUnits(data.amount.toString(), sleepBalance.decimals);
      toast.loading('Unstaking tokens...', { id: toastId });
      const unstakeHash = await unstakeAsync({
        ...stakingRewardsContract(),
        functionName: 'unstake',
        args: [amount],
      });
      setManageStakeStatus('confirmingStake');
      await waitForTransactionReceipt(config, { hash: unstakeHash });

      toast.success('Successfully unstaked!', { id: toastId });
      reset();
      setShowUnstake(false);
      refetchBalance?.();
      refetchUserData?.();
    } catch (error) {
      console.error("Unstake failed:", error);
      toast.error('Failed to unstake.', { id: toastId });
    } finally {
      setManageStakeStatus('idle');
    }
  };

  useEffect(() => {
    if (userStakeData && !userStakeData.isVeteran && userStakeData.firstEffectiveTimestamp > 0n) {
      const secondsRemaining = VETERAN_SECONDS - (Math.floor(Date.now() / 1000) - Number(userStakeData.firstEffectiveTimestamp));
      if (secondsRemaining > 0) {
        setTimeToVeteran(timedelta(secondsRemaining));
      }
    }
  }, [userStakeData]);

  if (!userStakeData || !sleepBalance) {
    return <div>Loading stake data...</div>;
  }

  const { totalStake, effectiveStake, pendingStake, userRewards, userSleepRewards, isVeteran } = userStakeData;
  const effectiveShare = totalStaked > 0n ? (Number(effectiveStake * 1000000n / totalStaked) / 10000) : 0;
  const estimatedOkbReward = rewardPool > 0n ? parseFloat(formatUnits(rewardPool, 18)) * (effectiveShare / 100) : 0;

  const getButtonText = (action: 'stake' | 'unstake') => {
    if (manageStakeStatus === 'idle') return action === 'stake' ? 'Confirm & Stake' : 'Confirm & Unstake';
    return 'Processing...';
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
        <div className="stat glass rounded-lg">
          <div className="stat-title flex items-center justify-center">
            Total Staked
            <div className="tooltip tooltip-info ml-1" data-tip="The total amount of SLEEPING you have staked.">
              <InformationCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="stat-value text-primary">{formatUnits(totalStake, sleepBalance.decimals)}</div>
          <div className="stat-desc">Your entire position</div>
        </div>
        <div className="stat glass rounded-lg">
          <div className="stat-title flex items-center justify-center">
            Effective Stake
            <div className="tooltip tooltip-info ml-1" data-tip="Stakes active for over 7 days, earning rewards.">
              <InformationCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="stat-value text-success">{formatUnits(effectiveStake, sleepBalance.decimals)}</div>
          <div className="stat-desc">Earning Share: {effectiveShare.toFixed(4)}%</div>
        </div>
        <div className="stat glass rounded-lg">
          <div className="stat-title flex items-center justify-center">
            Pending Stake
            <div className="tooltip tooltip-info ml-1" data-tip="Stakes less than 7 days old, not yet earning rewards.">
              <InformationCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="stat-value text-warning">{formatUnits(pendingStake, sleepBalance.decimals)}</div>
          <div className="stat-desc">Awaiting activation</div>
        </div>
      </div>
      
      {/* Reward Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
          <div className="stat glass rounded-lg">
            <div className="stat-title">Claimable OKB</div>
            <div className="stat-value text-secondary">{formatUnits(userRewards, 18)}</div>
            <div className="stat-desc">Est. Next: {estimatedOkbReward.toFixed(6)} OKB</div>
          </div>
          <div className="stat glass rounded-lg">
            <div className="stat-title">Claimable SLEEPING</div>
            <div className="stat-value text-accent">{formatUnits(userSleepRewards, sleepBalance.decimals)}</div>
            <div className="stat-desc">From claim penalties</div>
          </div>
      </div>

      {/* Veteran Status */}
      <div className={`alert glass ${isVeteran ? 'alert-success' : 'alert-info'}`}>
        <ClockIcon className="w-8 h-8" />
        <div>
          <h3 className="font-bold">{isVeteran ? "Veteran Status: Active!" : "Veteran Status: In Progress"}</h3>
          <div className="text-xs">
            {isVeteran
              ? "Your effective stake is earning bonus rewards."
              : `Your first stake will become veteran in: ${timeToVeteran}`
            }
          </div>
        </div>
      </div>
      
      <div className="divider">Actions</div>

      {/* Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Manage Stake */}
        <div className="card glass">
          <div className="card-body">
            <h2 className="card-title">Manage Stake</h2>
            <p className="mb-4 text-sm">Add more to your stake or unstake a portion of your tokens (FIFO).</p>
            
            {(showAddStake || showUnstake) && (
              <form onSubmit={handleSubmit(showAddStake ? handleAddStakeSubmit : handleUnstakeSubmit)} className="space-y-4">
                <MaxValueField
                  title={`AMOUNT TO ${showAddStake ? 'ADD' : 'UNSTAKE'}`}
                  value={(showAddStake ? maxBalance : maxUnstakeBalance).toFixed(4)}
                  disabled={manageStakeStatus !== 'idle'}
                  errorMessage={<ErrorMessage errors={errors} name="amount" />}
                  register={register("amount", {
                    validate: async (value) => {
                      const max = showAddStake ? maxBalance : maxUnstakeBalance;
                      if (value > max) return `Maximum is ${max.toFixed(4)}`;
                      return true;
                    }
                  })}
                  setValue={setValue}
                />
                <div className="card-actions justify-end">
                   <button type="button" className="btn btn-ghost" onClick={() => { setShowAddStake(false); setShowUnstake(false); reset(); }}>Cancel</button>
                   <button
                    type="submit"
                    className={clsx("btn btn-primary", { loading: manageStakeStatus !== 'idle' })}
                    disabled={manageStakeStatus !== 'idle' || !isValid}
                  >
                    {getButtonText(showAddStake ? 'stake' : 'unstake')}
                  </button>
                </div>
              </form>
            )}

            <div className={clsx("card-actions justify-center", { 'hidden': showAddStake || showUnstake })}>
              <button className="btn btn-primary btn-outline" onClick={() => { setShowAddStake(true); trigger('amount'); }}>Add to Stake</button>
              <button className="btn btn-ghost btn-outline" onClick={() => { setShowUnstake(true); trigger('amount'); }}>Unstake</button>
            </div>
          </div>
        </div>

        {/* Claim Rewards */}
        <div className="card glass">
          <div className="card-body">
            <h2 className="card-title">Claim Rewards</h2>
            <p className="text-sm">Claim your earned OKB and SLEEPING rewards.</p>
            <div className="card-actions justify-center mt-4">
              <button disabled>{/* Claim OKB */}</button>
              <button disabled>{/* Claim SLEEPING */}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
