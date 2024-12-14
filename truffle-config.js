require('babel-register');
require('babel-polyfill');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
    volta: {
      provider: () => new HDWalletProvider({
        mnemonic: {
          phrase: "liar save element move uncover census wife picture spread dog art tornado" // Replace with your actual mnemonic
        },
        providerOrUrl: "https://volta-rpc.energyweb.org",
        pollingInterval: 27000, 
        timeoutBlocks: 250,
      }),
      network_id: 73799, // holesky's network ID
      gas: 6000000, // Adjust gas limit as needed
      gasPrice: 50000000000 // Adjust gas price if needed
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
