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

    async function encryptSessionKey(sessionKey, recipientPublicKeyHex) {
        try {
            if (!recipientPublicKeyHex) {
                console.error("Recipient public key is null or undefined.");
                return;
            }
    
            // Convert recipient public key from hexadecimal to ArrayBuffer
            const publicKeyBuffer = new Uint8Array(recipientPublicKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))).buffer;
    
            // Import the recipient's public key
            const publicKey = await window.crypto.subtle.importKey(
                "spki", 
                publicKeyBuffer, 
                { name: "RSA-OAEP", hash: { name: "SHA-256" } }, 
                false, 
                ["encrypt"]
            );
    
            // Convert the session key (string) into an ArrayBuffer
            const encoder = new TextEncoder();
            const sessionKeyBuffer = encoder.encode(sessionKey);
    
            // Encrypt the session key using the recipient's public key
            const encryptedSessionKeyBuffer = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                publicKey,
                sessionKeyBuffer
            );
    
            // Convert the encrypted session key into a hexadecimal string
            const encryptedSessionKeyHex = Array.from(new Uint8Array(encryptedSessionKeyBuffer))
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
    
            return encryptedSessionKeyHex;
        } catch (error) {
            console.error("Error in encrypting session key:", error);
        }
    }
    
    
    async function decryptSessionKey(encryptedSessionKeyHex) {
        try {
            // Retrieve the private key from localStorage
            const privateKeyHex = localStorage.getItem('privateKey');
            if (!privateKeyHex) {
                throw new Error('Private key not found in localStorage');
            }
    
            // Convert the private key from hexadecimal to ArrayBuffer
            const privateKeyBuffer = new Uint8Array(privateKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))).buffer;
    
            // Import the private key from the ArrayBuffer (PKCS8 format)
            const privateKey = await window.crypto.subtle.importKey(
                "pkcs8",
                privateKeyBuffer,
                { name: "RSA-OAEP", hash: { name: "SHA-256" } },
                true, // Whether the key is extractable
                ["decrypt"] // Key usage
            );
    
            // Convert the encrypted session key from hexadecimal to ArrayBuffer
            const encryptedSessionKeyBuffer = new Uint8Array(encryptedSessionKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))).buffer;
    
            // Decrypt the session key using the private key
            const decryptedSessionKeyBuffer = await window.crypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                privateKey,
                encryptedSessionKeyBuffer
            );
    
            // Convert the decrypted session key to a string (assuming it's UTF-8 encoded)
            const decoder = new TextDecoder();
            const decryptedSessionKey = decoder.decode(decryptedSessionKeyBuffer);
    
            return decryptedSessionKey;
        } catch (error) {
            console.error("Error in decrypting session key:", error);
        }
    }
    
    
    
    const sendMessage = async () => {
        if (!recipient || !message) {
            alert("Both recipient and message fields are required.");
            return;
        }
    
        if (contract) {
            try {
                // Fetch recipient's public key
                const recipientPublicKeyHex = await contract.methods.getPublicKey(recipient).call({ from: account });
                console.log("Public Key:", recipientPublicKeyHex);
    
                if (!recipientPublicKeyHex) {
                    console.error("No public key found for recipient.");
                    return;
                }
    
                // Generate a new session key for encryption
                const sessionKey = generateSessionKey();
                console.log("Session Key:", sessionKey);
    
               
                const rc4 = new RC4(sessionKey);
                const encryptedmessage = rc4.encrypt(message);

                const paddedmessage = encryptedmessage+sessionKey;

                console.log("Padded Envelope:", paddedmessage);
    
                // Encrypt the session key with the recipient's public key
                const encryptedSessionKey = await encryptSessionKey(sessionKey, recipientPublicKeyHex);
                console.log("encrypted session key", encryptSessionKey);
                // Store the encrypted session key on-chain
                await contract.methods.storeSessionKey(recipient, encryptedSessionKey).send({ from: account });
    
                // Send the encrypted envelope as the message
                const gasEstimate = await contract.methods.sendMessage(recipient, paddedmessage).estimateGas({ from: account });
                await contract.methods.sendMessage(recipient, paddedmessage).send({ from: account, gas: gasEstimate + 100000 });
    
                alert("Message sent successfully!");
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
                    const sessionKey = await contract.methods.getSessionKey(sender,account).call({ from: account });
                    console.log("session key fetched from block",sessionKey);


                    const decryptedSessionKey = await decryptSessionKey(sessionKey);


                    
                    const rc4 = new RC4(decryptedSessionKey);
                    // Separate the encrypted message from the appended session key
                    const encryptedContent = msg.content.slice(0, -decryptedSessionKey.length); // remove the session key from the end
                    console.log("encrypted msg that is fetched from block and session key removed:", encryptedContent);    
                    // Decrypt the content
                    msg.content = rc4.decrypt(encryptedContent);
                    console.log("message content",msg.content);
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
