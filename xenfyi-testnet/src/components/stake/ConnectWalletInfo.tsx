import { InformationCircleIcon } from '@heroicons/react/outline';

export const ConnectWalletInfo = () => {
  return (
    <div className="alert shadow-lg glass">
      <div>
        <InformationCircleIcon className="w-8 h-8" />
        <div>
          <h3 className="font-bold">Please Connect Your Wallet</h3>
          <div className="text-xs">Connect your wallet to view your staking dashboard and manage your assets.</div>
        </div>
      </div>
    </div>
  );
};


