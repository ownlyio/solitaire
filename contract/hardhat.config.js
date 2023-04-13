require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

/**
 *  Commands
 *    npx hardhat run scripts/my_script.js
 *    npx hardhat verify CONTRACT_ADDRESS
 */

const ALCHEMY_API_KEY = "LIs_rn4wGgjNHSGr9OV6ElmdpCqHDxJ2";
const PRIVATE_KEY = "43f68651bd8118e22fa59e8b8313ec6979e27c72468731a63bcde866bdf5b127";

module.exports = {
  defaultNetwork: "localhost",
  solidity: {
    version: "0.8.2",
    settings: {
      optimizer: {
        enabled: true
      }
    }
  },
  networks: {
    ethmainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    bsctestnet: {
      url: "https://speedy-nodes-nyc.moralis.io/66aa4c60304ba7f399f9eedd/bsc/testnet",
      // url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      // url: "https://data-seed-prebsc-2-s1.binance.org:8545/",
      // url: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      // url: "https://data-seed-prebsc-2-s2.binance.org:8545/",
      // url: "https://data-seed-prebsc-1-s3.binance.org:8545/",
      // url: "https://data-seed-prebsc-2-s3.binance.org:8545/",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    bscmainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [`0x${PRIVATE_KEY}`],
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  },
  etherscan: {
    apiKey: "M3JXYI2Z13BRCDISUH35FR99FXJQYGJN2A" // bscscan
    // apiKey: "KHCSUR3QZTHMIQVA3NW7YJ6IBPG9W93N69" // etherscan
  }
};
