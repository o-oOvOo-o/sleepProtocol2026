import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import { NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  useAccount,
  useFeeData,
  useWriteContract,
} from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '~/lib/client';
import * as yup from 'yup';
import { PlusIcon, ChipIcon, XIcon, CheckCircleIcon } from '@heroicons/react/outline';
import { clsx } from 'clsx';

import CardContainer from '~/components/containers/CardContainer';
import Container from '~/components/containers/Container';
import { NumberStatCard } from '~/components/StatCards';
import { useSleepContext } from '~/contexts/SleepContext';
import {
  calculateMintReward,
  calculateRewardAmplifier,
  calculateSimulatedMintReward,
  calculateTimeDecayFactor,
  calculateTimeDecayFactorFromDays,
} from '~/lib/reward-calculator';
import { sleepMinterContract } from '~/lib/contracts';
import { timedelta, UTC_TIME } from '~/lib/helpers';
import { formatUnits } from 'viem';

interface IForm {
  count: number;
  term: number;
}

const useIsMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

type MintStatus = 'idle' | 'paying' | 'confirmingPay' | 'minting' | 'confirmingMint';

const Mint: NextPage = () => {
  const { t } = useTranslation('common');
  const { address, chain } = useAccount();
  const { data: feeData } = useFeeData();
  const { globalRank, genesisTs, refetchGlobals } = useSleepContext();
  const isMounted = useIsMounted();
  const [isFlipped, setFlipped] = useState<boolean>(false);
  const [estimatedReward, setEstimatedReward] = useState(0n);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  
  const { writeContractAsync: mintAsync, isPending, isSuccess } = useWriteContract();
  const [isConfirming, setConfirming] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      toast.success(t('toast.mint-successful'));
      reset();
      setFlipped(true);
      refetchGlobals?.();
      setTimeout(() => setFlipped(false), 3000);
    }
  }, [isSuccess]);


  // --- Simulator State ---
  const [simTerm, setSimTerm] = useState<number>(45);
  const [simCount, setSimCount] = useState<number>(1);
  const [simRank, setSimRank] = useState<number>(12345);
  const [simDays, setSimDays] = useState<number>(7);
  const [simulatedReward, setSimulatedReward] = useState(0n);

  // Mock data for UI preview when not connected or data is loading
  const MOCK_GLOBAL_RANK = 12345;
  const MOCK_GENESIS_TS = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // 7 days ago

  const daysSinceGenesis = isMounted && genesisTs > 0 ? (UTC_TIME - genesisTs) / 86400 : 0;
  const maxTerm = isMounted && genesisTs > 0 ? Math.floor(45 + daysSinceGenesis / 3) : 45;

  const displayGlobalRank = isMounted && globalRank > 0 ? globalRank : 0;
  const displayGenesisTs = isMounted && genesisTs > 0 ? genesisTs : 0;

  const schema = yup.object().shape({
    count: yup
      .number()
      .integer(t('form-field.count-integer'))
      .typeError(t('form-field.count-required'))
      .required(t('form-field.count-required'))
      .min(1, t('form-field.count-min'))
      .max(100, t('form-field.count-max', { max: 100 })),
    term: yup
        .number()
      .integer(t('form-field.days-integer'))
      .typeError(t('form-field.days-required'))
      .required(t('form-field.days-required'))
      .min(1, t('form-field.days-positive'))
      .max(maxTerm, t('form-field.days-maximum', { numberOfDays: maxTerm })),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setValue,
    reset,
  } = useForm<IForm>({
    mode: 'onChange',
    defaultValues: {
      count: 1,
      term: 1,
    },
    resolver: yupResolver(schema),
  });
  const { count, term } = watch();

  useEffect(() => {
    const currentCount = Number(count);
    const currentTerm = Number(term);

    if (currentCount > 0 && currentTerm > 0 && displayGlobalRank > 0 && displayGenesisTs > 0) {
      // For the main calculator, the user's rank IS the current global rank for simulation purposes
      const rewardData = calculateMintReward(currentTerm, displayGlobalRank, displayGlobalRank, displayGenesisTs);
      setEstimatedReward(rewardData.totalReward * BigInt(currentCount));
    } else {
      setEstimatedReward(0n);
    }
  }, [count, term, displayGlobalRank, displayGenesisTs]);

  // --- Simulator Calculation ---
  useEffect(() => {
    if (simTerm > 0 && simCount > 0 && simRank > 0 && simDays >= 0) {
      const rewardPerUnit = calculateSimulatedMintReward(simTerm, simRank, simDays);
      setSimulatedReward(rewardPerUnit * BigInt(simCount));
    } else {
      setSimulatedReward(0n);
    }
  }, [simTerm, simCount, simRank, simDays]);

  const integerCount = count ? Math.floor(Number(count)) : 0;
  const integerTerm = term ? Math.floor(Number(term)) : 0;

  // Use refs to store the latest values for the async callback
  const termRef = useRef(integerTerm);
  const countRef = useRef(integerCount);

  useEffect(() => {
    termRef.current = integerTerm;
    countRef.current = integerCount;
  }, [integerTerm, integerCount]);

  const onSubmit = async () => {
    if (!isValid || !integerCount) return;

    setConfirming(true);
    try {
      const countAsBigInt = BigInt(integerCount);
      const termInSeconds = BigInt(integerTerm * 24 * 60 * 60);
      const mintFee = countAsBigInt * 10n ** 16n;

      const hash = await mintAsync({
        ...sleepMinterContract(),
        functionName: 'claimRank',
        args: [termInSeconds, countAsBigInt],
        value: mintFee,
        gas: 300000n, // A bit more gas for the integrated function
      });
      
      await waitForTransactionReceipt(config, { hash });

      toast.success(t('toast.mint-successful'));
      reset();
      setFlipped(true);
      refetchGlobals?.();
      setTimeout(() => setFlipped(false), 3000);

    } catch (error) {
      console.error("An error occurred during the minting process:", error);
      toast.error("An error occurred. Please check the console.");
    } finally {
      setConfirming(false);
    }
  };

  const isProcessing = isPending || isConfirming;

  const mintFeeDisplay = formatUnits((BigInt(integerCount) * 10n ** 16n), 18);
  const amplifier = calculateRewardAmplifier(displayGlobalRank);
  const timeDecay = calculateTimeDecayFactor(displayGenesisTs);

  const simulatedAmplifier = calculateRewardAmplifier(simRank);
  const simulatedTimeDecay = calculateTimeDecayFactorFromDays(simDays);

  return (
    <Container className="max-w-screen-2xl">
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
        {/* Flip Container */}
        <div className="[perspective:1000px]">
          <div
            className={clsx(
              'relative w-[700px] h-[440px] [transform-style:preserve-3d] transition-transform duration-700',
              { '[transform:rotateY(180deg)]': isFlipped }
            )}
          >
            {/* Front Face */}
            <div className="absolute w-full h-full [backface-visibility:hidden]">
              <div className="card w-[700px] h-[440px] bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-neutral-content rounded-2xl p-8 flex flex-col justify-between font-mono shadow-lg border-b-4 border-r-4 border-white/60 shine-effect">
                {/* Top Section */}
                <div className="z-20 flex justify-between items-start">
                  <h2 className="text-2xl font-bold"> Sleeping Card</h2>
                  <ChipIcon className="w-12 h-12 text-yellow-400 animate-pulse" />
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="z-20 flex flex-col justify-center flex-grow"
                >
                  <div className="grid grid-cols-5 gap-x-4 gap-y-2 text-lg items-center">
                    <div className="col-span-3">
                      <label className="text-xs tracking-widest flex justify-between">
                        <span>{t('form-field.mint-units')}</span>
                        <span className="opacity-70">MAX: 100</span>
                      </label>
                      <input
                        type="number"
                        {...register('count')}
                        className="input bg-transparent focus:outline-none w-full text-4xl p-0 tracking-wider"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs tracking-widest flex justify-between">
                        <span>{t('form-field.sleep-duration')}</span>
                        <span className="opacity-70">MAX: {maxTerm} {t('days')}</span>
                      </label>
                      <input
                        type="number"
                        {...register('term')}
                        max={maxTerm}
                        className="input bg-transparent focus:outline-none w-full text-4xl p-0 tracking-wider"
                      />
                      <ErrorMessage
                        errors={errors}
                        name="term"
                        render={({ message }) => <p className="text-error text-xs mt-1">{message}</p>}
                      />
                    </div>
              </div>

                  <div className="flex justify-end items-end mt-6">
                    <div className="text-right">
                      <p className="text-xs">{t('card.mint-fee')}</p>
                      <p className="font-semibold text-lg">{mintFeeDisplay} OKB</p>
                    </div>
                    <button
                      type="submit"
                      className={clsx('btn btn-accent w-48 ml-6', { loading: isProcessing })}
                      disabled={isProcessing || !isValid}
                    >
                      {isConfirming ? "正在确认..." : (isPending ? "请批准..." : t('mint.button-sleep'))}
                    </button>
                  </div>
                </form>

                {/* Bottom Section */}
                <div className="z-20 flex justify-between items-end">
                  <div>
                    <p className="font-light text-xs tracking-widest">CARD HOLDER</p>
                    <p className="font-medium tracking-wider text-sm">
                      {isMounted ? address : '...'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-md flex items-center justify-center opacity-70">
                      <div className="w-10 h-6 bg-gradient-conic from-pink-500 via-red-500 to-yellow-500 blur-sm"></div>
                    </div>
                    <XIcon className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
            {/* Back Face */}
            <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="card w-[700px] h-[440px] bg-gradient-to-br from-success to-green-600 text-success-content rounded-2xl p-8 flex flex-col justify-center items-center font-mono shadow-lg text-center border-b-4 border-r-4 border-white/60">
                <CheckCircleIcon className="w-24 h-24 animate-bounce" />
                <h2 className="text-3xl font-bold mt-4">{t('toast.mint-successful')}</h2>
                <p className="mt-2">Your Sleeping Card is dreaming.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Spacer for mobile */}
        <div className="md:hidden h-8"></div>

        {/* Reward Calculator & Simulator */}
        <CardContainer className="shadow-lg border-b-4 border-r-4 border-white/60">
          <div className="flex flex-col space-y-4">
            <h2 className="card-title text-white">{t('mint.reward-calculator')}</h2>
            {/* Estimated Reward */}
            <NumberStatCard
              title={t('card.estimated-reward')}
              value={formatUnits(estimatedReward, 18)}
              suffix=" SLEEPING"
            />
            <div className="collapse collapse-arrow glass">
              <input type="checkbox" defaultChecked />
              <div className="collapse-title text-md font-medium text-white">{t('mint.calculation-details')}</div>
              <div className="collapse-content">
                <ul className="list-disc pl-5 text-xs text-white">
                  <li>
                    {t('card.global-rank')}: {isMounted && displayGlobalRank > 0 ? displayGlobalRank.toLocaleString() : '...'}
                  </li>
                  <li>
                    {t('form-field.term-days')}: {term || 0}
                  </li>
                  <li>
                    {t('card.amplifier')}: {amplifier.toFixed(4)}
                  </li>
                  <li>
                    {t('card.time-decay')}: {timeDecay.toFixed(4)} (x{Math.round(timeDecay * 100)}%)
                  </li>
                </ul>
              </div>
              </div>

            {/* Simulator */}
            <div className="card bg-transparent rounded-box p-4 glass">
              <h3 className="text-lg font-medium mb-2 text-white">{t('mint.simulator.title')}</h3>
              <div className="form-control w-full space-y-2 text-xs">
                <div>
                  <label className="label pb-0">
                    <span className="label-text text-white">{t('mint.simulator.term')}</span>
                  </label>
                  <input
                    type="number"
                    value={simTerm}
                    onChange={(e) => setSimTerm(Number(e.target.value))}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="label pb-0">
                    <span className="label-text text-white">{t('mint.simulator.count')}</span>
                  </label>
                  <input
                    type="number"
                    value={simCount}
                    onChange={(e) => setSimCount(Number(e.target.value))}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="label pb-0">
                    <span className="label-text text-white">{t('mint.simulator.rank')}</span>
                  </label>
                  <input
                    type="number"
                    value={simRank}
                    onChange={(e) => setSimRank(Number(e.target.value))}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
                <div>
                  <label className="label pb-0">
                    <span className="label-text text-white">{t('mint.simulator.days')}</span>
                  </label>
                  <input
                    type="number"
                    value={simDays}
                    onChange={(e) => setSimDays(Number(e.target.value))}
                    className="input input-bordered input-sm w-full"
                  />
                </div>
              </div>
              <div className="divider my-1"></div>
              <div className="collapse collapse-arrow glass -mx-4 -mb-4">
                <input type="checkbox" />
                <div className="collapse-title">
                  <NumberStatCard
                    title={t('mint.simulator.result')}
                    value={formatUnits(simulatedReward, 18)}
                    suffix=" SLEEPING"
                    valueClassName="text-lg"
                  />
                </div>
                <div className="collapse-content">
                  <ul className="list-disc pl-5 text-xs text-white">
                    <li>
                      {t('card.amplifier')}: {simulatedAmplifier.toFixed(4)}
                    </li>
                    <li>
                      {t('card.time-decay')}: {simulatedTimeDecay.toFixed(4)} (x
                      {Math.round(simulatedTimeDecay * 100)}%)
                    </li>
                    <li className="mt-2">
                      <span className="font-bold">{t('card.genesis-ts')}:</span>{' '}
                      {isMounted && displayGenesisTs > 0
                        ? new Date(displayGenesisTs * 1000).toLocaleString()
                        : '...'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContainer>
      </div>
    </Container>
  );
};

export default Mint;
