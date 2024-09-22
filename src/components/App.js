import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import HelloWorldContract from '/Users/aditiwagh/helloworldapp/starter_kit/src/abis/HelloWorld.json'; // Ensure this path is correct

const App = () => {
    const [message, setMessage] = useState('');
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState('');

    useEffect(() => {
        const init = async () => {
            // Initialize web3
            const web3 = new Web3(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await web3.eth.getAccounts();
            setAccount(accounts[0]);

            // Initialize contract
            const networkId = await web3.eth.net.getId();
            const deployedNetwork = HelloWorldContract.networks[networkId];
            const instance = new web3.eth.Contract(
                HelloWorldContract.abi,
                deployedNetwork && deployedNetwork.address,
            );
            setContract(instance);
        };
        init();
    }, []);

    const handlePrint = async () => {
        const result = await contract.methods.print().call();
        setMessage(result);
    };

    return (
        <div>
            <h1>Hello World DApp</h1>
            <button onClick={handlePrint}>Print Message</button>
            <p>{message}</p>
        </div>
    );
};

export default App;
