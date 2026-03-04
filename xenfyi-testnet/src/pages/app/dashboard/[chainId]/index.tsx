import type { GetServerSideProps, NextPage } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/app/dashboard",
      permanent: false,
    },
  };
};

const DashboardChainRedirect: NextPage = () => null;

export default DashboardChainRedirect;
