pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract MessageStore {
    struct Message {
        address recipient;
        string content;
        address sender;
    }

    Message[] private messages;

    event MessageSent(address recipient, string content, address sender);

    // Function to send a message to a specific recipient
    function sendMessage(address recipient, string memory content) public {
        require(recipient != address(0), "Invalid recipient address.");
        messages.push(Message({
            recipient: recipient,
            content: content,
            sender: msg.sender
        }));
        emit MessageSent(recipient, content, msg.sender);
    }

    // Function to fetch messages for the logged-in Ethereum account
    function fetchMessagesForLoggedInAccount() public view returns (string[] memory) {
        uint256 messageCount = 0;
        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].recipient == msg.sender) {
                messageCount++;
            }
        }

        string[] memory result = new string[](messageCount);
        uint256 index = 0;

        for (uint256 i = 0; i < messages.length; i++) {
            if (messages[i].recipient == msg.sender) {
                result[index] = messages[i].content;
                index++;
            }
        }

        return result;
    }
}
