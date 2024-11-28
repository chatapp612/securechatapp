import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context.js';
import { useNavigate } from 'react-router-dom';
import './AddContactPage.css';

const AddContactPage = () => {
    const { web3, contract, account } = useWeb3();
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (web3 && contract) {
            fetchUsers();
        }
    }, [web3, contract]);

    const fetchUsers = async () => {
        try {
            if (!web3 || !contract) {
                setError('Web3 or contract is not initialized');
                return;
            }

            const result = await contract.methods.getAllRegisteredUsers().call({ from: account });
            const addresses = result[0];
            const usernames = result[1];
    
            if (Array.isArray(addresses) && Array.isArray(usernames) && addresses.length > 0) {
                // Combine addresses and usernames into a single array of objects
                const usersData = addresses.map((address, index) => ({
                    address,
                    username: usernames[index]
                })).filter(user => user.address !== account);
                setUsers(usersData);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to fetch users. Please try again later.');
        }
    };

    const handleUserClick = (user) => {
        navigate('/app', { state: { recipient: user.address} });  // Passing the recipient address to App component
    };

    return (
        <div className="add-contact-page">
            <div className="chat-header">
                <h2>All Registered Users</h2>
            </div>
            {error ? (
                <div className="error-message">{error}</div>
            ) : (
                <ul className="user-list">
                    {users.length > 0 ? (
                        users.map((user, index) => (
                            <li key={index} className="user-item">
                                <a 
                                onClick={() => handleUserClick(user)}>{user.username}</a>
                            </li>
                        ))
                    ) : (
                        <div>No users registered yet.</div>
                    )}
                </ul>
            )}
        </div>
    );
};

export default AddContactPage;
