import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context.js'; // Import the custom hook for web3 context
import Web3 from 'web3'; // Import Web3 to generate keys
import { sha256 } from 'js-sha256'; // Hash function to simulate randomness based on the address
const crypto = require('crypto');
    const fs = require('fs');

import sodium from "libsodium-wrappers";



const Home = () => {
    const [open, setOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState(''); // New state for password
    const [error, setError] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [currentUsername, setCurrentUsername] = useState('');
    const [currentAccount, setCurrentAccount] = useState('');
    
    const { web3, contract, account } = useWeb3(); // Access web3, contract, and account from the context
    const navigate = useNavigate();
    const secp256k1 = require("secp256k1");
    // Check if user is already registered on page load
    useEffect(() => {
        if (account && contract) {
            checkIfRegistered();
        }
    }, [account, contract]);



    async function generatePrivateKeyFromAddress() {
        // Request access to the MetaMask account
        await window.ethereum.request({ method: 'eth_requestAccounts' });
    
        // Get the current Ethereum address from MetaMask
        const accounts = await web3.eth.getAccounts();
        const accountAddress = accounts[0];
    
        console.log("MetaMask Ethereum Address:", accountAddress);
    
        // Use the Ethereum address as a seed for generating a private key
        // Hash the address to generate a 'random' private key (this is not cryptographically secure)
        const pseudoRandomPrivateKey = sha256(accountAddress); // Hash the address to simulate randomness
    
        // Private key is derived from the hash - ensure it is in the expected format (remove 0x)
        const privateKey = `0x${pseudoRandomPrivateKey.slice(0, 64)}`; // Slice to get the correct length (32 bytes)
    
        console.log("Generated Private Key (from address):", privateKey);
    
        return privateKey;    }


    const checkIfRegistered = async () => {
        try {
            const existingUsername = await contract.methods.getUsername().call({ from: account });
            if (existingUsername) {
                setCurrentUsername(existingUsername);
                setIsRegistered(true);
                 
    
                 
 
            } else {
                setIsRegistered(false);
            }
        } catch (error) {
            console.error("Error checking registration status:", error);
            setError("Failed to check registration status.");
        }
    };

    const handleSignUpOpen = () => {
        setOpen(true);
    };

  
    
    // Method to generate an RSA public/private key pair using the Web Crypto API
// Method to generate an RSA public/private key pair using the Web Crypto API
const generateKeys = async (account) => {
    // Initialize Sodium
    await sodium.ready;

    const keyPair = sodium.crypto_kx_keypair();

    // Convert public and private keys to hexadecimal
    const publicKeyHex = sodium.to_hex(keyPair.publicKey);
    const privateKeyHex = sodium.to_hex(keyPair.privateKey);

    console.log("Generated Public Key (Hex format):", publicKeyHex);
    console.log("Generated Private Key (Hex format):", privateKeyHex);

    // Store private key in local storage, using the account address as the key
    localStorage.setItem(`privateKey-${account}`, privateKeyHex);
    console.log(`Private key for ${account} stored in local storage!`);

    // Provide a download option for the private key
    const blob = new Blob([privateKeyHex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "private_key.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Release the URL object after download

    return publicKeyHex; // Return the public key
};

const handleSignUpSubmit = async () => {
    if (!username || !password) { // Validate username and password
        setError('Username and Password are required');
        return;
    }
    try {
        // Generate the public and private keys
        const publicKeyHex = await generateKeys(); // Await for the generated public key in hex format

        

        // Register the user on the blockchain with the username and public key
        await contract.methods.registerUser(username, publicKeyHex, password).send({ from: account });

        // Store the public key on the blockchain if needed
        await contract.methods.updatePublicKey(publicKeyHex).send({ from: account });

        setOpen(false);
        navigate('/app', { state: { account, username } }); // Navigate to the main app with account and username
    } catch (error) {
        console.error("Registration error:", error);
        setError("Registration failed. Please try again.");
    }
};


    const handleLogin = async () => {
        if (!password) { // Validate password
            setError('Password is required for login');
            return;
        }
        try {
            console.log("Password entered by user:", password);
            console.log("before password validate");

            // Hash the password entered by the user
            const hashedPassword = web3.utils.keccak256(password);
    
            // Print the hashed password to the console
            console.log("Hashed password generated by user:", hashedPassword);
    
            // Fetch the username associated with the account
            const username = await contract.methods.getUsername().call({ from: account });
            console.log("Username from contract:", username);
    
            // Fetch the stored password hash from the smart contract for the logged-in account
            const storedHashedPassword = await contract.methods.getPasswordHash(account).call();
            console.log("Hashed password stored in the contract:", storedHashedPassword);
    
            // Validate the password by comparing the hashes
            const passwordValid = hashedPassword === storedHashedPassword;
            console.log("Password valid:", passwordValid); // This will print `true` or `false` based on comparison
    
            if (passwordValid) {
                console.log("Password is valid. User login successful.");

                setCurrentUsername(username);
                navigate('/app', { state: { account, username } });
               
                console.log("Final")
               
    
                
    
            } else {
                setError('Invalid password');
            }
        } catch (error) {
            console.error("Login error:", error);
            setError("Login failed. Please try again.");
        }
    };
    return (
        <div>
            <h1>Welcome to the Chat App</h1>
            {!isRegistered ? (
                <>
                    <h2>Sign Up</h2>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} // Bind password input
                    />
                    <button onClick={handleSignUpSubmit}>Sign Up</button>
                </>
            ) : (
                <>
                    <h2>Welcome Back, {currentUsername}!</h2>
                    <input
                        type="password"
                        placeholder="Enter Password to Login"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} // Bind password input
                    />
                    <button onClick={handleLogin}>Login</button>
                </>
            )}
            {error && <p style={{ color: 'red' }}>{error}</p>} {/* Error handling */}
        </div>
    );
};

export default Home;
