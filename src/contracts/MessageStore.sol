pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract MessageStore {

    struct EncryptedContact {
        string name;
        bytes32 encryptedAddress;
    }

    // Mapping from user address to their contacts
    mapping(address => EncryptedContact[]) private userContacts;

    // Mapping to store usernames and password hashes against Ethereum addresses
    mapping(address => string) private users;
    mapping(address => bytes32) private passwordHashes;
    mapping(address => string) public publicKeys; // Public keys mapped to addresses

        mapping(address => mapping(address => string)) private sessionKeys; // Mapping recipient to sender to session key

address[] private allRegisteredUsers; // Array to store registered users' addresses

    event ContactAdded(address indexed user, string contactName);
    event ContactRemoved(address indexed user, string contactName);
    event UserRegistered(address indexed user, string username);
    event PublicKeyUpdated(address indexed user, string publicKey); // Event for public key update

    // Function to add a user with a username, password, and public key
    function registerUser(string memory username, string memory publicKey, string memory password) public returns (bool) {
        // Check if the user is already registered
        if (bytes(users[msg.sender]).length > 0) {
            // If the user is already registered, return false
            return false; 
        }

        // If not registered, save the username, hashed password, and public key
        users[msg.sender] = username;
        passwordHashes[msg.sender] = keccak256(abi.encodePacked(password)); // Store hashed password
        publicKeys[msg.sender] = publicKey; // Store public key
 allRegisteredUsers.push(msg.sender);
        // Emit the UserRegistered and PublicKeyUpdated events
        emit UserRegistered(msg.sender, username);
        emit PublicKeyUpdated(msg.sender, publicKey);
        
        // Return true indicating successful registration
        return true; 
    }

function getAllRegisteredUsers() public view returns (address[] memory, string[] memory) {
    address[] memory addresses = new address[](allRegisteredUsers.length);
    string[] memory usernames = new string[](allRegisteredUsers.length);

    for (uint256 i = 0; i < allRegisteredUsers.length; i++) {
        addresses[i] = allRegisteredUsers[i]; // Store each user's address
        usernames[i] = users[allRegisteredUsers[i]]; // Retrieve and store each user's username
    }

    return (addresses, usernames);
}

  function storeSessionKey(address recipient, string memory sessionKey) public {
        sessionKeys[msg.sender][recipient] = sessionKey; // Store session key for sender-recipient pair
    }

    // Function to fetch session key
    function getSessionKey(address sender, address recipient) public view returns (string memory) {
        return sessionKeys[sender][recipient]; // Retrieve the stored session key
    }

    


// Function to update the public key of the logged-in user
function updatePublicKey(string memory publicKey) public returns (bool) {
    // Check if the user is registered
    require(bytes(users[msg.sender]).length > 0, "User is not registered.");

    // Update the public key
    publicKeys[msg.sender] = publicKey;

    // Emit the PublicKeyUpdated event
    emit PublicKeyUpdated(msg.sender, publicKey);

    return true;
}



// Function to get the public key of a specific address
function getPublicKey(address user) public view returns (string memory) {
    return publicKeys[user];
}




    function getPasswordHash(address user) public view returns (bytes32) {
    return passwordHashes[user];
}

    // Function to get the username of a logged-in user
    function getUsername() public view returns (string memory) {
        return users[msg.sender];
    }

    // Function to validate the password for login
    function validatePassword(string memory password) public view returns (bool) {
        return passwordHashes[msg.sender] == keccak256(abi.encodePacked(password));
    }

    // Function to add a contact
    function addContact(string memory contactName, bytes32 encryptedAddress) public {
        EncryptedContact memory newContact = EncryptedContact({
            name: contactName,
            encryptedAddress: encryptedAddress
        });
        userContacts[msg.sender].push(newContact);
        emit ContactAdded(msg.sender, contactName);
    }

    // Function to retrieve contacts for the logged-in account
    function getContacts() public view returns (EncryptedContact[] memory) {
        return userContacts[msg.sender];
    }

    // Function to remove a contact
    function removeContact(uint256 index) public {
        require(index < userContacts[msg.sender].length, "Invalid index.");
        string memory contactName = userContacts[msg.sender][index].name;
        userContacts[msg.sender][index] = userContacts[msg.sender][userContacts[msg.sender].length - 1];
        userContacts[msg.sender].pop();
        emit ContactRemoved(msg.sender, contactName);
    }

    struct Message {
        address recipient;
        string content;
        address sender;
        uint256 timestamp;  // Add timestamp to track message time
    }

    Message[] private messages;

    event MessageSent(address indexed recipient, string content, address indexed sender);

    // Function to send a message to a specific recipient
    function sendMessage(address recipient, string memory content) public {
        require(recipient != address(0), "Invalid recipient address.");
        messages.push(Message({
            recipient: recipient,
            content: content,
            sender: msg.sender,
            timestamp: now  // Capture the timestamp
        }));
        emit MessageSent(recipient, content, msg.sender);
    }

    // Fetch messages sent by the logged-in account
    function fetchSentMessages() public view returns (Message[] memory) {
        uint256 sentCount = 0;
        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].sender == msg.sender) {
                sentCount++;
            }
        }

        Message[] memory sentMessages = new Message[](sentCount);
        uint256 index = 0;

        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].sender == msg.sender) {
                sentMessages[index] = messages[i];
                index++;
            }
        }

        return sentMessages;
    }

    // Fetch messages received by the logged-in account
    function fetchMessagesForLoggedInAccount() public view returns (Message[] memory) {
        uint256 messageCount = 0;
        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].recipient == msg.sender) {
                messageCount++;
            }
        }

        Message[] memory receivedMessages = new Message[](messageCount);
        uint256 index = 0;

        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].recipient == msg.sender) {
                receivedMessages[index] = messages[i];
                index++;
            }
        }

        return receivedMessages;
    }

    // New function to fetch messages from a specific sender to the logged-in account
    function fetchMessagesFromSender(address sender) public view returns (Message[] memory) {
        uint256 messageCount = 0;
        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].sender == sender && messages[i].recipient == msg.sender) {
                messageCount++;
            }
        }

        Message[] memory messagesFromSender = new Message[](messageCount);
        uint256 index = 0;

        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].sender == sender && messages[i].recipient == msg.sender) {
                messagesFromSender[index] = messages[i];
                index++;
            }
        }

        return messagesFromSender;
    }

    function fetchMessagesForSender(address sender) public view returns (Message[] memory) {
        uint256 messageCount = 0;
        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].sender == sender && messages[i].recipient == msg.sender) {
                messageCount++;
            }
        }

        Message[] memory senderMessages = new Message[](messageCount);
        uint256 index = 0;

        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].sender == sender && messages[i].recipient == msg.sender) {
                senderMessages[index] = messages[i];
                index++;
            }
        }

        return senderMessages;
    }
}
