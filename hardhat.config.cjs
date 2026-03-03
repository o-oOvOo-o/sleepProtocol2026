require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    xlayertest: {
      url: "https://testrpc.xlayer.tech",
      chainId: 1952,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    sepolia: {
      url: "https://eth-sepolia.public.blastapi.io",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      xlayertest: "abc",
      sepolia: process.env.ETHERSCAN_API_KEY || "abc",
    },
    customChains: [
      {
        network: "xlayertest",
        chainId: 1952,
        urls: {
          apiURL: "https://www.oklink.com/api/explorer/v1/contract/verify/async/compile/xlayer-test",
          browserURL: "https://www.oklink.com/xlayer-test"
        }
      }
    ]
  }
};
