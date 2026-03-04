export async function getStaticProps() {
  return {
    redirect: {
      destination: '/app/mint/1',
      permanent: false,
    },
  };
}

export default function MintRedirect() {
  return null;
}
