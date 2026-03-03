import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

import CardContainer from '~/components/containers/CardContainer';
import Container from '~/components/containers/Container';
import LitepaperLayout from '~/components/layouts/LitepaperLayout';

const LitepaperPage: NextPage<{ slug: string }> = ({ slug }) => {
  const { t } = useTranslation(['litepaper', 'common']);

  const renderContent = () => {
    switch (slug) {
      case 'ethos':
        return (
          <>
            <h2>{t('ethos.title')}</h2>
            <p>{t('ethos.p1')}</p>
            <p>{t('ethos.p2')}</p>
            <ul>
              <li>
                <strong>{t('ethos.li1_strong')}</strong>
                <p className="mt-1">{t('ethos.li1_text')}</p>
              </li>
              <li>
                <strong>{t('ethos.li2_strong')}</strong>
                <p className="mt-1">{t('ethos.li2_text')}</p>
              </li>
              <li>
                <strong>{t('ethos.li3_strong')}</strong>
                <p className="mt-1">{t('ethos.li3_text')}</p>
              </li>
            </ul>
          </>
        );
      case 'tokenomics':
        return (
          <>
            <h2>{t('tokenomics.title')}</h2>
            <p>{t('tokenomics.intro')}</p>
          </>
        );
      case 'mint-fee':
        return (
          <>
            <h3>{t('tokenomics.mint_fee.title')}</h3>
            <p>{t('tokenomics.mint_fee.p1')}</p>
          </>
        );
      case 'dynamic-term':
        return (
          <>
            <h3>{t('tokenomics.dynamic_term.title')}</h3>
            <p>{t('tokenomics.dynamic_term.p1')}</p>
          </>
        );
      case 'population-pressure':
        return (
          <>
            <h3>{t('tokenomics.population_pressure.title')}</h3>
            <p>{t('tokenomics.population_pressure.p1')}</p>
          </>
        );
      case 'time-decay':
        return (
          <>
            <h3>{t('tokenomics.time_decay.title')}</h3>
            <p>{t('tokenomics.time_decay.p1')}</p>
          </>
        );
      case 'tax':
        return (
          <>
            <h3>{t('tokenomics.tax.title')}</h3>
            <p>{t('tokenomics.tax.p1')}</p>
            <ul>
              <li>{t('tokenomics.tax.li1')}</li>
              <li>{t('tokenomics.tax.li2')}</li>
            </ul>
          </>
        );
      case 'fee-distribution':
        return (
          <>
            <h3>{t('tokenomics.fee_distribution.title')}</h3>
            <p>{t('tokenomics.fee_distribution.p1')}</p>
            <ul>
              <li>{t('tokenomics.fee_distribution.li1')}</li>
              <li>{t('tokenomics.fee_distribution.li2')}</li>
            </ul>
          </>
        );
      default:
        return <p>Section not found.</p>;
    }
  };

  const title = t(`${slug.replace('-', '.')}.title`, { ns: 'litepaper', defaultValue: 'Litepaper' });

  return (
    <>
      <Head>
        <title>Sleep Coin Litepaper - {title}</title>
      </Head>
      <Container className="max-w-6xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          Sleep Coin ({t('token-symbol', { ns: 'common' })}) Litepaper
        </h1>
        <LitepaperLayout>
          <CardContainer>
            <div className="prose max-w-none prose-headings:mt-8 prose-headings:mb-4 prose-p:leading-relaxed prose-ul:my-4 prose-headings:text-base-content prose-p:text-base-content prose-ul:text-base-content prose-strong:text-base-content prose-li:text-base-content">
              {renderContent()}
            </div>
          </CardContainer>
        </LitepaperLayout>
      </Container>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = [
    'ethos',
    'tokenomics',
    'mint-fee',
    'dynamic-term',
    'population-pressure',
    'time-decay',
    'tax',
    'fee-distribution',
  ];
  const paths = slugs.map((slug) => ({ params: { slug } }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ locale, params }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'litepaper'])),
      slug: params?.slug,
    },
  };
};

export default LitepaperPage;
