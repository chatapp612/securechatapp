// const Hello = artifacts.require("Hello");
const MessageStore = artifacts.require("MessageStore");

module.exports = function(deployer) {
    // deployer.deploy(Hello);
    deployer.deploy(MessageStore);
};
