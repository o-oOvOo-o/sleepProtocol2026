import { GetStaticProps, NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const LitepaperIndex: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/litepaper/ethos');
  }, [router]);

  return null;
};

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'litepaper'])),
    },
  };
};

export default LitepaperIndex;




