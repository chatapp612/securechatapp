import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import MessageStoreContract from '../abis/MessageStore.json';
import './App.css';

const App = () => {
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [allMessages, setAllMessages] = useState([]);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState('');
    const [error, setError] = useState('');
    const [senders, setSenders] = useState([]);
    const [selectedSender, setSelectedSender] = useState(null);

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

        window.ethereum.on('accountsChanged', init);
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
                fetchMessages(); // Refresh the senders after sending a message
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
                // Fetch messages received from the selected sender to your account
                const receivedMessages = await contract.methods.fetchMessagesForSender(sender).call({ from: account });
    
                // Fetch messages sent from your account to the selected sender
                const sentMessages = await contract.methods.fetchMessagesForSender(account).call({ from: sender });
    
                // Format received messages
                const formattedReceivedMessages = receivedMessages.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp * 1000, // Convert to milliseconds for proper date formatting
                    direction: 'received',  // Mark these as received messages
                }));
    
                // Format sent messages
                const formattedSentMessages = sentMessages.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp * 1000,  // Convert to milliseconds
                    direction: 'sent',  // Mark these as sent messages
                }));
    
                // Combine both sent and received messages into one array
                const combinedMessages = [...formattedReceivedMessages, ...formattedSentMessages];
    
                // Sort the combined messages by timestamp in chronological order
                combinedMessages.sort((a, b) => a.timestamp - b.timestamp);
    
                // Update state with combined and sorted messages
                setAllMessages(combinedMessages);
    
                // Set the selected sender for display
                setSelectedSender(sender);
            } catch (error) {
                console.error("Error fetching messages for sender:", error);
                alert("Error fetching messages for sender: " + error.message);
                setError(error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };
    
    

    return (
        <div className="app">
            {/* Sidebar with Contacts */}
            <div className="sidebar">
                <h3>Contacts</h3>
                <button onClick={fetchMessages} className="fetch-button">Show Contacts</button>
                <ul className="senders-list">
                    {senders.length > 0 ? (
                        senders.map((sender, index) => (
                            <li key={index} onClick={() => fetchMessagesForSender(sender)}>
            
                                <span>{sender}</span>
                            </li>
                        ))
                    ) : (
                        <li>No contacts available.</li>
                    )}
                </ul>
            </div>
    
            {/* Chat Area */}
            <div className="chat-container">
                <div className="chat-header">
                    <h2>Messages for: {selectedSender || "Select a Sender"}</h2>
                </div>
                <div className="chat-window">
                    <ul className="messages">
                        {allMessages.length > 0 ? (
                            allMessages.map((msg, index) => (
                                <li key={index} className={`message ${msg.direction}`}>
                                    <p>{msg.content}</p>
                                    <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </li>
                            ))
                        ) : (
                            <li>No messages found.</li>
                        )}
                    </ul>
                </div>
    
                {/* Message Input Area */}
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
