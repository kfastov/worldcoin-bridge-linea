# PropagateRoot Service Documentation

## Overview

The PropagateRoot service is a helper component in the Linea WorldID system. Its primary function is to relay Merkle tree roots from the Ethereum L1 (mainnet) WorldID Identity Manager to the Linea L2 WorldID contract.

## Main Goal

The service aims to:

1. Monitor changes in the WorldID Merkle tree on Ethereum L1.
2. Call `propagateRoot()` on the LineaStateBridge contract on Ethereum when changes are detected.
3. Claim the resulting messages on the LineaWorldID contract on Linea L2.

## Key Components

- L1MessageListener: Monitors events on L1.
- L2MessageHandler: Claims messages on L2.
- LineaRootPropagator: Manages the root propagation process.
- Scheduler: Orchestrates tasks.
- Config: Manages configuration settings.

## Workflow

1. **Initialization**: The service validates its configuration and connects to L1 and L2 networks.
2. **L1 Event Monitoring**: Listens for TreeChanged events on the WorldID Identity Manager contract on L1.
3. **Root Propagation**: Upon detecting a TreeChanged event, calls `propagateRoot()` on the LineaStateBridge contract on L1.
4. **L2 Message Claiming**: Periodically checks for and claims messages on the LineaWorldID contract on L2.
5. **Continuous Operation**: Continues monitoring events and claiming messages to maintain synchronization.

## Required Environment Variables

- `PRIVATE_KEY`: For transaction signing.
- `L1_RPC_URL`: Ethereum L1 RPC URL.
- `L2_RPC_URL`: Linea L2 RPC URL.
- `LINEA_STATE_BRIDGE_ADDRESS`: LineaStateBridge contract address on L1.
- `L1_MESSAGE_SERVICE_ADDRESS`: L1 Message Service contract address.
- `L2_MESSAGE_SERVICE_ADDRESS`: L2 Message Service contract address.
- `WORLD_ID_IDENTITY_MANAGER_ADDRESS`: WorldID Identity Manager contract address on L1.
- `LINEA_WORLD_ID_ADDRESS`: LineaWorldID contract address on L2.

Optional variables (with defaults) include:
- `PROPAGATION_PERIOD`: Time between root propagations (default: 1 hour).
- `LISTENER_INIT_DELAY`: Delay before starting the L1 listener (default: 0 seconds).
- `L1_BLOCKS_TO_QUERY`: Number of L1 blocks to query for events (default: 1000).
- `L2_BLOCKS_TO_QUERY`: Number of L2 blocks to query for events (default: 1000).
- `L2_POLLING_INTERVAL`: Interval for polling L2 for new blocks (default: 15 seconds).

## Security Note

Ensure all environment variables are set securely, especially the private key.

## Monitoring

Monitor logs for successful root propagations, message claims, and any errors.
