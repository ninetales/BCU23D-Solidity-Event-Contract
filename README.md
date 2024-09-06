# Solidity Contract - Event Manager

# Gas optimization and security practices

- Use of ++i instead of i++ in loops
  I have used ++i in my loops because it is slightly more gas-efficient than i++. This is due to how Solidity handles incrementing operations. ++i increments the value in place, while i++ creates a temporary copy of the variable before incrementing it.

- Reentrancy
  I have employed OpenZeppelin's nonReentrant modifier to protect critical functions like buyTicket and cancelTicket from reentrancy attacks. This measure prevents malicious contracts from calling the function repeatedly within a single transaction, which could potentially drain funds. This ensures that my contract adheres to best security practices by eliminating one of the most common vulnerabilities in smart contracts.

- Consideration of how unsigned integers are stored
  In my contract, I have been mindful of how unsigned integers are stored. By using appropriately sized integer types like uint16 for variables such as eventsCounter and ticketLimit, I reduce unnecessary gas costs associated with storing larger types like uint256. This ensures more efficient gas usage without sacrificing functionality.

- Fail-Safe Fallback function
  I have implemented a fallback function in my contract to enhance security by safely handling unexpected transactions. This function logs any data sent to the contract that doesn’t match predefined functions.

- Custom errors
  I have used custom errors in my contract to improve both gas efficiency and code clarity. Custom errors provide a more gas-efficient way to handle exceptions compared to traditional require statements with string messages. They are more gas-efficient and a better way explain to users why an operation failed.
