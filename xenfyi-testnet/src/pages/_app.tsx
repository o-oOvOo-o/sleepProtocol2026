import '~/styles/main.css';

// import { Analytics } from '@vercel/analytics/react';
// import { ConnectKitProvider } from 'connectkit';
import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
// import { ThemeProvider } from 'next-themes';
// import { GoogleAnalytics } from 'nextjs-google-analytics';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/router';
// Apollo Client moved to liquidate page only
import { ConnectKitProvider } from 'connectkit';

import Layout from '~/components/Layout';
import { config } from '~/lib/client';
import { SleepProvider } from '~/contexts/SleepContext';
// import ClientOnly from '~/components/ClientOnly';

// Apollo Client configuration moved to liquidate page

const MyApp = ({ Component, pageProps }: AppProps) => {
  const [queryClient] = useState(() => new QueryClient());
  const router = useRouter();
  
  // 只对 /app 路径下的页面使用 Layout（包含导航栏）
  const shouldUseLayout = router.pathname.startsWith('/app');

  const WrappedComponent = shouldUseLayout ? (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="retro" options={{ ensName: false, showAvatar: false }}>
          <SleepProvider>
            {/* <GoogleAnalytics trackPageViews /> */}
            {WrappedComponent}
            {/* <Analytics /> */}
          </SleepProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default appWithTranslation(MyApp);
