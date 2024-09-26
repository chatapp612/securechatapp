import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import MessageStoreContract from '../abis/MessageStore.json';

const App = () => {
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [allMessages, setAllMessages] = useState([]); // Store both sent and received messages
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
                const receivedMessages = await contract.methods.fetchMessagesForLoggedInAccount().call({ from: account });
                const sentMessages = await contract.methods.fetchSentMessages().call({ from: account });

                // Combine received and sent messages
                const combinedMessages = [...receivedMessages, ...sentMessages].map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp * 1000 // Convert to milliseconds
                }));

                // Sort messages by timestamp in descending order
                combinedMessages.sort((a, b) => a.timestamp - b.timestamp);

                setAllMessages(combinedMessages);
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
            <h1>MESSAGING APP</h1>
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
            <button onClick={fetchMessages}>Fetch All Messages</button>

            <h2>All Messages:</h2>
            <ul>
                {allMessages.length > 0 ? (
                    allMessages.map((msg, index) => (
                        <li key={index}>
                            <strong>{msg.sender === account ? 'To' : 'From'}:</strong> {msg.sender === account ? msg.recipient : msg.sender} <br />
                            <strong>Message:</strong> {msg.content} <br />
                            <strong>Timestamp:</strong> {new Date(msg.timestamp).toLocaleString()}
                        </li>
                    ))
                ) : (
                    <li>No messages found.</li>
                )}
            </ul>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default App;
