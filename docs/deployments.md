# Deployment Guide

The deployment logic for the Worldcoin Bridge on Linea is implemented in
[`src/script/deploy.js`](../src/script/deploy.js). The script is intended to be run via the `bun run deploy`,
`bun run deploy:testnet`, and `bun run deploy:mainnet` commands. Below is a detailed description of what each deployment
command does and the corresponding Forge scripts that are executed:

---

## Deployment Commands

### `bun run deploy:mainnet`

This command interactively deploys the WorldID state bridge on the Linea mainnet.

#### Steps Executed:

1. **Configuration Setup**:

   - Generates the `src/script/.deploy-config.json` file to store deployment configurations.
   - Prompts for the following information:
     - **Deployer Private Key** (`PRIVATE_KEY`): Your wallet's private key used for deploying contracts.
     - **Ethereum RPC URL** (`ETH_RPC_URL`): The RPC URL for Ethereum mainnet.
     - **Linea RPC URL** (`LINEA_RPC_URL`): The RPC URL for Linea mainnet. Default is `http://localhost:8545`.
     - **Ethereum Etherscan API Key** (`ETHERSCAN_API_KEY`): For contract verification on Etherscan.
     - **Lineascan API Key** (`LINEA_SCAN_API_KEY`): For contract verification on Lineascan.
     - **Lineascan Verifier URL** (`LINEA_SCAN_VERIFIER_URL`): The verifier URL for Lineascan.
     - **WorldID Tree Depth** (`treeDepth`): The Merkle tree depth for WorldID. Default is `30`.
     - **Message Service Addresses**:
       - **L1 Message Service Address** (`MESSAGE_SERVICE_ADDRESS_L1`): Address of the message service on L1.
       - **L2 Message Service Address** (`MESSAGE_SERVICE_ADDRESS_L2`): Address of the message service on L2.
   - Saves these configurations to `.deploy-config.json`.

2. **Deploy `LineaWorldID.sol` to Linea Mainnet**:

   - Executes the Forge script [`DeployLineaWorldID.s.sol`](../src/script/DeployLineaWorldID.s.sol) to deploy the
     `LineaWorldID` contract on Linea mainnet.

     - **Command Executed**:

       ```bash
       forge script src/script/DeployLineaWorldID.s.sol:DeployLineaWorldID --fork-url <LINEA_RPC_URL> --broadcast --json
       ```

   - Extracts the deployed contract address from the logs and saves it to `.deploy-config.json`.
   - If a Lineascan API key is provided, proceeds to verify the contract.

3. **Verify `LineaWorldID` Contract on Lineascan** (Optional):

   - Uses the `forge verify-contract` command to verify the `LineaWorldID` contract on Lineascan.

     - **Command Executed**:

       ```bash
       forge verify-contract <LINEA_WORLD_ID_ADDRESS> src/LineaWorldID.sol:LineaWorldID --etherscan-api-key <LINEA_SCAN_API_KEY> --verifier-url <LINEA_SCAN_VERIFIER_URL> --watch
       ```

4. **Deploy `LineaStateBridge.sol` to Ethereum Mainnet**:

   - Prompts for the `WorldIDIdentityManager` address (`WORLD_ID_IDENTITY_MANAGER_ADDRESS`).
   - Executes the Forge script [`DeployLineaStateBridge.s.sol`](../src/script/DeployLineaStateBridge.s.sol) to deploy
     the `LineaStateBridge` contract on Ethereum mainnet.

     - **Command Executed**:

       ```bash
       forge script src/script/DeployLineaStateBridge.s.sol:DeployLineaStateBridge --fork-url <ETH_RPC_URL> --broadcast --json
       ```

     - If an Ethereum Etherscan API key is provided, adds `--etherscan-api-key` and `--verify` flags for automatic
       verification.

   - Extracts the deployed contract address from the logs and saves it to `.deploy-config.json`.

5. **Initialize `LineaWorldID` Contract**:

   - Executes the Forge script [`InitializeLineaWorldID.s.sol`](../src/script/InitializeLineaWorldID.s.sol) to transfer
     ownership of `LineaWorldID` to `LineaStateBridge`.

     - **Command Executed**:

       ```bash
       forge script src/script/InitializeLineaWorldID.s.sol:InitializeLineaWorldID --fork-url <LINEA_RPC_URL> --broadcast --legacy --json
       ```

   - Confirms the ownership transfer and updates the configuration file.

---

### `bun run deploy:testnet`

This command deploys the WorldID state bridge on the Linea testnet (Linea Sepolia and Ethereum Sepolia).

#### Steps Executed:

1. **Configuration Setup**:

   - Similar to `bun run deploy:mainnet`, but uses testnet configurations.
   - Prompts for testnet-specific RPC URLs and API keys.

2. **Deploy `LineaWorldID.sol` to Linea Sepolia**:

   - Deploys the `LineaWorldID` contract to Linea Sepolia using the same Forge script but with testnet parameters.

3. **Verify `LineaWorldID` Contract on Lineascan** (Optional):

   - Verifies the contract on the Linea testnet explorer if API keys are provided.

4. **Deploy `LineaStateBridge.sol` to Ethereum Sepolia**:

   - Deploys the `LineaStateBridge` contract to Ethereum Sepolia.

5. **Initialize `LineaWorldID` Contract**:
   - Transfers ownership to `LineaStateBridge` on the testnet.

---

### `bun run deploy`

This command is a generic deployment script that can be used for both mainnet and testnet deployments, depending on the
environment specified.

---

## Addresses of the Deployments

### Testnet Deployments on Ethereum Sepolia and Linea Sepolia

- **LineaStateBridge (Ethereum Sepolia)**:
  [0x64A96eED1dA15FCFb0874D82F7D7C6ea3Fda6aEf](https://sepolia.etherscan.io/address/0x64A96eED1dA15FCFb0874D82F7D7C6ea3Fda6aEf)

- **LineaWorldID (Linea Sepolia)**:
  [0x5d676D93ffE4dC07805a780531a559b08cC3564d](https://sepolia.lineascan.build/address/0x5d676D93ffE4dC07805a780531a559b08cC3564d)

---

## Additional Notes

- **Forge Version**: Ensure you are using a compatible version of Forge and Foundry to run the scripts.
- **Private Key**: The deployer private key must have sufficient funds on the target network to cover deployment costs.
- **Environment Variables**: You can create environment-specific files (e.g., `mainnet.env`, `testnet.env`) to store
  environment variables used in the deployment scripts.
- **Configuration File**: The `.deploy-config.json` file stores all deployment configurations and deployed contract
  addresses. It's used for subsequent runs to reuse configurations.
- **Verification Issue**: Due to a known issue
  ([foundry-rs/foundry#7466](https://github.com/foundry-rs/foundry/issues/7466)), contracts cannot be verified and
  deployed simultaneously. The script handles verification in a separate step.

---

By following this guide, you should be able to deploy the Worldcoin Bridge contracts to either the mainnet or testnet
environment. Make sure to replace placeholders with actual values and update explorer URLs as necessary.
