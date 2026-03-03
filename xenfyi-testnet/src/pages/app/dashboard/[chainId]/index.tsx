import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useContext, useEffect } from "react";

import Breadcrumbs from "~/components/Breadcrumbs";
import { chainIcons } from "~/components/Constants";
import CardContainer from "~/components/containers/CardContainer";
import Container from "~/components/containers/Container";
import { ChainStatCard, DataCard, DateStatCard, NumberStatCard } from "~/components/StatCards";
import SleepContext from "~/contexts/SleepContext";
import { allChains } from "~/lib/client";
import { sleepCoinContract } from "~/lib/xen-contract";

const Dashboard: NextPage = () => {
  const { t } = useTranslation("common");

  const router = useRouter();
  const { chainId } = router.query as unknown as { chainId: number };
  const chainFromId = allChains.find((c) => c && c.id == chainId);

  const { setChainOverride, token, globalRank, totalStaked, genesisTs, rewardPool } = useContext(SleepContext);

  const generalStats = [
    {
      title: t("card.global-rank"),
      value: globalRank,
    },
    {
      title: t("card.staked"),
      value: totalStaked / 1e18, // Assuming 18 decimals
    },
    {
        title: t("card.reward-pool"),
        value: rewardPool / 1e18, // Assuming 18 decimals for OKB
        suffix: " OKB"
    }
  ];

  useEffect(() => {
    if (chainFromId) {
      setChainOverride(chainFromId);
    }
  }, [chainFromId, setChainOverride]);

  return (
    <div>
      <Container className="max-w-2xl">
        <Breadcrumbs />

        <div className="flex flex-col space-y-8">
          <div className="dropdown dropdown-hover">
            <label tabIndex={0} className="btn m-1 glass text-neutral">
              {t("dashboard.select-chain")}
            </label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow rounded-box glass w-64 flex space-y-2">
              {allChains.map((c) => (
                <li key={c.id}>
                  <Link href={`/dashboard/${c.id}`} className="text-neutral justify-between glass">
                    {c.name}
                    {chainIcons[c.id]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <CardContainer>
            <h2 className="card-title">{t("dashboard.general-stats")}</h2>
            <div className="stats stats-vertical bg-transparent text-neutral">
              <ChainStatCard value={chainFromId?.name ?? "X Layer Testnet"} id={chainFromId?.id ?? 1952} />
              <DateStatCard title={t("dashboard.days-since-launch")} dateTs={genesisTs} isPast={true} />
              {token && (
                <DataCard
                  title={t("dashboard.token-address")}
                  value={token?.symbol ?? "SLEEPING"}
                  description={sleepCoinContract(chainFromId).address}
                />
              )}

              {generalStats.map((item, index) => (
                <NumberStatCard key={index} title={item.title} value={item.value} decimals={0} suffix={item.suffix} />
              ))}
            </div>
          </CardContainer>
        </div>
      </Container>
    </div>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}

export const getStaticPaths = async ({ locales }: any) => {
  // generate locales paths for all chains and all locales
  const allPaths = allChains.flatMap((chain) =>
    locales.map((locale: string) => ({
      params: { chainId: chain.id.toString() },
      locale,
    }))
  );

  return {
    paths: allPaths,
    fallback: false,
  };
};

export default Dashboard;
