import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Web3 from 'web3';
import MessageStoreContract from '../abis/MessageStore.json';

const Home = () => {
    const [open, setOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [currentUsername, setCurrentUsername] = useState(''); // State for storing current username
    const [currentAccount, setCurrentAccount] = useState(''); // State for storing current account
    const navigate = useNavigate();

    // Initialize web3, contract, and account
    const initWeb3 = async () => {
        console.log("Initializing web3...");
        try {
            const web3Instance = new Web3(window.ethereum);
            console.log("Requesting Ethereum accounts...");

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Fetch accounts after requesting access
            const accounts = await web3Instance.eth.getAccounts();
            console.log("Accounts retrieved:", accounts);

            // Check if no accounts were returned
            if (accounts.length === 0) {
                console.error("No accounts found. Please connect a wallet.");
                setError("No accounts found. Please connect a wallet.");
                return null;
            }

            const networkId = await web3Instance.eth.net.getId();
            console.log("Network ID:", networkId);
            const deployedNetwork = MessageStoreContract.networks[networkId];

            if (deployedNetwork) {
                const contractInstance = new web3Instance.eth.Contract(
                    MessageStoreContract.abi,
                    deployedNetwork.address,
                );
                console.log("Contract instance created:", deployedNetwork.address);
                return { web3: web3Instance, contract: contractInstance, account: accounts[0] };
            } else {
                throw new Error("Contract not deployed on this network");
            }
        } catch (error) {
            console.error("Web3 initialization error:", error);
            setError(error.message);
            return null;
        }
    };

    const checkIfRegistered = async (account) => {
        const result = await initWeb3();
        if (result) {
            try {
                // Check if the user is already registered
                const existingUsername = await result.contract.methods.getUsername().call({ from: account });
                if (existingUsername) {
                    setCurrentUsername(existingUsername); // Set the username
                    setCurrentAccount(account); // Set the account
                    setIsRegistered(true); // Set registered status
                    return true;  // User is already registered
                }
                setIsRegistered(false); // User is not registered
                return false; // User is not registered
            } catch (error) {
                console.error("Error checking registration status:", error);
                setError("Failed to check registration status.");
                return false;
            }
        }
        return false; // Failed to initialize Web3
    };

    const handleSignUpOpen = async () => {
        const result = await initWeb3();
        if (result) {
            await checkIfRegistered(result.account); // Check if the user is registered
        }
        setOpen(true); // Open the modal regardless of registration status
    };

    const handleSignUpSubmit = async () => {
        console.log("Sign up submitted with username:", username);
        const result = await initWeb3();
        if (result) {
            try {
                // Check if the user is already registered
                if (isRegistered) {
                    return;  // Exit if already registered
                }

                // Attempt to register the user on the blockchain
                console.log("Attempting to register user...");
                await result.contract.methods.registerUser(username).send({ from: result.account });

                // If registration is successful
                console.log("Username stored on blockchain:", username);
                setOpen(false);
                // Pass the username and account to the chat page
                console.log("Navigating to chat app...");
                navigate('/app', { state: { account: result.account, username: username } });
            } catch (error) {
                console.error("Registration error:", error);
                alert("Registration failed. Please try again.");
            }
        } else {
            console.log("Web3 initialization failed.");
        }
    };

    const handleLogin = async () => {
        console.log("Login attempt...");
        const result = await initWeb3();
        if (result) {
            try {
                // Fetch the username from the blockchain
                console.log("Fetching username...");
                const username = await result.contract.methods.getUsername().call({ from: result.account });
                console.log("Logged in as:", username);
                navigate('/app', { state: { account: result.account, username: username } });
            } catch (error) {
                console.error("Login error:", error);
                setError("Failed to login: " + error.message);
            }
        } else {
            console.log("Web3 initialization failed during login.");
        }
    };

    
    

    return (
        <div style={{ textAlign: 'center', marginTop: '20%' }}>
            <h1>Messaging Application</h1>
            <button onClick={handleSignUpOpen} className="handlesignup-button">
                Sign Up
            </button>
            <button onClick={handleLogin} className="handlelogin-button">
                Login
            </button>

            {open && (
                <div style={modalStyle}>
                    <h2>Sign Up</h2>
                    {isRegistered ? (
                        <div>
                            <p>You are already signed up as <strong>{currentUsername}</strong></p>
                            <p>Ethereum Address: <strong>{currentAccount}</strong></p>
                            <p>To sign up as a new user, please open your wallet to switch your Ethereum account.</p>
                            
                        </div>
                    ) : (
                        <div>
                            <input
                                type="text"
                                placeholder="Enter Username"
                                value={username}
                                onChange={(e) => {
                                    console.log("Username input changed to:", e.target.value);
                                    setUsername(e.target.value);
                                }}
                                style={inputStyle}
                            />
                            <button onClick={handleSignUpSubmit} style={buttonStyle}>
                                Submit
                            </button>
                        </div>
                    )}
                    <button onClick={() => {
                        console.log("Closing modal...");
                        setOpen(false);
                    }} style={{ ...buttonStyle, backgroundColor: 'red' }}>
                        Close
                    </button>
                </div>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

// Styles for buttons, modal, and input fields
const buttonStyle = {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
};

const modalStyle = {
    padding: '20px',
    backgroundColor: 'white',
    margin: '15% auto',
    width: '300px',
    textAlign: 'center',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
};

const inputStyle = {
    padding: '10px',
    fontSize: '16px',
    width: '100%',
    marginBottom: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
};

export default Home;