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
          phrase: "bean shoulder vibrant flee shallow holiday vague little train crash marble glove" // Replace with your actual mnemonic
        },
        providerOrUrl: "https://volta-rpc.energyweb.org", 
        pollingInterval: 15000,// Volta network RPC URL
      }),
      network_id: 73799, // Volta's network ID
      gas: 8000000, // Optional: adjust gas limit as needed
      gasPrice: 20000000000 // Optional: adjust gas price if needed
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
}

// bean shoulder vibrant flee shallow holiday vague little train crash marble glove