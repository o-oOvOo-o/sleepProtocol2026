import type { Address } from "viem";
import type { Chain } from "viem/chains";
import { useReadContract } from "wagmi";

import XENCryptoABI from "~/abi/XENCryptoABI";
import { xenContract } from "~/lib/xen-contract";

interface AddressBalanceProps {
  address: Address;
  chain: Chain;
}

export const useXENAddressBalance = (props: AddressBalanceProps) => {
  const { data: userMintData } = useReadContract({
    address: xenContract(props.chain).address,
    abi: XENCryptoABI,
    functionName: "getUserMint",
    account: props.address,
    // watch: true,
  });

  const { data: userStakeData } = useReadContract({
    address: xenContract(props.chain).address,
    abi: XENCryptoABI,
    functionName: "getUserStake",
    account: props.address,
    // watch: true,
  });

  return {
    mintData: userMintData,
    stakeData: userStakeData,
  };
};

export default useXENAddressBalance;
