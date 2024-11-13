import crypto from 'crypto';


// Generate a random AES session key
export function generateSessionKey() {
    return crypto.randomBytes(32).toString('hex'); // 256-bit AES key
}

// Encrypt session key with the recipient’s public RSA key
export function encryptSessionKey(sessionKey, recipientPublicKey) {
    const bufferKey = Buffer.from(sessionKey, 'hex');
    return crypto.publicEncrypt(
        { key: recipientPublicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        bufferKey
    ).toString('base64');
}

// Decrypt session key with the user’s private RSA key
export function decryptSessionKey(encryptedSessionKey, userPrivateKey) {
    const bufferKey = Buffer.from(encryptedSessionKey, 'base64');
    return crypto.privateDecrypt(
        { key: userPrivateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        bufferKey
    ).toString('hex');
}
// cryptoUtils.js

// RC4 encryption function
export function rc4(key, message) {
    // Initialize the key scheduling algorithm (KSA)
    let S = [];
    let j = 0;
    const keyLength = key.length;
    const messageLength = message.length;

    // Key-scheduling algorithm
    for (let i = 0; i < 256; i++) {
        S[i] = i;
    }
    
    for (let i = 0; i < 256; i++) {
        j = (j + S[i] + key.charCodeAt(i % keyLength)) % 256;
        [S[i], S[j]] = [S[j], S[i]];  // Swap S[i] and S[j]
    }

    // Pseudo-random generation algorithm (PRGA)
    let i = 0;
    j = 0;
    let output = '';
    
    for (let n = 0; n < messageLength; n++) {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        [S[i], S[j]] = [S[j], S[i]];  // Swap S[i] and S[j]
        
        const K = S[(S[i] + S[j]) % 256];
        output += String.fromCharCode(message.charCodeAt(n) ^ K);  // XOR with the keystream
    }

    return output;  // Encrypted message
}

// Encrypt the message using RC4 with the session key
export function encryptMessage(message, sessionKey) {
    return rc4(sessionKey, message);
}
