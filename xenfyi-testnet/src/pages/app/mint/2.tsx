import type { GetServerSideProps, NextPage } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/app/mint/1',
      permanent: false,
    },
  };
};

const MintRedirect: NextPage = () => null;

export default MintRedirect;
