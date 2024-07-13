# State Bridge Spec

The diagram above demonstrates the process of propagating World ID Merkle tree roots from the `WorldIDIdentityManager` contract (located in the world-id-contracts repository) on the Ethereum mainnet to the `LineaWorldID` contract

World ID Merkle tree roots are retrieved from the `WorldIDIdentityManager` contract by invoking the `latestRoot()` public method. These roots are then sent to the LineaWorldID contract using its receiveRoot() method, facilitated by the propagateRoot() method. This process ensures that the  Merkle tree roots are accurately and efficiently propagated from the `WorldIDIdentityManager` to the `LineaWorldID` contract.

## LineaStateBridge

The LineaStateBridge contract is an integral component in the architecture designed to facilitate secure and efficient communication between Ethereum and Linea. it's primary purpose is to serve as a trusted intermediary that retrieves Merkle tree roots from the `WorldIDIdentityManager` contract on Ethereum and delivers them to the `LineaWorldID` contract on the Linea blockchain. This process ensures that state updates are accurately propagated across both blockchains.

The propagation process incurs transaction fees on both the Ethereum and Linea blockchains. The `LineaStateBridge` manages these fees, requiring periodic transactions to be initiated and paid for by users or designated operators. This ensures the continued operation and data consistency of the system
