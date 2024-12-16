import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context.js'; // Import the custom hook for web3 context
import Web3 from 'web3'; // Import Web3 to generate keys
import { sha256 } from 'js-sha256'; // Hash function to simulate randomness based on the address
import sodium from "libsodium-wrappers";
import './Home.css'; // Import Home specific styles

const crypto = require('crypto');
const fs = require('fs');

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
          
            setError("Failed to check registration status.");
        }
    };

    const handleSignUpOpen = () => {
        setOpen(true);
    };

    const generateKeys = async () => {
        await sodium.ready;

        //elliptic curve cryptography (ECC) based on the Curve25519 curve
        const keyPair = sodium.crypto_kx_keypair();
      
        const publicKeyHex = sodium.to_hex(keyPair.publicKey);
        const privateKeyHex = sodium.to_hex(keyPair.privateKey);

        localStorage.setItem(`privateKey-${account}`, privateKeyHex);
      

        

        return publicKeyHex;
    };

    const handleSignUpSubmit = async () => {
        if (!username || !password) {
            setError('Username and Password are required');
            return;
        }
        if (username.length < 3 || username.length > 100) {
            setError('Username must be between 3 and 100 characters');
            return;
        }

        const passwordErrors = getPasswordStrengthError(password);
    
        if (passwordErrors.length > 0) {
            setError(passwordErrors.join(' ')); // Join all error messages with space
            return;
        }
        try {
            const publicKeyHex = await generateKeys();

           
            const transactionPromise1=  contract.methods.registerUser(username, publicKeyHex, password).send({ from: account });
          

         
           
            setTimeout(() => {
                // Update the UI after 10 seconds
              
                setOpen(false);
            navigate('/app', { state: { account, username } });
                
            }, 20000);
           
            // Optionally handle the transaction result later
            transactionPromise1
                .then(receipt => {
                  
                })
                .catch(error => {
                   
                    alert("Transaction failed: " + error.message);
                });

            

           
        } catch (error) {
           
            setError("Registration failed. Please try again.");
        }
    };

    const handleLogin = async () => {
        if (!password) {
            setError('Password is required for login');
            return;
        }
        try {
            const hashedPassword = web3.utils.keccak256(password);

            const username = await contract.methods.getUsername().call({ from: account });

            const storedHashedPassword = await contract.methods.getPasswordHash(account).call();

            const passwordValid = hashedPassword === storedHashedPassword;

            if (passwordValid) {
              
                setCurrentUsername(username);
                navigate('/app', { state: { account, username } });
            } else {
                setError('Invalid password');
            }
        } catch (error) {
         
            setError("Login failed. Please try again.");
        }
    };

const getPasswordStrengthError = (password) => {
    const errors = [];
    
    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long.");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter.");
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter.");
    }
    if (!/\d/.test(password)) {
        errors.push("Password must contain at least one number.");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push("Password must contain at least one special character.");
    }
    
    return errors;
};


    return (
        <div className="login-container align">
            <div className="grid">
                <div className="login-box">
                    <h1 className="text--center">Secure Chat App</h1>
                    {!isRegistered ? (
                        <>
                            <h2 className="signup-text">Sign Up</h2>
                            <div className="form">
                                <div className="form__field">
                                    <input
                                        className="form__input"
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                                <div className="form__field">
                                    
                                    <input
                                        className="form__input"
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)} // Bind password input
                                    />
                                </div>
                                <button className="button login" onClick={handleSignUpSubmit}>Sign Up</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="login-text">Welcome Back, {currentUsername}!</h2>
                            <div className="form">
                                <div className="form__field">
                                    <input
                                        className="form__input"
                                        type="password"
                                        placeholder="Enter Password to Login"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)} // Bind password input
                                    />
                                </div>
                                <button className="button login" onClick={handleLogin}>Login</button>
                            </div>
                        </>
                    )}
                    {error && <p className="error text--center">{error}</p>} {/* Error handling */}
                </div>
            </div>
        </div>
    );
};

export default Home; 

