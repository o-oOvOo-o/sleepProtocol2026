import { useForm } from 'react-hook-form';
import { useSleepContext } from '~/contexts/SleepContext';
import { formatUnits, parseUnits } from 'viem';
import { useWriteContract } from 'wagmi';
import toast from 'react-hot-toast';
import { MaxValueField } from '../FormFields';
import { ErrorMessage } from '@hookform/error-message';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { sleepCoinContract, stakingRewardsContract } from '~/lib/contracts';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '~/lib/client';

type StakeForm = {
  amount: number;
};

type StakeStatus = 'idle' | 'approving' | 'confirmingApprove' | 'staking' | 'confirmingStake';

export const UnstakedDashboard = () => {
  const { sleepBalance, refetchBalance, refetchUserData } = useSleepContext();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContractAsync: stakeAsync } = useWriteContract();
  const [stakeStatus, setStakeStatus] = useState<StakeStatus>('idle');

  const maxBalance = sleepBalance ? parseFloat(formatUnits(sleepBalance.value, sleepBalance.decimals)) : 0;

  const schema = yup.object().shape({
    amount: yup
      .number()
      .required("Amount is required")
      .max(maxBalance, `Maximum amount is ${maxBalance.toFixed(4)}`)
      .positive("Amount must be positive")
      .typeError("Invalid number"),
  }).required();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<StakeForm>({
    mode: 'onChange',
    resolver: yupResolver(schema),
  });

  const handleStakeSubmit = async (data: StakeForm) => {
    if (!isValid || !sleepBalance) return;

    setStakeStatus('approving');
    try {
      const amountToStake = parseUnits(data.amount.toString(), sleepBalance.decimals);

      const approveHash = await approveAsync({
        ...sleepCoinContract(),
        functionName: 'approve',
        args: [stakingRewardsContract().address, amountToStake],
      });
      
      setStakeStatus('confirmingApprove');
      toast.loading('Waiting for approval confirmation...', { id: 'stake-toast' });
      await waitForTransactionReceipt(config, { hash: approveHash });
      toast.success('Approved! Sending stake transaction...', { id: 'stake-toast' });

      setStakeStatus('staking');
      const stakeHash = await stakeAsync({
        ...stakingRewardsContract(),
        functionName: 'stake',
        args: [amountToStake],
      });
      
      setStakeStatus('confirmingStake');
      toast.loading('Waiting for stake confirmation...', { id: 'stake-toast' });
      await waitForTransactionReceipt(config, { hash: stakeHash });

      toast.success('Stake successful!', { id: 'stake-toast' });
      refetchBalance?.();
      refetchUserData?.();
    } catch (error) {
      console.error("Staking process failed:", error);
      toast.error('Staking failed. Please check console.', { id: 'stake-toast' });
    } finally {
      setStakeStatus('idle');
    }
  };
  
  const getButtonText = () => {
    switch (stakeStatus) {
      case 'approving': return 'Approving...';
      case 'confirmingApprove': return 'Confirming Approval...';
      case 'staking': return 'Staking...';
      case 'confirmingStake': return 'Confirming Stake...';
      default: return 'Stake Your SLEEPING';
    }
  };

  const isProcessing = stakeStatus !== 'idle';

  return (
    <form onSubmit={handleSubmit(handleStakeSubmit)} className="space-y-4">
      <p>You have no SLEEPING tokens staked. Stake now to start earning rewards.</p>
      <MaxValueField
        title="AMOUNT TO STAKE"
        description="The amount of SLEEPING you wish to stake."
        value={maxBalance.toFixed(4)}
        disabled={isProcessing}
        errorMessage={<ErrorMessage errors={errors} name="amount" />}
        register={register("amount")}
        setValue={setValue}
      />
      <div className="form-control w-full">
        <button
          type="submit"
          className={clsx("btn btn-primary", { loading: isProcessing })}
          disabled={isProcessing || !isValid}
        >
          {getButtonText()}
        </button>
      </div>
    </form>
  );
};
