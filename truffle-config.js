require('babel-register');
require('babel-polyfill');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },
    volta: {
      provider: () => new HDWalletProvider({
        mnemonic: {
          phrase: "about release tunnel casual pattern funny hen record speak example spin warfare" // Replace with your actual mnemonic
        },
        providerOrUrl: "https://volta-rpc.energyweb.org",
        pollingInterval: 25000, // Volta network RPC URL
        timeoutBlocks: 219,
      }),
      network_id: 73799, // Volta's network ID
      gas: 8000000, // Adjust gas limit as needed
      gasPrice: 200000000000 // Adjust gas price if needed
    }
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis/',
  compilers: {
    solc: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
