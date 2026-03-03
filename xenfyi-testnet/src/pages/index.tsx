import type { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const Win98WithNoSSR = dynamic(
  () => import('~/win98/Win98'),
  { ssr: false }
);

const DesktopPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Sleep Protocol - Windows 98 Desktop</title>
        <meta name="description" content="Sleep Protocol running in a classic Windows 98 environment" />
        <link rel="icon" href="/favicon.ico" />
        <style jsx global>{`
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          #__next {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `}</style>
      </Head>
      <div style={{ 
        margin: 0, 
        padding: 0, 
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        fontFamily: '"MS Sans Serif", sans-serif',
        backgroundColor: '#008080'
      }}>
        <Win98WithNoSSR />
      </div>
    </>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default DesktopPage;
