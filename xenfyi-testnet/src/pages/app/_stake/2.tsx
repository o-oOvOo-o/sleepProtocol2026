export async function getStaticProps() {
  return {
    redirect: {
      destination: '/app/stake',
      permanent: false,
    },
  };
}

export default function StakeRedirect() {
  return null;
}
