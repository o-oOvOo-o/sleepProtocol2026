import { Chain } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export const xLayerTestnet: Chain = {
  id: 1952, // Corrected Chain ID
  name: 'X Layer Testnet',
  network: 'x-layer-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'OKB',
    symbol: 'OKB',
  },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
    public: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url: 'https://www.oklink.com/xlayer-test',
    },
  },
  testnet: true,
};

export { sepolia };
