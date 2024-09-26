pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract MessageStore {
    struct Message {
        address recipient;
        string content;
        address sender;
        uint256 timestamp;  // Add timestamp to track message time
    }

    Message[] private messages;

    event MessageSent(address recipient, string content, address sender);

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
}
