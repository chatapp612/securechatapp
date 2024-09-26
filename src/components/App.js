import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import MessageStoreContract from '../abis/MessageStore.json';
import './App.css'; // Ensure to import your CSS file

const App = () => {
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [allMessages, setAllMessages] = useState([]);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState('');
    const [error, setError] = useState('');
    const [senders, setSenders] = useState([]); // To store unique senders
    const [selectedSender, setSelectedSender] = useState(null); // State for the selected sender

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

        // Handle account changes
        window.ethereum.on('accountsChanged', init);
        // Handle network changes
        window.ethereum.on('networkChanged', init);

        return () => {
            window.ethereum.removeListener('accountsChanged', init);
            window.ethereum.removeListener('networkChanged', init);
        };
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
                setMessage('');
                setRecipient('');
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
                // Populate senders list from received messages
                const uniqueSenders = [...new Set(receivedMessages.map(msg => msg.sender))];
                setSenders(uniqueSenders);
            } catch (error) {
                console.error("Error fetching messages:", error);
                alert("Error fetching messages: " + error.message);
                setError(error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };

    const fetchMessagesForSender = async (sender) => {
        if (contract) {
            try {
                // Fetch messages sent by the selected sender to the logged-in account
                const messagesFromSender = await contract.methods.fetchMessagesForSender(sender).call({ from: account });
                // Fetch messages sent by the logged-in account to the selected sender
                const messagesFromAccount = await contract.methods.fetchMessagesForSender(account).call({ from: account });
    
                const formattedMessages = [
                    ...messagesFromSender.map(msg => ({
                        ...msg,
                        timestamp: msg.timestamp * 1000,
                    })),
                    ...messagesFromAccount.map(msg => ({
                        ...msg,
                        timestamp: msg.timestamp * 1000,
                    }))
                ];
    
                // Sort by descending timestamp
                formattedMessages.sort((a, b) => b.timestamp - a.timestamp);
                setAllMessages(formattedMessages);
            } catch (error) {
                console.error("Error fetching messages for sender:", error);
                alert("Error fetching messages for sender: " + error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };
    

    return (
        <div className="app">
            <div className="sidebar">
                <h3>Senders</h3>
                <button onClick={fetchMessages} className="fetch-button">Fetch Senders</button>
                <ul className="senders-list">
                    {senders.length > 0 ? (
                        senders.map((sender, index) => (
                            <li key={index}>
                                <button onClick={() => fetchMessagesForSender(sender)}>{sender}</button>
                            </li>
                        ))
                    ) : (
                        <li>No senders available.</li>
                    )}
                </ul>
            </div>
            <div className="chat-container"> {/* Right side for chat */}
                <div className="chat-header">
                    <h2>Messages for: {selectedSender || "Select a Sender"}</h2>
                </div>
                <div className="chat-window">
                    <ul className="messages">
                        {allMessages.length > 0 ? (
                            allMessages.map((msg, index) => (
                                <li key={index} className={`message ${msg.sender === account ? 'sent' : 'received'}`}>
                                    <p>{msg.content}</p>
                                    <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </li>
                            ))
                        ) : (
                            <li>No messages found.</li>
                        )}
                    </ul>
                </div>
                <div className="input-area">
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Enter Recipient Ethereum Address"
                        className="recipient-input"
                    />
                    
                </div>
                <div className="input-area">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter Message"
                        className="message-input"
                    />
                    <button onClick={sendMessage} className="send-button">Send</button>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>
        </div>
    );
}

export default App;
