pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract MessageStore {

    struct EncryptedContact {
        string name;
        bytes32 encryptedAddress;
    }

    // Mapping from user address to their contacts
    mapping(address => EncryptedContact[]) private userContacts;

    // Mapping to store usernames against Ethereum addresses
    mapping(address => string) private users;

    event ContactAdded(address indexed user, string contactName);
    event ContactRemoved(address indexed user, string contactName);
    event UserRegistered(address indexed user, string username);

    // Function to add a user with a username
  // Function to add a user with a username
function registerUser(string memory username) public returns (bool) {
    // Check if the user is already registered
    if (bytes(users[msg.sender]).length > 0) {
        // If the user is already registered, return false
        return false; 
    }

    // If not registered, save the username
    users[msg.sender] = username;

    // Emit the UserRegistered event
    emit UserRegistered(msg.sender, username);
    
    // Return true indicating successful registration
    return true; 
}


    // Function to get the username of a logged-in user
    function getUsername() public view returns (string memory) {
        return users[msg.sender];
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