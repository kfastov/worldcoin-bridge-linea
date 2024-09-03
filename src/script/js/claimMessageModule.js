import { ethers } from 'ethers';
import { LineaSDK } from '@consensys/linea-sdk';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// Securely read the private key from the environment variable
const privateKey = process.env.L2_SIGNER_PRIVATE_KEY;
if (!privateKey) {
    throw new Error('Private key not found in environment variables');
}

const l2RPCUrl = process.env.L2_RPC_URL;
if (!l2RPCUrl) {
  throw new Error('Layer 2 RPC url not found in environment variables');
}

// Initialize the Linea SDK
const lineaSDK = new LineaSDK({
  l2RpcUrl: l2RPCUrl,
  l2SignerPrivateKey: privateKey,
  network: "linea-mainnet",
  mode: "read-write",
});


/**
 * Claims a pending message on L2MessageService
 * @param {string} sender - The address of the message sender
 * @param {string} destination - The destination address
 * @param {string} fee - The fee for claiming the message
 * @param {string} value - The value of the message
 * @param {string} messageHash - The hash of the message
 * @param {string} nonce - The nonce of the message
 * @param {string} calldata - The calldata of the message
 * @param {string} l2MessageServiceAddress - The address of the L2MessageService contract
 * @returns {Promise<ethers.ContractTransaction>} The transaction receipt
 * @throws {Error} If there's an error during the claiming process
 */
async function claimPendingMessage(sender, destination, fee, value, messageHash, nonce, calldata, l2MessageServiceAddress) {
    try {
      const l2Contract = lineaSDK.getL2Contract(l2MessageServiceAddress);

      const message = {
        messageSender: sender,
        destination: destination,
        fee: fee,
        value: value,
        messageNonce: nonce,
        calldata: calldata,
        messageHash: messageHash
      }

      const tx = await l2Contract.claim(message);
      await tx.wait();
      console.log('Message claimed successfully:', tx.hash);
      return tx;

    } catch (error) {
        console.error('Error claiming message:', error);
        throw error; // Re-throw the error after logging it
    }
}

// Export the module functions
export { claimPendingMessage };