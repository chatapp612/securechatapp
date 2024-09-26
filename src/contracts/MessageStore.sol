pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract MessageStore {
    struct Message {
        address recipient;
        string content;
        address sender;
        uint256 timestamp; // New field for timestamp
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
            timestamp: now // Store the current timestamp
        }));
        emit MessageSent(recipient, content, msg.sender);
    }

    // Struct to hold message and sender information
    struct MessageWithSender {
        string content;
        address sender;
        uint256 timestamp; // Include timestamp in the struct
    }

    // Function to fetch messages for the logged-in Ethereum account along with sender info
    function fetchMessagesForLoggedInAccount() public view returns (MessageWithSender[] memory) {
        uint256 messageCount = 0;
        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].recipient == msg.sender) {
                messageCount++;
            }
        }

        MessageWithSender[] memory result = new MessageWithSender[](messageCount);
        uint256 index = 0;

        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].recipient == msg.sender) {
                result[index] = MessageWithSender({
                    content: messages[i].content,
                    sender: messages[i].sender,
                    timestamp: messages[i].timestamp // Capture timestamp
                });
                index++;
            }
        }

        return result;
    }

    // Function to fetch messages sent by the logged-in account
    function fetchSentMessages() public view returns (MessageWithSender[] memory) {
        uint256 messageCount = 0;
        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].sender == msg.sender) {
                messageCount++;
            }
        }

        MessageWithSender[] memory result = new MessageWithSender[](messageCount);
        uint256 index = 0;

        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].sender == msg.sender) {
                result[index] = MessageWithSender({
                    content: messages[i].content,
                    sender: messages[i].sender,
                    timestamp: messages[i].timestamp // Capture timestamp
                });
                index++;
            }
        }

        return result;
    }
}
