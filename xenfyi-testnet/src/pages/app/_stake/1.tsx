import type { GetServerSideProps, NextPage } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/app/stake',
      permanent: false,
    },
  };
};

const StakeRedirect: NextPage = () => null;

export default StakeRedirect;
