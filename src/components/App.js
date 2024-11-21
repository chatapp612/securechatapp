import React, { useEffect, useState } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context.js';
import crypto from 'crypto';
import sodium from "libsodium-wrappers";

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

    
    
  //******************************************************************************************************************************************* */  
  const deriveEncryptionKey = async () => {
    try {
        // Fetch the recipient's public key from the smart contract using the recipient state
        const recipientPublicKeyHex = await contract.methods.getPublicKey(recipient).call({ from: account });

        // Retrieve your private key from local storage using your account address
        const privateKeyHex = localStorage.getItem(`privateKey-${account}`);

        if (!privateKeyHex) {
            throw new Error("Private key not found in localStorage.");
        }

        // Convert hex keys to Uint8Array
        const recipientPublicKey = sodium.from_hex(recipientPublicKeyHex);
        const privateKey = sodium.from_hex(privateKeyHex);

        // Calculate the shared secret using your private key and the recipient's public key
        const rawSecret = sodium.crypto_scalarmult(privateKey, recipientPublicKey);

        console.log("Derived Shared Secret (Hex format):", sodium.to_hex(rawSecret));

        // Set a salt (can be a fixed value or a random value, depending on your application)
        const salt = sodium.randombytes_buf(32); // Using 32 bytes of random data as salt
        
        // Set the info string (can be "encryption", "authentication", or any context)
        const info = sodium.from_string('encryption');

        // Use HKDF to derive a key from the rawSecret
        const derivedKey = sodium.crypto_kdf_derive_from_key(32, rawSecret, salt, info) // Derive 32 bytes key

        console.log("Derived Encryption Key (Hex format):", sodium.to_hex(derivedKey));
        

        const key1 = `${account}_${recipient}`;
        const key2 = `${recipient}_${account}`;
    
        // Store the derived key in local storage for both combinations
        localStorage.setItem(key1, sodium.to_hex(derivedKey));
        localStorage.setItem(key2, sodium.to_hex(derivedKey));
    
        console.log(`Derived encryption key stored for ${key1} and ${key2}`);


        return sodium.to_hex(derivedKey); // Return the derived encryption key
    } catch (error) {
        console.error("Error deriving encryption key:", error);
    }
};


  

  //******************************************************************************************************************************************* */  

    const sendMessage = async () => {
        if (!recipient || !message) {
            alert("Both recipient and message fields are required.");
            return;
        }
    
        if (contract) {
            try {
                console.log("in send msg");


              
            let sessionKeyHex = localStorage.getItem(`${account}_${recipient}`) ||
            localStorage.getItem(`${recipient}_${account}`);



            if (!sessionKeyHex) {
                console.log("Session key not found, deriving a new one...");
                sessionKeyHex = deriveEncryptionKey();
            
            
            }
                const rc4 = new RC4(sessionKeyHex);
                const encryptedmessage = rc4.encrypt(message);

                
                const gasEstimate = await contract.methods.sendMessage(recipient, encryptedmessage).estimateGas({ from: account });
                await contract.methods.sendMessage(recipient, encryptedmessage).send({ from: account, gas: gasEstimate + 100000 });
    
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
                    let sessionKeyHex1 = localStorage.getItem(`${account}_${recipient}`) ||
                    localStorage.getItem(`${recipient}_${account}`);
        
        
                    
                        // For all messages, decrypt as usual
                       console.log("encrypted msg that is fetched from block", msg.content);
                        const rc4 = new RC4(sessionKeyHex1);
                        // Decrypt the content
                        msg.content = rc4.decrypt(msg.content);
                        console.log("message content decrpted in plaintext", msg.content);
                    
                    
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
