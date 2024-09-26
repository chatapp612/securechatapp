import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import MessageStoreContract from '../abis/MessageStore.json';

const App = () => {
    const [recipient, setRecipient] = useState('');  // New field for recipient's Ethereum address
    const [message, setMessage] = useState('');
    const [fetchedMessages, setFetchedMessages] = useState([]);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                const web3 = new Web3(window.ethereum);
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const accounts = await web3.eth.getAccounts();
                setAccount(accounts[0]);

                const networkId = await web3.eth.net.getId();
                const deployedNetwork = MessageStoreContract.networks[networkId];

                if (deployedNetwork) {
                    const instance = new web3.eth.Contract(
                        MessageStoreContract.abi,
                        deployedNetwork.address,
                    );
                    setContract(instance);
                } else {
                    console.error("Contract not found on the network:", networkId);
                    setError("Contract not deployed on this network");
                }
            } catch (error) {
                console.error("Initialization Error:", error);
                setError(error.message);
            }
        };
        init();
    }, []);

    const sendMessage = async () => {
        if (!recipient || !message) {
            alert("Both recipient and message fields are required.");
            return;
        }

        if (contract) {
            try {
                const gasEstimate = await contract.methods.sendMessage(recipient, message).estimateGas({ from: account });
                await contract.methods.sendMessage(recipient, message).send({ from: account, gas: gasEstimate + 100000 });
                alert("Message sent!");
                setMessage('');  // Clear message input
                setRecipient('');  // Clear recipient input
            } catch (error) {
                console.error("Transaction Error:", error);
                alert("Transaction failed: " + error.message);
                setError(error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };

    const fetchMessages = async () => {
        if (contract) {
            try {
                const messages = await contract.methods.fetchMessagesForLoggedInAccount().call({ from: account });
                setFetchedMessages(messages);
            } catch (error) {
                console.error("Error fetching messages:", error);
                alert("Error fetching messages: " + error.message);
                setError(error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };

    return (
        <div>
            <h1>Message Store DApp</h1>
            <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter Recipient Ethereum Address"
            />
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter Message"
            />
            <button onClick={sendMessage}>Send Message</button>
            <button onClick={fetchMessages}>Fetch Messages</button>

            <h2>Fetched Messages:</h2>
            <ul>
                {fetchedMessages.length > 0 ? (
                    fetchedMessages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))
                ) : (
                    <li>No messages found for this account.</li>
                )}
            </ul>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default App;
