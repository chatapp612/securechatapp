import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import HelloWorldContract from '../abis/HelloWorld.json';

const App = () => {
    const [message, setMessage] = useState('');
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                // Connect to Volta network
                const web3 = new Web3(new Web3.providers.HttpProvider("https://volta-rpc.energyweb.org"));
                
                // Request accounts from MetaMask
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                const networkId = await web3.eth.net.getId();
                const deployedNetwork = HelloWorldContract.networks[networkId];

                if (deployedNetwork) {
                    const instance = new web3.eth.Contract(
                        HelloWorldContract.abi,
                        deployedNetwork.address,
                    );
                    setContract(instance);
                } else {
                    throw new Error("Contract not deployed on this network");
                }
            } catch (error) {
                console.error("Initialization Error:", error);
                setError(error.message);
            }
        };
        init();
    }, []);

    const inputStr = async () => {
        const inputString = document.getElementById('inputString').value;

        if (!inputString) {
            alert("Input cannot be empty.");
            return;
        }

        if (contract) {
            try {
                const gasEstimate = await contract.methods.setString(inputString).estimateGas({ from: account });
                const receipt = await contract.methods.setString(inputString).send({ from: account, gas: gasEstimate });
                console.log("Transaction successful:", receipt);
                alert("String stored!");
            } catch (error) {
                console.error("Transaction Error:", error);
                alert("Transaction failed: " + error.message);
                setError(error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };

    const printStr = async () => {
        if (contract) {
            try {
                const result = await contract.methods.print().call();
                setMessage(result);
            } catch (error) {
                console.error("Error fetching string:", error);
                alert("Error fetching string: " + error.message);
                setError(error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };

    return (
        <div>
            <h1>Hello World DApp</h1>
            <input type="text" id="inputString" placeholder="Enter a string" />
            <button onClick={inputStr}>Store String</button>
            <button onClick={printStr}>Get String</button>
            <p>{message}</p>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default App;
