import React, { useEffect, useState } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context.js'; // Import Web3 context hook
import crypto from 'crypto';
const forge = require('node-forge');

// RC4 encryption/decryption class
class RC4 {
    constructor(key) {
        this.key = key;
        this.state = [];
        this.i = 0;
        this.j = 0;
        this.initialize();
    }

    // Initialize the RC4 cipher with the key
    initialize() {
        const key = [...this.key].map((char) => char.charCodeAt(0)); // Convert key to an array of byte values
        for (let i = 0; i < 256; i++) {
            this.state[i] = i;
        }
        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + this.state[i] + key[i % key.length]) % 256;
            [this.state[i], this.state[j]] = [this.state[j], this.state[i]]; // Swap values
        }
    }

    // RC4 encryption or decryption
    process(input) {
        const output = [];
        for (let k = 0; k < input.length; k++) {
            this.i = (this.i + 1) % 256;
            this.j = (this.j + this.state[this.i]) % 256;
            [this.state[this.i], this.state[this.j]] = [this.state[this.j], this.state[this.i]];
            const byte = this.state[(this.state[this.i] + this.state[this.j]) % 256];
            output.push(input[k] ^ byte); // XOR with byte from the state
        }
        return output;
    }

    encrypt(message) {
        const input = [...message].map((char) => char.charCodeAt(0)); // Convert message to byte array
        const encrypted = this.process(input);
        return Buffer.from(encrypted).toString('hex'); // Return as hex string
    }

    decrypt(encryptedMessage) {
        const encryptedBytes = Buffer.from(encryptedMessage, 'hex');
        const decrypted = this.process([...encryptedBytes]);
        return String.fromCharCode(...decrypted); // Convert byte array back to string
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

    const { contract, account } = useWeb3(); // Use contract and account from Web3Context
    var username = (location.state && location.state.username) ? location.state.username : 'Guest';

    useEffect(() => {
        if (contract && account) {
            fetchMessages();
        }
    }, [contract, account]);

    const generateSessionKey = (recipientPublicKey) => {
        const randomValue = crypto.randomBytes(16).toString('hex'); // Generate random 16-byte value
        const sessionKey = `${recipientPublicKey}${randomValue}`; // Combine public key with random value
        return sessionKey;
    };

    const encryptSessionKey = (sessionKey, recipientPublicKey) => {
        try {
            // Convert the session key to a buffer (utf-8 encoding)
            const buffer = Buffer.from(sessionKey, 'utf-8');
    
            // Check if recipientPublicKey is valid
            if (!recipientPublicKey) {
                console.error("Recipient public key is null or undefined.");
                return;
            }
    
            // The public key should be in PEM format, so ensure it is a string and valid.
            if (typeof recipientPublicKey !== 'string' || !recipientPublicKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
                console.error("Invalid public key format. The key must be in PEM format.");
                return;
            }
    
            // Encrypt the session key using the recipient's public key
            const encrypted = crypto.publicEncrypt(
                recipientPublicKey,  // PEM format public key
                buffer               // Session key buffer
            );
    
            // Return the encrypted session key in hex format
            return encrypted.toString('hex');
        } catch (error) {
            console.error("Error in encrypting session key:", error);
        }
    };
    
    
    
    function convertPublicKeyToPem(publicKeyString) {
        // If the public key is in hexadecimal format, convert it to a binary array (buffer)
        const publicKeyBuffer = Buffer.from(publicKeyString, 'hex');
        
        // We now assume publicKeyBuffer contains the raw binary of the public key (e.g., X.509 format)
        const pemFormattedPublicKey = forge.pki.publicKeyToPem(forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(publicKeyBuffer)));
        
        return pemFormattedPublicKey;
    }
    
    

    const sendMessage = async () => {
        if (!recipient || !message) {
            alert("Both recipient and message fields are required.");
            return;
        }
    
        if (contract) {
            try {
                // Fetch the recipient's public key in hex format
                const recipientPublicKey = await contract.methods.getPublicKey(recipient).call({ from: account });
                console.log("Recipient Address:", recipient);
                console.log("Fetched Public Key:", recipientPublicKey);
    
                // Convert the public key from hex to PEM format
                const recipientPublicKeyPem = convertPublicKeyToPem(recipientPublicKey);
                console.log("Converted Public Key to PEM format:", recipientPublicKeyPem);
    
                // Generate session key using recipient's PEM public key
                const sessionKey = generateSessionKey(recipientPublicKeyPem);
                console.log("Generated Session Key:", sessionKey);
    
                // Encrypt the message with the session key using RC4
                const rc4 = new RC4(sessionKey);
                const encryptedMessage = rc4.encrypt(message);
                console.log("Encrypted Message:", encryptedMessage);
                
                // Encrypt session key using recipient's PEM public key
                const encryptedSessionKey = encryptSessionKey(sessionKey, recipientPublicKeyPem);
                console.log("Encrypted Session Key:", encryptedSessionKey);
    
                // Store the encrypted session key on the blockchain
                await contract.methods.storeSessionKey(recipient, encryptedSessionKey).send({ from: account });
    
                // Send the encrypted message to the blockchain
                const gasEstimate = await contract.methods.sendMessage(recipient, encryptedMessage).estimateGas({ from: account });
                await contract.methods.sendMessage(recipient, encryptedMessage).send({ from: account, gas: gasEstimate + 100000 });
                alert("Message sent!");
                setMessage('');
                setRecipient('');
                fetchMessages(); // Refresh senders after sending a message
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
    
                // For each message, get the session key from the contract and decrypt the message
                for (let msg of combinedMessages) {
                    const sessionKey = await contract.methods.getSessionKey(sender).call({ from: account });
    
                    // Use the session key to decrypt the message
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
                                    <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Enter your message"
                        className="message-input"
                    />
                    <button onClick={sendMessage} className="send-button">Send</button>
                </div>
            </div>
        </div>
    );
};

export default App;
