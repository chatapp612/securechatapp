import React, { useEffect, useState } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context.js';
import crypto from 'crypto';

class RC4 {
    constructor(key) {
        this.key = key;
        this.state = [];
        this.i = 0;
        this.j = 0;
        this.initialize();
    }

    initialize() {
        const key = [...this.key].map((char) => char.charCodeAt(0));
        for (let i = 0; i < 256; i++) this.state[i] = i;
        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + this.state[i] + key[i % key.length]) % 256;
            [this.state[i], this.state[j]] = [this.state[j], this.state[i]];
        }
    }

    process(input) {
        const output = [];
        for (let k = 0; k < input.length; k++) {
            this.i = (this.i + 1) % 256;
            this.j = (this.j + this.state[this.i]) % 256;
            [this.state[this.i], this.state[this.j]] = [this.state[this.j], this.state[this.i]];
            const byte = this.state[(this.state[this.i] + this.state[this.j]) % 256];
            output.push(input[k] ^ byte);
        }
        return output;
    }

    encrypt(message) {
        const input = [...message].map((char) => char.charCodeAt(0));
        const encrypted = this.process(input);
        return Buffer.from(encrypted).toString('hex');
    }

    decrypt(encryptedMessage) {
        const encryptedBytes = Buffer.from(encryptedMessage, 'hex');
        const decrypted = this.process([...encryptedBytes]);
        return String.fromCharCode(...decrypted);
    }
}

const App = () => {
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [allMessages, setAllMessages] = useState([]);
    const [senders, setSenders] = useState([]);
    const [selectedSender, setSelectedSender] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    const { contract, account } = useWeb3();
    const username = (location.state && location.state.username) ? location.state.username : 'Guest';

    useEffect(() => {
        if (contract && account) {
            fetchMessages();
        }
    }, [contract, account]);

    const generateSessionKey = () => {
        return crypto.randomBytes(16).toString('hex');
    };

    const encryptSessionKey = (sessionKey, recipientPublicKeyHex) => {
        try {
            if (!recipientPublicKeyHex) {
                console.error("Recipient public key is null or undefined.");
                return;
            }
    
            const pemKey = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(recipientPublicKeyHex, 'hex').toString('base64')}\n-----END PUBLIC KEY-----`;
            console.log(pemKey);
            const buffer = Buffer.from(sessionKey, 'utf-8');
            const encrypted = crypto.publicEncrypt(
                { key: pemKey, padding: crypto.constants.RSA_PKCS1_PADDING },
                buffer
            );
            return encrypted.toString('hex');
        } catch (error) {
            console.error("Error in encrypting session key:", error);
        }
    };
    

    const sendMessage = async () => {
        if (!recipient || !message) {
            alert("Both recipient and message fields are required.");
            return;
        }

        if (contract) {
            try {
                const recipientPublicKeyHex = await contract.methods.getPublicKey(recipient).call({ from: account });
                console.log("publickey",recipientPublicKeyHex);
                if (!recipientPublicKeyHex) {
                    console.error("No public key found for recipient.");
                    return;
                }
                
                const sessionKey = generateSessionKey();
                console.log("sessionkey",sessionKey);
                console.log(typeof sessionKey); // should output "string"

                const rc4 = new RC4(sessionKey);
                const encryptedMessage = rc4.encrypt(message);
                console.log("encryptedmsg", encryptedMessage)
                const encryptedSessionKey = encryptSessionKey(sessionKey, recipientPublicKeyHex);

                await contract.methods.storeSessionKey(recipient, encryptedSessionKey).send({ from: account });

                const gasEstimate = await contract.methods.sendMessage(recipient, encryptedMessage).estimateGas({ from: account });
                await contract.methods.sendMessage(recipient, encryptedMessage).send({ from: account, gas: gasEstimate + 100000 });
                alert("Message sent!");
                setMessage('');
                setRecipient('');
                fetchMessages();
            } catch (error) {
                console.error("Transaction Error:", error);
                alert("Transaction failed: " + error.message);
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
            }
        } else {
            alert("Contract not initialized.");
        }
    };

    const fetchMessagesForSender = async (sender) => {
        if (contract) {
            try {
                const receivedMessages = await contract.methods.fetchMessagesForSender(sender).call({ from: account });
                const sentMessages = await contract.methods.fetchMessagesForSender(account).call({ from: sender });

                const formattedReceivedMessages = receivedMessages.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp * 1000,
                    direction: 'received',
                }));

                const formattedSentMessages = sentMessages.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp * 1000,
                    direction: 'sent',
                }));

                const combinedMessages = [...formattedReceivedMessages, ...formattedSentMessages];
                combinedMessages.sort((a, b) => a.timestamp - b.timestamp);

                for (let msg of combinedMessages) {
                    const sessionKey = await contract.methods.getSessionKey(sender).call({ from: account });
                    const rc4 = new RC4(sessionKey);
                    msg.content = rc4.decrypt(msg.content);
                }

                setAllMessages(combinedMessages);
                setSelectedSender(sender);
            } catch (error) {
                console.error("Error fetching messages for sender:", error);
                alert("Error fetching messages for sender: " + error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };

    const goToAddContactPage = () => {
        navigate('/add-contact');
    };

    return (
        <div className="app">
            <div className="sidebar">
                <h3>Contacts</h3>
                <h2>Welcome, {username}</h2>
                <p>Your Ethereum address: {account}</p>
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

            <div className="chat-container">
                <div className="chat-header">
                    <h2>Messages for: {selectedSender || "Select a Sender"}</h2>
                    <button onClick={goToAddContactPage} className="addcontact-button">Add New Contact</button>
                </div>
                <div className="chat-window">
                    <ul className="messages">
                        {allMessages.length > 0 ? (
                            allMessages.map((msg, index) => (
                                <li key={index} className={`message ${msg.direction}`}>
                                    <p>{msg.content}</p>
                                    <span className="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
                                </li>
                            ))
                        ) : (
                            <li>No messages to display</li>
                        )}
                    </ul>
                </div>

                <div className="message-form">
                    <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Recipient address"
                    />
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter your message"
                    />
                    <button onClick={sendMessage}>Send</button>
                </div>
            </div>
        </div>
    );
};

export default App;
