import { Address, Chain } from "wagmi";

import { SleepCoinABI } from "~/abi/SleepCoinABI";
import { SleepMinterABI } from "~/abi/SleepMinterABI";
import { TreasuryDistributorABI } from "~/abi/TreasuryDistributorABI";
import { StakingRewardsABI } from "~/abi/StakingRewardsABI";
import { x1Testnet } from "~/lib/chains";

const PLACEHOLDER_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export const sleepCoinContract = (contractChain?: Chain) => {
  switch (contractChain?.id) {
    case x1Testnet.id:
      return {
        address: PLACEHOLDER_ADDRESS,
        abi: SleepCoinABI,
        chainId: contractChain.id,
      };
    default:
      return {
        address: "0x0" as Address,
        abi: SleepCoinABI,
      };
  }
};

export const sleepMinterContract = (contractChain?: Chain) => {
  switch (contractChain?.id) {
    case x1Testnet.id:
      return {
        address: PLACEHOLDER_ADDRESS,
        abi: SleepMinterABI,
        chainId: contractChain.id,
      };
    default:
      return {
        address: "0x0" as Address,
        abi: SleepMinterABI,
      };
  }
};

export const treasuryDistributorContract = (contractChain?: Chain) => {
  switch (contractChain?.id) {
    case x1Testnet.id:
      return {
        address: PLACEHOLDER_ADDRESS,
        abi: TreasuryDistributorABI,
        chainId: contractChain.id,
      };
    default:
      return {
        address: "0x0" as Address,
        abi: TreasuryDistributorABI,
      };
  }
};

export const stakingRewardsContract = (contractChain?: Chain) => {
  switch (contractChain?.id) {
    case x1Testnet.id:
      return {
        address: PLACEHOLDER_ADDRESS,
        abi: StakingRewardsABI,
        chainId: contractChain.id,
      };
    default:
      return {
        address: "0x0" as Address,
        abi: StakingRewardsABI,
      };
  }
};
