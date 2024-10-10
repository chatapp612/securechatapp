// AddContactPage.js
import React, { useState, useEffect } from 'react';
import './App.css';

const AddContactPage = ({ web3, contract }) => {
    const [showBox, setShowBox] = useState(false);
    const [name, setName] = useState('');
    const [recipient, setRecipient] = useState('');
    const [contacts, setContacts] = useState([]);

    useEffect(() => {
        if (contract) {
            fetchContacts();
        }
    }, [contract]);

    const fetchContacts = async () => {
        const accounts = await web3.eth.getAccounts();
        const contactsData = await contract.methods.getContacts().call({ from: accounts[0] });
        setContacts(contactsData);
    };

    const handleSave = async () => {
        const accounts = await web3.eth.getAccounts();
        const encryptedAddress = web3.utils.keccak256(recipient); // Example encryption, adjust as needed
        await contract.methods.addContact(name, encryptedAddress).send({ from: accounts[0] });
        setName('');
        setRecipient('');
        setShowBox(false);
        fetchContacts(); // Refresh contacts after saving
    };

    const toggleBox = () => {
        setShowBox(!showBox);
    };

    const CenteredBox = ({ onClose }) => {
        return (
            <div className="overlay">
                <div className="box">
                    <h2>Add Contact</h2>
                    <div className="add-contact-input-area">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter Name"
                            className="name-input"
                        />
                    </div>
                    <div className="add-contact-input-area">
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="Enter Recipient Ethereum Address"
                            className="add-contact-recipient-input"
                        />
                    </div>
                    <div className="button-group">
                        <button onClick={handleSave} className="save-button">Save</button>
                        <button onClick={onClose} className="cancel-button">Cancel</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="add-contact-page">
            <div className="chat-header">
                <h2>Contact List</h2>
                <button onClick={toggleBox} className="addcontact-button">Add New Contact</button>
            </div>
            {showBox && <CenteredBox onClose={toggleBox} />}
            <div className="contact-list">
                {contacts.map((contact, index) => (
                    <div key={index} className="contact-item">
                        {contact.name} - {web3.utils.toHex(contact.encryptedAddress)} {/* Adjust as necessary */}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AddContactPage;
