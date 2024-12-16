pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract MessageStore {
struct User {
        string username;
        bytes32 passwordHash;
        string publicKey;
    }
address[] private allRegisteredUsers; // Array to store registered users' addresses

   // Mapping from user address to their user information (username, hashed password, and public key)
    mapping(address => User) private users;

  event UserRegistered(address indexed user, string username);
    event PublicKeyUpdated(address indexed user, string publicKey);

        // Function to register a new user with a username, password, and public key
    function registerUser(string memory username, string memory publicKey, string memory password) public returns (bool) {
        // Check if the user is already registered
        if (bytes(users[msg.sender].username).length > 0) {
            // If the user is already registered, return false
            return false; 
        }

        // If not registered, save the username, hashed password, and public key in the User struct
        users[msg.sender] = User({
            username: username,
            passwordHash: keccak256(abi.encodePacked(password)), // Store hashed password
            publicKey: publicKey
        });
        
        // Add the user to the list of registered users
        allRegisteredUsers.push(msg.sender);

        // Emit the UserRegistered and PublicKeyUpdated events
        emit UserRegistered(msg.sender, username);
        emit PublicKeyUpdated(msg.sender, publicKey);

        // Return true indicating successful registration
        return true; 
    }


function getAllRegisteredUsers() public view returns (address[] memory, string[] memory) {
    uint256 userCount = allRegisteredUsers.length;
    address[] memory addresses = new address[](userCount);
    string[] memory usernames = new string[](userCount);

    for (uint256 i = 0; i < userCount; i++) {
        address userAddress = allRegisteredUsers[i];
        addresses[i] = userAddress; // Store each user's address
        usernames[i] = users[userAddress].username; // Retrieve and store each user's username
    }

    return (addresses, usernames);
}


// Function to get the public key of a specific address
function getPublicKey(address user) public view returns (string memory) {
    return users[user].publicKey;
}

// Function to get the password hash of a specific address
function getPasswordHash(address user) public view returns (bytes32) {
    return users[user].passwordHash;
}

// Function to get the username of the logged-in user
function getUsername() public view returns (string memory) {
    return users[msg.sender].username;
}


   // Function to validate the password for login
function validatePassword(string memory password) public view returns (bool) {
    return users[msg.sender].passwordHash == keccak256(abi.encodePacked(password));
}

// Function to get the username by address
function getUsernameByAddress(address user) public view returns (string memory) {
    return users[user].username;
}

struct Message {
    address recipient;
    string content;
    address sender;
    uint256 timestamp;  
}

Message[] private messages;

event MessageSent(address indexed recipient, string content, address indexed sender);

// Function to send a message to a specific recipient
function sendMessage(address recipient, string memory content) public {
    require(bytes(users[msg.sender].username).length > 0, "You must be a registered user to send messages."); // Check if sender is registered
    require(recipient != address(0), "Invalid recipient address.");
    messages.push(Message({
        recipient: recipient,
        content: content,
        sender: msg.sender,
        timestamp: block.timestamp  // Capture the timestamp (use block.timestamp instead of `now`)
    }));
    emit MessageSent(recipient, content, msg.sender);
}

// Fetch all messages (sent and received) for the logged-in account
function fetchAllMessagesForLoggedInAccount() public view returns (Message[] memory) {
    uint256 messageCount = 0;

    // Count all messages related to the logged-in address (sent or received)
    for (uint256 i = 0; i < messages.length; i++) {
        if (messages[i].sender == msg.sender || messages[i].recipient == msg.sender) {
            messageCount++;
        }
    }

    // Create an array to store the fetched messages
    Message[] memory allMessages = new Message[](messageCount);
    uint256 index = 0;

    // Store the messages in the array (sent or received by the logged-in address)
    for (uint256 i = 0; i < messages.length; i++) {
        if (messages[i].sender == msg.sender || messages[i].recipient == msg.sender) {
            allMessages[index] = messages[i];
            index++;
        }
    }

    return allMessages;
}

}
