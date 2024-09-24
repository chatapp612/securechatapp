pragma solidity ^0.5.0;

contract HelloWorld {
    string private storedString;

    event StringSet(string newString);

    function setString(string memory newString) public {
        storedString = newString;
        emit StringSet(newString);
    }

    function print() public view returns (string memory) {
        return storedString;
    }
}
