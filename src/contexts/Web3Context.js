import React, { createContext, useContext, useEffect, useState } from 'react';
import Web3 from 'web3';
import MessageStoreContract from '../abis/MessageStore.json'; // Import the ABI

// Create the Web3 context
const Web3Context = createContext();

// Custom hook to access the Web3Context
export const useWeb3 = () => {
    return useContext(Web3Context);
};

// Web3Provider component
export const Web3Provider = ({ children }) => {
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState('');

    useEffect(() => {
        const initWeb3 = async () => {
            if (window.ethereum) {
                try {
                    const web3Instance = new Web3(window.ethereum);
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const accounts = await web3Instance.eth.getAccounts();
                    setAccount(accounts[0]);

                    const networkId = await web3Instance.eth.net.getId();
                    const deployedNetwork = MessageStoreContract.networks[networkId];
                    if (deployedNetwork) {
                        const contractInstance = new web3Instance.eth.Contract(MessageStoreContract.abi, deployedNetwork.address);
                        setWeb3(web3Instance);
                        setContract(contractInstance);
                    } else {
                        console.error("Contract not deployed on this network");
                    }
                } catch (error) {
                    console.error("Web3 initialization failed:", error);
                }
            }
        };

        initWeb3();
    }, []);

    // Add a logout function to clear the account
    const logout = () => {
        setAccount(null);  // Clear the account to "log out" the user
      
    };

    return (
        <Web3Context.Provider value={{ web3, contract, account, setAccount, logout }}>
            {children}
        </Web3Context.Provider>
    );
};
