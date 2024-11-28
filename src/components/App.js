import React, { useEffect, useState } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context.js';
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
    const [message, setMessage] = useState('');
    const [allMessages, setAllMessages] = useState([]);
    const [senders, setSenders] = useState([]);
    const [selectedSender, setSelectedSender] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { contract, account, setAccount } = useWeb3();
    const username = (location.state && location.state.username) ? location.state.username : '';

    useEffect(() => {
        if (location.state && location.state.recipient) {
            setSelectedSender(location.state.recipient);
        }
        if (contract && account) {
            fetchMessages();
            if (location.state && location.state.recipient) {
                fetchMessagesForSender(location.state.recipient);
            }
        }
    }, [contract, account, location.state && location.state.recipient]);

    const deriveEncryptionKey = async () => {
        try {
            const recipientPublicKeyHex = await contract.methods.getPublicKey(selectedSender).call({ from: account });
            const privateKeyHex = localStorage.getItem(`privateKey-${account}`);
            if (!privateKeyHex) {
                throw new Error("Private key not found in localStorage.");
            }

            const recipientPublicKey = sodium.from_hex(recipientPublicKeyHex);
            const privateKey = sodium.from_hex(privateKeyHex);
            const rawSecret = sodium.crypto_scalarmult(privateKey, recipientPublicKey);
            //BLAKE2B-subkeylen(key=key, message={}, salt=subkey_id || {0}, personal=ctx || {0})
            const derivedKey = sodium.crypto_kdf_derive_from_key(32, 1, 'encryption', rawSecret);
            const key1 = `${account}_${selectedSender}`;
            const key2 = `${selectedSender}_${account}`;
            localStorage.setItem(key1, sodium.to_hex(derivedKey));
            localStorage.setItem(key2, sodium.to_hex(derivedKey));
            return sodium.to_hex(derivedKey);
        } catch (error) {
            console.error("Error deriving encryption key:", error);
        }
    };

    const sendMessage = async () => {
        if (!selectedSender || !message) {
            alert("Both recipient and message fields are required.");
            return;
        }
        if (contract) {
            try {
                let sessionKeyHex = localStorage.getItem(`${account}_${selectedSender}`) ||
                    localStorage.getItem(`${selectedSender}_${account}`);
    
                if (!sessionKeyHex) {
                    sessionKeyHex = await deriveEncryptionKey();
                }
    
                const rc4 = new RC4(sessionKeyHex);
                const encryptedMessage = rc4.encrypt(message);
    
                const gasEstimate = await contract.methods.sendMessage(selectedSender, encryptedMessage).estimateGas({ from: account });
                await contract.methods.sendMessage(selectedSender, encryptedMessage).send({ from: account, gas: gasEstimate + 100000 });
    
                alert("Message sent successfully!");
                setMessage('');
    
                fetchMessagesForSender(selectedSender);
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
                const allMessages = await contract.methods.fetchAllMessagesForLoggedInAccount().call({ from: account });
                const uniqueSenders = [...new Set(allMessages.map(msg => msg.sender === account ? msg.recipient : msg.sender))];

                const sendersWithNames = await Promise.all(
                    uniqueSenders.map(async (sender) => ({
                        address: sender,
                        name: await getUserName(sender),
                    }))
                );
                setSenders(sendersWithNames);
            } catch (error) {
                console.error("Error fetching messages:", error);
                alert("Error fetching messages: " + error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    };

    const getUserName = async (address) => {
        if (contract) {
            try {
                const username = await contract.methods.getUsernameByAddress(address).call();
                return username || address;
            } catch (error) {
                console.error("Error fetching the name:", error);
                return address;
            }
        }
        return address;
    };

    const fetchMessagesForSender = async (sender) => {
        if (contract) {
            try {
                const allMessages = await contract.methods.fetchAllMessagesForLoggedInAccount().call({ from: account });
                const messagesWithSender = allMessages.filter(
                    msg => (msg.sender === sender && msg.recipient === account) || 
                           (msg.sender === account && msg.recipient === sender)
                );
    
                const formattedMessages = messagesWithSender.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp * 1000,
                    direction: msg.sender === account ? 'sent' : 'received',
                }));
    
                formattedMessages.sort((a, b) => a.timestamp - b.timestamp);
    
                for (let msg of formattedMessages) {
                    let sessionKeyHex = localStorage.getItem(`${account}_${sender}`) ||
                        localStorage.getItem(`${sender}_${account}`);
    
                    if (!sessionKeyHex) {
                        sessionKeyHex = await deriveEncryptionKey();
                    }
    
                    const rc4 = new RC4(sessionKeyHex);
                    msg.content = rc4.decrypt(msg.content);
                }
    
                setAllMessages(formattedMessages);
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

    const handleLogout = () => {
        setAccount(null);
        window.location.href = '/';
    };

    return (
        <div className="app">
            <div className="sidebar">
            
                <h2>{username}</h2>
                <p>Your Ethereum address: {account}</p>

                <ul className="senders-list">
                    {senders.length > 0 ? (
                        senders.map((senderObj, index) => (
                            <li key={index} onClick={() => fetchMessagesForSender(senderObj.address)}>
                                <span>{senderObj.name}</span>
                            </li>
                        ))
                    ) : (
                        <li>No contacts available.</li>
                    )}
                </ul>
            </div>

            <div className="chat-container">
                <div className="chat-header">
                    <h2>{selectedSender}</h2>
                    <button onClick={goToAddContactPage} className="addcontact-button">All Contacts</button>
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>

                <div className="chat-window">
    <ul className="messages">
        {allMessages.length > 0 ? (
            allMessages.map((msg, index) => (
                <li key={index} className={`message ${msg.direction}`}>
                   { console.log(msg.direction)}
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
                        value={message}
                        className="message-input"
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                    />
                    <button onClick={sendMessage} className="send-button">Send</button>
                </div>
            </div>
        </div>
    );
};

export default App;
