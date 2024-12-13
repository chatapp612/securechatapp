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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [registeredContacts, setRegisteredContacts] = useState([]);
    const [ChatWindow,  setChatWindow] = useState(false);
    const [sidebar,  setSideBar] = useState(true);
   
    const location = useLocation();
    const navigate = useNavigate();
    const { contract, account, setAccount } = useWeb3();
    const username = (location.state && location.state.username) ? location.state.username : '';

    useEffect(() => {
        if (contract && account) {
            fetchMessages();
        }

    }, [contract, account]);

   
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

                setTimeout(() => {
                    // Update the UI after 10 seconds
                    console.log("10 seconds passed. Refreshing messages...");
                    fetchMessagesForSender(selectedSender); // Fetch updated messages
                    setMessage("")
                }, 20000); // Timer for 10 seconds
    
                // Send the transaction
                const transactionPromise = contract.methods.sendMessage(selectedSender, encryptedMessage).send({ from: account, gas: gasEstimate + 100000 });
                fetchMessagesForSender(selectedSender); 
                console.log("Transaction sent successfully.");
    
                // Optionally handle the transaction result later
                transactionPromise
                    .then(receipt => {
                        console.log("Transaction confirmed:", receipt);
                    })
                    .catch(error => {
                        console.error("Transaction Error:", error);
                        alert("Transaction failed: " + error.message);
                    });
    
            } catch (error) {
                console.error("Error:", error);
                alert("Transaction failed: " + error.message);
            }
        } else {
            alert("Contract not initialized.");
        }
    }
    ;

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

        setSideBar(false)
        setChatWindow(true)
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



    const handleLogout = () => {
        setAccount(null);
       
        navigate('/'); // Redirect to the homepage
    };
    const fetchRegisteredContacts = async () => {
        try {
            if (contract) {
                const result = await contract.methods.getAllRegisteredUsers().call({ from: account });
                const addresses = result[0];
                const usernames = result[1];
                const users = addresses.map((address, index) => ({
                    address,
                    username: usernames[index],
                })).filter(user => user.address !== account);
                setRegisteredContacts(users);
            }
        } catch (error) {
            console.error("Error fetching registered users:", error);
        }
    };

    const handleAllContactsClick = async () => {
        await fetchRegisteredContacts();
        setIsModalOpen(true);
    };

    const handleContactClick = async (user) => {
        setSelectedSender(user.address); // Set the selected sender's address
        closeModal(); // Close the modal after selecting a contact
        
        // Fetch chat history for the selected sender
        await fetchMessagesForSender(user.address);
    };
    

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const sidebarfullscreen = () => {
        setSideBar(true);
        setChatWindow(false);
    };

    const chatwindowfullscreen = () => {
        setChatWindow(true);
    };

    const profileModalopen=()=>{

    };
    // Helper function to format date to "DD/MM/YYYY"
const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB'); // 'en-GB' gives the format DD/MM/YYYY
  };
  
  // Helper function to format time to "HH:MM"
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Only hour and minute
  };
  
  // Function to group messages by date
  const groupMessagesByDate = (messages) => {
    const groupedMessages = {};
  
    messages.forEach((message) => {
      const messageDate = formatDate(message.timestamp);
      if (!groupedMessages[messageDate]) {
        groupedMessages[messageDate] = [];
      }
      groupedMessages[messageDate].push(message);
    });
  
    return groupedMessages;
  };


  const handleProfileClick =()=>{

    setIsProfileModalOpen(true)
  };

  const closeProfileModal=()=>{
setIsProfileModalOpen(false)
  };
  

    return (
        <div className="app">
           {sidebar && (
            <div className="sidebar">
            
          
                <ul className="senders-list">
                    {senders.length > 0 ? (
                        senders.map((senderObj, index) => (
                            <li key={index} onClick={() => fetchMessagesForSender(senderObj.address)} className={selectedSender === senderObj.address ? 'selected' : ''}>
                                <span>{senderObj.name}</span>
                            </li>
                        ))
                    ) : (
                        <li>No contacts available.</li>
                    )}
                </ul>
            </div>
           )}

             {/*  header outside the chat container */}
             <div className="header">
  <div className="profile-info">
    <h2>Secure Chat App</h2>
  </div>

  <div className="buttons-container">
  <button onClick={sidebarfullscreen} className="sidebar-button">Chats</button>
  <button onClick={handleAllContactsClick} className="sidebar-button">Contacts</button>
  <button onClick={handleProfileClick} className="sidebar-button">Profile</button>
  
  
   
    
  </div>
</div>

{ChatWindow && (
            <div className="chat-container">
           
            <div className="chat-window" style={{ maxHeight: '100%', overflowY: 'auto' }}>
                
  
<ul className="messages">
    {(() => {
        const groupedMessages = groupMessagesByDate(allMessages);
        console.log(groupedMessages) // group messages before rendering
        return Object.keys(groupedMessages).length > 0 ? (
            Object.keys(groupedMessages).map((date, index) => (
                <li key={index} className={`message-section ${date}`}>
                    <div key={date} className="date-header">
                        {date}
                        </div>
                    {groupedMessages[date].map((msg, msgIndex) => (
                        <div key={msgIndex} className={`message ${msg.direction} ${date}`}>
                            <p>{msg.content}</p>
                            <span className="timestamp">{formatTime(msg.timestamp)}</span>
                        </div>
                    ))}
                    
                </li>
            ))
        ) : (
            <li>No messages to display</li>
        );
    })()}
</ul>
    <div className="message-form">
                    <textarea
                        
                        value={message}
                        className="message-input"
                        rows={1}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                    />
                  {/* Send Icon as an Image */}
                
                  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA5UlEQVR4nO3WMUpDQRSF4Q/UQhsRbKzdQMAFaCtqmTalYh9wATZuwMIt2FoGRJusIK0QSF4jdnaCXBGmsBFM4purkAN//V+GmTOXZRJzhCmecIGNWuIJ4gsNzrDWtji+YYxTrNQWR2GEboY4CkPsZ4ijMEAnQxx4xy12a4uj8IYb7MwjbhaUf/KKS2zOIj4uBRK/wAv6WJ9lgC3soYcr3JU2m2eAaemAVQtkGwc4xzXu8fzDAR6zxA9/8qhPsi5Xk/WcIqtA4r9U5qD2JzGs/S2Oai8C47ZXn0nWsndY5NXX22W0kQ875CXXn83dMgAAAABJRU5ErkJggg==" alt="send"
                className="send-icon" 
                onClick={sendMessage} 
            />
                </div>
</div>
               
            </div>

    )}

{isProfileModalOpen && (
    <div className="profilemodal">
        
            <h2>{username}</h2>
            <div className="buttons-container">
  <button onClick={closeProfileModal} className="sidebar-button">Cancel</button>
  <button onClick={handleLogout} className="sidebar-button">Logout</button>
  
  
  
   
    
  </div>
            
         
    </div>
)}
            {isModalOpen && (
    <div className="modal">
        <div className="modal-content">
            <h2>Registered Users</h2>
            <ul className="registered-contacts-list">
                {registeredContacts.length > 0 ? (
                    registeredContacts.map((user, index) => (
                        <li
                            key={index} 
                            className="contact-box"
                            onClick={() => handleContactClick(user)}
                        >
                            <span className="contact-username">{user.username}</span>
                          
                        </li>
                    ))
                ) : (
                    <div>No registered contacts found.</div>
                )}
            </ul>
            <button onClick={closeModal} className="close-button">Close</button>
        </div>
    </div>
)}

        </div>
    );
};

export default App;



