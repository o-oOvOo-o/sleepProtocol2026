import { createConfig, http } from 'wagmi';
import { xLayerTestnet, sepolia } from '~/lib/chains';
import { injected, metaMask } from 'wagmi/connectors';

export const config = createConfig({
  chains: [xLayerTestnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [xLayerTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});
