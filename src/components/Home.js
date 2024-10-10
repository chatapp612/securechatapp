import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context.js'; // Import the custom hook for web3 context

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
            console.error("Error checking registration status:", error);
            setError("Failed to check registration status.");
        }
    };

    const handleSignUpOpen = () => {
        setOpen(true);
    };

    const handleSignUpSubmit = async () => {
        if (!username || !password) { // Validate username and password
            setError('Username and Password are required');
            return;
        }
        try {
            await contract.methods.registerUser(username, password).send({ from: account });
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
            const username = await contract.methods.getUsername().call({ from: account });
            const passwordValid = await contract.methods.validatePassword(password).call({ from: account });

            if (passwordValid) {
                setCurrentUsername(username);
                navigate('/app', { state: { account, username } }); // Navigate to the main app with account and username
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
