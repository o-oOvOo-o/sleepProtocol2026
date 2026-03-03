import { NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { DataCard, NumberStatCard } from '~/components/StatCards';
import Container from '~/components/containers/Container';
import { useSleepContext } from '~/contexts/SleepContext';
import { calculateRewardAmplifier } from '~/lib/reward-calculator';
import { timedelta, UTC_TIME } from '~/lib/helpers';

const useIsMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const Dashboard: NextPage = () => {
  const { t } = useTranslation('common');
  const { globalRank, genesisTs, totalStaked } = useSleepContext();
  const isMounted = useIsMounted();

  const daysSinceGenesis = isMounted && genesisTs > 0 ? (UTC_TIME - genesisTs) / 86400 : 0;
  const maxTerm = isMounted && genesisTs > 0 ? Math.floor(45 + daysSinceGenesis / 3) : 0;
  const amplifier = isMounted && globalRank > 0 ? calculateRewardAmplifier(globalRank) : 0;

  return (
    <>
      <Head>
        <title>Sleep Coin - {t('dashboard.title')}</title>
      </Head>
      <Container className="max-w-6xl">
        <h1 className="text-4xl font-bold text-center mb-8">{t('dashboard.title')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1 */}
          <div className="space-y-8">
            <DataCard>
              <NumberStatCard
                title={t('card.global-rank')}
                value={isMounted && globalRank > 0 ? globalRank.toLocaleString() : '...'}
                valueStyles="text-3xl"
              />
              <p>Active Minters: TBD</p>
              <p>Active Stakes: TBD</p>
              <p>
                Time Since Genesis:{' '}
                {isMounted && genesisTs > 0 ? timedelta(UTC_TIME - genesisTs) : '...'}
              </p>
            </DataCard>
          </div>

          {/* Column 2 */}
          <div className="space-y-8">
            <DataCard>
              <p>Total Supply: 10,000,000,000,000</p>
              <p>Total Staked: {isMounted && totalStaked > 0 ? totalStaked.toLocaleString() : '...'}</p>
            </DataCard>
          </div>

          {/* Column 3 */}
          <div className="space-y-8">
            <DataCard>
              <p>Max Term, days: {isMounted && maxTerm > 0 ? maxTerm : '...'}</p>
              <p>Amplifier: {isMounted && amplifier > 0 ? amplifier.toFixed(4) : '...'}</p>
            </DataCard>
          </div>
        </div>
      </Container>
    </>
  );
};

export const getStaticProps = async ({ locale }: any) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});

export default Dashboard;
